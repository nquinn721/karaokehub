import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GenerativeModel, GoogleGenerativeAI } from '@google/generative-ai';
import * as puppeteer from 'puppeteer';
import * as sharp from 'sharp';

export interface FacebookPageData {
  url: string;
  type: 'group' | 'profile' | 'page';
  screenshots: string[]; // base64 encoded images
  htmlContent: string;
  extractedText: string;
  posts: FacebookPost[];
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
  private isLoggedIn = false;
  private browser: puppeteer.Browser | null = null;
  private page: puppeteer.Page | null = null;

  constructor(private readonly configService: ConfigService) {
    const geminiApiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!geminiApiKey) {
      throw new Error('GEMINI_API_KEY is required');
    }
    this.genAI = new GoogleGenerativeAI(geminiApiKey);
  }

  /**
   * Initialize Puppeteer browser with Facebook-optimized settings
   */
  async initializeBrowser(): Promise<void> {
    if (this.browser) {
      return; // Already initialized
    }

    this.logger.log('Initializing Facebook parser browser...');

    try {
      this.browser = await puppeteer.launch({
        headless: false, // Set to false for debugging login process
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
          '--window-size=1920,1080'
        ],
        defaultViewport: { width: 1920, height: 1080 },
        timeout: 60000,
      });

      this.page = await this.browser.newPage();

      // Set realistic user agent and headers
      await this.page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      );

      await this.page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      });

      // Remove automation indicators
      await this.page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', {
          get: () => undefined,
        });
        (window as any).chrome = {
          runtime: {},
        };
      });

      this.logger.log('Facebook parser browser initialized successfully');
    } catch (error) {
      this.logger.error(`Failed to initialize browser: ${error.message}`);
      throw error;
    }
  }

  /**
   * Login to Facebook using stored credentials
   */
  async loginToFacebook(): Promise<void> {
    if (this.isLoggedIn) {
      this.logger.log('Already logged in to Facebook');
      return;
    }

    if (!this.page) {
      await this.initializeBrowser();
    }

    const email = this.configService.get<string>('FACEBOOK_EMAIL');
    const password = this.configService.get<string>('FACEBOOK_PASSWORD');

    if (!email || !password) {
      throw new Error('Facebook login credentials not found. Please set FACEBOOK_EMAIL and FACEBOOK_PASSWORD in .env file');
    }

    this.logger.log('Logging in to Facebook...');

    try {
      // Navigate to Facebook login page
      await this.page!.goto('https://www.facebook.com/login', {
        waitUntil: 'networkidle2',
        timeout: 30000,
      });

      // Wait for login form
      await this.page!.waitForSelector('#email', { timeout: 10000 });

      // Fill in credentials
      await this.page!.type('#email', email, { delay: 100 });
      await this.page!.type('#pass', password, { delay: 100 });

      // Click login button
      await this.page!.click('#loginbutton');

      // Wait for navigation after login
      await this.page!.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });

      // Check if login was successful
      const currentUrl = this.page!.url();
      if (currentUrl.includes('facebook.com') && !currentUrl.includes('login')) {
        this.isLoggedIn = true;
        this.logger.log('Successfully logged in to Facebook');

        // Handle any post-login dialogs/popups
        await this.handlePostLoginDialogs();
      } else {
        throw new Error('Login failed - still on login page');
      }

    } catch (error) {
      this.logger.error(`Facebook login failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Handle any dialogs or popups that appear after login
   */
  private async handlePostLoginDialogs(): Promise<void> {
    try {
      // Wait a bit for any dialogs to appear
      await new Promise(resolve => setTimeout(resolve, 3000));

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
            this.logger.log(`Dismissed dialog with selector: ${selector}`);
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        } catch (e) {
          // Ignore errors - dialog might not exist
        }
      }

      // Try pressing Escape key to close any remaining dialogs
      await this.page!.keyboard.press('Escape');

    } catch (error) {
      this.logger.warn(`Error handling post-login dialogs: ${error.message}`);
    }
  }

  /**
   * Parse a Facebook group or page
   */
  async parseFacebookPage(url: string): Promise<ParsedFacebookData> {
    this.logger.log(`Starting Facebook parsing for: ${url}`);

    try {
      // Ensure we're logged in
      await this.loginToFacebook();

      // Navigate to the target page/group
      await this.page!.goto(url, {
        waitUntil: 'networkidle2',
        timeout: 30000,
      });

      // Wait for page content to load
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Determine page type
      const pageType = this.determineFacebookPageType(url);
      this.logger.log(`Detected Facebook page type: ${pageType}`);

      // Extract data based on page type
      let pageData: FacebookPageData;
      switch (pageType) {
        case 'group':
          pageData = await this.extractGroupData(url);
          break;
        case 'profile':
          pageData = await this.extractProfileData(url);
          break;
        case 'page':
          pageData = await this.extractPageData(url);
          break;
        default:
          pageData = await this.extractGenericData(url);
      }

      // Parse the extracted data with Gemini
      return await this.parseWithGemini(pageData);

    } catch (error) {
      this.logger.error(`Facebook parsing failed: ${error.message}`);
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
   * Extract data from Facebook groups
   */
  private async extractGroupData(url: string): Promise<FacebookPageData> {
    this.logger.log('Extracting Facebook group data...');

    const screenshots: string[] = [];
    const posts: FacebookPost[] = [];

    try {
      // Take initial screenshot
      const initialScreenshot = await this.captureScreenshot();
      screenshots.push(initialScreenshot);

      // Scroll to load more posts
      for (let i = 0; i < 5; i++) {
        await this.page!.evaluate(() => {
          window.scrollBy(0, window.innerHeight * 0.8);
        });
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Take screenshot after scrolling
        const scrollScreenshot = await this.captureScreenshot();
        screenshots.push(scrollScreenshot);
      }

      // Extract post data
      const extractedPosts = await this.page!.evaluate(() => {
        const postElements = document.querySelectorAll('[data-testid="story-body"], [role="article"]');
        const posts = [];

        postElements.forEach((postEl, index) => {
          if (index > 20) return; // Limit to first 20 posts

          const post: any = {
            author: '',
            content: '',
            timestamp: '',
          };

          // Extract author
          const authorEl = postEl.querySelector('[data-testid="post_author_name"], strong a');
          if (authorEl) {
            post.author = authorEl.textContent?.trim() || '';
          }

          // Extract content
          const contentEl = postEl.querySelector('[data-testid="post_message"], .userContent');
          if (contentEl) {
            post.content = contentEl.textContent?.trim() || '';
          }

          // Extract timestamp
          const timeEl = postEl.querySelector('time');
          if (timeEl) {
            post.timestamp = timeEl.getAttribute('datetime') || timeEl.textContent?.trim() || '';
          }

          // Only include posts with substantial content
          if (post.content && post.content.length > 20) {
            posts.push(post);
          }
        });

        return posts;
      });

      posts.push(...extractedPosts);

      // Get HTML content
      const htmlContent = await this.page!.content();

      // Extract all text content
      const extractedText = await this.page!.evaluate(() => {
        return document.body.innerText;
      });

      this.logger.log(`Extracted ${posts.length} posts and ${screenshots.length} screenshots from group`);

      return {
        url,
        type: 'group',
        screenshots,
        htmlContent,
        extractedText,
        posts,
      };

    } catch (error) {
      this.logger.error(`Error extracting group data: ${error.message}`);
      throw error;
    }
  }

  /**
   * Extract data from Facebook profiles
   */
  private async extractProfileData(url: string): Promise<FacebookPageData> {
    this.logger.log('Extracting Facebook profile data...');

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
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Capture posts screenshots
      for (let i = 0; i < 3; i++) {
        const postScreenshot = await this.captureScreenshot();
        screenshots.push(postScreenshot);

        await this.page!.evaluate(() => {
          window.scrollBy(0, window.innerHeight * 0.8);
        });
        await new Promise(resolve => setTimeout(resolve, 3000));
      }

      // Extract profile and post data
      const profileData = await this.page!.evaluate(() => {
        // Get profile info
        const profileName = document.querySelector('h1')?.textContent?.trim() || '';
        const bio = document.querySelector('[data-testid="user-biography"]')?.textContent?.trim() || '';

        // Get posts
        const postElements = document.querySelectorAll('[data-testid="story-body"], [role="article"]');
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
          fullText: document.body.innerText
        };
      });

      posts.push(...profileData.posts);

      const htmlContent = await this.page!.content();

      this.logger.log(`Extracted ${posts.length} posts from profile: ${profileData.profileName}`);

      return {
        url,
        type: 'profile',
        screenshots,
        htmlContent,
        extractedText: profileData.fullText,
        posts,
      };

    } catch (error) {
      this.logger.error(`Error extracting profile data: ${error.message}`);
      throw error;
    }
  }

  /**
   * Extract data from Facebook pages
   */
  private async extractPageData(url: string): Promise<FacebookPageData> {
    this.logger.log('Extracting Facebook page data...');
    
    // Similar to profile but with page-specific selectors
    return this.extractProfileData(url); // For now, use same logic
  }

  /**
   * Extract data from unknown Facebook page types
   */
  private async extractGenericData(url: string): Promise<FacebookPageData> {
    this.logger.log('Extracting generic Facebook data...');
    
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
      this.logger.error(`Error capturing screenshot: ${error.message}`);
      throw error;
    }
  }

  /**
   * Parse Facebook data using Gemini Vision and text analysis
   */
  private async parseWithGemini(pageData: FacebookPageData): Promise<ParsedFacebookData> {
    this.logger.log(`Parsing Facebook data with Gemini Vision (${pageData.screenshots.length} screenshots, ${pageData.posts.length} posts)`);

    try {
      const model = this.genAI.getGenerativeModel({
        model: 'gemini-2.0-flash-exp',
        generationConfig: {
          temperature: 0.1,
          topP: 0.8,
          topK: 40,
          maxOutputTokens: 8192,
        },
      });

      // Prepare text content
      let textContent = `FACEBOOK PAGE TYPE: ${pageData.type}\nURL: ${pageData.url}\n\n`;
      
      if (pageData.posts.length > 0) {
        textContent += `POSTS:\n`;
        pageData.posts.forEach((post, index) => {
          textContent += `POST ${index + 1}:\n`;
          textContent += `Author: ${post.author}\n`;
          textContent += `Content: ${post.content}\n`;
          if (post.timestamp) textContent += `Time: ${post.timestamp}\n`;
          textContent += `\n`;
        });
      }

      // Prepare the comprehensive prompt
      const prompt = `Analyze this Facebook ${pageData.type} and extract ALL karaoke-related shows and venue information.

🎯 FACEBOOK CONTENT ANALYSIS:
You have access to:
1. Screenshots showing the visual layout and posts
2. Text content extracted from posts and descriptions
3. HTML structure for additional context

CONTENT TO ANALYZE:
${textContent}

🚨 EXTRACTION REQUIREMENTS:

📍 VENUE & ADDRESS EXTRACTION:
- Look for venue names in posts and comments
- Extract complete addresses when mentioned
- Find phone numbers and websites for venues
- Look for recurring venues mentioned across multiple posts

🕘 TIME & SCHEDULE EXTRACTION:
- Extract specific show times and days
- Look for weekly schedules
- Find recurring events and regular shows
- Convert times to both "7 pm" and "19:00" formats

🎤 DJ & HOST EXTRACTION:
- Find DJ names and hosts mentioned in posts
- Look for "@mentions" of karaoke hosts
- Extract contact information if available

🗓️ EVENT EXTRACTION:
- Each venue + day combination = separate show
- Look for patterns like "Monday at Venue X", "Tuesday karaoke at Y"
- Extract special events and regular weekly shows

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
      "context": "Facebook posts/profile"
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
      const imageParts = pageData.screenshots.map(screenshot => ({
        inlineData: {
          data: screenshot,
          mimeType: 'image/jpeg',
        },
      }));

      this.logger.log(`Making Gemini request with ${imageParts.length} images and ${textContent.length} chars of text`);

      // Make the Gemini request
      const result = await model.generateContent([prompt, ...imageParts]);
      const response = await result.response;
      const text = response.text();

      this.logger.log('Gemini analysis complete, parsing JSON response');

      // Parse JSON response
      const cleanJsonString = this.cleanGeminiResponse(text);
      let parsedData;

      try {
        parsedData = JSON.parse(cleanJsonString);
        this.logger.log('✅ Facebook data JSON parsing successful');
      } catch (jsonError) {
        this.logger.error(`❌ Facebook data JSON parsing failed: ${jsonError.message}`);
        
        // Try to extract partial data
        parsedData = this.extractPartialDataFromResponse(text, pageData.url);
        if (!parsedData) {
          throw new Error(`Facebook data JSON parsing failed: ${jsonError.message}`);
        }
      }

      // Ensure required structure
      const finalData: ParsedFacebookData = {
        vendor: parsedData.vendor || {
          name: 'Facebook Page',
          website: pageData.url,
          description: 'Parsed from Facebook content',
          confidence: 0.5
        },
        djs: Array.isArray(parsedData.djs) ? parsedData.djs : [],
        shows: Array.isArray(parsedData.shows) ? parsedData.shows : [],
        rawData: {
          url: pageData.url,
          title: `Facebook ${pageData.type} Analysis`,
          content: textContent.substring(0, 1000),
          parsedAt: new Date(),
        },
      };

      this.logger.log(
        `Facebook parsing complete: ${finalData.shows.length} shows, ${finalData.djs.length} DJs`
      );

      return finalData;

    } catch (error) {
      this.logger.error(`Error parsing Facebook data with Gemini: ${error.message}`);
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
      this.logger.warn('Attempting to extract partial data from malformed response');
      
      // Basic extraction patterns
      const venuePattern = /"venue"\s*:\s*"([^"]+)"/g;
      const djPattern = /"djName"\s*:\s*"([^"]+)"/g;
      
      const venues = Array.from(text.matchAll(venuePattern)).map(m => m[1]);
      const djs = Array.from(text.matchAll(djPattern)).map(m => m[1]);
      
      if (venues.length > 0) {
        return {
          vendor: {
            name: 'Facebook Page',
            website: url,
            description: 'Partial extraction from Facebook',
            confidence: 0.3
          },
          djs: [...new Set(djs)].map(name => ({
            name,
            confidence: 0.3,
            context: 'Facebook content'
          })),
          shows: venues.map(venue => ({
            venue,
            time: 'See post for details', // Required field
            confidence: 0.3
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
      this.logger.error(`Partial extraction failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Close browser and cleanup
   */
  async cleanup(): Promise<void> {
    this.logger.log('Cleaning up Facebook parser...');
    
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
      this.logger.log('Facebook parser cleanup complete');
    } catch (error) {
      this.logger.error(`Error during cleanup: ${error.message}`);
    }
  }

  /**
   * Get current login status
   */
  getLoginStatus(): boolean {
    return this.isLoggedIn;
  }
}
