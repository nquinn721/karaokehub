import { GoogleGenerativeAI } from '@google/generative-ai';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as puppeteer from 'puppeteer';
import { Like, Repository } from 'typeorm';
import { getGeminiModel, getGeminiPerformanceSettings } from '../config/gemini.config';
import { FacebookAuthWebSocketService } from '../websocket/facebook-auth-websocket.service';
import { UrlToParse } from './url-to-parse.entity';

export interface LocationData {
  [state: string]: string[];
}

export interface GroupSearchResult {
  city: string;
  state: string;
  groupUrls: string[];
  error?: string;
}

@Injectable()
export class FacebookGroupDiscoveryService {
  private readonly logger = new Logger(FacebookGroupDiscoveryService.name);
  private readonly maxConcurrentWorkers = Math.min(os.cpus().length, 16); // Use available CPU cores, max 16 to avoid overwhelming Facebook
  private readonly searchDelay = 1500; // Reduced delay for faster processing
  private genAI: GoogleGenerativeAI;

  constructor(
    @InjectRepository(UrlToParse)
    private urlToParseRepository: Repository<UrlToParse>,
    private configService: ConfigService,
    private facebookAuthService: FacebookAuthWebSocketService,
  ) {
    // Initialize Gemini AI
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      this.logger.error('❌ GEMINI_API_KEY not found in environment variables');
      throw new Error('GEMINI_API_KEY is required for Facebook group discovery');
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  /**
   * Load existing Facebook session cookies from environment or file
   */
  private async loadExistingCookies(): Promise<any[]> {
    try {
      // Try environment variable first (production)
      const cookiesFromEnv = this.configService.get<string>('FB_SESSION_COOKIES');

      if (cookiesFromEnv) {
        this.logger.log('📦 Loading existing Facebook cookies from environment...');
        return JSON.parse(cookiesFromEnv);
      }

      // Try local file (development)
      const cookiesFilePath = path.join(process.cwd(), 'data', 'facebook-cookies.json');

      if (fs.existsSync(cookiesFilePath)) {
        this.logger.log('📂 Loading existing Facebook cookies from local file...');
        const fileContent = fs.readFileSync(cookiesFilePath, 'utf8');
        return JSON.parse(fileContent);
      }

      this.logger.warn('❌ No existing Facebook cookies found');
      return [];
    } catch (error) {
      this.logger.error(`❌ Failed to load existing cookies: ${error.message}`);
      return [];
    }
  }

  /**
   * Main method to discover karaoke groups from all cities
   */
  async discoverGroupsFromAllCities(): Promise<GroupSearchResult[]> {
    this.logger.log('🔍 Starting Facebook group discovery for all cities...');

    const locations = this.loadLocationsData();
    const allCities = this.flattenLocations(locations);

    this.logger.log(`📍 Found ${allCities.length} cities to process`);

    // Process cities in batches with worker limit
    const results: GroupSearchResult[] = [];
    const batchSize = this.maxConcurrentWorkers;

    for (let i = 0; i < allCities.length; i += batchSize) {
      const batch = allCities.slice(i, i + batchSize);
      this.logger.log(
        `🏭 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(allCities.length / batchSize)}`,
      );

      const batchPromises = batch.map((city) => this.discoverGroupsForCity(city));
      const batchResults = await Promise.allSettled(batchPromises);

      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          this.logger.error(`❌ Batch processing failed: ${result.reason}`);
        }
      }

      // Delay between batches to be respectful to Facebook
      if (i + batchSize < allCities.length) {
        await this.delay(this.searchDelay * 2);
      }
    }

    // Save all discovered URLs to database
    await this.saveDiscoveredUrls(results);

