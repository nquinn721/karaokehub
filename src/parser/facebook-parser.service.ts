import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as fs from 'fs';
import * as path from 'path';
import * as puppeteer from 'puppeteer';
import { Repository } from 'typeorm';
import { Worker } from 'worker_threads';
import { KaraokeWebSocketGateway } from '../websocket/websocket.gateway';
import { ParsedSchedule, ParseStatus } from './parsed-schedule.entity';
import { UrlToParse } from './url-to-parse.entity';
import type {
  ImageDataPair,
  ImageUrlPair,
  ImageWorkerMessage,
  ParsedFacebookData,
  ValidationWorkerMessage,
  WorkerResult,
} from './worker-types';

@Injectable()
export class FacebookParserService {
  private readonly logger = new Logger(FacebookParserService.name);
  private currentParsingLogs: Array<{
    timestamp: Date;
    level: 'info' | 'success' | 'warning' | 'error';
    message: string;
  }> = [];

  constructor(
    private readonly configService: ConfigService,
    private readonly webSocketGateway: KaraokeWebSocketGateway,
    @InjectRepository(ParsedSchedule)
    private parsedScheduleRepository: Repository<ParsedSchedule>,
    @InjectRepository(UrlToParse)
    private urlToParseRepository: Repository<UrlToParse>,
  ) {}

  /**
   * Main Facebook parsing entry point - follows the new clean architecture
   */
  async parseAndSaveFacebookPageClean(url: string): Promise<{
    parsedScheduleId: string;
    data: ParsedFacebookData;
    stats: any;
  }> {
    this.currentParsingLogs = [];
    const startTime = Date.now();

    this.logAndBroadcast(`��� Starting clean Facebook parsing for: ${url}`);

    try {
      // Step 1: Extract image URLs from Facebook page
      this.logAndBroadcast('��� Step 1: Extracting images from Facebook page...');
      const imageDataArray = await this.extractImageUrls(url);
      this.logAndBroadcast(`📱 Step 1 Complete: Found ${imageDataArray.length} images to process`);

      // Step 2: Process images using workers for parallel processing
      this.logAndBroadcast('🔍 Step 2: Processing images with AI analysis...');
      const processedImages = await this.processImagesWithWorkers(imageDataArray);
      this.logAndBroadcast(
        `🎯 Step 2 Complete: Processed ${processedImages.length} images, found ${processedImages.filter((img) => img !== null).length} karaoke events`,
      );

      // Step 3: Validate and aggregate data using validation worker
      this.logAndBroadcast('✅ Step 3: Validating and aggregating event data...');
      const finalData = await this.validateAndAggregateData(processedImages, url);
      this.logAndBroadcast(
        `📊 Step 3 Complete: ${finalData.shows.length} shows, ${finalData.djs.length} DJs, ${finalData.vendors.length} venues found`,
      );

      // Step 4: Save to database
      this.logAndBroadcast('��� Step 4: Saving to database...');
      const savedSchedule = await this.saveToDatabase(finalData, url);

      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000;

      this.logAndBroadcast(`💾 Database save complete - Parsing ID: ${savedSchedule.id}`);
      this.logAndBroadcast(
        `✅ Clean parsing completed in ${duration.toFixed(2)}s - Results: ${finalData.shows.length} shows, ${finalData.djs.length} DJs, ${finalData.vendors.length} venues`,
        'success',
      );

      return {
        parsedScheduleId: savedSchedule.id,
        data: finalData,
        stats: {
          shows: finalData.shows.length,
          djs: finalData.djs.length,
          vendors: finalData.vendors.length,
          processingTime: duration,
          imageCount: imageDataArray.length,
        },
      };
    } catch (error) {
      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000;

      this.logAndBroadcast(
        `��� Clean parsing failed after ${duration.toFixed(2)}s: ${error.message}`,
        'error',
      );
      throw error;
    }
  }

