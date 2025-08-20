import { GoogleGenerativeAI } from '@google/generative-ai';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as fs from 'fs';
import * as path from 'path';
import * as puppeteer from 'puppeteer';
import * as sharp from 'sharp';
import { Repository } from 'typeorm';
import { Worker } from 'worker_threads';
import { getGeminiModel, getGeminiPerformanceSettings } from '../config/gemini.config';
import { GeocodingService } from '../geocoding/geocoding.service';
import { KaraokeWebSocketGateway } from '../websocket/websocket.gateway';
import { ParsedSchedule, ParseStatus } from './parsed-schedule.entity';
import { UrlToParse } from './url-to-parse.entity';

export interface FacebookPageData {
  url: string;
  type: 'group' | 'profile' | 'page';
  screenshots: string[]; // base64 encoded images
  htmlContent: string;
  extractedText: string;
  posts: FacebookPost[];
  imageUrls?: string[]; // Added for media extraction
}

export interface FacebookPost {
  author: string;
  content: string;
  timestamp?: string;
  images?: string[]; // base64 encoded
  url?: string;
}

export interface ParsedFacebookData {
  vendor: {
    name: string;
    website: string;
    description: string;
    confidence: number;
  };
  djs: Array<{
    name: string;
    confidence: number;
    context: string;
  }>;
  venues?: Array<{
    name: string;
    address?: string;
    city?: string;
    state?: string;
    confidence: number;
  }>;
  shows: Array<{
    venue: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    lat?: number;
    lng?: number;
    venuePhone?: string;
    venueWebsite?: string;
    time: string; // Required, not optional
    startTime?: string;
    endTime?: string;
    day?: string;
    djName?: string;
    description?: string;
    source?: string;
    confidence: number;
  }>;
  rawData: {
    url: string;
    title: string;
    content: string;
    parsedAt: Date;
  };
}

@Injectable()
export class FacebookParserService {
  private readonly logger = new Logger(FacebookParserService.name);
  private readonly genAI: GoogleGenerativeAI;
  private currentParsingLogs: Array<{
    timestamp: Date;
    level: 'info' | 'success' | 'warning' | 'error';
    message: string;
  }> = [];
  private isLoggedIn = false;
  private browser: puppeteer.Browser | null = null;
  private page: puppeteer.Page | null = null;
  private readonly sessionDir = path.join(process.cwd(), 'facebook-session');
  private readonly cookiesPath = path.join(this.sessionDir, 'cookies.json');

  constructor(
    private readonly configService: ConfigService,
    private readonly webSocketGateway: KaraokeWebSocketGateway,
    private readonly geocodingService: GeocodingService,
    @InjectRepository(ParsedSchedule)
    private parsedScheduleRepository: Repository<ParsedSchedule>,
    @InjectRepository(UrlToParse)
    private urlToParseRepository: Repository<UrlToParse>,
  ) {
    const geminiApiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!geminiApiKey) {
      throw new Error('GEMINI_API_KEY is required');
    }
    this.genAI = new GoogleGenerativeAI(geminiApiKey);

