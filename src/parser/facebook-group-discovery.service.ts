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
   * Perform search for karaoke groups
   */
  private async performSearch(page: puppeteer.Page, searchQuery: string): Promise<void> {
    this.logger.log(`🔍 Searching for: "${searchQuery}"`);

    // Navigate to groups search
    const searchUrl = `https://www.facebook.com/search/groups/?q=${encodeURIComponent(searchQuery)}`;
    await page.goto(searchUrl, { waitUntil: 'networkidle0' });

    // Wait for search results to load
    await page.waitForSelector('[role="feed"]', { timeout: 10000 });

    // Scroll down a bit to load more results
    await page.evaluate(() => {
      window.scrollBy(0, 500);
    });

    await this.delay(2000);
  }

  /**
   * Use Gemini to analyze the screenshot and select appropriate groups
   */
  private async analyzeGroupsWithGemini(
    screenshot: Buffer,
    city: string,
    state: string,
  ): Promise<string[]> {
    this.logger.log(`🤖 Analyzing groups for ${city}, ${state} with Gemini...`);

    const prompt = `
    You are analyzing a Facebook search results page for karaoke groups in ${city}, ${state}.
    
    Please identify the TOP 2 public karaoke groups from this screenshot that meet these STRICT criteria:
    
    REQUIRED CRITERIA:
    1. Must be PUBLIC groups (look for "Public group" text or public icon indicators)
    2. Must be related to karaoke (singing, music venues, karaoke nights, open mic, DJ services, etc.)
    3. Must be relevant to ${city} or ${state} area (local groups only)
    4. Must have valid, well-formed Facebook group URLs
    5. Should have reasonable member counts (prefer groups with 50+ members)
    
    FILTERING RULES:
    - REJECT any groups marked as "Private" or "Closed"
    - REJECT any groups without clear karaoke/music relevance
    - REJECT any groups that appear to be spam or fake
    - REJECT any malformed or incomplete URLs
    - REJECT any groups with very few members (under 10)
    - REJECT any groups that are clearly not local to ${city}, ${state}
    
    URL REQUIREMENTS:
    - URLs must follow the exact format: https://www.facebook.com/groups/[group-id]
    - Remove ALL query parameters (everything after ?)
    - Ensure the group-id portion is valid (letters, numbers, dots, hyphens only)
    - Do not include URLs that redirect to Facebook login or error pages
    
    From the screenshot, extract the Facebook group URLs for the TOP 2 groups that best match these criteria.
    Focus on groups that appear to be active karaoke communities with PUBLIC visibility.
    
    IMPORTANT: Clean the URLs by removing all query parameters (everything after the ? in the URL).
    For example: "https://www.facebook.com/groups/example?ref=search" should become "https://www.facebook.com/groups/example"
    
    Return your response as a JSON array of cleaned group URLs:
    ["https://www.facebook.com/groups/group1", "https://www.facebook.com/groups/group2"]
    
    If you cannot find 2 suitable PUBLIC karaoke groups that meet ALL criteria, return fewer URLs or an empty array.
    Quality over quantity - only include groups you are confident are public and karaoke-related.
    `;

    try {
      const performanceSettings = getGeminiPerformanceSettings();
      const model = this.genAI.getGenerativeModel({
        model: getGeminiModel('vision'),
        generationConfig: {
          temperature: performanceSettings.temperature,
          topP: performanceSettings.topP,
          topK: performanceSettings.topK,
          maxOutputTokens: Math.min(performanceSettings.maxTokensPerRequest, 1024), // Limit for JSON response
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

      // Clean the response by removing markdown code blocks and extra whitespace
      let cleanedAnalysis = analysis.trim();

      // Remove markdown code blocks if present
      if (cleanedAnalysis.startsWith('```json') || cleanedAnalysis.startsWith('```')) {
        cleanedAnalysis = cleanedAnalysis.replace(/^```(json)?\s*/, '').replace(/```\s*$/, '');
      }

      // Trim again after removing code blocks
      cleanedAnalysis = cleanedAnalysis.trim();

      // Parse the JSON response
      const urls = JSON.parse(cleanedAnalysis);

      if (Array.isArray(urls)) {
        // Clean URLs by removing query parameters and validate format
        const cleanedUrls = urls
          .map((url) => {
            if (typeof url === 'string') {
              // Remove query parameters
              let cleanUrl = url.includes('?') ? url.split('?')[0] : url;

              // Ensure proper Facebook group URL format
              if (cleanUrl.includes('facebook.com/groups/')) {
                // Extract the group ID and validate it
                const groupIdMatch = cleanUrl.match(/facebook\.com\/groups\/([a-zA-Z0-9._-]+)\/?$/);
                if (groupIdMatch && groupIdMatch[1]) {
                  const groupId = groupIdMatch[1];
                  // Validate group ID format (alphanumeric, dots, hyphens, underscores)
                  if (/^[a-zA-Z0-9._-]+$/.test(groupId) && groupId.length >= 3) {
                    return `https://www.facebook.com/groups/${groupId}`;
                  }
                }
              }
            }
            return null;
          })
          .filter((url) => url !== null);

        this.logger.log(`✅ Gemini selected ${cleanedUrls.length} groups for ${city}, ${state}:`);
        cleanedUrls.forEach((url, index) => {
          this.logger.log(`   ${index + 1}. ${url}`);
        });
        return cleanedUrls.slice(0, 2); // Ensure max 2 groups
      } else {
        this.logger.warn(`⚠️ Unexpected Gemini response format for ${city}, ${state}`);
        return [];
      }
    } catch (error) {
      this.logger.error(`❌ Gemini analysis failed for ${city}, ${state}: ${error.message}`);
      return [];
    }
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