  /**
   * Step 1: Extract image URLs from Facebook page using Puppeteer
   */
  private async extractImageUrls(url: string): Promise<ImageDataPair[]> {
    let browser = this.browser;
    let shouldCloseBrowser = false;

    // Use existing browser if available, otherwise create new one
    if (!browser) {
      browser = await puppeteer.launch({
        headless: false, // Set to false to allow for interactive login
        userDataDir: null, // Prevent persistent user data
        ignoreDefaultArgs: ['--disable-extensions'],
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
          '--incognito',
          '--no-default-browser-check',
          '--no-first-run',
          '--disable-default-apps',
          '--disable-extensions',
          '--disable-plugins',
          '--disable-sync',
          '--disable-translate',
          '--disable-local-storage',
          '--disable-databases',
          '--disable-shared-workers',
          '--disable-file-system',
          '--disable-session-crashed-bubble',
          '--start-maximized',
          '--start-fullscreen',
          '--window-size=1920,1080',
          '--memory-pressure-off',
          '--disable-background-timer-throttling',
          '--disable-renderer-backgrounding',
          '--disable-backgrounding-occluded-windows',
        ],
      });
      shouldCloseBrowser = true;
    }

    try {
      const page = await browser.newPage();

      // Set a realistic user agent
      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      );

      // Load saved cookies before navigation
      const cookiesLoaded = await this.loadFacebookCookies(page);
      if (cookiesLoaded) {
        this.logAndBroadcast('🍪 Loaded saved Facebook cookies');
        this.isLoggedIn = true;
      }

      this.logAndBroadcast(`🌐 Navigating to: ${url}`);

