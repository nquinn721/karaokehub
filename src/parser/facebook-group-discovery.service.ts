import { GoogleGenerativeAI } from '@google/generative-ai';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as fs from 'fs';
import * as path from 'path';
import * as puppeteer from 'puppeteer';
import { Like, Repository } from 'typeorm';
import { getGeminiModel } from '../config/gemini.config';
import { FacebookAuthWebSocketService } from '../websocket/facebook-auth-websocket.service';
import { UrlToParse } from './url-to-parse.entity';

export interface LocationData {
  [state: string]: Array<{
    city: string;
    lat: number;
    lng: number;
  }>;
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
  private readonly maxConcurrentWorkers = 3; // Limit concurrent Puppeteer instances
  private readonly searchDelay = 2000; // Delay between searches to avoid rate limiting
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
    lat: number;
    lng: number;
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
      // Get Facebook credentials from admin via WebSocket
      const requestId = `group-search-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const credentials = await this.facebookAuthService.requestCredentials(requestId);

      if (!credentials) {
        throw new Error('No Facebook credentials provided by admin');
      }

      // Navigate to Facebook and login
      await this.loginToFacebook(page, credentials);

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
    
    Please identify the TOP 2 public karaoke groups from this screenshot that meet these criteria:
    1. Must be PUBLIC groups (not private)
    2. Must be related to karaoke (singing, music venues, karaoke nights, etc.)
    3. Must be relevant to ${city} or ${state} area
    4. Should have reasonable member counts (prefer groups with more members)
    5. Avoid duplicate or very similar groups
    
    From the screenshot, extract the Facebook group URLs or names for the TOP 2 groups that best match these criteria.
    Focus on groups that appear to be active karaoke communities.
    
    Return your response as a JSON array of group URLs or identifiers:
    ["https://www.facebook.com/groups/group1", "https://www.facebook.com/groups/group2"]
    
    If you cannot find 2 suitable public karaoke groups, return fewer URLs or an empty array.
    `;

    try {
      const model = this.genAI.getGenerativeModel({
        model: getGeminiModel('vision'),
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

      // Parse the JSON response
      const urls = JSON.parse(analysis);

      if (Array.isArray(urls)) {
        this.logger.log(`✅ Gemini selected ${urls.length} groups for ${city}, ${state}`);
        return urls.slice(0, 2); // Ensure max 2 groups
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
   * Save all discovered URLs to the database
   */
  private async saveDiscoveredUrls(results: GroupSearchResult[]): Promise<void> {
    this.logger.log('💾 Saving discovered URLs to database...');

    const allUrls: string[] = [];

    for (const result of results) {
      for (const url of result.groupUrls) {
        if (url && url.includes('facebook.com/groups/')) {
          allUrls.push(url);
        }
      }
    }

    // Remove duplicates
    const uniqueUrls = [...new Set(allUrls)];
    this.logger.log(`📊 Found ${uniqueUrls.length} unique group URLs`);

    // Save to database in batches
    const batchSize = 50;
    for (let i = 0; i < uniqueUrls.length; i += batchSize) {
      const batch = uniqueUrls.slice(i, i + batchSize);

      for (const url of batch) {
        try {
          // Check if URL already exists
          const existing = await this.urlToParseRepository.findOne({ where: { url } });

          if (!existing) {
            await this.urlToParseRepository.save({
              url,
              name: null,
              isApproved: false,
              hasBeenParsed: false,
            });
            this.logger.log(`✅ Saved new URL: ${url}`);
          } else {
            this.logger.log(`⏭️ URL already exists: ${url}`);
          }
        } catch (error) {
          this.logger.error(`❌ Failed to save URL ${url}: ${error.message}`);
        }
      }
    }

    this.logger.log(`✅ Finished saving URLs to database`);
  }

  /**
   * Load locations data from JSON file
   */
  private loadLocationsData(): LocationData {
    const locationsPath = path.join(process.cwd(), 'data', 'locations.json');
    const locationsData = JSON.parse(fs.readFileSync(locationsPath, 'utf8'));
    return locationsData;
  }

  /**
   * Flatten locations data into a single array with state info
   */
  private flattenLocations(
    locations: LocationData,
  ): Array<{ city: string; state: string; lat: number; lng: number }> {
    const flattened: Array<{ city: string; state: string; lat: number; lng: number }> = [];

    for (const [state, cities] of Object.entries(locations)) {
      for (const cityData of cities) {
        flattened.push({
          city: cityData.city,
          state,
          lat: cityData.lat,
          lng: cityData.lng,
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