    // Ensure session directory exists
    this.ensureSessionDir();
  }

  /**
   * Enhanced logging method that logs both to console and broadcasts to WebSocket clients
   */
  private logAndBroadcast(
    message: string,
    level: 'info' | 'success' | 'warning' | 'error' = 'info',
  ) {
    // Log to console using NestJS logger
    switch (level) {
      case 'success':
      case 'info':
        this.logger.log(message);
        break;
      case 'warning':
        this.logger.warn(message);
        break;
      case 'error':
        this.logger.error(message);
        break;
    }

    // Capture log for parsed_schedule database storage
    this.currentParsingLogs.push({
      timestamp: new Date(),
      level,
      message,
    });

    // Broadcast to WebSocket clients
    if (this.webSocketGateway) {
      try {
        this.webSocketGateway.broadcastParserLog(message, level);
      } catch (wsError) {
        // Ignore WebSocket errors in test environments
        console.log(`WebSocket broadcast skipped: ${wsError.message}`);
      }
    }
  }

  /**
   * Ensure session directory exists for storing cookies
   */
  private ensureSessionDir(): void {
    try {
      if (!fs.existsSync(this.sessionDir)) {
        fs.mkdirSync(this.sessionDir, { recursive: true });
        this.logAndBroadcast(`📁 Created session directory: ${this.sessionDir}`, 'info');
      }
    } catch (error) {
      this.logAndBroadcast(`Failed to create session directory: ${error.message}`, 'warning');
    }
  }

  /**
   * Save cookies to maintain session
   */
  private async saveCookies(): Promise<void> {
    try {
      if (!this.page) return;

      const cookies = await this.page.cookies();
      fs.writeFileSync(this.cookiesPath, JSON.stringify(cookies, null, 2));
      this.logAndBroadcast(`🍪 Saved ${cookies.length} cookies for session persistence`, 'info');
    } catch (error) {
      this.logAndBroadcast(`Failed to save cookies: ${error.message}`, 'warning');
    }
  }

  /**
   * Load saved cookies to restore session
   */
  private async loadCookies(): Promise<boolean> {
    try {
      if (!fs.existsSync(this.cookiesPath)) {
        this.logAndBroadcast('📝 No saved cookies found - fresh login required', 'info');
        return false;
      }

      const cookiesString = fs.readFileSync(this.cookiesPath, 'utf8');
      const cookies = JSON.parse(cookiesString);

      if (!this.page) return false;

      await this.page.setCookie(...cookies);
      this.logAndBroadcast(`🍪 Loaded ${cookies.length} saved cookies`, 'info');

      // Test if session is still valid
      await this.page.goto('https://www.facebook.com', {
        waitUntil: 'domcontentloaded',
        timeout: 15000,
      });

      await new Promise((resolve) => setTimeout(resolve, 2000));

      const currentUrl = this.page.url();
      if (!currentUrl.includes('/login')) {
        this.logAndBroadcast('✅ Session restored successfully - already logged in!', 'success');
        this.isLoggedIn = true;
        return true;
      } else {
        this.logAndBroadcast('⚠️ Saved session expired - fresh login required', 'warning');
        return false;
      }
    } catch (error) {
      this.logAndBroadcast(`Failed to load cookies: ${error.message}`, 'warning');
      return false;
    }
  }

  /**
   * Initialize Puppeteer browser with Facebook-optimized settings
   */
  async initializeBrowser(): Promise<void> {
    if (this.browser) {
      return; // Already initialized
    }

    this.logAndBroadcast('🚀 Initializing Facebook parser browser (HEADLESS MODE)...');

    try {
      this.browser = await puppeteer.launch({
        headless: true, // Run headless for production security
        devtools: false, // Don't open devtools automatically
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-blink-features=AutomationControlled',
          '--disable-web-security',
          '--allow-running-insecure-content',
          '--disable-features=VizDisplayCompositor',
          '--no-first-run',
          '--disable-extensions',
          '--window-size=1200,900',
          '--start-maximized',
          '--disable-infobars',
          '--disable-notifications',
        ],
        defaultViewport: { width: 1200, height: 900 }, // Set specific viewport
        timeout: 60000,
        slowMo: 150, // Add delay between actions to seem more human and watch easier
      });

      this.logAndBroadcast('✅ Browser launched successfully', 'success');

      this.page = await this.browser.newPage();
      this.logAndBroadcast('📄 New page created', 'info');

      // Set realistic user agent and headers
      await this.page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      );

      await this.page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        DNT: '1',
        Connection: 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      });

      // Remove automation indicators
      await this.page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', {
          get: () => undefined,
        });

        // Remove automation flags
        delete (window as any).cdc_adoQpoasnfa76pfcZLmcfl_Array;
        delete (window as any).cdc_adoQpoasnfa76pfcZLmcfl_Promise;
        delete (window as any).cdc_adoQpoasnfa76pfcZLmcfl_Symbol;

        (window as any).chrome = {
          runtime: {},
        };

        // Override permissions
        const originalQuery = window.navigator.permissions.query;
        window.navigator.permissions.query = (parameters) =>
          parameters.name === 'notifications'
            ? Promise.resolve({ state: Notification.permission } as any)
            : originalQuery(parameters);
      });

      this.logAndBroadcast('Facebook parser browser initialized successfully', 'success');
    } catch (error) {
      this.logAndBroadcast(`Failed to initialize browser: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Set zoom level to get more content per scroll
   */
  async setOptimalZoom(): Promise<void> {
    try {
      this.logAndBroadcast('🔍 Setting optimal zoom level for maximum content...', 'info');

      // Method 1: Browser-level zoom (most reliable)
      await this.page!.evaluate(() => {
        (document.body.style as any).zoom = '0.6'; // 60% zoom for better readability
      });

      // Method 2: CSS transform as backup
      await this.page!.addStyleTag({
        content: `
          html {
            transform: scale(0.6) !important;
            transform-origin: 0 0 !important;
          }
          body {
            width: 166% !important; /* Compensate for 60% zoom */
            height: 166% !important;
          }
        `,
      });

      // Method 3: Viewport zoom using Chrome DevTools (alternative approach)
      try {
        const client = await this.page!.target().createCDPSession();
        await client.send('Emulation.setDeviceMetricsOverride', {
          width: 1920,
          height: 1080,
          deviceScaleFactor: 0.6,
          mobile: false,
        });
        this.logAndBroadcast('✅ CDP device metrics override set successfully', 'success');
      } catch (cdpError) {
        this.logAndBroadcast('CDP zoom failed, using CSS zoom', 'warning');
      }

      this.logAndBroadcast(
        '✅ Zoom level set to 60% - will see 2.8x more content per scroll!',
        'success',
      );

      // Wait for zoom to take effect
      await new Promise((resolve) => setTimeout(resolve, 1500));
    } catch (error) {
      this.logAndBroadcast(`Zoom setting failed: ${error.message}`, 'warning');
    }
  }

  /**
   * Login to Facebook using stored credentials
   */
  async loginToFacebook(): Promise<void> {
    if (this.isLoggedIn) {
      this.logAndBroadcast('Already logged in to Facebook', 'info');
      return;
    }

    if (!this.page) {
      await this.initializeBrowser();
    }

    // Try to restore previous session first
    this.logAndBroadcast('🔄 Attempting to restore previous Facebook session...', 'info');
    const sessionRestored = await this.loadCookies();
    if (sessionRestored) {
      return; // Successfully restored session
    }

    let email = this.configService.get<string>('FACEBOOK_EMAIL');
    let password = this.configService.get<string>('FACEBOOK_PASSWORD');

    this.logAndBroadcast(
      `🔍 Facebook credentials check: Email=${email ? 'SET' : 'MISSING'}, Password=${password ? 'SET' : 'MISSING'}`,
      'info',
    );

    if (!email || !password || email.includes('example.com')) {
      this.logAndBroadcast('🔗 No valid credentials found, requesting from admin UI...');
      this.logAndBroadcast('📱 PLEASE CHECK THE ADMIN PARSER PAGE FOR THE LOGIN MODAL');

      // Navigate to login page first and wait there
      this.logAndBroadcast('🌐 Navigating to Facebook login page...');
      await this.page!.goto('https://www.facebook.com/login', {
        waitUntil: 'domcontentloaded',
        timeout: 20000,
      });

      await this.page!.waitForSelector('#email', { timeout: 8000 });
      this.logAndBroadcast('📋 Login page loaded, waiting for credentials from admin...');

      // Request credentials from admin UI via WebSocket
      const requestId = `fb-login-${Date.now()}`;
      this.logAndBroadcast(`🚨 MODAL SHOULD APPEAR NOW - Request ID: ${requestId}`);

      const credentialsRequest = await this.webSocketGateway.requestFacebookCredentials(requestId);

      if (!credentialsRequest) {
        const errorMsg = 'Facebook login credentials not provided by admin';
        this.logAndBroadcast(`❌ ${errorMsg}`, 'error');
        throw new Error(
          'Facebook login cancelled or timed out. Please provide credentials through the admin panel.',
        );
      }

      email = credentialsRequest.email;
      password = credentialsRequest.password;
      this.logAndBroadcast('✅ Credentials received from admin UI, proceeding with login...');

      // Now fill the form with received credentials
      this.logAndBroadcast('📝 Filling credentials...', 'info');
      await this.page!.type('#email', email, { delay: 50 });
      await this.page!.type('#pass', password, { delay: 50 });

      // Submit login
      this.logAndBroadcast('�️ Submitting login...', 'info');
      await Promise.all([
        this.page!.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 20000 }),
        this.page!.click('#loginbutton'),
      ]);
    } else {
      this.logAndBroadcast('🔐 Using credentials from environment variables...', 'info');

      // Navigate to Facebook login page with faster loading
      this.logAndBroadcast('🌐 Navigating to login page...', 'info');
      await this.page!.goto('https://www.facebook.com/login', {
        waitUntil: 'domcontentloaded', // Faster than networkidle2
        timeout: 20000,
      });

      // Wait for login form and fill quickly
      await this.page!.waitForSelector('#email', { timeout: 8000 });
      this.logAndBroadcast('📝 Filling credentials...', 'info');

      await this.page!.type('#email', email, { delay: 50 }); // Faster typing
      await this.page!.type('#pass', password, { delay: 50 });

      // Submit login
      this.logAndBroadcast('🖱️ Submitting login...', 'info');
      await Promise.all([
        this.page!.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 20000 }),
        this.page!.click('#loginbutton'),
      ]);
    }

    this.logAndBroadcast('🔐 Login form submitted, verifying...', 'info');

    try {
      // Quick login verification
      const currentUrl = this.page!.url();
      if (currentUrl.includes('facebook.com') && !currentUrl.includes('login')) {
        this.isLoggedIn = true;
        this.logAndBroadcast('✅ Successfully logged in to Facebook', 'success');

        // Save cookies for future sessions
        await this.saveCookies();

        // Notify admin UI of successful login
        this.webSocketGateway.notifyFacebookLoginResult(
          'current-login',
          true,
          'Facebook login successful! Session saved.',
        );

        // Quick popup dismissal
        await this.quickPopupDismissal();
      } else {
        const errorMsg = 'Login failed - still on login page';
        this.webSocketGateway.notifyFacebookLoginResult('current-login', false, errorMsg);
        throw new Error(errorMsg);
      }
    } catch (error) {
      this.logAndBroadcast(`Facebook login failed: ${error.message}`, 'error');

      // Notify admin UI of login failure
      this.webSocketGateway.notifyFacebookLoginResult(
        'current-login',
        false,
        `Login failed: ${error.message}`,
      );

      throw error;
    }
  }

  /**
   * Quick popup dismissal without long waits
   */
  private async quickPopupDismissal(): Promise<void> {
    try {
      // Short wait for any popups
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Try to dismiss common popups quickly
      const quickSelectors = [
        '[role="dialog"] [aria-label*="Close"]',
        '[aria-label*="Not Now"]',
        '[aria-label*="Skip"]',
      ];

      for (const selector of quickSelectors) {
        try {
          const element = await this.page!.$(selector);
          if (element) {
            await element.click();
            this.logAndBroadcast(`Dismissed popup: ${selector}`, 'info');
            break; // Exit after first successful dismissal
          }
        } catch (e) {
          // Continue to next selector
        }
      }

      // Single escape key press for any remaining dialogs
      await this.page!.keyboard.press('Escape');
    } catch (error) {
      this.logAndBroadcast(`Popup dismissal error: ${error.message}`, 'warning');
    }
  }

  /**
   * Handle any dialogs or popups that appear after login (DEPRECATED - use quickPopupDismissal)
   */
  private async handlePostLoginDialogs(): Promise<void> {
    try {
      // Wait a bit for any dialogs to appear
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Look for and dismiss common post-login dialogs
      const dialogSelectors = [
        '[role="dialog"] [aria-label*="Close"]',
        '[role="dialog"] [aria-label*="Dismiss"]',
        '[data-testid="cookie-policy-manage-dialog"] [aria-label*="Close"]',
        '[aria-label*="Not Now"]',
        '[aria-label*="Skip"]',
      ];

      for (const selector of dialogSelectors) {
        try {
          const element = await this.page!.$(selector);
          if (element) {
            await element.click();
            this.logAndBroadcast(`Dismissed dialog with selector: ${selector}`, 'info');
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        } catch (e) {
          // Ignore errors - dialog might not exist
        }
      }

      // Handle notification popups specifically
      await this.handleNotificationPopups();

      // Try pressing Escape key to close any remaining dialogs
      await this.page!.keyboard.press('Escape');
    } catch (error) {
      this.logAndBroadcast(`Error handling post-login dialogs: ${error.message}`, 'warning');
    }
  }

  /**
   * Handle browser notification permission popups quickly
   */
  private async handleNotificationPopups(): Promise<void> {
    try {
      // Quick check for notification popups
      const notificationSelectors = [
        'button[aria-label*="Block"]',
        'button[aria-label*="Not Now"]',
        '[role="dialog"] button[aria-label*="Not Now"]',
      ];

      for (const selector of notificationSelectors) {
        try {
          const element = await this.page!.$(selector);
          if (element) {
            const isVisible = await element.isIntersectingViewport();
            if (isVisible) {
              await element.click();
              this.logAndBroadcast(`Blocked notifications: ${selector}`, 'info');
              return; // Exit after first successful click
            }
          }
        } catch (e) {
          // Continue to next selector
        }
      }

      // Quick escape key press for any remaining popups
      await this.page!.keyboard.press('Escape');
    } catch (error) {
      this.logAndBroadcast(`Quick notification popup handling error: ${error.message}`, 'warning');
    }
  }

  /**
   * Simplified entry point for Facebook parsing that handles session management gracefully
   */
  async parseAndSaveFacebookPage(url: string): Promise<{
    parsedScheduleId: string;
    data: ParsedFacebookData;
    stats: any;
  }> {
    // Clear previous parsing logs for this session
    this.currentParsingLogs = [];
    const startTime = Date.now();

    this.logAndBroadcast(`🎯 Starting Facebook parsing for: ${url}`);

    try {
      // Initialize browser and attempt to restore session
      await this.initializeBrowser();
      
      // Try to restore existing session first
      try {
        const sessionRestored = await this.loadCookies();
        if (sessionRestored) {
          this.logAndBroadcast(`✅ Using existing Facebook session`, 'info');
        } else {
          this.logAndBroadcast(`⚠️ No existing session, will try to login when needed`, 'warning');
        }
      } catch (sessionError) {
        this.logAndBroadcast(`⚠️ Session restoration failed, will try to login when needed`, 'warning');
        // Continue anyway - login will be attempted when needed
      }

      // Use the worker-based parsing method directly
      const parsedData = await this.extractGroupMediaDataWithWorker(url);

      const processingTime = Date.now() - startTime;

      this.logAndBroadcast(
        `Captured ${this.currentParsingLogs.length} parsing logs for database storage`,
        'info',
      );

      // Create and save parsed_schedule
      try {
        this.logAndBroadcast(`💾 Creating parsed_schedule record...`, 'info');
        
        const parsedSchedule = this.parsedScheduleRepository.create({
          url: url,
          rawData: {
            url: url,
            title: `Facebook Group: ${url}`,
            content: `Parsed via Worker-based processing - Found ${parsedData.shows?.length || 0} shows and ${parsedData.djs?.length || 0} DJs`,
            parsedAt: new Date(),
            pageType: 'group',
            showsFound: parsedData.shows?.length || 0,
            djsFound: parsedData.djs?.length || 0,
          },
          aiAnalysis: parsedData,
          status: ParseStatus.PENDING_REVIEW,
          parsingLogs: [...this.currentParsingLogs],
        });

        this.logAndBroadcast(`💾 Saving parsed_schedule to database...`, 'info');
        const savedSchedule = await this.parsedScheduleRepository.save(parsedSchedule);

        this.logAndBroadcast(
          `Successfully saved Facebook parsed data for admin review. ID: ${savedSchedule.id}`,
          'success',
        );

        // Ensure URL name is set after successful parsing
        await this.ensureUrlNameIsSet(url, parsedData);

        return {
          parsedScheduleId: savedSchedule.id,
          data: parsedData,
          stats: {
            showsFound: parsedData.shows?.length || 0,
            djsFound: parsedData.djs?.length || 0,
            vendorName: parsedData.vendor?.name || 'Facebook Page',
            pageType: 'group',
            processingMethod: 'Worker-based',
            processingTime,
          },
        };
      } catch (dbError) {
        this.logAndBroadcast(`❌ Database save failed: ${dbError.message}`, 'error');
        throw dbError;
      }
    } catch (error) {
      this.logAndBroadcast(`💥 Facebook parsing failed: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Parse a Facebook group or page
   */
  async parseFacebookPage(url: string): Promise<{
    parsedScheduleId: string;
    data: ParsedFacebookData;
    stats: any;
  }> {
    // Clear previous parsing logs for this session
    this.currentParsingLogs = [];
    const startTime = Date.now();

    this.logAndBroadcast(`🎯 Starting Facebook parsing for: ${url}`);

    // Check credentials first before initializing browser
    const email = this.configService.get<string>('FACEBOOK_EMAIL');
    const password = this.configService.get<string>('FACEBOOK_PASSWORD');

    if (!email || !password || email.includes('example.com')) {
      this.logAndBroadcast('❌ Facebook credentials not configured properly', 'warning');
      throw new Error(`Facebook parsing requires login credentials. Please set:
        FACEBOOK_EMAIL=your-actual-email@gmail.com
        FACEBOOK_PASSWORD=your-actual-password
        
        Current values: 
        FACEBOOK_EMAIL=${email || 'NOT SET'}
        FACEBOOK_PASSWORD=${password ? 'SET' : 'NOT SET'}
        
        Update your .env file with real Facebook credentials to enable enhanced parsing with ~20 pages of scrolling and photo collection.`);
    }

    try {
      // Ensure we're logged in first
      await this.loginToFacebook();

      this.logAndBroadcast(`📍 Starting streamlined navigation to: ${url}`, 'info');

      // Simple, direct navigation approach
      try {
        this.logAndBroadcast('� Navigating directly to target URL...', 'info');

        await this.page!.goto(url, {
          waitUntil: 'domcontentloaded', // Faster than networkidle2
          timeout: 20000, // Reduced timeout
        });

        // Short wait for content to load
        await new Promise((resolve) => setTimeout(resolve, 3000));

        const currentUrl = this.page!.url();
        this.logAndBroadcast(`📊 Landed on: ${currentUrl}`, 'info');

        // Quick popup handling
        await this.handleNotificationPopups();

        // Check if we're on a valid Facebook page
        if (
          currentUrl.includes('/groups/') ||
          currentUrl.includes('/pages/') ||
          currentUrl.includes('/pg/') ||
          (currentUrl.includes('facebook.com/') && !currentUrl.includes('/login'))
        ) {
          this.logAndBroadcast('✅ Successfully navigated to Facebook page', 'info');

          // If redirected to home, try direct group navigation
          if (currentUrl.includes('/home') || currentUrl.includes('/feed')) {
            const groupId = url.match(/\/groups\/(\d+)/)?.[1];
            if (groupId) {
              this.logAndBroadcast(`🔄 Redirected to feed, trying direct group URL...`, 'info');
              await this.page!.goto(`https://www.facebook.com/groups/${groupId}`, {
                waitUntil: 'domcontentloaded',
                timeout: 15000,
              });
              await new Promise((resolve) => setTimeout(resolve, 2000));
            }
          }
        } else {
          throw new Error(`Navigation failed - unexpected URL: ${currentUrl}`);
        }
      } catch (navError) {
        this.logAndBroadcast(`Navigation failed: ${navError.message}`, 'error');
        throw navError;
      }

      // Quick final check and proceed to extraction
      const finalUrl = this.page!.url();
      this.logAndBroadcast(`🔍 Ready to extract from: ${finalUrl}`, 'info');

      // Determine page type and start extraction
      const pageType = this.determineFacebookPageType(finalUrl);
      this.logAndBroadcast(`📝 Detected page type: ${pageType}`, 'info');

      // Extract data based on page type using appropriate method
      let parsedData: ParsedFacebookData;
      switch (pageType) {
        case 'group':
          this.logAndBroadcast(
            `🏢 Starting GROUP MEDIA data extraction with WORKER (Recent Media focus)...`,
            'info',
          );
          // Use worker-based extraction directly for groups
          parsedData = await this.extractGroupMediaDataWithWorker(url); // Use original URL, not finalUrl
          this.logAndBroadcast(`✅ Worker-based group parsing completed successfully`, 'success');
          this.logAndBroadcast(
            `📊 Found ${parsedData.shows?.length || 0} shows and ${parsedData.djs?.length || 0} DJs`,
            'info',
          );
          break;
        case 'profile':
          this.logAndBroadcast(`👤 Starting PROFILE data extraction...`, 'info');
          const profileData = await this.extractProfileData(finalUrl);
          // Parse the extracted data with Gemini for non-group pages
          try {
            this.logAndBroadcast(`🧠 Starting Gemini parsing for profile...`, 'info');
            parsedData = await this.parseWithGemini(profileData);
            this.logAndBroadcast(`✅ Gemini parsing completed successfully`, 'success');
            this.logAndBroadcast(
              `📊 Found ${parsedData.shows?.length || 0} shows and ${parsedData.djs?.length || 0} DJs`,
              'info',
            );
          } catch (geminiError) {
            this.logAndBroadcast(`❌ Gemini parsing failed: ${geminiError.message}`, 'error');
            throw geminiError;
          }
          break;
        case 'page':
          this.logAndBroadcast(`📄 Starting PAGE data extraction...`, 'info');
          const pageData = await this.extractPageData(finalUrl);
          // Parse the extracted data with Gemini for non-group pages
          try {
            this.logAndBroadcast(`🧠 Starting Gemini parsing for page...`, 'info');
            parsedData = await this.parseWithGemini(pageData);
            this.logAndBroadcast(`✅ Gemini parsing completed successfully`, 'success');
            this.logAndBroadcast(
              `📊 Found ${parsedData.shows?.length || 0} shows and ${parsedData.djs?.length || 0} DJs`,
              'info',
            );
          } catch (geminiError) {
            this.logAndBroadcast(`❌ Gemini parsing failed: ${geminiError.message}`, 'error');
            throw geminiError;
          }
          break;
        default:
          this.logAndBroadcast(`❓ Starting GENERIC data extraction...`, 'info');
          const genericData = await this.extractGenericData(finalUrl);
          // Parse the extracted data with Gemini for non-group pages
          try {
            this.logAndBroadcast(`🧠 Starting Gemini parsing for generic page...`, 'info');
            parsedData = await this.parseWithGemini(genericData);
            this.logAndBroadcast(`✅ Gemini parsing completed successfully`, 'success');
            this.logAndBroadcast(
              `📊 Found ${parsedData.shows?.length || 0} shows and ${parsedData.djs?.length || 0} DJs`,
              'info',
            );
          } catch (geminiError) {
            this.logAndBroadcast(`❌ Gemini parsing failed: ${geminiError.message}`, 'error');
            throw geminiError;
          }
      }

      const processingTime = Date.now() - startTime;

      this.logAndBroadcast(
        `Captured ${this.currentParsingLogs.length} parsing logs for database storage`,
        'info',
      );

      // Create and save parsed_schedule
      try {
        this.logAndBroadcast(`💾 Creating parsed_schedule record...`, 'info');

        const parsedSchedule = this.parsedScheduleRepository.create({
          url: url,
          rawData: {
            url: url,
            title: `Facebook ${pageType}: ${url}`,
            content: `Parsed via ${pageType === 'group' ? 'Worker-based' : 'Gemini'} processing`,
            parsedAt: new Date(),
            pageType: pageType,
            showsFound: parsedData.shows?.length || 0,
            djsFound: parsedData.djs?.length || 0,
          },
          aiAnalysis: parsedData,
          status: ParseStatus.PENDING_REVIEW,
          parsingLogs: [...this.currentParsingLogs],
        });

        this.logAndBroadcast(`💾 Saving parsed_schedule to database...`, 'info');
        const savedSchedule = await this.parsedScheduleRepository.save(parsedSchedule);

        this.logAndBroadcast(
          `Successfully saved Facebook parsed data for admin review. ID: ${savedSchedule.id}`,
          'success',
        );

        // Ensure URL name is set after successful parsing
        await this.ensureUrlNameIsSet(url, parsedData);

        return {
          parsedScheduleId: savedSchedule.id,
          data: parsedData,
          stats: {
            showsFound: parsedData.shows?.length || 0,
            djsFound: parsedData.djs?.length || 0,
            vendorName: parsedData.vendor?.name || 'Facebook Page',
            pageType: pageType,
            processingMethod: pageType === 'group' ? 'Worker-based' : 'Gemini',
            processingTime,
          },
        };
      } catch (dbError) {
        this.logAndBroadcast(`❌ Database save failed: ${dbError.message}`, 'error');
        throw dbError;
      }
    } catch (error) {
      this.logAndBroadcast(`💥 Facebook parsing failed: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Determine the type of Facebook page
   */
  private determineFacebookPageType(url: string): 'group' | 'profile' | 'page' | 'unknown' {
    if (url.includes('/groups/')) return 'group';
    if (url.includes('/pages/') || url.includes('/pg/')) return 'page';
    if (url.match(/facebook\.com\/[a-zA-Z0-9.-]+$/)) return 'profile';
    return 'unknown';
  }

  /**
   * Extract media URLs from Facebook group's Recent Media section
   */
  private async extractGroupMediaData(groupUrl: string): Promise<FacebookPageData> {
    this.logAndBroadcast(
      '📸 Starting Facebook group MEDIA extraction (Recent Media section)...',
      'info',
    );

    const screenshots: string[] = [];
    const posts: FacebookPost[] = [];
    const collectedPhotos: string[] = [];

    try {
      // Navigate to the group's media section
      const groupId = groupUrl.match(/\/groups\/([^\/\?]+)/)?.[1];
      if (!groupId) {
        throw new Error('Could not extract group ID from URL');
      }

      const mediaUrl = `https://www.facebook.com/groups/${groupId}/media`;
      this.logAndBroadcast(`📍 Navigating to media section: ${mediaUrl}`, 'info');

      await this.page!.goto(mediaUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 20000,
      });

      // Wait for media section to load
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Set optimal zoom for maximum content visibility
      await this.setOptimalZoom();

      // Take initial screenshot of media section
      const initialScreenshot = await this.captureScreenshot();
      screenshots.push(initialScreenshot);

      this.logAndBroadcast('🚀 Starting media collection with zoomed out view...', 'info');

      // Scroll through media section (fewer scrolls since we're targeting images)
      let scrollCount = 0;
      const maxScrolls = 5; // Back to 5 for comprehensive data collection
      let lastHeight = 0;
      let noNewContentCount = 0;

      while (scrollCount < maxScrolls && noNewContentCount < 3) {
        scrollCount++;
        this.logAndBroadcast(
          `📄 Media scroll ${scrollCount}/${maxScrolls} (collecting image URLs)...`,
          'info',
        );

        // Get current height before scrolling
        const currentHeight = await this.page!.evaluate(() => document.body.scrollHeight);

        // Scroll to load more media
        await this.page!.evaluate(() => {
          window.scrollBy(0, window.innerHeight * 1.2);
        });

        // Wait for new media to load (2 seconds)
        this.logAndBroadcast(`⏳ Waiting 2 seconds for images to load...`, 'info');
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // Additional wait for images to actually finish loading
        await this.page!.waitForFunction(
          () => {
            const images = document.querySelectorAll('img[src*="scontent"], img[src*="fbcdn"]');
            const loadedImages = Array.from(images).filter((img) => {
              const imgElement = img as HTMLImageElement;
              return imgElement.complete && imgElement.naturalHeight > 0;
            });
            return loadedImages.length === images.length || images.length === 0;
          },
          { timeout: 3000 },
        ).catch(() => {
          // If timeout, continue anyway - some images might be lazy loaded
          this.logAndBroadcast('⚠️ Image loading timeout, continuing...', 'warning');
        });

        // Log how many images are now visible
        const imageCount = await this.page!.evaluate(() => {
          const images = document.querySelectorAll('img[src*="scontent"], img[src*="fbcdn"]');
          return images.length;
        });

        this.logAndBroadcast(
          `📷 Images loading complete for scroll ${scrollCount} (${imageCount} images visible)`,
          'info',
        );

        // Check if new content loaded
        const newHeight = await this.page!.evaluate(() => document.body.scrollHeight);

        if (newHeight === lastHeight) {
          noNewContentCount++;
          this.logAndBroadcast(`⏸️ No new media (${noNewContentCount}/3)`, 'info');
        } else {
          noNewContentCount = 0;
          lastHeight = newHeight;
          this.logAndBroadcast(`✅ New media loaded, height: ${newHeight}`, 'info');
        }

        // Take screenshot every 2 scrolls
        if (scrollCount % 2 === 0) {
          const scrollScreenshot = await this.captureScreenshot();
          screenshots.push(scrollScreenshot);
        }
      }

      this.logAndBroadcast(`📊 Media scrolling complete! Now extracting image URLs...`, 'info');

      // Extract all image URLs from the media section
      const mediaImages = await this.page!.evaluate(() => {
        const images = document.querySelectorAll('img[src*="scontent"], img[src*="fbcdn"]');
        const imageUrls: string[] = [];

        images.forEach((img) => {
          const src = img.getAttribute('src');
          if (
            src &&
            (src.includes('scontent') || src.includes('fbcdn')) &&
            !src.includes('emoji') &&
            !src.includes('profile_pic') &&
            src.startsWith('http') // Ensure it's a valid HTTP URL
          ) {
            // Validate URL format
            try {
              new URL(src);
              imageUrls.push(src); // Keep original URL
            } catch (urlError) {
              this.logAndBroadcast(`Invalid URL skipped: ${src}`, 'warning');
            }
          }
        });

        // Remove duplicates and filter out very small images (likely icons)
        const uniqueUrls = [...new Set(imageUrls)];
        return uniqueUrls.filter((url) => {
          // Skip very small images by checking URL patterns
          return !url.includes('safe_image') && !url.includes('60x60');
        });
      });

      this.logAndBroadcast(`🖼️ Found ${mediaImages.length} image URLs from media section`, 'info');

      // Convert image URLs to posts format for AI processing
      mediaImages.forEach((imageUrl, index) => {
        posts.push({
          author: 'Media Post',
          content: `Image ${index + 1}`,
          timestamp: '',
          images: [imageUrl],
          url: imageUrl,
        });
      });

      collectedPhotos.push(...mediaImages);

      // Get final HTML content
      const htmlContent = await this.page!.content();
      const extractedText = await this.page!.evaluate(() => document.body.innerText);

      this.logAndBroadcast(
        `✨ Media extraction complete:
        - Image URLs: ${collectedPhotos.length}
        - Screenshots: ${screenshots.length}
        - Media posts: ${posts.length}
        - Scrolls: ${scrollCount}`,
        'info',
      );

      return {
        url: mediaUrl,
        type: 'group',
        screenshots,
        htmlContent,
        extractedText,
        posts,
        imageUrls: collectedPhotos, // Add the collected image URLs
      };
    } catch (error) {
      this.logAndBroadcast(`💥 Media extraction failed: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Extract data from Facebook groups with improved timing and error handling
   */
  private async extractGroupData(url: string): Promise<FacebookPageData> {
    this.logAndBroadcast('🏢 Starting streamlined Facebook group data extraction...', 'info');

    const screenshots: string[] = [];
    const posts: FacebookPost[] = [];
    const collectedPhotos: string[] = [];

    try {
      // Wait for page to fully load before starting
      this.logAndBroadcast('⏳ Waiting for group page to load completely...', 'info');
      await this.page!.waitForSelector(
        '[role="main"], [data-testid="page-info"], #m_group_stories_container',
        {
          timeout: 15000,
        },
      );

      // Set optimal zoom for maximum content visibility
      await this.setOptimalZoom();

      // Take initial screenshot (zoomed out view)
      const initialScreenshot = await this.captureScreenshot();
      screenshots.push(initialScreenshot);

      this.logAndBroadcast('🚀 Starting focused content scrolling with zoomed out view...', 'info');

      // Simplified scrolling with better timing and zoom optimization
      let scrollCount = 0;
      const maxScrolls = 15; // Back to 15 for comprehensive data collection
      let lastHeight = 0;
      let noNewContentCount = 0;

      while (scrollCount < maxScrolls && noNewContentCount < 3) {
        scrollCount++;
        this.logAndBroadcast(
          `📄 Scroll ${scrollCount}/${maxScrolls} (zoomed out for 2.8x more content)...`,
          'info',
        );

        // Get current height before scrolling
        const currentHeight = await this.page!.evaluate(() => document.body.scrollHeight);

        // Larger scroll distance since we're zoomed out
        await this.page!.evaluate(() => {
          // Scroll by 120% of viewport height to take advantage of zoom
          window.scrollBy(0, window.innerHeight * 1.2);
        });

        // Shorter wait time for faster operation
        await new Promise((resolve) => setTimeout(resolve, 1200)); // Even faster since more content is visible

        // Check if new content loaded
        const newHeight = await this.page!.evaluate(() => document.body.scrollHeight);

        if (newHeight === lastHeight) {
          noNewContentCount++;
          this.logAndBroadcast(`⏸️ No new content (${noNewContentCount}/3)`, 'info');
        } else {
          noNewContentCount = 0;
          lastHeight = newHeight;
          this.logAndBroadcast(
            `✅ New content loaded, height: ${newHeight} (zoom advantage!)`,
            'info',
          );
        }

        // Take screenshot every 3 scrolls
        if (scrollCount % 3 === 0) {
          const scrollScreenshot = await this.captureScreenshot();
          screenshots.push(scrollScreenshot);
        }

        // Quick photo collection
        try {
          const photosInViewport = await this.extractPhotosFromViewport();
          collectedPhotos.push(...photosInViewport);
        } catch (photoError) {
          this.logAndBroadcast(`Photo extraction error: ${photoError.message}`, 'warning');
        }
      }

      this.logAndBroadcast(
        `✅ Scrolling complete! Collected ${collectedPhotos.length} photos in ${scrollCount} scrolls`,
        'info',
      );

      // Extract posts with improved selectors and error handling
      this.logAndBroadcast('� Extracting posts from current page content...', 'info');

      const extractedPosts = await this.page!.evaluate(() => {
        const posts = [];

        // More comprehensive post selectors for Facebook groups
        const postSelectors = [
          '[data-testid="story-body"]',
          '[role="article"]',
          '[data-pagelet*="FeedUnit"]',
          '[data-testid="story-content"]',
          '.userContentWrapper',
          '.fbUserContent',
        ];

        let allPostElements = [];

        // Collect all post elements from different selectors
        postSelectors.forEach((selector) => {
          const elements = document.querySelectorAll(selector);
          allPostElements.push(...Array.from(elements));
        });

        // Remove duplicates
        const uniquePosts = [...new Set(allPostElements)];

        this.logger?.log(`Found ${uniquePosts.length} potential post elements`);

        uniquePosts.forEach((postEl, index) => {
          if (index >= 50) return; // Limit to 50 posts for faster processing

          try {
            const post: any = {
              author: '',
              content: '',
              timestamp: '',
              images: [],
            };

            // Extract author with fallback selectors
            const authorSelectors = [
              '[data-testid="story-subtitle"] strong a',
              '[data-testid="post_author_name"]',
              'strong a[role="link"]',
              'h3 strong a',
              '.fwb a',
              '.profileLink',
            ];

            for (const selector of authorSelectors) {
              const authorEl = postEl.querySelector(selector);
              if (authorEl?.textContent?.trim()) {
                post.author = authorEl.textContent.trim();
                break;
              }
            }

            // Extract content with fallback selectors
            const contentSelectors = [
              '[data-testid="post_message"]',
              '[data-testid="story-subtitle"] + div [dir="auto"]',
              '.userContent',
              '.text_exposed_root',
              '[data-testid="story-body"] [dir="auto"]',
            ];

            for (const selector of contentSelectors) {
              const contentEl = postEl.querySelector(selector);
              if (contentEl?.textContent?.trim()) {
                post.content = contentEl.textContent.trim();
                break;
              }
            }

            for (const selector of contentSelectors) {
              const contentEl = postEl.querySelector(selector);
              if (contentEl && !post.content) {
                post.content = contentEl.textContent?.trim() || '';
                break;
              }
            }

            // Extract timestamp with multiple selectors
            const timeSelectors = [
              'time',
              '[data-testid="story-subtitle"] abbr',
              '.timestampContent',
              'abbr[data-utime]',
            ];

            for (const selector of timeSelectors) {
              const timeEl = postEl.querySelector(selector);
              if (timeEl && !post.timestamp) {
                post.timestamp =
                  timeEl.getAttribute('datetime') ||
                  timeEl.getAttribute('data-utime') ||
                  timeEl.textContent?.trim() ||
                  '';
                break;
              }
            }

            // Extract image URLs from this post
            const imgElements = postEl.querySelectorAll('img[src*="scontent"], img[src*="fbcdn"]');
            imgElements.forEach((img) => {
              const src = img.getAttribute('src');
              if (src && src.includes('scontent') && !src.includes('emoji')) {
                post.images.push(src);
              }
            });

            // Only include posts with substantial content or images
            if ((post.content && post.content.length > 15) || post.images.length > 0) {
              posts.push(post);
            }
          } catch (postError) {
            // Skip problematic posts
            this.logAndBroadcast('Error processing post:', 'warning');
          }
        });

        return posts;
      });

      posts.push(...extractedPosts);

      // Get final HTML content after all scrolling
      const htmlContent = await this.page!.content();

      // Extract all text content
      const extractedText = await this.page!.evaluate(() => {
        return document.body.innerText;
      });

      this.logAndBroadcast(
        `✨ Enhanced extraction complete:
        - Posts: ${posts.length}
        - Screenshots: ${screenshots.length}
        - Photos collected: ${collectedPhotos.length}
        - Scrolls completed: ${scrollCount}`,
        'info',
      );

      return {
        url,
        type: 'group',
        screenshots,
        htmlContent,
        extractedText,
        posts: posts.map((post) => ({
          ...post,
          images: [...(post.images || []), ...collectedPhotos.slice(0, 10)], // Add collected photos to posts
        })),
      };
    } catch (error) {
      this.logAndBroadcast(`💥 Error extracting group data: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Extract data from Facebook profiles
   */
  private async extractProfileData(url: string): Promise<FacebookPageData> {
    this.logAndBroadcast('Extracting Facebook profile data...', 'info');

    const screenshots: string[] = [];
    const posts: FacebookPost[] = [];

    try {
      // Take initial screenshot focusing on profile info
      const profileScreenshot = await this.captureScreenshot();
      screenshots.push(profileScreenshot);

      // Scroll to posts section
      await this.page!.evaluate(() => {
        window.scrollBy(0, window.innerHeight * 0.5);
      });
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Capture posts screenshots
      for (let i = 0; i < 3; i++) {
        const postScreenshot = await this.captureScreenshot();
        screenshots.push(postScreenshot);

        await this.page!.evaluate(() => {
          window.scrollBy(0, window.innerHeight * 0.8);
        });
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }

      // Extract profile and post data
      const profileData = await this.page!.evaluate(() => {
        // Get profile info
        const profileName = document.querySelector('h1')?.textContent?.trim() || '';
        const bio =
          document.querySelector('[data-testid="user-biography"]')?.textContent?.trim() || '';

        // Get posts
        const postElements = document.querySelectorAll(
          '[data-testid="story-body"], [role="article"]',
        );
        const posts = [];

        postElements.forEach((postEl, index) => {
          if (index > 15) return; // Limit posts

          const content = postEl.textContent?.trim() || '';
          if (content && content.length > 20) {
            posts.push({
              author: profileName,
              content: content,
              timestamp: '',
            });
          }
        });

        return {
          profileName,
          bio,
          posts,
          fullText: document.body.innerText,
        };
      });

      posts.push(...profileData.posts);

      const htmlContent = await this.page!.content();

      this.logAndBroadcast(
        `Extracted ${posts.length} posts from profile: ${profileData.profileName}`,
        'info',
      );

      return {
        url,
        type: 'profile',
        screenshots,
        htmlContent,
        extractedText: profileData.fullText,
        posts,
      };
    } catch (error) {
      this.logAndBroadcast(`Error extracting profile data: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Extract data from Facebook pages
   */
  private async extractPageData(url: string): Promise<FacebookPageData> {
    this.logAndBroadcast('Extracting Facebook page data...', 'info');

    // Similar to profile but with page-specific selectors
    return this.extractProfileData(url); // For now, use same logic
  }

  /**
   * Extract data from unknown Facebook page types
   */
  private async extractGenericData(url: string): Promise<FacebookPageData> {
    this.logAndBroadcast('Extracting generic Facebook data...', 'info');

    const screenshot = await this.captureScreenshot();
    const htmlContent = await this.page!.content();
    const extractedText = await this.page!.evaluate(() => document.body.innerText);

    return {
      url,
      type: 'page',
      screenshots: [screenshot],
      htmlContent,
      extractedText,
      posts: [],
    };
  }

  /**
   * Capture a screenshot and return as base64
   */
  private async captureScreenshot(): Promise<string> {
    try {
      const screenshot = await this.page!.screenshot({
        type: 'jpeg',
        quality: 80,
        fullPage: false, // Capture viewport only for faster processing
      });

      // Resize image to reduce size
      const resizedImage = await sharp(screenshot)
        .resize(1200, 800, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toBuffer();

      return resizedImage.toString('base64');
    } catch (error) {
      this.logAndBroadcast(`Error capturing screenshot: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Extract photos from current viewport
   */
  private async extractPhotosFromViewport(): Promise<string[]> {
    try {
      const photos = await this.page!.evaluate(() => {
        const images: string[] = [];

        // Look for Facebook content images in current viewport
        const imgElements = document.querySelectorAll('img[src*="scontent"], img[src*="fbcdn"]');

        imgElements.forEach((img) => {
          const rect = img.getBoundingClientRect();

          // Check if image is in viewport and not too small
          if (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= window.innerHeight &&
            rect.right <= window.innerWidth &&
            rect.width > 100 &&
            rect.height > 100
          ) {
            const src = img.getAttribute('src');
            if (
              src &&
              src.includes('scontent') &&
              !src.includes('emoji') &&
              !src.includes('profile_pic') &&
              !src.includes('static.xx.fbcdn')
            ) {
              images.push(src);
            }
          }
        });

        return images;
      });

      this.logAndBroadcast(`Collected ${photos.length} photos from current viewport`, 'info');
      return photos;
    } catch (error) {
      this.logAndBroadcast(`Error extracting photos from viewport: ${error.message}`, 'warning');
      return [];
    }
  }

  /**
   * Parse Facebook data using Gemini Vision and text analysis
   */
  private async parseWithGemini(pageData: FacebookPageData): Promise<ParsedFacebookData> {
    this.logAndBroadcast(
      `🧠 Parsing Facebook data with Gemini Vision (${pageData.screenshots.length} screenshots, ${pageData.posts.length} posts)`,
      'info',
    );

    // Check if this is a media-focused extraction (lots of image URLs)
    const totalImages = pageData.posts.reduce((sum, post) => sum + (post.images?.length || 0), 0);
    const hasImageUrls = pageData.posts.some((post) => post.url && post.url.includes('scontent'));

    if (hasImageUrls && totalImages > 3) {
      this.logAndBroadcast(
        `📸 Detected media extraction with ${totalImages} images - using specialized image parsing`,
        'info',
      );
      return await this.parseImageUrlsWithGemini(pageData);
    }

    // Original text-based parsing for regular posts
    return await this.parseTextWithGemini(pageData);
  }

  /**
   * Parse image URLs directly with Gemini Vision
   */
  private async parseImageUrlsWithGemini(pageData: FacebookPageData): Promise<ParsedFacebookData> {
    this.logAndBroadcast(
      `🖼️ Processing ${pageData.posts.length} images with Gemini Vision...`,
      'info',
    );

    try {
      const performanceSettings = getGeminiPerformanceSettings();
      const model = this.genAI.getGenerativeModel({
        model: getGeminiModel('facebook'), // Use centralized Facebook parsing model
        generationConfig: {
          temperature: performanceSettings.temperature,
          topP: performanceSettings.topP,
          topK: performanceSettings.topK,
          maxOutputTokens: performanceSettings.maxTokensPerRequest,
        },
      });

      // Process images in batches
      const allShows = [];
      const allDjs = [];
      const batchSize = 5; // Process 5 images at a time

      for (let i = 0; i < pageData.posts.length; i += batchSize) {
        const batch = pageData.posts.slice(i, i + batchSize);
        this.logAndBroadcast(
          `📋 Processing image batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(pageData.posts.length / batchSize)}...`,
          'info',
        );

        const imageParts = [];
        let batchText = `Please analyze these karaoke event flyers/images and extract:\n\n`;

        for (const post of batch) {
          if (post.images && post.images.length > 0) {
            const imageUrl = post.images[0];
            try {
              // Fetch the image
              const response = await fetch(imageUrl);
              const imageBuffer = await response.arrayBuffer();

              imageParts.push({
                inlineData: {
                  data: Buffer.from(imageBuffer).toString('base64'),
                  mimeType: 'image/jpeg',
                },
              });

              batchText += `Image ${imageParts.length}: ${imageUrl}\n`;
            } catch (error) {
              this.logAndBroadcast(`Failed to fetch image: ${imageUrl}`, 'warning');
            }
          }
        }

        if (imageParts.length === 0) continue;

        batchText += `\n🎤 KARAOKE EVENT ANALYSIS INSTRUCTIONS:

You are an expert at extracting karaoke show information from Facebook event flyers and images. 
Please analyze each image for KARAOKE-RELATED events only and extract the following information:

REQUIRED FIELDS FOR EACH KARAOKE SHOW:
1. VENUE NAME (bar, restaurant, club hosting karaoke)
2. COMPLETE ADDRESS (street, city, state, zip code)
3. DATE AND TIME (when karaoke happens)  
4. DJ/HOST NAME (person running karaoke)
5. PRECISE COORDINATES (latitude and longitude)

IMPORTANT GEOCODING REQUIREMENTS:
For EVERY venue with a complete address (street + city + state), you MUST provide precise latitude and longitude coordinates.
Examples:
- "123 Main St, Columbus, OH" → lat: 39.961176, lng: -82.998794
- "456 Broadway, New York, NY" → lat: 40.758896, lng: -73.985130

WHAT TO LOOK FOR:
- Karaoke nights, karaoke events, DJ hosting karaoke
- Regular weekly karaoke schedules
- Special karaoke events or contests
- Any mentions of "karaoke", "sing", "host", "DJ"

WHAT TO IGNORE:
- Live music bands (unless they also mention karaoke)
- Regular bar events without karaoke
- DJs playing music only (no singing/karaoke)

FORMAT AS JSON ARRAY:
[{
  "venue": "REQUIRED: Exact venue name",
  "address": "REQUIRED: Complete street address",
  "city": "REQUIRED: City name", 
  "state": "REQUIRED: State abbreviation (e.g., OH, NY)",
  "zip": "ZIP code if visible",
  "lat": "REQUIRED: Precise latitude as decimal number (e.g., 39.961176)",
  "lng": "REQUIRED: Precise longitude as decimal number (e.g., -82.998794)",
  "dayOfWeek": "REQUIRED: Day of week (Monday, Tuesday, etc.)",
  "time": "REQUIRED: Time karaoke starts (e.g., '7:00 PM', '8:30 PM')",
  "djName": "REQUIRED: DJ/Host name if mentioned",
  "description": "Additional details about the karaoke event",
  "isRecurring": "true/false - is this a regular weekly event?",
  "confidence": "0.1-1.0 confidence this is actually a karaoke event"
}]

ONLY return events that are clearly KARAOKE-related. If unsure, set confidence low.
`;

        try {
          const result = await model.generateContent([batchText, ...imageParts]);
          const response = await result.response;
          const text = response.text();

          this.logAndBroadcast(`📝 Batch result: ${text.substring(0, 200)}...`, 'info');

          // Parse JSON response
          const jsonMatch = text.match(/\[[\s\S]*?\]/);
          if (jsonMatch) {
            const extractedData = JSON.parse(jsonMatch[0]);

            for (const item of extractedData) {
              if (item.venue && item.time && item.confidence > 0.3) {
                // Build the show object
                const show = {
                  venue: item.venue,
                  address: item.address || '',
                  city: item.city || '',
                  state: item.state || '',
                  zip: item.zip || '',
                  lat: item.lat || null,
                  lng: item.lng || null,
                  dayOfWeek: item.dayOfWeek || '',
                  time: item.time,
                  djName: item.djName || '',
                  description: item.description || '',
                  isRecurring: item.isRecurring === 'true',
                  source: pageData.url,
                  confidence: parseFloat(item.confidence) || 0.5,
                };

                // Geocode if missing coordinates but has address
                if ((!show.lat || !show.lng) && show.address && show.city && show.state) {
                  this.logAndBroadcast(
                    `🗺️ Geocoding venue: ${show.venue} at ${show.address}`,
                    'info',
                  );

                  try {
                    const geocodeResult = await this.geocodingService.geocodeAddressHybrid(
                      `${show.address}, ${show.city}, ${show.state}`,
                    );

                    if (geocodeResult) {
                      show.lat = geocodeResult.lat;
                      show.lng = geocodeResult.lng;
                      if (!show.city && geocodeResult.city) show.city = geocodeResult.city;
                      if (!show.state && geocodeResult.state) show.state = geocodeResult.state;
                      if (!show.zip && geocodeResult.zip) show.zip = geocodeResult.zip;

                      this.logAndBroadcast(
                        `✅ Geocoded ${show.venue}: ${show.lat}, ${show.lng}`,
                        'success',
                      );
                    }
                  } catch (geocodeError) {
                    this.logAndBroadcast(
                      `⚠️ Geocoding failed for ${show.venue}: ${geocodeError.message}`,
                      'warning',
                    );
                  }
                }

                allShows.push(show);
              }

              if (item.djName) {
                allDjs.push({
                  name: item.djName,
                  confidence: parseFloat(item.confidence) || 0.7,
                  context: `Found at ${item.venue || 'venue'} - ${item.time || 'unknown time'}`,
                });
              }
            }
          }
        } catch (error) {
          this.logAndBroadcast(`Error processing image batch: ${error.message}`, 'warning');
        }

        // Small delay between batches to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      this.logAndBroadcast(
        `✨ Image parsing complete: ${allShows.length} shows, ${allDjs.length} DJs found`,
        'info',
      );

      return {
        vendor: {
          name: 'Facebook Group',
          website: pageData.url,
          description: 'Karaoke events from Facebook group images',
          confidence: 0.7,
        },
        djs: allDjs,
        shows: allShows,
        rawData: {
          url: pageData.url,
          title: 'Facebook Group Media',
          content: `Processed ${pageData.posts.length} images`,
          parsedAt: new Date(),
        },
      };
    } catch (error) {
      this.logAndBroadcast(`💥 Image parsing failed: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Original text-based parsing method
   */
  private async parseTextWithGemini(pageData: FacebookPageData): Promise<ParsedFacebookData> {
    this.logAndBroadcast(
      `📝 Using text-based parsing (${pageData.screenshots.length} screenshots, ${pageData.posts.length} posts)`,
      'info',
    );

    try {
      const performanceSettings = getGeminiPerformanceSettings();
      const model = this.genAI.getGenerativeModel({
        model: getGeminiModel('facebook'),
        generationConfig: {
          temperature: performanceSettings.temperature,
          topP: performanceSettings.topP,
          topK: performanceSettings.topK,
          maxOutputTokens: performanceSettings.maxTokensPerRequest,
        },
      });

      // Prepare comprehensive text content
      let textContent = `FACEBOOK PAGE TYPE: ${pageData.type}\nURL: ${pageData.url}\n\n`;

      if (pageData.posts.length > 0) {
        textContent += `POSTS AND CONTENT (${pageData.posts.length} posts analyzed):\n`;
        pageData.posts.forEach((post, index) => {
          textContent += `POST ${index + 1}:\n`;
          textContent += `Author: ${post.author}\n`;
          textContent += `Content: ${post.content}\n`;
          if (post.timestamp) textContent += `Time: ${post.timestamp}\n`;
          if (post.images && post.images.length > 0) {
            textContent += `Images: ${post.images.length} photos found\n`;
          }
          textContent += `\n`;
        });
      }

      // Count total photos collected
      const totalPhotos = pageData.posts.reduce(
        (count, post) => count + (post.images ? post.images.length : 0),
        0,
      );

      // Prepare the enhanced prompt with photo analysis
      const prompt = `🎯 COMPREHENSIVE FACEBOOK KARAOKE ANALYSIS
Analyze this Facebook ${pageData.type} for ALL karaoke venues, shows, and events.

📊 CONTENT SUMMARY:
- Screenshots: ${pageData.screenshots.length} captured
- Posts analyzed: ${pageData.posts.length}
- Photos collected: ${totalPhotos}
- Content scrolled: ~20 pages of feed

CONTENT TO ANALYZE:
${textContent}

🚨 ENHANCED EXTRACTION REQUIREMENTS:

� PHOTO & IMAGE ANALYSIS:
- Scan screenshots for venue names, addresses, and show times
- Look for event flyers and promotional images
- Extract text from photos showing karaoke schedules
- Find venue signage and address information in images

�📍 VENUE & ADDRESS EXTRACTION:
- Look for venue names in posts, comments, and images
- Extract complete addresses when mentioned
- Find phone numbers and websites for venues
- Look for recurring venues mentioned across multiple posts
- Check image text for venue information

🕘 TIME & SCHEDULE EXTRACTION:
- Extract specific show times and days from text and images
- Look for weekly schedules in photos and flyers
- Find recurring events and regular shows
- Convert times to both "7 pm" and "19:00" formats
- Scan event flyers for detailed timing

🎤 DJ & HOST EXTRACTION:
- Find DJ names and hosts mentioned in posts and images
- Look for "@mentions" of karaoke hosts
- Extract contact information if available
- Check photos for DJ announcements

🗓️ EVENT EXTRACTION:
- Each venue + day combination = separate show
- Look for patterns like "Monday at Venue X", "Tuesday karaoke at Y"
- Extract special events and regular weekly shows
- Parse event flyers and promotional content

🌍 LOCATION REQUIREMENTS:
For every venue found, provide precise coordinates:
- Use venue name + address for exact location
- Provide lat/lng as decimal numbers with 6+ places
- Ensure coordinates match the venue location

🚨 ADDRESS COMPONENT SEPARATION - CRITICAL:
NEVER MIX COMPONENTS:
✅ CORRECT:
address: "123 Main Street" (street only)
city: "Columbus" (city only)
state: "OH" (state only)
zip: "43215" (zip only)

❌ WRONG:
address: "123 Main Street, Columbus, OH 43215"

🎯 COMPREHENSIVE ANALYSIS GOALS:
With ~20 pages of content and ${totalPhotos} photos, extract EVERY possible karaoke venue and show. Look for:
- Weekly recurring shows
- Special events
- Venue rotations
- Multiple locations from same DJ/company
- Guest DJ appearances
- Seasonal or temporary shows

Return ONLY valid JSON:
{
  "vendor": {
    "name": "Facebook page/group name or primary business",
    "website": "${pageData.url}",
    "description": "Description from page/group",
    "confidence": 0.8
  },
  "djs": [
    {
      "name": "DJ Name",
      "confidence": 0.8,
      "context": "Facebook posts/profile/images"
    }
  ],
  "shows": [
    {
      "venue": "Venue Name",
      "address": "Street address only",
      "city": "City name only", 
      "state": "State abbreviation only",
      "zip": "ZIP code only",
      "lat": 39.961176,
      "lng": -82.998794,
      "venuePhone": "Phone if found",
      "venueWebsite": "Website if found",
      "time": "Show time like '7 pm'",
      "startTime": "24-hour format like '19:00'",
      "endTime": "End time or 'close'",
      "day": "day_of_week",
      "djName": "DJ/host name",
      "description": "Show details",
      "confidence": 0.8
    }
  ]
}`;

      // Prepare image parts
      const imageParts = pageData.screenshots.map((screenshot) => ({
        inlineData: {
          data: screenshot,
          mimeType: 'image/jpeg',
        },
      }));

      this.logAndBroadcast(
        `Making Gemini request with ${imageParts.length} images and ${textContent.length} chars of text`,
        'info',
      );

      // Make the Gemini request
      const result = await model.generateContent([prompt, ...imageParts]);
      const response = await result.response;
      const text = response.text();

      this.logAndBroadcast('Gemini analysis complete, parsing JSON response', 'info');

      // Parse JSON response
      const cleanJsonString = this.cleanGeminiResponse(text);
      let parsedData;

      try {
        parsedData = JSON.parse(cleanJsonString);
        this.logAndBroadcast('✅ Facebook data JSON parsing successful', 'info');
      } catch (jsonError) {
        this.logAndBroadcast(`❌ Facebook data JSON parsing failed: ${jsonError.message}`, 'error');

        // Try to extract partial data
        parsedData = this.extractPartialDataFromResponse(text, pageData.url);
        if (!parsedData) {
          throw new Error(`Facebook data JSON parsing failed: ${jsonError.message}`);
        }
      }

      // Ensure required structure and geocode venues
      const processedShows = [];
      if (Array.isArray(parsedData.shows)) {
        for (const show of parsedData.shows) {
          const processedShow = { ...show, source: pageData.url };

          // Geocode if missing coordinates but has address
          if (
            (!processedShow.lat || !processedShow.lng) &&
            processedShow.address &&
            processedShow.city &&
            processedShow.state
          ) {
            this.logAndBroadcast(
              `🗺️ Geocoding venue: ${processedShow.venue} at ${processedShow.address}`,
              'info',
            );

            try {
              const geocodeResult = await this.geocodingService.geocodeAddressHybrid(
                `${processedShow.address}, ${processedShow.city}, ${processedShow.state}`,
              );

              if (geocodeResult) {
                processedShow.lat = geocodeResult.lat;
                processedShow.lng = geocodeResult.lng;
                if (!processedShow.city && geocodeResult.city)
                  processedShow.city = geocodeResult.city;
                if (!processedShow.state && geocodeResult.state)
                  processedShow.state = geocodeResult.state;
                if (!processedShow.zip && geocodeResult.zip) processedShow.zip = geocodeResult.zip;

                this.logAndBroadcast(
                  `✅ Geocoded ${processedShow.venue}: ${processedShow.lat}, ${processedShow.lng}`,
                  'success',
                );
              }
            } catch (geocodeError) {
              this.logAndBroadcast(
                `⚠️ Geocoding failed for ${processedShow.venue}: ${geocodeError.message}`,
                'warning',
              );
            }
          }

          processedShows.push(processedShow);
        }
      }

      const finalData: ParsedFacebookData = {
        vendor: parsedData.vendor || {
          name: 'Facebook Page',
          website: pageData.url,
          description: 'Parsed from Facebook content',
          confidence: 0.5,
        },
        djs: Array.isArray(parsedData.djs) ? parsedData.djs : [],
        shows: processedShows,
        rawData: {
          url: pageData.url,
          title: `Facebook ${pageData.type} Analysis`,
          content: textContent.substring(0, 1000),
          parsedAt: new Date(),
        },
      };

      this.logAndBroadcast(
        `Facebook parsing complete: ${finalData.shows.length} shows, ${finalData.djs.length} DJs`,
        'info',
      );

      return finalData;
    } catch (error) {
      this.logAndBroadcast(`Error parsing Facebook data with Gemini: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Clean Gemini response to extract valid JSON
   */
  private cleanGeminiResponse(text: string): string {
    // Remove markdown code blocks
    let cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '');

    // Remove any text before the first {
    const firstBrace = cleaned.indexOf('{');
    if (firstBrace !== -1) {
      cleaned = cleaned.substring(firstBrace);
    }

    // Remove any text after the last }
    const lastBrace = cleaned.lastIndexOf('}');
    if (lastBrace !== -1) {
      cleaned = cleaned.substring(0, lastBrace + 1);
    }

    return cleaned.trim();
  }

  /**
   * Extract partial data from malformed JSON response
   */
  private extractPartialDataFromResponse(text: string, url: string): ParsedFacebookData | null {
    try {
      this.logAndBroadcast('Attempting to extract partial data from malformed response', 'warning');

      // Basic extraction patterns
      const venuePattern = /"venue"\s*:\s*"([^"]+)"/g;
      const djPattern = /"djName"\s*:\s*"([^"]+)"/g;

      const venues = Array.from(text.matchAll(venuePattern)).map((m) => m[1]);
      const djs = Array.from(text.matchAll(djPattern)).map((m) => m[1]);

      if (venues.length > 0) {
        return {
          vendor: {
            name: 'Facebook Page',
            website: url,
            description: 'Partial extraction from Facebook',
            confidence: 0.3,
          },
          djs: [...new Set(djs)].map((name) => ({
            name,
            confidence: 0.3,
            context: 'Facebook content',
          })),
          shows: venues.map((venue) => ({
            venue,
            time: 'See post for details', // Required field
            source: url,
            confidence: 0.3,
          })),
          rawData: {
            url,
            title: 'Partial Facebook extraction',
            content: 'Recovered from malformed response',
            parsedAt: new Date(),
          },
        };
      }

      return null;
    } catch (error) {
      this.logAndBroadcast(`Partial extraction failed: ${error.message}`, 'error');
      return null;
    }
  }

  /**
   * Parse images using worker thread for intensive processing
   */
  async parseImageUrlsWithWorker(imageUrls: string[]): Promise<{ shows: any[]; djs: any[] }> {
    return new Promise((resolve, reject) => {
      this.logAndBroadcast(`🧵 Starting worker thread for ${imageUrls.length} images...`, 'info');

      // Use absolute path to the worker file in src directory
      const workerPath = path.join(process.cwd(), 'dist', 'parser', 'image-parsing-worker.js');
      const worker = new Worker(workerPath, {
        workerData: {
          images: imageUrls,
          geminiApiKey: this.configService.get<string>('GEMINI_API_KEY'),
          batchSize: 10, // Increase for paid tier with 2,000 requests/minute
        },
      });

      let progressCallback: (data: any) => void;

      worker.on('message', (message) => {
        switch (message.type) {
          case 'progress':
            const { batchNum, totalBatches, processed, total } = message.data;
            this.logAndBroadcast(
              `📊 Worker progress: Batch ${batchNum}/${totalBatches} (${processed}/${total} images)`,
              'info',
            );
            if (progressCallback) {
              progressCallback(message.data);
            }
            break;

          case 'log':
            // Forward worker logs to client
            this.logAndBroadcast(message.data.message, message.data.level);
            break;

          case 'complete':
            this.logAndBroadcast(`✅ Worker completed successfully`, 'success');
            worker.terminate();
            resolve(message.data);
            break;

          case 'error':
            this.logAndBroadcast(`❌ Worker error: ${message.data.message}`, 'error');
            worker.terminate();
            reject(new Error(message.data.message));
            break;
        }
      });

      worker.on('error', (error) => {
        this.logAndBroadcast(`💥 Worker thread error: ${error.message}`, 'error');
        reject(error);
      });

      worker.on('exit', (code) => {
        if (code !== 0) {
          this.logAndBroadcast(`🚫 Worker stopped with exit code ${code}`, 'error');
          reject(new Error(`Worker stopped with exit code ${code}`));
        }
      });

      // Store progress callback for external use
      (worker as any).onProgress = (callback: (data: any) => void) => {
        progressCallback = callback;
      };
    });
  }

  /**
   * Enhanced media extraction with worker thread processing
   */
  async extractGroupMediaDataWithWorker(groupUrl: string): Promise<ParsedFacebookData> {
    this.logAndBroadcast(`🎥 Starting enhanced group media extraction: ${groupUrl}`, 'info');

    try {
      // Ensure we're logged in first
      await this.loginToFacebook();

      // First extract image URLs using existing method
      const pageData = await this.extractGroupMediaData(groupUrl);

      if (!pageData.imageUrls || pageData.imageUrls.length === 0) {
        this.logAndBroadcast('⚠️ No images found for worker processing', 'warning');
        return {
          shows: [],
          djs: [],
          venues: [],
          vendor: {
            name: 'Unknown',
            website: '',
            description: 'No media content available',
            confidence: 0,
          },
          rawData: {
            url: groupUrl,
            title: 'No images found',
            content: 'No media content available for processing',
            parsedAt: new Date(),
          },
        };
      }

      this.logAndBroadcast(
        `🖼️ Processing ${pageData.imageUrls.length} images with worker thread...`,
        'info',
      );

      // Use worker thread for intensive parsing
      const workerResults = await this.parseImageUrlsWithWorker(pageData.imageUrls);

      return {
        shows: workerResults.shows || [],
        djs: workerResults.djs || [],
        venues: [], // Could be extracted from shows if needed
        vendor: {
          name: 'Worker Processed',
          website: '',
          description: `Found ${workerResults.shows?.length || 0} shows and ${workerResults.djs?.length || 0} DJs`,
          confidence: 0.8,
        },
        rawData: {
          url: groupUrl,
          title: `Worker processed ${pageData.imageUrls.length} images`,
          content: `Found ${workerResults.shows?.length || 0} shows and ${workerResults.djs?.length || 0} DJs`,
          parsedAt: new Date(),
        },
      };
    } catch (error) {
      this.logAndBroadcast(`💥 Enhanced media extraction failed: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Login with provided credentials (for admin UI)
   */
  async loginWithCredentials(email: string, password: string): Promise<boolean> {
    try {
      this.logAndBroadcast('🔐 Attempting login with provided credentials...', 'info');

      if (!this.page) {
        throw new Error('Browser not initialized');
      }

      // Navigate to Facebook login page
      await this.page.goto('https://www.facebook.com/login', {
        waitUntil: 'domcontentloaded',
        timeout: 20000,
      });

      // Fill credentials
      await this.page.waitForSelector('#email', { timeout: 8000 });
      await this.page.type('#email', email, { delay: 50 });
      await this.page.type('#pass', password, { delay: 50 });

      // Submit login
      await Promise.all([
        this.page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 20000 }),
        this.page.click('#loginbutton'),
      ]);

      // Check if login was successful
      const currentUrl = this.page.url();
      if (!currentUrl.includes('/login') && !currentUrl.includes('/checkpoint/')) {
        this.logAndBroadcast('✅ Credentials login successful', 'info');
        this.isLoggedIn = true;
        return true;
      } else {
        this.logAndBroadcast('❌ Credentials login failed', 'error');
        return false;
      }
    } catch (error) {
      this.logAndBroadcast(`Credentials login error: ${error.message}`, 'error');
      return false;
    }
  }

  /**
   * Save current session for future use
   */
  async saveCurrentSession(): Promise<void> {
    try {
      await this.saveCookies();
      this.logAndBroadcast('💾 Current session saved successfully', 'info');
    } catch (error) {
      this.logAndBroadcast(`Failed to save current session: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Check if saved session exists
   */
  hasSavedSession(): boolean {
    return fs.existsSync(this.cookiesPath);
  }

  /**
   * Clear saved session
   */
  async clearSession(): Promise<void> {
    try {
      if (fs.existsSync(this.cookiesPath)) {
        fs.unlinkSync(this.cookiesPath);
        this.logAndBroadcast('🗑️ Saved session cleared', 'info');
      }

      this.isLoggedIn = false;

      if (this.page) {
        await this.page
          .goto('https://www.facebook.com/logout', {
            waitUntil: 'domcontentloaded',
            timeout: 10000,
          })
          .catch(() => {
            // Ignore logout errors
          });
      }
    } catch (error) {
      this.logAndBroadcast(`Failed to clear session: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Close browser and cleanup
   */
  async cleanup(): Promise<void> {
    this.logAndBroadcast('Cleaning up Facebook parser...', 'info');

    try {
      if (this.page) {
        await this.page.close();
        this.page = null;
      }

      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }

      this.isLoggedIn = false;
      this.logAndBroadcast('Facebook parser cleanup complete', 'info');
    } catch (error) {
      this.logAndBroadcast(`Error during cleanup: ${error.message}`, 'error');
    }
  }

  /**
   * Get current login status
   */
  getLoginStatus(): boolean {
    return this.isLoggedIn;
  }

  /**
   * Generate appropriate name for URL based on vendor data
   */
  private generateUrlName(url: string, parsedData: ParsedFacebookData): string {
    if (!parsedData.vendor?.name) {
      return 'Unnamed Business';
    }

    if (url.includes('facebook.com/groups/')) {
      return `FB Group: ${parsedData.vendor.name}`;
    } else if (url.includes('facebook.com/')) {
      return `FB: ${parsedData.vendor.name}`;
    } else {
      return parsedData.vendor.name;
    }
  }

  /**
   * Update the name field for a URL in the urls_to_parse table
   */
  private async updateUrlName(url: string, name: string): Promise<void> {
    try {
      await this.urlToParseRepository.update({ url }, { name });
      this.logAndBroadcast(`Updated URL name: ${url} -> ${name}`, 'success');
    } catch (error) {
      this.logAndBroadcast(`Error updating URL name: ${error.message}`, 'error');
    }
  }

  /**
   * Ensure URL name is set after successful parsing
   */
  private async ensureUrlNameIsSet(url: string, parsedData: ParsedFacebookData): Promise<void> {
    try {
      // First check if URL already has a name set
      const existingUrl = await this.urlToParseRepository.findOne({ where: { url } });

      if (existingUrl?.name) {
        this.logAndBroadcast(`URL already has name: ${existingUrl.name}`, 'info');
        return;
      }

      // If no name exists and we have vendor information, set the name
      if (parsedData.vendor?.name) {
        const urlName = this.generateUrlName(url, parsedData);
        await this.updateUrlName(url, urlName);
        this.logAndBroadcast(`Set URL name: ${urlName}`, 'info');
      } else {
        this.logAndBroadcast(`No vendor name found in parsed data for URL: ${url}`, 'warning');
      }
    } catch (error) {
      this.logAndBroadcast(`Failed to ensure URL name is set: ${error.message}`, 'warning');
    }
  }
}