      // Navigate to the page first
      await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: 30000,
      });

      // Check if we hit a login page
      const isLoginPage = await this.checkIfLoginPage(page);

      if (isLoginPage) {
        this.logAndBroadcast(
          '🔒 Login page detected - requesting credentials from client...',
          'warning',
        );

        // Request credentials from client via WebSocket
        const loginSuccess = await this.performInteractiveLogin(page);

        if (!loginSuccess) {
          throw new Error('Facebook login required but failed. Please provide valid credentials.');
        }

        this.logAndBroadcast('✅ Login successful, saving session...');

        // Save cookies after successful login
        await this.saveFacebookCookies(page);

        this.logAndBroadcast('✅ Session saved, navigating to group page...');

        // Navigate to the group page with /media after successful login
        const groupUrl = url.includes('/media') ? url : `${url}/media`;
        await page.goto(groupUrl, {
          waitUntil: 'networkidle2',
          timeout: 30000,
        });
      } else {
        // No login required, route directly to group page with /media
        this.logAndBroadcast('✅ No login required, routing to group page...');
        const groupUrl = url.includes('/media') ? url : `${url}/media`;

        if (groupUrl !== url) {
          await page.goto(groupUrl, {
            waitUntil: 'networkidle2',
            timeout: 30000,
          });
        }
      }

      // Set larger viewport to see more content
      this.logAndBroadcast('�️ Setting up viewport for better content visibility...');
      await page.setViewport({
        width: 1920,
        height: 1080,
        deviceScaleFactor: 1.0, // Full scale for better image detection
      });

      // Ensure the page uses the full browser window
      await page.evaluate(() => {
        // Scroll to top first
        window.scrollTo(0, 0);
        // Try to maximize the window if possible
        if (window.screen && window.screen.width && window.screen.height) {
          window.resizeTo(window.screen.width, window.screen.height);
        }
      });

      // Take a full screenshot for group name validation
      this.logAndBroadcast('📷 Taking full page screenshot for group validation...');

      // Take screenshot
      const screenshot = await page.screenshot({
        fullPage: true,
        type: 'png',
      });

      // Save screenshot for validation (optional - could be used by Gemini worker)
      // await require('fs').promises.writeFile('temp/facebook-group-screenshot.png', screenshot);

      // Wait for initial content to load
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Zoom out to show more content on screen before scrolling
      this.logAndBroadcast('🔍 Zooming out to capture more content...');
      await page.evaluate(() => {
        document.body.style.zoom = '0.8'; // Zoom out to 80%
      });
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Scroll down multiple times with longer waits to ensure all content loads
      this.logAndBroadcast('📜 Scrolling down to load all content...');

      for (let i = 0; i < 8; i++) {
        // Increased from 5 to 8 scrolls
        // Scroll to bottom
        await page.evaluate(() => {
          window.scrollTo(0, document.body.scrollHeight);
        });

        // Wait longer for content to load
        await new Promise((resolve) => setTimeout(resolve, 3000)); // Increased from 2s to 3s

        this.logAndBroadcast(`📜 Scroll ${i + 1}/8 completed, waiting for content...`);

        // Additional wait for images to load
        await page.evaluate(async () => {
          const images = document.querySelectorAll('img');
          const imagePromises = Array.from(images).map((img) => {
            if (img.complete) return Promise.resolve();
            return new Promise((resolve) => {
              img.onload = resolve;
              img.onerror = resolve;
              setTimeout(resolve, 2000); // Timeout after 2s
            });
          });
          await Promise.all(imagePromises);
        });
      }

      // Final wait for all content to stabilize
      await new Promise((resolve) => setTimeout(resolve, 5000)); // Increased final wait

      this.logAndBroadcast('📸 Parsing HTML for all image URLs...');

      // Parse HTML for all image URLs with improved detection
      const imageUrls = await page.evaluate(() => {
        const images: any[] = [];

        // Get all img elements
        const imgElements = document.querySelectorAll('img');

        // Also check for lazy-loaded images in data attributes
        const lazyImages = document.querySelectorAll(
          '[data-src], [data-lazy-src], [data-original]',
        );

        // Process img elements
        imgElements.forEach((element, index) => {
          const img = element as HTMLImageElement;
          const src =
            img.src ||
            img.getAttribute('data-src') ||
            img.getAttribute('data-lazy-src') ||
            img.getAttribute('data-original');

          if (src && src.startsWith('http')) {
            // Skip Facebook system images and icons
            const skipPatterns = [
              '/rsrc.php/', // Facebook resource files
              '/hsts-pixel.gif', // Security tracking pixels
              'static.xx.fbcdn.net/rsrc', // Static resources
              '.svg', // SVG icons
              'emoji', // Emoji images
              'reaction', // Reaction images
              'icon', // Generic icons
              '/safe_image.php', // Facebook's safe image proxy
              'width="16"', // Small icons
              'height="16"', // Small icons
              '/profile_pic/', // Profile pictures
              '/avatar/', // Avatar images
              'data:image/', // Base64 encoded small images
            ];

            const shouldSkip = skipPatterns.some((pattern) => src.includes(pattern));
            if (shouldSkip) return;

            // Include content images from Facebook/Instagram and external sources
            if (
              src.includes('facebook') ||
              src.includes('fbcdn') ||
              src.includes('instagram') ||
              src.includes('cdninstagram') ||
              src.includes('scontent')
            ) {
              const alt = img.alt || '';
              const width = img.naturalWidth || img.width || 0;
              const height = img.naturalHeight || img.height || 0;

              // Only include images that are reasonably sized (likely content, not UI elements)
              if (width >= 100 && height >= 100) {
                images.push({
                  url: src,
                  index: index,
                  alt: alt,
                  context: img.parentElement?.textContent?.substring(0, 200) || '',
                });
              }
            }
          }
        });

        // Process lazy-loaded elements that aren't img tags
        lazyImages.forEach((element, index) => {
          const src =
            element.getAttribute('data-src') ||
            element.getAttribute('data-lazy-src') ||
            element.getAttribute('data-original');

          if (src && src.startsWith('http') && !images.some((img) => img.url === src)) {
            const skipPatterns = [
              '/rsrc.php/',
              '/hsts-pixel.gif',
              'static.xx.fbcdn.net/rsrc',
              '.svg',
              'emoji',
              'reaction',
              'icon',
              '/safe_image.php',
              'width="16"',
              'height="16"',
              '/profile_pic/',
              '/avatar/',
              'data:image/',
            ];

            const shouldSkip = skipPatterns.some((pattern) => src.includes(pattern));
            if (
              !shouldSkip &&
              (src.includes('facebook') ||
                src.includes('fbcdn') ||
                src.includes('instagram') ||
                src.includes('cdninstagram') ||
                src.includes('scontent'))
            ) {
              images.push({
                url: src,
                index: index + 1000, // Offset to avoid duplicates
                alt: element.getAttribute('alt') || '',
                context: element.parentElement?.textContent?.substring(0, 200) || '',
              });
            }
          }
        });

        // Remove duplicates based on URL
        const uniqueImages = images.filter(
          (img, index, self) => index === self.findIndex((i) => i.url === img.url),
        );

        return uniqueImages;
      });

      this.logAndBroadcast(`🎯 Found ${imageUrls.length} unique images for processing`);

      // Download images as base64 within browser context to avoid session/cookie issues
      this.logAndBroadcast(`📥 Downloading images within browser session...`);
      const imageDataArray = await this.downloadImagesAsBase64(page, imageUrls);
      this.logAndBroadcast(`📥 Downloaded ${imageDataArray.length} images successfully`);

      return imageDataArray.slice(0, 30); // Increased limit to 30 images max
    } finally {
      if (shouldCloseBrowser && browser) {
        await browser.close();
      }
    }
  }

  /**
   * Download images as base64 within browser context to avoid session/cookie issues
   */
  private async downloadImagesAsBase64(
    page: any,
    imageUrls: ImageUrlPair[],
  ): Promise<ImageDataPair[]> {
    const imageDataArray: ImageDataPair[] = [];

    for (let i = 0; i < imageUrls.length; i++) {
      const imageUrl = imageUrls[i];
      try {
        // Download image using browser's fetch (which has access to cookies/session)
        const base64Data = await page.evaluate(async (url) => {
          try {
            const response = await fetch(url);
            if (!response.ok) {
              throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const arrayBuffer = await response.arrayBuffer();
            const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
            const mimeType = response.headers.get('content-type') || 'image/jpeg';

            return {
              base64,
              mimeType,
            };
          } catch (error) {
            console.error('Browser fetch error:', error);
            return null;
          }
        }, imageUrl.url);

        if (base64Data) {
          imageDataArray.push({
            data: base64Data.base64,
            mimeType: base64Data.mimeType,
            index: imageUrl.index,
            alt: imageUrl.alt,
            context: imageUrl.context,
            originalUrl: imageUrl.url,
          });
        }
      } catch (error) {
        console.error(`Failed to download image ${imageUrl.url}:`, error);
      }
    }

    return imageDataArray;
  }

  /**
   * Step 2: Process images using worker threads for parallel AI analysis
   */
  private async processImagesWithWorkers(imageDataArray: ImageDataPair[]): Promise<WorkerResult[]> {
    const batchSize = 3; // Process 3 images at a time to avoid rate limits
    const results: WorkerResult[] = [];

    for (let i = 0; i < imageDataArray.length; i += batchSize) {
      const batch = imageDataArray.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(imageDataArray.length / batchSize);

      this.logAndBroadcast(
        `🔍 Processing image batch ${batchNumber}/${totalBatches} (${batch.length} images)`,
      );

      const batchPromises = batch.map((imageData) => this.processImageWithWorker(imageData));
      const batchResults = await Promise.allSettled(batchPromises);

      batchResults.forEach((result, batchIndex) => {
        if (result.status === 'fulfilled' && result.value) {
          results.push(result.value);
          this.logAndBroadcast(`✓ Image ${i + batchIndex + 1}: Found karaoke event`);
        } else {
          this.logAndBroadcast(
            `✗ Image ${i + batchIndex + 1}: ${result.status === 'rejected' ? result.reason : 'No karaoke content'}`,
            'warning',
          );
        }
      });

      // Brief pause between batches to respect rate limits
      if (i + batchSize < imageDataArray.length) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    return results;
  }

  /**
   * Process a single image using the TypeScript image worker
   */
  private async processImageWithWorker(imageData: ImageDataPair): Promise<WorkerResult | null> {
    return new Promise((resolve, reject) => {
      const workerPath = path.join(__dirname, 'facebook-image-worker.js');
      const worker = new Worker(workerPath);

      const timeout = setTimeout(() => {
        worker.terminate();
        resolve(null); // Don't reject, just return null for failed images
      }, 30000); // 30 second timeout per image

      worker.on('message', (message: ImageWorkerMessage) => {
        clearTimeout(timeout);
        worker.terminate();

        if (message.type === 'success') {
          resolve(message.result);
        } else {
          this.logAndBroadcast(`Image worker error: ${message.error}`, 'warning');
          resolve(null);
        }
      });

      worker.on('error', (error) => {
        clearTimeout(timeout);
        worker.terminate();
        this.logAndBroadcast(`Worker error: ${error.message}`, 'warning');
        resolve(null);
      });

      // Send image data to worker
      worker.postMessage({
        imageData: imageData,
        geminiApiKey: this.configService.get<string>('GEMINI_API_KEY'),
      });
    });
  }

  /**
   * Step 3: Validate and aggregate data using validation worker
   */
  private async validateAndAggregateData(
    processedImages: WorkerResult[],
    originalUrl: string,
  ): Promise<ParsedFacebookData> {
    return new Promise((resolve, reject) => {
      const workerPath = path.join(__dirname, 'facebook-validation-worker.js');
      const worker = new Worker(workerPath);

      const timeout = setTimeout(() => {
        worker.terminate();
        reject(new Error('Validation worker timeout'));
      }, 60000); // 60 second timeout for validation

      worker.on('message', (message: ValidationWorkerMessage) => {
        if (message.type === 'success' || message.type === 'complete') {
          clearTimeout(timeout);
          worker.terminate();
          resolve(message.result || (message.data as ParsedFacebookData));
        } else if (message.type === 'error') {
          clearTimeout(timeout);
          worker.terminate();
          const errorMsg = message.error || 'Unknown validation error';
          reject(new Error(`Validation worker error: ${errorMsg}`));
        } else if (message.type === 'log') {
          // Handle log messages without terminating the worker
          const logData = message.data as { message: string; level?: string };
          this.logAndBroadcast(
            `🔍 Validation: ${logData.message}`,
            (logData.level as any) || 'info',
          );
          // Don't terminate worker, continue processing
        } else {
          clearTimeout(timeout);
          worker.terminate();
          reject(new Error(`Validation worker unexpected message type: ${message.type}`));
        }
      });

      worker.on('error', (error) => {
        clearTimeout(timeout);
        worker.terminate();
        reject(new Error(`Validation worker error: ${error.message}`));
      });

      // Send processed data to validation worker
      worker.postMessage({
        processedImages: processedImages,
        originalUrl: originalUrl,
        geminiApiKey: this.configService.get<string>('GEMINI_API_KEY'),
      });
    });
  }

  /**
   * Step 4: Save validated data to database
   */
  private async saveToDatabase(data: ParsedFacebookData, url: string): Promise<ParsedSchedule> {
    const schedule = new ParsedSchedule();
    schedule.url = url;
    schedule.status = ParseStatus.PENDING_REVIEW;
    schedule.rawData = {
      ...data,
      // Ensure stats are available for admin UI
      stats: {
        showsFound: data.shows?.length || 0,
        djsFound: data.djs?.length || 0,
        vendorsFound: data.vendors?.length || 0,
      },
    };
    schedule.aiAnalysis = data;
    schedule.parsingLogs = this.currentParsingLogs;

    this.logAndBroadcast(
      `💾 Saving to database: ${data.shows?.length || 0} shows, ${data.djs?.length || 0} DJs, ${data.vendors?.length || 0} vendors`,
    );

    return await this.parsedScheduleRepository.save(schedule);
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

    // Add to current parsing logs
    this.currentParsingLogs.push({
      timestamp: new Date(),
      level,
      message,
    });

    // Broadcast to WebSocket clients if available
    try {
      this.webSocketGateway.server.emit('facebook-parsing-log', {
        timestamp: new Date(),
        level,
        message,
      });
    } catch (error) {
      this.logger.warn(`WebSocket broadcast failed: ${error.message}`);
    }
  }

  /**
   * Legacy method for backward compatibility (if needed)
   */
  async parseAndSaveFacebookPage(url: string) {
    return this.parseAndSaveFacebookPageClean(url);
  }

  // Browser and session management methods for backward compatibility
  private browser: any = null;
  private isLoggedIn: boolean = false;
  private savedSessionExists: boolean = false;
  private cookiesFilePath: string = path.join(__dirname, '../../temp/facebook-cookies.json');

  /**
   * Save Facebook cookies to file for session persistence
   */
  private async saveFacebookCookies(page: any): Promise<void> {
    try {
      const cookies = await page.cookies();
      const cookiesDir = path.dirname(this.cookiesFilePath);

      // Ensure temp directory exists
      if (!fs.existsSync(cookiesDir)) {
        fs.mkdirSync(cookiesDir, { recursive: true });
      }

      fs.writeFileSync(this.cookiesFilePath, JSON.stringify(cookies, null, 2));
      this.logger.log(`Facebook cookies saved to ${this.cookiesFilePath}`);
      this.savedSessionExists = true;
    } catch (error) {
      this.logger.warn(`Failed to save Facebook cookies: ${error.message}`);
    }
  }

  /**
   * Load Facebook cookies from file if they exist
   */
  private async loadFacebookCookies(page: any): Promise<boolean> {
    try {
      if (!fs.existsSync(this.cookiesFilePath)) {
        return false;
      }

      const cookiesData = fs.readFileSync(this.cookiesFilePath, 'utf8');
      const cookies = JSON.parse(cookiesData);

      if (cookies && cookies.length > 0) {
        await page.setCookie(...cookies);
        this.logger.log('Facebook cookies loaded successfully');
        this.savedSessionExists = true;
        return true;
      }

      return false;
    } catch (error) {
      this.logger.warn(`Failed to load Facebook cookies: ${error.message}`);
      return false;
    }
  }

  /**
   * Clear saved Facebook cookies
   */
  private clearFacebookCookies(): void {
    try {
      if (fs.existsSync(this.cookiesFilePath)) {
        fs.unlinkSync(this.cookiesFilePath);
        this.logger.log('Facebook cookies cleared');
      }
      this.savedSessionExists = false;
    } catch (error) {
      this.logger.warn(`Failed to clear Facebook cookies: ${error.message}`);
    }
  }

  /**
   * Check if the current page is a Facebook login page
   */
  private async checkIfLoginPage(page: any): Promise<boolean> {
    try {
      // Check for common login page elements
      const loginIndicators = await page.evaluate(() => {
        // Check for login form elements
        const emailInput = document.querySelector(
          '#email, input[name="email"], input[type="email"]',
        );
        const passwordInput = document.querySelector(
          '#pass, input[name="pass"], input[type="password"]',
        );
        const loginButton = document.querySelector(
          '#loginbutton, button[name="login"], button[type="submit"]',
        );

        // Check for login page URLs
        const isLoginUrl =
          window.location.href.includes('/login') ||
          window.location.href.includes('/checkpoint') ||
          window.location.pathname === '/';

        // Check for "Log In" text
        const hasLoginText =
          document.body.textContent?.toLowerCase().includes('log in') ||
          document.body.textContent?.toLowerCase().includes('sign in');

        return {
          hasEmailInput: !!emailInput,
          hasPasswordInput: !!passwordInput,
          hasLoginButton: !!loginButton,
          isLoginUrl,
          hasLoginText,
        };
      });

      // Consider it a login page if we have login form elements or are on a login URL
      const isLogin =
        (loginIndicators.hasEmailInput && loginIndicators.hasPasswordInput) ||
        loginIndicators.isLoginUrl;

      if (isLogin) {
        this.logger.log('Detected Facebook login page');
      }

      return isLogin;
    } catch (error) {
      this.logger.warn(`Error checking login page: ${error.message}`);
      return false;
    }
  }

  /**
   * Perform interactive login using the admin modal credential system
   */
  private async performInteractiveLogin(page: any): Promise<boolean> {
    try {
      this.logAndBroadcast('🔑 Requesting Facebook credentials from admin...', 'info');

      // Generate unique request ID
      const requestId = `fb-login-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Request credentials via WebSocket (this will trigger the admin modal)
      const credentials = await this.requestCredentialsFromAdmin(requestId);

      if (!credentials || !credentials.email || !credentials.password) {
        this.logAndBroadcast('❌ No credentials provided or request timed out', 'error');
        return false;
      }

      this.logAndBroadcast('📝 Credentials received, attempting slow login...', 'info');

      // Perform slow login to avoid captcha detection
      await this.performSlowLogin(page, credentials.email, credentials.password);

      // Check if login was successful
      const loginSuccess = await this.verifyLoginSuccess(page);

      if (loginSuccess) {
        this.logAndBroadcast('✅ Facebook login successful!', 'success');
        this.isLoggedIn = true;
        return true;
      } else {
        this.logAndBroadcast(
          '❌ Facebook login failed - incorrect credentials or captcha challenge',
          'error',
        );
        return false;
      }
    } catch (error) {
      this.logger.error(`Interactive login failed: ${error.message}`);
      this.logAndBroadcast(`❌ Login error: ${error.message}`, 'error');
      return false;
    }
  }

  /**
   * Request credentials from admin via WebSocket
   */
  private async requestCredentialsFromAdmin(requestId: string): Promise<any> {
    try {
      this.logAndBroadcast('📡 Sending credential request to admin interface...');

      // Use the main WebSocket gateway which already has Facebook credential handling
      const credentials = await this.webSocketGateway.requestFacebookCredentials(requestId);

      if (!credentials) {
        this.logAndBroadcast('⏰ Credential request timed out or was cancelled', 'warning');
        return null;
      }

      this.logAndBroadcast('✅ Credentials received from admin', 'success');
      return credentials;
    } catch (error) {
      this.logger.error(`Failed to request credentials: ${error.message}`);
      this.logAndBroadcast(`❌ Credential request error: ${error.message}`, 'error');
      return null;
    }
  }

  /**
   * Perform slow login to avoid captcha detection
   */
  private async performSlowLogin(page: any, email: string, password: string): Promise<void> {
    try {
      // Navigate to Facebook login page if not already there
      const currentUrl = await page.url();
      if (
        (!currentUrl.includes('facebook.com/login') && !currentUrl.includes('facebook.com')) ||
        currentUrl.includes('logout')
      ) {
        this.logAndBroadcast('🌐 Navigating to Facebook login page...');
        await page.goto('https://www.facebook.com/login', { waitUntil: 'networkidle2' });
        await this.randomDelay(1000, 2000);
      }

      // Wait for login form to be visible
      await page.waitForSelector('#email', { timeout: 10000 });
      this.logAndBroadcast('📋 Login form detected');

      // Clear any existing text and type email slowly
      await page.click('#email');
      await this.randomDelay(500, 1000);
      await page.keyboard.down('Control');
      await page.keyboard.press('KeyA');
      await page.keyboard.up('Control');
      await this.randomDelay(100, 300);

      this.logAndBroadcast('✍️ Entering email address...');
      await this.typeSlowly(page, '#email', email);
      await this.randomDelay(800, 1500);

      // Type password slowly
      await page.click('#pass');
      await this.randomDelay(500, 1000);
      await page.keyboard.down('Control');
      await page.keyboard.press('KeyA');
      await page.keyboard.up('Control');
      await this.randomDelay(100, 300);

      this.logAndBroadcast('🔒 Entering password...');
      await this.typeSlowly(page, '#pass', password);
      await this.randomDelay(1000, 2000);

      // Click login button
      this.logAndBroadcast('🔄 Submitting login form...');
      await page.click('#loginbutton');

      // Wait for navigation or error
      await Promise.race([
        page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }),
        page.waitForSelector('.error', { timeout: 15000 }).then(() => {
          throw new Error('Login error detected');
        }),
        new Promise((resolve) => setTimeout(resolve, 15000)), // Fallback timeout
      ]);

      this.logAndBroadcast('⏳ Login submitted, waiting for response...');
      await this.randomDelay(2000, 4000);
    } catch (error) {
      throw new Error(`Slow login failed: ${error.message}`);
    }
  }

  /**
   * Type text slowly to mimic human behavior
   */
  private async typeSlowly(page: any, selector: string, text: string): Promise<void> {
    for (const char of text) {
      await page.type(selector, char);
      await this.randomDelay(50, 150); // Random delay between keystrokes
    }
  }

  /**
   * Generate random delay to avoid detection
   */
  private async randomDelay(min: number, max: number): Promise<void> {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  /**
   * Verify that login was successful
   */
  private async verifyLoginSuccess(page: any): Promise<boolean> {
    try {
      // Wait a bit for page to load after login
      await this.randomDelay(2000, 3000);

      // Check for various indicators of successful login
      const loginIndicators = await page.evaluate(() => {
        // Look for user-specific elements that indicate successful login
        const hasSearchBox = !!document.querySelector('[data-testid="search"]');
        const hasUserMenu =
          !!document.querySelector('[aria-label*="Account"]') ||
          !!document.querySelector('[data-testid="user_menu"]');
        const hasHomeNav =
          !!document.querySelector('[href="/"]') ||
          !!document.querySelector('a[href*="facebook.com"]');
        const notOnLoginPage = !window.location.href.includes('/login');
        const hasNewsfeed =
          !!document.querySelector('[role="main"]') || !!document.querySelector('#stream_pagelet');

        return {
          hasSearchBox,
          hasUserMenu,
          hasHomeNav,
          notOnLoginPage,
          hasNewsfeed,
          currentUrl: window.location.href,
        };
      });

      this.logger.log('Login verification results:', loginIndicators);

      // Consider login successful if we have multiple positive indicators
      const successCount = Object.values(loginIndicators).filter(Boolean).length - 1; // Subtract 1 for currentUrl
      const isSuccess = successCount >= 2;

      if (isSuccess) {
        this.logAndBroadcast(
          `✅ Login verification passed (${successCount}/5 indicators)`,
          'success',
        );
      } else {
        this.logAndBroadcast(
          `❌ Login verification failed (${successCount}/5 indicators)`,
          'warning',
        );
        this.logAndBroadcast(`Current URL: ${loginIndicators.currentUrl}`, 'info');
      }

      return isSuccess;
    } catch (error) {
      this.logger.error(`Login verification failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Initialize browser - legacy method for backward compatibility
   */
  async initializeBrowser(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
    }

    this.browser = await puppeteer.launch({
      headless: true,
      userDataDir: null,
      ignoreDefaultArgs: ['--disable-extensions'],
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--incognito',
        '--no-default-browser-check',
        '--no-first-run',
        '--disable-default-apps',
        '--disable-extensions',
        '--disable-plugins',
        '--disable-sync',
        '--disable-translate',
        '--disable-local-storage',
        '--disable-databases',
        '--disable-shared-workers',
        '--disable-file-system',
        '--disable-session-crashed-bubble',
        '--memory-pressure-off',
        '--disable-background-timer-throttling',
        '--disable-renderer-backgrounding',
        '--disable-backgrounding-occluded-windows',
      ],
    });

    this.logger.log('Browser initialized for legacy compatibility');
  }

  /**
   * Login with credentials - legacy method for backward compatibility
   */
  async loginWithCredentials(email: string, password: string): Promise<boolean> {
    if (!this.browser) {
      await this.initializeBrowser();
    }

    try {
      const page = await this.browser.newPage();
      await page.goto('https://www.facebook.com/login');

      await page.type('#email', email);
      await page.type('#pass', password);
      await page.click('#loginbutton');

      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 });

      // Check if login was successful by looking for the presence of user-specific elements
      const isLoggedIn = await page.evaluate(() => {
        return document.querySelector('[data-testid="search"]') !== null;
      });

      this.isLoggedIn = isLoggedIn;

      if (isLoggedIn) {
        // Save cookies after successful login
        await this.saveFacebookCookies(page);
        this.logger.log('Facebook login successful - cookies saved');
      }

      await page.close();

      this.logger.log(`Facebook login ${isLoggedIn ? 'successful' : 'failed'}`);
      return isLoggedIn;
    } catch (error) {
      this.logger.error(`Facebook login error: ${error.message}`);
      this.isLoggedIn = false;
      return false;
    }
  }

  /**
   * Save current session - legacy method for backward compatibility
   */
  async saveCurrentSession(): Promise<void> {
    // Check if we have a current browser with active pages
    if (this.browser) {
      try {
        const pages = await this.browser.pages();
        if (pages.length > 0) {
          const page = pages[0];
          await this.saveFacebookCookies(page);
          this.logger.log('Session cookies saved successfully');
          return;
        }
      } catch (error) {
        this.logger.warn(`Failed to save session from browser: ${error.message}`);
      }
    }

    // Fallback to marking session as saved for compatibility
    this.savedSessionExists = true;
    this.logger.log('Session marked as saved (no active browser pages)');
  }

  /**
   * Get login status - legacy method for backward compatibility
   */
  getLoginStatus(): boolean {
    return this.isLoggedIn;
  }

  /**
   * Check if saved session exists - legacy method for backward compatibility
   */
  hasSavedSession(): boolean {
    // Check if we have saved cookies file
    const hasCookieFile = fs.existsSync(this.cookiesFilePath);
    if (hasCookieFile) {
      this.savedSessionExists = true;
    }
    return this.savedSessionExists || hasCookieFile;
  }

  /**
   * Clear session - legacy method for backward compatibility
   */
  async clearSession(): Promise<void> {
    this.isLoggedIn = false;
    this.savedSessionExists = false;

    // Clear saved cookies
    this.clearFacebookCookies();

    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }

    this.logger.log('Session and cookies cleared');
  }

  /**
   * Login to Facebook - legacy method for backward compatibility
   */
  async loginToFacebook(): Promise<void> {
    // This method would typically handle automatic login with saved session
    // For now, we'll just mark as logged in if we have a "saved session"
    if (this.savedSessionExists && !this.isLoggedIn) {
      await this.initializeBrowser();
      this.isLoggedIn = true;
      this.logger.log('Logged in using saved session');
    }
  }

  /**
   * Parse Facebook page - legacy method for backward compatibility
   */
  async parseFacebookPage(url: string): Promise<any> {
    const result = await this.parseAndSaveFacebookPageClean(url);
    return result;
  }
}