    this.logger.log(
      `✅ Group discovery completed. Found ${results.reduce((sum, r) => sum + r.groupUrls.length, 0)} groups total`,
    );
    return results;
  }

  /**
   * Discover karaoke groups for a specific city
   */
  private async discoverGroupsForCity(cityData: {
    city: string;
    state: string;
  }): Promise<GroupSearchResult> {
    const { city, state } = cityData;
    this.logger.log(`🎤 Searching for karaoke groups in ${city}, ${state}`);

    let browser: puppeteer.Browser | null = null;

    try {
      // Launch Puppeteer with Facebook-friendly settings
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
        ],
      });

      const page = await browser.newPage();

      // Set user agent and viewport
      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      );
      await page.setViewport({ width: 1366, height: 768 });

      // Perform Facebook login and search
      const groupUrls = await this.performGroupSearch(page, city, state);

      return {
        city,
        state,
        groupUrls,
      };
    } catch (error) {
      this.logger.error(`❌ Error discovering groups for ${city}, ${state}: ${error.message}`);
      return {
        city,
        state,
        groupUrls: [],
        error: error.message,
      };
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  /**
   * Perform the actual Facebook search and group selection
   */
  private async performGroupSearch(
    page: puppeteer.Page,
    city: string,
    state: string,
  ): Promise<string[]> {
    try {
      // Try to get Facebook credentials from admin via WebSocket first
      const requestId = `group-search-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      this.logger.log(`🔐 Requesting Facebook credentials for ${city}, ${state}...`);

      const credentials = await this.facebookAuthService.requestCredentials(requestId);

      if (!credentials) {
        // Fallback to existing session cookies
        this.logger.log('⚡ No admin credentials provided, using existing session cookies...');
        const existingCookies = await this.loadExistingCookies();

        if (existingCookies.length === 0) {
          throw new Error('No Facebook credentials or session cookies available');
        }

        // Use existing cookies for authentication
        await this.loginToFacebook(page, { cookies: existingCookies });
      } else {
        // Use provided credentials
        await this.loginToFacebook(page, credentials);
      }

      // Search for karaoke groups in the city
      const searchQuery = `karaoke ${city} ${state}`;
      await this.performSearch(page, searchQuery);

      // Take screenshot for Gemini analysis
      const screenshot = await page.screenshot({
        fullPage: false,
        clip: { x: 0, y: 0, width: 1366, height: 768 },
      });

      // Use Gemini to analyze and select appropriate groups
      const selectedGroups = await this.analyzeGroupsWithGemini(
        Buffer.from(screenshot),
        city,
        state,
      );

      return selectedGroups;
    } catch (error) {
      this.logger.error(`❌ Group search failed for ${city}, ${state}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Login to Facebook using provided credentials
   */
  private async loginToFacebook(page: puppeteer.Page, credentials: any): Promise<void> {
    this.logger.log('🔐 Logging into Facebook...');

    // Navigate to Facebook
    await page.goto('https://www.facebook.com/', { waitUntil: 'networkidle0' });

    // Check if already logged in via cookies
    if (credentials.cookies) {
      await page.setCookie(...credentials.cookies);
      await page.reload({ waitUntil: 'networkidle0' });
    }

    // Check if we need to perform login
    const loginForm = await page.$('form[data-testid="royal_login_form"]');
    if (loginForm) {
      // Fill in login credentials
      await page.type('#email', credentials.email);
      await page.type('#pass', credentials.password);

      // Submit login form
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle0' }),
        page.click('button[name="login"]'),
      ]);

      // Handle potential 2FA or security checks
      await this.handleSecurityChecks(page);
    }

    this.logger.log('✅ Facebook login completed');
  }

  /**
   * Handle Facebook security checks (2FA, etc.)
   */
  private async handleSecurityChecks(page: puppeteer.Page): Promise<void> {
    // Wait a bit for any security checks to appear
    await this.delay(3000);

    // Check for 2FA prompt
    const twoFactorPrompt = await page.$('input[name="approvals_code"]');
    if (twoFactorPrompt) {
      this.logger.warn('⚠️ 2FA prompt detected - this may require manual intervention');
      // For automated systems, we'd need to handle this via the admin interface
      throw new Error('2FA prompt detected - manual intervention required');
    }

    // Check for other security prompts
    const securityCheck = await page.$('[data-testid="checkpoint_title"]');
    if (securityCheck) {
      this.logger.warn('⚠️ Security checkpoint detected');
      throw new Error('Security checkpoint detected - manual intervention required');
    }
  }

  /**
   * Perform search for karaoke groups with deep scrolling if needed
   */
  private async performSearch(page: puppeteer.Page, searchQuery: string): Promise<void> {
    this.logger.log(`🔍 Searching for: "${searchQuery}"`);

    // Navigate to groups search
    const searchUrl = `https://www.facebook.com/search/groups/?q=${encodeURIComponent(searchQuery)}`;
    await page.goto(searchUrl, { waitUntil: 'networkidle0' });

    // Wait for search results to load
    await page.waitForSelector('[role="feed"]', { timeout: 10000 });

    // Progressively scroll to load more results
    // We'll scroll multiple times to get a good selection of groups
    await this.scrollToLoadMoreResults(page);
  }

  /**
   * Scroll down progressively to load more search results
   */
  private async scrollToLoadMoreResults(page: puppeteer.Page): Promise<void> {
    this.logger.log(`📜 Loading more search results...`);

    // Scroll down in stages to load more groups
    for (let i = 0; i < 5; i++) {
      const scrollAmount = 600 * (i + 1);
      
      await page.evaluate((amount) => {
        window.scrollBy(0, amount);
      }, scrollAmount);

      // Wait for content to load after each scroll
      await this.delay(2000);

      // Check if we've reached the end of results
      const hasMoreContent = await page.evaluate(() => {
        const feed = document.querySelector('[role="feed"]');
        if (!feed) return false;
        
        // Check if there are loading spinners or "no more results" indicators
        const loadingSpinners = document.querySelectorAll('[role="progressbar"]');
        const noMoreResults = document.querySelectorAll('*').length > 0 && 
          Array.from(document.querySelectorAll('*')).some(el => 
            el.textContent?.toLowerCase().includes('no more') ||
            el.textContent?.toLowerCase().includes('end of results')
          );
        
        return loadingSpinners.length > 0 || !noMoreResults;
      });

      if (!hasMoreContent) {
        this.logger.log(`📜 Reached end of search results after ${i + 1} scrolls`);
        break;
      }
    }

    // Final scroll back to top to ensure we capture the full page
    await page.evaluate(() => {
      window.scrollTo(0, 0);
    });
    await this.delay(1000);
  }

  /**
   * Two-stage analysis: First analyze search results, then validate individual groups
   * If not enough valid groups found, search deeper in the results
   */
  private async analyzeGroupsWithGemini(
    screenshot: Buffer,
    city: string,
    state: string,
  ): Promise<string[]> {
    this.logger.log(`🤖 Stage 1: Analyzing search results for ${city}, ${state} with Gemini...`);

    // Stage 1: Analyze search results page to identify potential groups
    const candidateUrls = await this.analyzeSearchResults(screenshot, city, state);
    
    if (candidateUrls.length === 0) {
      this.logger.log(`❌ No candidate groups found in search results for ${city}, ${state}`);
      return [];
    }

    this.logger.log(`🔍 Stage 2: Validating ${candidateUrls.length} candidate groups by visiting their pages...`);

    // Stage 2: Visit each candidate group and validate with screenshots
    const validatedUrls = await this.validateGroupsWithScreenshots(candidateUrls, city, state);

    // If we don't have enough validated groups, we could implement additional search logic here
    // For now, return what we found
    return validatedUrls;
  }

  /**
   * Stage 1: Analyze search results to identify potential karaoke groups
   */
  private async analyzeSearchResults(
    screenshot: Buffer,
    city: string,
    state: string,
  ): Promise<string[]> {
    const prompt = `
    You are analyzing a Facebook search results page for karaoke groups in ${city}, ${state}.
    
    Please identify ALL potential public karaoke groups from this screenshot that meet these criteria:
    
    BASIC CRITERIA (for candidates):
    1. Must be PUBLIC groups (look for "Public group" text or public icon indicators)
    2. Could be related to karaoke, singing, music venues, entertainment, or nightlife
    3. Should be relevant to ${city} or ${state} area (local groups preferred)
    4. Must have valid Facebook group URLs
    5. Should have some member activity (prefer groups with 20+ members)
    
    FILTERING RULES:
    - REJECT any groups marked as "Private" or "Closed"
    - REJECT any groups that are clearly spam or fake
    - REJECT any malformed or incomplete URLs
    - REJECT any groups with very few members (under 5)
    - REJECT any groups that are clearly not local to the region
    
    URL REQUIREMENTS:
    - URLs must follow the format: https://www.facebook.com/groups/[group-id]
    - Remove ALL query parameters (everything after ?)
    - Ensure the group-id portion is valid
    
    BE INCLUSIVE in this stage - we will validate the actual content in the next stage.
    Look for groups that might be karaoke-related, including:
    - Karaoke groups
    - Music venues
    - DJ services
    - Open mic nights
    - Entertainment groups
    - Bar/club groups that might host karaoke
    - Community groups that might have karaoke events
    
    Extract ALL potential group URLs (up to 8) that could be karaoke-related.
    
    Return your response as a JSON array of cleaned group URLs:
    ["https://www.facebook.com/groups/group1", "https://www.facebook.com/groups/group2", ...]
    
    If you find fewer than 8 suitable candidates, return what you find.
    Quality candidates that need validation - don't be too restrictive at this stage.
    `;

    try {
      const performanceSettings = getGeminiPerformanceSettings();
      const model = this.genAI.getGenerativeModel({
        model: getGeminiModel('vision'),
        generationConfig: {
          temperature: performanceSettings.temperature,
          topP: performanceSettings.topP,
          topK: performanceSettings.topK,
          maxOutputTokens: Math.min(performanceSettings.maxTokensPerRequest, 1024),
        },
      });

      const result = await model.generateContent([
        prompt,
        {
          inlineData: {
            data: screenshot.toString('base64'),
            mimeType: 'image/png',
          },
        },
      ]);

      const response = await result.response;
      const analysis = response.text();

      // Clean and parse the response
      let cleanedAnalysis = analysis.trim();
      if (cleanedAnalysis.startsWith('```json') || cleanedAnalysis.startsWith('```')) {
        cleanedAnalysis = cleanedAnalysis.replace(/^```(json)?\s*/, '').replace(/```\s*$/, '');
      }
      cleanedAnalysis = cleanedAnalysis.trim();

      const urls = JSON.parse(cleanedAnalysis);

      if (Array.isArray(urls)) {
        const cleanedUrls = this.cleanAndValidateUrls(urls);
        this.logger.log(`✅ Found ${cleanedUrls.length} candidate groups for validation`);
        return cleanedUrls.slice(0, 8); // Max 8 candidates for validation
      } else {
        this.logger.warn(`⚠️ Unexpected response format from Gemini for search results`);
        return [];
      }
    } catch (error) {
      this.logger.error(`❌ Search results analysis failed: ${error.message}`);
      return [];
    }
  }

  /**
   * Stage 2: Visit each candidate group and validate with screenshots
   */
  private async validateGroupsWithScreenshots(
    candidateUrls: string[],
    city: string,
    state: string,
  ): Promise<string[]> {
    const validatedUrls: string[] = [];
    const maxValidatedGroups = 3; // Final limit of validated groups
    const maxRetries = 2; // Retry failed validations

    for (let i = 0; i < candidateUrls.length && validatedUrls.length < maxValidatedGroups; i++) {
      const url = candidateUrls[i];
      this.logger.log(`🔍 Validating group ${i + 1}/${candidateUrls.length}: ${url}`);

      let isValid = false;
      let retryCount = 0;

      // Retry validation in case of network issues
      while (!isValid && retryCount <= maxRetries) {
        try {
          isValid = await this.validateSingleGroup(url, city, state);
          if (isValid) {
            validatedUrls.push(url);
            this.logger.log(`✅ Group validated and approved: ${url}`);
            break;
          } else {
            this.logger.log(`❌ Group rejected after validation: ${url}`);
            break; // Don't retry if group is genuinely not karaoke-related
          }
        } catch (error) {
          retryCount++;
          this.logger.error(`❌ Error validating group ${url} (attempt ${retryCount}/${maxRetries + 1}): ${error.message}`);
          
          if (retryCount <= maxRetries) {
            this.logger.log(`🔄 Retrying validation for ${url} in 3 seconds...`);
            await this.delay(3000);
          }
        }
      }

      // Delay between validations to be respectful
      if (i < candidateUrls.length - 1) {
        await this.delay(2000);
      }
    }

    this.logger.log(`✅ Validation complete: ${validatedUrls.length} groups approved for ${city}, ${state}`);
    
    // If we didn't find enough valid groups, log a suggestion for deeper search
    if (validatedUrls.length < 2) {
      this.logger.log(`⚠️ Only found ${validatedUrls.length} valid groups for ${city}, ${state}. Consider expanding search criteria or scrolling deeper in results.`);
    }

    return validatedUrls;
  }

  /**
   * Validate a single group by visiting its page and taking a screenshot
   */
  private async validateSingleGroup(url: string, city: string, state: string): Promise<boolean> {
    let browser: puppeteer.Browser | null = null;

    try {
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
        ],
      });

      const page = await browser.newPage();
      
      // Set longer timeout for page operations
      page.setDefaultTimeout(20000);
      page.setDefaultNavigationTimeout(20000);
      
      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      );
      await page.setViewport({ width: 1366, height: 768 });

      // Load existing cookies for authentication
      const existingCookies = await this.loadExistingCookies();
      if (existingCookies.length > 0) {
        try {
          // Navigate to Facebook first, then set cookies
          await page.goto('https://www.facebook.com/', { waitUntil: 'domcontentloaded', timeout: 10000 });
          await page.setCookie(...existingCookies);
        } catch (cookieError) {
          this.logger.warn(`⚠️ Failed to set cookies for ${url}: ${cookieError.message}`);
        }
      }

      // Navigate to the group page with retries
      let navigationSuccess = false;
      const maxNavigationRetries = 3;
      
      for (let retry = 0; retry < maxNavigationRetries && !navigationSuccess; retry++) {
        try {
          await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
          navigationSuccess = true;
        } catch (navError) {
          this.logger.warn(`⚠️ Navigation attempt ${retry + 1} failed for ${url}: ${navError.message}`);
          if (retry < maxNavigationRetries - 1) {
            await this.delay(2000);
          }
        }
      }

      if (!navigationSuccess) {
        this.logger.error(`❌ Failed to navigate to ${url} after ${maxNavigationRetries} attempts`);
        return false;
      }

      // Wait for page content to load
      await this.delay(3000);

      // Check if we're redirected to login (private group or authentication issue)
      const currentUrl = page.url();
      if (currentUrl.includes('login') || currentUrl.includes('checkpoint') || currentUrl.includes('verify')) {
        this.logger.log(`⚠️ Redirected to login/checkpoint for ${url} - skipping`);
        return false;
      }

      // Check for error pages
      if (currentUrl.includes('error') || currentUrl.includes('notfound')) {
        this.logger.log(`⚠️ Error page detected for ${url} - skipping`);
        return false;
      }

      // Check for private group indicators
      const privateIndicators = await page.evaluate(() => {
        const text = document.body.textContent || '';
        const lowerText = text.toLowerCase();
        return lowerText.includes('private group') || 
               lowerText.includes('closed group') || 
               lowerText.includes('request to join') ||
               lowerText.includes('this content isn\'t available') ||
               lowerText.includes('content not available') ||
               lowerText.includes('join group');
      });

      if (privateIndicators) {
        this.logger.log(`⚠️ Group appears to be private: ${url}`);
        return false;
      }

      // Check if page actually loaded group content
      const hasGroupContent = await page.evaluate(() => {
        // Look for typical Facebook group page elements
        const groupIndicators = [
          '[data-pagelet="GroupFeed"]',
          '[data-pagelet="GroupInformation"]',
          '[role="main"]',
          '[data-testid="GroupFeed"]',
        ];
        
        return groupIndicators.some(selector => document.querySelector(selector) !== null);
      });

      if (!hasGroupContent) {
        this.logger.log(`⚠️ No group content detected for ${url} - skipping`);
        return false;
      }

      // Scroll down to load more content
      await page.evaluate(() => {
        window.scrollBy(0, 800);
      });
      await this.delay(2000);

      // Take screenshot of the group page
      const screenshot = await page.screenshot({
        fullPage: false,
        clip: { x: 0, y: 0, width: 1366, height: 768 },
        type: 'png',
      });

      // Use Gemini to analyze the group content
      const isKaraokeRelated = await this.analyzeGroupContent(
        Buffer.from(screenshot),
        url,
        city,
        state,
      );

      return isKaraokeRelated;
    } catch (error) {
      this.logger.error(`❌ Error validating group ${url}: ${error.message}`);
      return false;
    } finally {
      if (browser) {
        try {
          await browser.close();
        } catch (closeError) {
          this.logger.warn(`⚠️ Error closing browser: ${closeError.message}`);
        }
      }
    }
  }

  /**
   * Analyze individual group content to determine if it's karaoke-related
   */
  private async analyzeGroupContent(
    screenshot: Buffer,
    url: string,
    city: string,
    state: string,
  ): Promise<boolean> {
    const prompt = `
    You are analyzing a Facebook group page to determine if it's genuinely karaoke-related and worth including in our karaoke venue discovery system.
    
    Group URL: ${url}
    Location: ${city}, ${state}
    
    Analyze this screenshot and determine if this group meets ALL these STRICT criteria:
    
    REQUIRED CRITERIA:
    1. The group must be PUBLIC (not private/closed)
    2. The group must be actively related to KARAOKE specifically, including:
       - Karaoke venues or bars
       - Karaoke events or nights
       - Karaoke singers or communities
       - Open mic nights that include karaoke
       - DJ services that provide karaoke
    3. The group must be relevant to ${city}, ${state} or surrounding area
    4. The group should have real activity (recent posts, member engagement)
    5. The group should have a reasonable number of members (20+)
    
    REJECTION CRITERIA (return false if ANY of these apply):
    - Private or closed groups
    - Groups without clear karaoke relevance
    - Spam or fake groups
    - Groups with no recent activity
    - Groups clearly not related to the ${city}, ${state} area
    - Groups with very few members (under 20)
    - Groups that are just general music/entertainment without karaoke focus
    - Groups that are primarily about selling products/services unrelated to karaoke
    - Adult content or inappropriate groups
    
    Look for specific karaoke indicators in the content:
    - Posts about karaoke nights
    - Photos from karaoke events
    - Mentions of karaoke equipment
    - Discussions about songs or singing
    - Venue information for karaoke bars
    - Event announcements for karaoke
    
    Based on your analysis, is this a legitimate, active, public karaoke group worth including?
    
    Respond with ONLY "true" or "false" - no explanation needed.
    `;

    try {
      const performanceSettings = getGeminiPerformanceSettings();
      const model = this.genAI.getGenerativeModel({
        model: getGeminiModel('vision'),
        generationConfig: {
          temperature: 0.1, // Lower temperature for more consistent binary decisions
          topP: performanceSettings.topP,
          topK: performanceSettings.topK,
          maxOutputTokens: 10, // Very short response
        },
      });

      const result = await model.generateContent([
        prompt,
        {
          inlineData: {
            data: screenshot.toString('base64'),
            mimeType: 'image/png',
          },
        },
      ]);

      const response = await result.response;
      const analysis = response.text().trim().toLowerCase();

      // Parse the boolean response
      const isValid = analysis.includes('true');
      
      this.logger.log(`🤖 Gemini validation result for ${url}: ${isValid ? 'APPROVED' : 'REJECTED'}`);
      return isValid;
    } catch (error) {
      this.logger.error(`❌ Group content analysis failed for ${url}: ${error.message}`);
      return false;
    }
  }

  /**
   * Clean and validate URLs from Gemini response
   */
  private cleanAndValidateUrls(urls: any[]): string[] {
    return urls
      .map((url) => {
        if (typeof url === 'string') {
          // Remove query parameters
          let cleanUrl = url.includes('?') ? url.split('?')[0] : url;

          // Ensure proper Facebook group URL format
          if (cleanUrl.includes('facebook.com/groups/')) {
            const groupIdMatch = cleanUrl.match(/facebook\.com\/groups\/([a-zA-Z0-9._-]+)\/?$/);
            if (groupIdMatch && groupIdMatch[1]) {
              const groupId = groupIdMatch[1];
              if (/^[a-zA-Z0-9._-]+$/.test(groupId) && groupId.length >= 3) {
                return `https://www.facebook.com/groups/${groupId}`;
              }
            }
          }
        }
        return null;
      })
      .filter((url) => url !== null);
  }

  /**
   * Validate Facebook group URL format
   */
  private isValidFacebookGroupUrl(url: string): boolean {
    try {
      // Check basic URL format
      const urlObj = new URL(url);
      if (!urlObj.hostname.includes('facebook.com')) {
        return false;
      }

      // Check for groups path
      if (!url.includes('facebook.com/groups/')) {
        return false;
      }

      // Extract and validate group ID
      const groupIdMatch = url.match(/facebook\.com\/groups\/([a-zA-Z0-9._-]+)\/?$/);
      if (!groupIdMatch || !groupIdMatch[1]) {
        return false;
      }

      const groupId = groupIdMatch[1];
      // Validate group ID format and length
      return /^[a-zA-Z0-9._-]+$/.test(groupId) && groupId.length >= 3 && groupId.length <= 100;
    } catch (error) {
      return false;
    }
  }

  /**
   * Save all discovered URLs to the database
   */
  private async saveDiscoveredUrls(results: GroupSearchResult[]): Promise<void> {
    this.logger.log('💾 Saving discovered URLs to database...');

    let totalSaved = 0;
    let totalSkipped = 0;

    // Process each result to maintain city/state association
    for (const result of results) {
      for (const url of result.groupUrls) {
        if (url && this.isValidFacebookGroupUrl(url)) {
          try {
            // Check if URL already exists
            const existing = await this.urlToParseRepository.findOne({ where: { url } });

            if (!existing) {
              await this.urlToParseRepository.save({
                url,
                name: null,
                isApproved: false,
                hasBeenParsed: false,
                city: result.city,
                state: result.state,
              });
              this.logger.log(`✅ Saved new URL for ${result.city}, ${result.state}: ${url}`);
              totalSaved++;
            } else {
              // Update existing record with city/state if missing
              if (!existing.city || !existing.state) {
                existing.city = result.city;
                existing.state = result.state;
                await this.urlToParseRepository.save(existing);
                this.logger.log(`🔄 Updated city/state for existing URL: ${url}`);
              } else {
                this.logger.log(`⏭️ URL already exists: ${url}`);
              }
              totalSkipped++;
            }
          } catch (error) {
            this.logger.error(`❌ Failed to save URL ${url}: ${error.message}`);
          }
        } else {
          this.logger.warn(`⚠️ Invalid or malformed URL rejected: ${url}`);
        }
      }
    }

    this.logger.log(`✅ Finished saving URLs: ${totalSaved} new, ${totalSkipped} existing`);
  }

  /**
   * Load locations data from JSON file
   */
  private loadLocationsData(): LocationData {
    const locationsPath = path.join(process.cwd(), 'data', 'majorLocations.json');
    const locationsData = JSON.parse(fs.readFileSync(locationsPath, 'utf8'));
    return locationsData;
  }

  /**
   * Flatten locations data into a single array with state info
   */
  private flattenLocations(locations: LocationData): Array<{ city: string; state: string }> {
    const flattened: Array<{ city: string; state: string }> = [];

    for (const [state, cities] of Object.entries(locations)) {
      for (const city of cities) {
        flattened.push({
          city,
          state,
        });
      }
    }

    return flattened;
  }

  /**
   * Utility method for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get discovery progress/status
   */
  async getDiscoveryStatus(): Promise<{
    totalCities: number;
    processedCities: number;
    discoveredGroups: number;
    isRunning: boolean;
  }> {
    const locations = this.loadLocationsData();
    const totalCities = this.flattenLocations(locations).length;

    // Count how many URLs we've discovered (approximate progress)
    const discoveredGroups = await this.urlToParseRepository.count({
      where: { url: Like('%facebook.com/groups/%') },
    });

    return {
      totalCities,
      processedCities: 0, // Would need to track this in a more sophisticated way
      discoveredGroups,
      isRunning: false, // Would need to track this with a flag
    };
  }
}
