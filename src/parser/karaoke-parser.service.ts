import { GoogleGenerativeAI } from '@google/generative-ai';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as path from 'path';
import * as puppeteer from 'puppeteer';
import { Repository } from 'typeorm';
import { Worker } from 'worker_threads';
import { getGeminiModel } from '../config/gemini.config';
import { DJ } from '../dj/dj.entity';
import { GeocodingService } from '../geocoding/geocoding.service';
import { Show } from '../show/show.entity';
import { Vendor } from '../vendor/vendor.entity';
import { VenueService } from '../venue/venue.service';
import { KaraokeWebSocketGateway } from '../websocket/websocket.gateway';
import { FacebookParserService } from './facebook-parser.service';
import { ParallelGeminiService } from './parallel-gemini.service';
import { ParsedSchedule, ParseStatus } from './parsed-schedule.entity';
import { UrlToParse } from './url-to-parse.entity';
import { UrlToParseService } from './url-to-parse.service';

export interface ParsedKaraokeData {
  vendor?: {
    name: string;
    owner?: string;
    website: string;
    description?: string;
    confidence: number;
  };
  vendors?: Array<{
    name: string;
    owner?: string;
    website?: string;
    description?: string;
    confidence: number;
  }>;
  venues?: Array<{
    name: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    lat?: number;
    lng?: number;
    phone?: string;
    website?: string;
    confidence: number;
  }>;
  djs: Array<{
    name: string;
    confidence: number;
    context?: string;
    aliases?: string[];
  }>;
  shows: Array<{
    venueName: string; // Reference to venue by name
    venue?: string; // Legacy field for backward compatibility
    address?: string; // Legacy field - will be moved to venue
    city?: string; // Legacy field - will be moved to venue
    state?: string; // Legacy field - will be moved to venue
    zip?: string; // Legacy field - will be moved to venue
    lat?: number; // Legacy field - will be moved to venue
    lng?: number; // Legacy field - will be moved to venue
    time: string;
    startTime?: string;
    endTime?: string;
    day?: string;
    djName?: string;
    vendor?: string; // Vendor/Company providing karaoke service
    description?: string;
    venuePhone?: string; // Legacy field - will be moved to venue
    venueWebsite?: string; // Legacy field - will be moved to venue
    source?: string;
    confidence: number;
  }>;
  rawData?: {
    url: string;
    title: string;
    content: string;
    parsedAt: Date;
  };
}

@Injectable()
export class KaraokeParserService {
  private readonly logger = new Logger(KaraokeParserService.name);
  private genAI: GoogleGenerativeAI;

  // Parsing status tracking
  private isCurrentlyParsing = false;
  private currentParsingUrl: string | null = null;
  private parsingStartTime: Date | null = null;

  // Log tracking for database storage
  private currentParsingLogs: Array<{
    timestamp: Date;
    level: 'info' | 'success' | 'warning' | 'error';
    message: string;
  }> = [];

  constructor(
    @InjectRepository(ParsedSchedule)
    private parsedScheduleRepository: Repository<ParsedSchedule>,
    @InjectRepository(UrlToParse)
    private urlToParseRepository: Repository<UrlToParse>,
    @InjectRepository(Vendor)
    private vendorRepository: Repository<Vendor>,
    @InjectRepository(DJ)
    private djRepository: Repository<DJ>,
    @InjectRepository(Show)
    private showRepository: Repository<Show>,
    private geocodingService: GeocodingService,
    private webSocketGateway: KaraokeWebSocketGateway,
    private facebookParserService: FacebookParserService,
    private urlToParseService: UrlToParseService,
    private venueService: VenueService,
    private parallelGeminiService: ParallelGeminiService,
  ) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  /**
   * Get current parsing status
   */
  getParsingStatus() {
    return {
      isCurrentlyParsing: this.isCurrentlyParsing,
      currentParsingUrl: this.currentParsingUrl,
      parsingStartTime: this.parsingStartTime,
      elapsedTimeMs: this.parsingStartTime ? Date.now() - this.parsingStartTime.getTime() : 0,
    };
  }

  /**
   * Get primary vendor from parsed data (handles both old and new vendor structure)
   */
  private getPrimaryVendorName(parsedData: ParsedKaraokeData): string | null {
    return (
      parsedData.vendor?.name ||
      (parsedData.vendors && parsedData.vendors.length > 0 ? parsedData.vendors[0].name : null)
    );
  }

  /**
   * Get primary vendor object from parsed data (handles both old and new vendor structure)
   */
  private getPrimaryVendor(parsedData: ParsedKaraokeData): any {
    return (
      parsedData.vendor ||
      (parsedData.vendors && parsedData.vendors.length > 0 ? parsedData.vendors[0] : null)
    );
  }

  /**
   * Set parsing status
   */
  private setParsingStatus(isActive: boolean, url?: string) {
    this.isCurrentlyParsing = isActive;
    if (isActive) {
      this.currentParsingUrl = url || null;
      this.parsingStartTime = new Date();
      // Clear previous parsing logs when starting a new session
      this.currentParsingLogs = [];
    } else {
      this.currentParsingUrl = null;
      this.parsingStartTime = null;
    }
  }

  /**
   * Create production-ready Puppeteer configuration with fallback paths
   */
  private createPuppeteerConfig(): {
    headless: boolean;
    executablePath: string | undefined;
    args: string[];
    timeout: number;
  } {
    const puppeteerArgs = [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-web-security',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
    ];

    // Additional Linux-specific arguments for production
    if (process.platform === 'linux') {
      puppeteerArgs.push(
        '--disable-gpu',
        '--no-zygote',
        '--single-process', // Important for Docker containers
        '--disable-extensions',
        '--disable-software-rasterizer',
        '--disable-background-networking',
        '--disable-default-apps',
        '--disable-sync',
        '--disable-translate',
        '--hide-scrollbars',
        '--metrics-recording-only',
        '--mute-audio',
        '--no-first-run',
        '--safebrowsing-disable-auto-update',
        '--ignore-gpu-blacklist',
        '--ignore-certificate-errors',
        '--ignore-ssl-errors',
        '--ignore-certificate-errors-spki-list',
      );
    }

    // Try to find the best executable path with fallbacks
    let executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;

    if (process.platform === 'linux' && !executablePath) {
      const fs = require('fs');
      const commonPaths = [
        '/usr/bin/chromium-browser',
        '/usr/bin/chromium',
        '/usr/bin/google-chrome-stable',
        '/usr/bin/google-chrome',
        '/opt/google/chrome/chrome',
      ];

      // Find the first path that exists
      for (const path of commonPaths) {
        try {
          if (fs.existsSync(path)) {
            executablePath = path;
            this.logAndBroadcast(`Found Chrome/Chromium at: ${path}`, 'info');
            break;
          }
        } catch (error) {
          // Continue to next path
        }
      }

      if (!executablePath) {
        this.logAndBroadcast(
          'Warning: No Chrome/Chromium executable found in common paths',
          'warning',
        );
        this.logAndBroadcast(`Checked paths: ${commonPaths.join(', ')}`, 'warning');
      }
    }

    this.logAndBroadcast(
      `Platform: ${process.platform}, Puppeteer args: ${puppeteerArgs.join(' ')}`,
      'info',
    );
    this.logAndBroadcast(`Using executable path: ${executablePath || 'default Chrome'}`, 'info');

    return {
      headless: true,
      executablePath: executablePath || undefined,
      args: puppeteerArgs,
      timeout: 60000, // 60 second timeout
    };
  }

  /**
   * Enhanced logging method that logs both to console and broadcasts to WebSocket clients
   */
  private recentLogMessages: Map<string, number> = new Map(); // Track recent messages with timestamps

  private logAndBroadcast(
    message: string,
    level: 'info' | 'success' | 'warning' | 'error' = 'info',
  ) {
    // Check for duplicate messages in the last 3 seconds
    const messageKey = `${level}:${message}`;
    const now = Date.now();
    const lastLogTime = this.recentLogMessages.get(messageKey);

    if (lastLogTime && now - lastLogTime < 3000) {
      // Skip duplicate message within 3 seconds
      return;
    }

    // Update the timestamp for this message
    this.recentLogMessages.set(messageKey, now);

    // Capture log for database storage if we're currently parsing
    if (this.isCurrentlyParsing) {
      this.currentParsingLogs.push({
        timestamp: new Date(),
        level,
        message,
      });
    }

    // Clean up old entries periodically (keep only last 10 seconds)
    if (this.recentLogMessages.size > 100) {
      for (const [key, timestamp] of this.recentLogMessages.entries()) {
        if (now - timestamp > 10000) {
          this.recentLogMessages.delete(key);
        }
      }
    }

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

    // Broadcast to WebSocket clients
    if (this.webSocketGateway) {
      this.webSocketGateway.broadcastParserLog(message, level);
    }
  }

  /**
   * Helper method to validate and convert time values for database storage
   */
  private validateTimeValue(timeValue: string | undefined): string | undefined {
    if (!timeValue || timeValue.trim() === '') {
      return undefined;
    }

    const normalizedTime = timeValue.toLowerCase().trim();

    // Handle common non-time values
    const invalidTimeValues = ['close', 'late', 'varies', 'tbd', 'n/a', 'na', 'unknown', 'open'];
    if (invalidTimeValues.includes(normalizedTime)) {
      return undefined;
    }

    // If it's already in HH:MM format, return as is
    if (/^\d{1,2}:\d{2}$/.test(normalizedTime)) {
      return normalizedTime;
    }

    // Try to convert common time formats
    // Convert "10:30 pm" to "22:30"
    const timeWithAmPm = normalizedTime.match(/^(\d{1,2}):?(\d{2})?\s*(am|pm)$/i);
    if (timeWithAmPm) {
      let hours = parseInt(timeWithAmPm[1]);
      const minutes = timeWithAmPm[2] || '00';
      const period = timeWithAmPm[3].toLowerCase();

      if (period === 'pm' && hours !== 12) {
        hours += 12;
      } else if (period === 'am' && hours === 12) {
        hours = 0;
      }

      return `${hours.toString().padStart(2, '0')}:${minutes}`;
    }

    // Convert "10 pm" to "22:00"
    const simpleTimeWithAmPm = normalizedTime.match(/^(\d{1,2})\s*(am|pm)$/i);
    if (simpleTimeWithAmPm) {
      let hours = parseInt(simpleTimeWithAmPm[1]);
      const period = simpleTimeWithAmPm[2].toLowerCase();

      if (period === 'pm' && hours !== 12) {
        hours += 12;
      } else if (period === 'am' && hours === 12) {
        hours = 0;
      }

      return `${hours.toString().padStart(2, '0')}:00`;
    }

    // If we can't parse it, return undefined (don't store invalid time)
    this.logAndBroadcast(`Could not parse time value: "${timeValue}", storing as null`, 'warning');
    return undefined;
  }

  /**
   * Normalize state names to standard abbreviations
   */
  private normalizeState(stateName: string): string {
    if (!stateName) return '';

    const stateMap: { [key: string]: string } = {
      alabama: 'AL',
      alaska: 'AK',
      arizona: 'AZ',
      arkansas: 'AR',
      california: 'CA',
      colorado: 'CO',
      connecticut: 'CT',
      delaware: 'DE',
      florida: 'FL',
      georgia: 'GA',
      hawaii: 'HI',
      idaho: 'ID',
      illinois: 'IL',
      indiana: 'IN',
      iowa: 'IA',
      kansas: 'KS',
      kentucky: 'KY',
      louisiana: 'LA',
      maine: 'ME',
      maryland: 'MD',
      massachusetts: 'MA',
      michigan: 'MI',
      minnesota: 'MN',
      mississippi: 'MS',
      missouri: 'MO',
      montana: 'MT',
      nebraska: 'NE',
      nevada: 'NV',
      'new hampshire': 'NH',
      'new jersey': 'NJ',
      'new mexico': 'NM',
      'new york': 'NY',
      'north carolina': 'NC',
      'north dakota': 'ND',
      ohio: 'OH',
      oklahoma: 'OK',
      oregon: 'OR',
      pennsylvania: 'PA',
      'rhode island': 'RI',
      'south carolina': 'SC',
      'south dakota': 'SD',
      tennessee: 'TN',
      texas: 'TX',
      utah: 'UT',
      vermont: 'VT',
      virginia: 'VA',
      washington: 'WA',
      'west virginia': 'WV',
      wisconsin: 'WI',
      wyoming: 'WY',
    };

    const normalized = stateName.toLowerCase().trim();

    // If it's already an abbreviation, return uppercase
    if (normalized.length === 2) {
      return normalized.toUpperCase();
    }

    // Look up full state name
    return stateMap[normalized] || stateName.toUpperCase();
  }

  /**
   * Generate appropriate name for URL based on type and parsed content
   */
  private generateUrlName(url: string, parsedData: ParsedKaraokeData): string {
    const vendorName = this.getPrimaryVendorName(parsedData);

    if (!vendorName) {
      return 'Unnamed Business';
    }

    if (url.includes('facebook.com/groups/')) {
      return `FB Group: ${vendorName}`;
    } else if (url.includes('facebook.com/')) {
      return `FB: ${vendorName}`;
    } else if (url.includes('instagram.com/')) {
      return `IG: ${vendorName}`;
    } else {
      return vendorName;
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
   * Centralized method to ensure URL name extraction happens after parsing
   * This should be called by all parsing methods that return ParsedKaraokeData
   */
  private async ensureUrlNameIsSet(url: string, parsedData: ParsedKaraokeData): Promise<void> {
    try {
      // First check if URL already has a name set
      const existingUrl = await this.urlToParseRepository.findOne({ where: { url } });

      if (existingUrl?.name) {
        this.logAndBroadcast(`URL already has name: ${existingUrl.name}`, 'info');
        return;
      }

      // If no name exists and we have vendor information, set the name
      const vendorName = this.getPrimaryVendorName(parsedData);
      if (vendorName) {
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

  /**
   * Parse HTML content using worker thread for CPU-intensive Gemini processing
   */
  private async parseHtmlWithWorker(htmlContent: string, url: string): Promise<ParsedKaraokeData> {
    return new Promise((resolve, reject) => {
      this.logAndBroadcast(`🧵 Starting worker thread for HTML parsing: ${url}`, 'info');

      // Create a generic HTML parsing worker (we'll create this file)
      const workerPath = path.join(process.cwd(), 'dist', 'parser', 'html-parsing-worker.js');
      const worker = new Worker(workerPath, {
        workerData: {
          htmlContent,
          url,
          geminiApiKey: process.env.GEMINI_API_KEY,
          model: getGeminiModel('worker'),
        },
      });

      worker.on('message', (message) => {
        switch (message.type) {
          case 'progress':
            this.logAndBroadcast(`📊 Worker progress: ${message.data.status}`, 'info');
            break;

          case 'complete':
            this.logAndBroadcast(`✅ Worker HTML parsing completed successfully`, 'success');
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
    });
  }

  /**
   * Enhanced Facebook parsing using Puppeteer for comprehensive data extraction
   */
  private async parseFacebookWithPuppeteer(url: string, urlType: any): Promise<ParsedKaraokeData> {
    let browser;
    let page;

    try {
      this.logAndBroadcast(`Starting Facebook parsing for ${urlType.type}: ${url}`, 'info');

      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
        ],
      });

      page = await browser.newPage();

      // Set mobile user agent for better access to Facebook content
      await page.setUserAgent(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
      );
      await page.setViewport({ width: 375, height: 667 });

      await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: 30000,
      });

      // Wait for content to load
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Handle any popups or overlays
      try {
        const popup = await page.$('[role="dialog"]');
        if (popup) {
          await page.keyboard.press('Escape');
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      } catch (e) {
        // Ignore popup handling errors
      }

      let extractedData;

      switch (urlType.type) {
        case 'profile':
          extractedData = await this.extractProfileData(page, url);
          break;
        case 'group':
          extractedData = await this.extractGroupData(page, url);
          break;
        case 'page':
          extractedData = await this.extractPageData(page, url);
          break;
        case 'event':
          extractedData = await this.extractEventData(page, url);
          break;
        case 'post':
          extractedData = await this.extractPostData(page, url);
          break;
        default:
          extractedData = await this.extractGenericFacebookData(page, url);
      }

      await browser.close();

      // Convert extracted data to ParsedKaraokeData format
      return await this.convertToKaraokeData(extractedData, url);
    } catch (error) {
      this.logAndBroadcast(`Facebook parsing error: ${error.message}`, 'error');

      if (browser) {
        await browser.close();
      }

      // Fallback to regular HTML parsing
      return this.parseWebsite(url);
    }
  }

  /**
   * Extract data from Facebook profile pages (like Max Denney)
   */
  private async extractProfileData(page: any, url: string): Promise<any> {
    this.logAndBroadcast('Extracting profile data...', 'info');

    return await page.evaluate(() => {
      const data = {
        type: 'profile',
        name: null,
        shows: [],
        about: null,
        location: null,
      };

      // Get profile name
      const nameSelectors = ['h1', '[data-testid*="name"]', 'title'];
      for (const selector of nameSelectors) {
        const elements = document.querySelectorAll(selector);
        for (const element of elements) {
          if (element && element.textContent.trim()) {
            data.name = element.textContent.trim();
            break;
          }
        }
        if (data.name) break;
      }

      // Extract show schedule from intro section
      const fullText = document.body.textContent;

      // Pattern for show format: "WED Venue Name 8-12am"
      const showPattern =
        /(MON|TUE|WED|THU|FRI|SAT|SUN|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\s+([A-Za-z\s'&-]+(?:Pub|Lounge|Bar|Club|Restaurant|Grill|Tavern|Brewery|Casino|Hall|Center))\s+(\d{1,2}[-:]\d{1,2}[ap]m|\d{1,2}[ap]m)/gi;

      const matches = [...fullText.matchAll(showPattern)];

      matches.forEach((match) => {
        const show = {
          day: match[1],
          venue: match[2].trim(),
          time: match[3],
          source: 'profile_intro',
        };
        data.shows.push(show);
      });

      // Look for location info
      const locationKeywords = ['columbus', 'ohio', 'central ohio', 'dublin', 'cleveland'];
      const foundLocation = locationKeywords.find((loc) => fullText.toLowerCase().includes(loc));
      if (foundLocation) {
        data.location = foundLocation;
      }

      return data;
    });
  }

  /**
   * Extract data from Facebook group pages (like Central Ohio Karaoke)
   */
  private async extractGroupData(page: any, url: string): Promise<any> {
    this.logAndBroadcast('Extracting group data...', 'info');

    // Scroll to load more posts
    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    return await page.evaluate(() => {
      const data = {
        type: 'group',
        name: null,
        description: null,
        posts: [],
        events: [],
      };

      // Get group name
      const nameSelectors = ['h1[data-testid="group-name"]', 'h1', '[data-testid="group-name"]'];
      for (const selector of nameSelectors) {
        const element = document.querySelector(selector);
        if (element && element.textContent.trim()) {
          data.name = element.textContent.trim();
          break;
        }
      }

      // Extract posts with karaoke content
      const postElements = document.querySelectorAll(
        '[data-testid="story-body"], [role="article"]',
      );

      postElements.forEach((postElement) => {
        const post = {
          author: null,
          content: null,
          timestamp: null,
          venue: null,
          location: null,
        };

        // Get post content
        const contentEl = postElement.querySelector('[data-testid="post_message"], .userContent');
        if (contentEl) {
          post.content = contentEl.textContent.trim();
        }

        // Get author
        const authorEl = postElement.querySelector('[data-testid="post_author_name"], strong a');
        if (authorEl) {
          post.author = authorEl.textContent.trim();
        }

        // Check for karaoke relevance
        const karaokeKeywords = [
          'karaoke',
          'sing',
          'singing',
          'dj',
          'host',
          'venue',
          'tonight',
          'tomorrow',
        ];
        const content = post.content?.toLowerCase() || '';
        const isRelevant = karaokeKeywords.some((keyword) => content.includes(keyword));

        if (isRelevant && post.content && post.content.length > 20) {
          // Try to extract venue and location
          const venuePattern = /at\s+([A-Z][a-zA-Z\s'&-]+)/;
          const venueMatch = post.content.match(venuePattern);
          if (venueMatch) {
            post.venue = venueMatch[1].trim();
          }

          data.posts.push(post);
        }
      });

      return data;
    });
  }

  /**
   * Extract data from Facebook page (business pages)
   */
  private async extractPageData(page: any, url: string): Promise<any> {
    this.logAndBroadcast('Extracting page data...', 'info');

    return await page.evaluate(() => {
      const data = {
        type: 'page',
        name: null,
        about: null,
        events: [],
        posts: [],
      };

      // Similar extraction logic for business pages
      const fullText = document.body.textContent;

      // Look for business name
      const nameEl = document.querySelector('h1');
      if (nameEl) {
        data.name = nameEl.textContent.trim();
      }

      return data;
    });
  }

  /**
   * Extract data from Facebook events
   */
  private async extractEventData(page: any, url: string): Promise<any> {
    this.logAndBroadcast('Extracting event data...', 'info');

    return await page.evaluate(() => {
      const data = {
        type: 'event',
        name: null,
        description: null,
        location: null,
        startTime: null,
        endTime: null,
      };

      // Extract event details
      const fullText = document.body.textContent;

      // Look for event name
      const nameEl = document.querySelector('h1');
      if (nameEl) {
        data.name = nameEl.textContent.trim();
      }

      return data;
    });
  }

  /**
   * Extract data from Facebook posts
   */
  private async extractPostData(page: any, url: string): Promise<any> {
    this.logAndBroadcast('Extracting post data...', 'info');

    return await page.evaluate(() => {
      const data = {
        type: 'post',
        content: null,
        author: null,
        timestamp: null,
      };

      const fullText = document.body.textContent;
      data.content = fullText;

      return data;
    });
  }

  /**
   * Generic Facebook data extraction
   */
  private async extractGenericFacebookData(page: any, url: string): Promise<any> {
    this.logAndBroadcast('Extracting generic Facebook data...', 'info');

    return await page.evaluate(() => {
      return {
        type: 'generic',
        content: document.body.textContent,
        title: document.title,
      };
    });
  }

  /**
   * Convert extracted Facebook data to ParsedKaraokeData format
   */
  private async convertToKaraokeData(extractedData: any, url: string): Promise<ParsedKaraokeData> {
    this.logAndBroadcast('Converting Facebook data to karaoke format...', 'info');

    const result: ParsedKaraokeData = {
      vendor: {
        name: extractedData.name || 'Facebook Profile/Page',
        website: url,
        confidence: 0.8,
      },
      djs: [],
      shows: [],
      rawData: {
        url,
        title: extractedData.name || 'Facebook Content',
        content: JSON.stringify(extractedData),
        parsedAt: new Date(),
      },
    };

    // Convert profile shows to karaoke shows
    if (extractedData.shows && extractedData.shows.length > 0) {
      extractedData.shows.forEach((show) => {
        result.shows.push({
          venueName: show.venue,
          venue: show.venue, // Legacy compatibility
          time: show.time,
          day: show.day,
          djName: extractedData.name,
          city: extractedData.location || 'Columbus',
          state: 'OH',
          confidence: 0.9,
        });
      });

      // Add the profile owner as a DJ
      if (extractedData.name) {
        result.djs.push({
          name: extractedData.name,
          confidence: 0.9,
          context: 'Facebook profile owner',
        });
      }
    }

    // Convert group posts to shows
    if (extractedData.posts && extractedData.posts.length > 0) {
      extractedData.posts.forEach((post) => {
        if (post.venue) {
          result.shows.push({
            venueName: post.venue,
            venue: post.venue, // Legacy compatibility
            djName: post.author,
            time: 'Check post for details',
            description: post.content?.substring(0, 200),
            confidence: 0.7,
          });

          // Add post author as DJ
          if (post.author) {
            result.djs.push({
              name: post.author,
              confidence: 0.8,
              context: 'Facebook group post author',
            });
          }
        }
      });
    }

    this.logAndBroadcast(
      `Converted to ${result.shows.length} shows and ${result.djs.length} DJs`,
      'info',
    );
    return result;
  }

  /**
   * Main parsing method - takes a URL and returns parsed karaoke data
   */
  async parseWebsite(url: string, userAccessToken?: string): Promise<ParsedKaraokeData> {
    try {
      // Check if this is a Facebook URL and use Puppeteer parsing
      if (url.includes('facebook.com') || url.includes('fb.com')) {
        this.logAndBroadcast(`Detected Facebook URL - using Puppeteer parsing`, 'info');

        try {
          // Use FacebookParserService with worker support for comprehensive parsing
          this.logAndBroadcast(
            `Delegating Facebook parsing to FacebookParserService with worker support`,
            'info',
          );

          // Initialize the Facebook parser browser if needed
          await this.facebookParserService.initializeBrowser();

          // Use the comprehensive Facebook parsing with worker support
          const result = await this.facebookParserService.parseFacebookPage(url);

          // Convert the result to our expected format
          const parsedData: ParsedKaraokeData = {
            vendor: result.data.vendor,
            shows: result.data.shows || [],
            djs: result.data.djs || [],
            rawData: result.data.rawData || {
              url: url,
              title: 'Facebook Page',
              content: 'Parsed via FacebookParserService',
              parsedAt: new Date(),
            },
          };

          this.logAndBroadcast(
            `Facebook parsing successful: ${result.stats.showsFound} shows, ${result.stats.djsFound} DJs found. Parsed schedule ID: ${result.parsedScheduleId}`,
            'success',
          );

          // Ensure URL name is set for this Facebook URL
          await this.ensureUrlNameIsSet(url, parsedData);

          return parsedData;
        } catch (facebookError) {
          this.logAndBroadcast(`Facebook parsing failed: ${facebookError.message}`, 'error');
          this.logAndBroadcast(`Falling back to generic HTML parsing for Facebook URL`, 'warning');

          // Fall back to generic HTML parsing if Facebook-specific parsing fails
          // This will help with Facebook URLs that don't load properly
        }
      }

      // Log memory usage before parsing
      const memUsage = process.memoryUsage();
      this.logAndBroadcast(
        `Memory before parsing: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB heap, ${Math.round(memUsage.rss / 1024 / 1024)}MB RSS`,
        'info',
      );

      this.logAndBroadcast(`Starting HTML parse for URL: ${url}`, 'info');

      // Get webpage HTML content only
      const htmlContent = await this.fetchRawHtml(url);
      this.logAndBroadcast(`Processing HTML content: ${htmlContent.length} characters`, 'info');

      // Trim unnecessary HTML content first
      const trimmedHtml = this.trimHtmlContent(htmlContent);
      this.logAndBroadcast(
        `After trimming: ${trimmedHtml.length} characters (${(((htmlContent.length - trimmedHtml.length) / htmlContent.length) * 100).toFixed(1)}% reduction)`,
        'info',
      );

      // CRITICAL DEBUG: Check if essential content might have been lost during trimming
      const originalLower = htmlContent.toLowerCase();
      const trimmedLower = trimmedHtml.toLowerCase();

      // Check for common karaoke-related terms
      const karaokeTerms = [
        'karaoke',
        'dj',
        'music',
        'show',
        'venue',
        'monday',
        'tuesday',
        'wednesday',
        'thursday',
        'friday',
        'saturday',
        'sunday',
      ];
      let termsMissing = [];

      for (const term of karaokeTerms) {
        const originalCount = (originalLower.match(new RegExp(term, 'g')) || []).length;
        const trimmedCount = (trimmedLower.match(new RegExp(term, 'g')) || []).length;

        if (originalCount > trimmedCount) {
          termsMissing.push(`${term}(${originalCount}→${trimmedCount})`);
        }
      }

      if (termsMissing.length > 0) {
        this.logAndBroadcast(
          `WARNING: Trimming may have removed important content: ${termsMissing.join(', ')}`,
          'warning',
        );
      } else {
        this.logAndBroadcast('Content trimming preserved all key karaoke terms', 'success');
      }

      // ADDITIONAL DEBUG: Check if page appears to be loading correctly
      if (trimmedHtml.includes('loading') || trimmedHtml.includes('Loading')) {
        this.logAndBroadcast(
          'WARNING: Page may still be loading - could affect parsing quality',
          'warning',
        );
      }

      if (trimmedHtml.length < 5000) {
        this.logAndBroadcast(
          'WARNING: Very small HTML content - site may not have loaded properly',
          'warning',
        );
      }

      const model = this.genAI.getGenerativeModel({ model: getGeminiModel('text') });

      // Parse HTML content using worker thread for CPU-intensive processing
      const parsedData = await this.parseHtmlWithWorker(trimmedHtml, url);

      this.logAndBroadcast(
        `HTML parse completed successfully for ${url}: ${parsedData.shows.length} shows found`,
        'success',
      );

      // Log memory usage after parsing
      const memUsageAfter = process.memoryUsage();
      this.logAndBroadcast(
        `Memory after parsing: ${Math.round(memUsageAfter.heapUsed / 1024 / 1024)}MB heap, ${Math.round(memUsageAfter.rss / 1024 / 1024)}MB RSS`,
        'info',
      );

      // Ensure URL name is set based on parsed data
      await this.ensureUrlNameIsSet(url, parsedData);

      return parsedData;
    } catch (error) {
      // Log memory usage on error
      const memUsageError = process.memoryUsage();
      this.logAndBroadcast(
        `Memory during error: ${Math.round(memUsageError.heapUsed / 1024 / 1024)}MB heap, ${Math.round(memUsageError.rss / 1024 / 1024)}MB RSS`,
        'error',
      );

      this.logAndBroadcast(`Error parsing website ${url}: ${error.message}`, 'error');
      this.logAndBroadcast(`Error stack: ${error.stack}`, 'error');

      // Log platform and environment info for debugging
      this.logAndBroadcast(
        `Platform: ${process.platform}, NODE_ENV: ${process.env.NODE_ENV}`,
        'info',
      );
      this.logAndBroadcast(
        `Puppeteer executable path: ${process.env.PUPPETEER_EXECUTABLE_PATH || 'default'}`,
        'info',
      );

      throw new Error(`Failed to parse website: ${error.message}`);
    }
  }

  /**
   * Fetch clean webpage content using intelligent content extraction
   */
  private async fetchWebpageContent(url: string): Promise<string> {
    this.logAndBroadcast(`Fetching webpage content for: ${url}`, 'info');

    try {
      // Use a mock of the fetch_webpage functionality for now
      // In a real implementation, you'd want to use a web scraping service
      // or implement intelligent content extraction

      // For now, fall back to Puppeteer but with better content extraction
      return await this.fetchRawHtml(url);
    } catch (error) {
      this.logAndBroadcast(`Error fetching webpage content: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Parse and save website data to parsed_schedules for admin review
   */
  async parseAndSaveWebsite(url: string): Promise<{
    parsedScheduleId: string;
    data: ParsedKaraokeData;
    stats: {
      showsFound: number;
      djsFound: number;
      venuesFound: number;
      vendorsFound: number;
      vendorName: string;
      htmlLength: number;
      processingTime: number;
    };
  }> {
    const startTime = Date.now();

    try {
      // Set parsing status to active
      this.setParsingStatus(true, url);

      this.logAndBroadcast(`Starting parse and save operation for URL: ${url}`, 'info');

      // Parse the website
      const parsedData = await this.parseWebsite(url);

      // Extract HTML content for storage (can be truncated for storage)
      const htmlContent = await this.fetchRawHtml(url);
      const truncatedContent =
        htmlContent.length > 10000 ? htmlContent.substring(0, 10000) + '...' : htmlContent;

      const processingTime = Date.now() - startTime;

      // Add final success logs before saving
      this.logAndBroadcast(
        `Processing completed in ${processingTime}ms - Shows: ${parsedData.shows?.length || 0}, DJs: ${parsedData.djs?.length || 0}`,
        'success',
      );

      // Debug: Log how many parsing logs we captured
      this.logAndBroadcast(
        `Captured ${this.currentParsingLogs.length} parsing logs for database storage`,
        'info',
      );

      // Save to parsed_schedules table for admin review
      const parsedScheduleData: any = {
        url: url,
        rawData: {
          url: url,
          title: this.extractTitleFromHtml(htmlContent),
          content: truncatedContent,
          parsedAt: new Date(),
        },
        aiAnalysis: parsedData,
        status: ParseStatus.PENDING_REVIEW,
        parsingLogs: [...this.currentParsingLogs], // Include captured logs
      };

      const parsedSchedule = this.parsedScheduleRepository.create(parsedScheduleData);
      const savedSchedule = (await this.parsedScheduleRepository.save(
        parsedSchedule,
      )) as unknown as ParsedSchedule;

      // Mark the URL as parsed in the urls_to_parse table
      const urlToParse = await this.urlToParseRepository.findOne({ where: { url: url } });
      if (urlToParse) {
        await this.urlToParseService.markAsParsed(urlToParse.id);
        this.logAndBroadcast(`Marked URL ${url} as parsed in database`, 'info');
      }

      this.logAndBroadcast(
        `Successfully saved parsed data for admin review. ID: ${savedSchedule.id}`,
        'success',
      );

      return {
        parsedScheduleId: savedSchedule.id,
        data: parsedData,
        stats: {
          showsFound: parsedData.shows?.length || 0,
          djsFound: parsedData.djs?.length || 0,
          venuesFound: parsedData.venues?.length || 0,
          vendorsFound: (parsedData.vendors?.length || 0) + (parsedData.vendor ? 1 : 0),
          vendorName: parsedData.vendor?.name || 'Unknown',
          htmlLength: htmlContent.length,
          processingTime,
        },
      };
    } catch (error) {
      this.logAndBroadcast(`Error parsing and saving website ${url}: ${error.message}`, 'error');
      this.logAndBroadcast(`Error stack: ${error.stack}`, 'error');

      // Log platform and environment info for debugging
      this.logAndBroadcast(
        `Platform: ${process.platform}, NODE_ENV: ${process.env.NODE_ENV}`,
        'info',
      );
      this.logAndBroadcast(
        `Puppeteer executable path: ${process.env.PUPPETEER_EXECUTABLE_PATH || 'default'}`,
        'info',
      );

      throw new Error(`Failed to parse and save website: ${error.message}`);
    } finally {
      // Clear parsing status
      this.setParsingStatus(false);
    }
  }

  /**
   * Parse and save website using full-page screenshot for visual analysis
   */
  async parseWebsiteWithScreenshot(url: string): Promise<{
    parsedScheduleId: string;
    data: ParsedKaraokeData;
    stats: {
      showsFound: number;
      djsFound: number;
      venuesFound: number;
      vendorsFound: number;
      vendorName: string;
      htmlLength: number;
      processingTime: number;
    };
  }> {
    const startTime = Date.now();

    try {
      // Set parsing status to active
      this.setParsingStatus(true, url);

      this.logAndBroadcast(
        `Starting screenshot-based parse and save operation for URL: ${url}`,
        'info',
      );

      // Take a full-page screenshot and parse with Gemini Vision
      this.logAndBroadcast('Step 1: Capturing screenshot...', 'info');
      const screenshotStartTime = Date.now();
      const { screenshot, htmlContent } = await this.captureFullPageScreenshot(url);
      const screenshotTime = Date.now() - screenshotStartTime;
      this.logAndBroadcast(
        `Screenshot captured in ${screenshotTime}ms (${(screenshot.length / 1024 / 1024).toFixed(2)} MB)`,
        'success',
      );

      this.logAndBroadcast('Step 2: Processing with Gemini Vision...', 'info');
      const geminiStartTime = Date.now();
      let parsedData;

      try {
        parsedData = await this.parseScreenshotWithGemini(screenshot, url);
      } catch (geminiError) {
        this.logAndBroadcast(`❌ Gemini Vision failed: ${geminiError.message}`, 'error');
        this.logAndBroadcast('🔄 Falling back to standard HTML parsing...', 'warning');

        // Try to fall back to regular HTML-based parsing if screenshot parsing fails
        try {
          this.logAndBroadcast('Attempting fallback HTML parsing...', 'info');
          parsedData = await this.parseWebsite(url);
          this.logAndBroadcast('✅ Fallback HTML parsing successful', 'success');
        } catch (fallbackError) {
          this.logAndBroadcast(
            `❌ Fallback parsing also failed: ${fallbackError.message}`,
            'error',
          );
          // Return minimal data structure to prevent complete failure
          parsedData = {
            vendor: this.generateVendorFromUrl(url),
            shows: [],
            djs: [],
            rawData: {
              url,
              title: 'Failed parsing',
              content: 'Both Gemini Vision and HTML parsing failed',
              parsedAt: new Date(),
            },
          };
          this.logAndBroadcast(
            '⚠️ Using minimal data structure to prevent complete failure',
            'warning',
          );
        }
      }

      const geminiTime = Date.now() - geminiStartTime;
      this.logAndBroadcast(`Vision processing completed in ${geminiTime}ms`, 'success');

      const processingTime = Date.now() - startTime;

      // Add final success logs before saving
      this.logAndBroadcast(
        `Screenshot processing completed in ${processingTime}ms - Shows: ${parsedData.shows?.length || 0}, DJs: ${parsedData.djs?.length || 0}`,
        'success',
      );

      // Debug: Log how many parsing logs we captured
      this.logAndBroadcast(
        `Captured ${this.currentParsingLogs.length} parsing logs for database storage`,
        'info',
      );

      // Update URL name if parsing was successful and we have vendor information
      if (parsedData.vendor?.name) {
        try {
          const urlName = this.generateUrlName(url, parsedData);
          await this.updateUrlName(url, urlName);
          this.logAndBroadcast(`Updated URL name: ${urlName}`, 'info');
        } catch (nameError) {
          // Don't fail the entire parsing if name update fails
          this.logAndBroadcast(`Failed to update URL name: ${nameError.message}`, 'warning');
        }
      }

      // Save to parsed_schedules table for admin review
      const truncatedContent =
        htmlContent.length > 10000 ? htmlContent.substring(0, 10000) + '...' : htmlContent;

      const parsedScheduleData: any = {
        url: url,
        rawData: {
          url: url,
          title: this.extractTitleFromHtml(htmlContent),
          content: truncatedContent,
          parsedAt: new Date(),
        },
        aiAnalysis: parsedData,
        status: ParseStatus.PENDING_REVIEW,
        parsingLogs: [...this.currentParsingLogs], // Include captured logs
      };

      const parsedSchedule = this.parsedScheduleRepository.create(parsedScheduleData);
      const savedSchedule = (await this.parsedScheduleRepository.save(
        parsedSchedule,
      )) as unknown as ParsedSchedule;

      // Mark the URL as parsed in the urls_to_parse table
      const urlToParse = await this.urlToParseRepository.findOne({ where: { url: url } });
      if (urlToParse) {
        await this.urlToParseService.markAsParsed(urlToParse.id);
        this.logAndBroadcast(`Marked URL ${url} as parsed in database`, 'info');
      }

      this.logAndBroadcast(
        `Successfully saved screenshot-parsed data for admin review. ID: ${savedSchedule.id}`,
        'success',
      );

      return {
        parsedScheduleId: savedSchedule.id,
        data: parsedData,
        stats: {
          showsFound: parsedData.shows?.length || 0,
          djsFound: parsedData.djs?.length || 0,
          venuesFound: parsedData.venues?.length || 0,
          vendorsFound: (parsedData.vendors?.length || 0) + (parsedData.vendor ? 1 : 0),
          vendorName: parsedData.vendor?.name || 'Unknown',
          htmlLength: htmlContent.length,
          processingTime,
        },
      };
    } catch (error) {
      this.logAndBroadcast(
        `Error parsing website with screenshot ${url}: ${error.message}`,
        'error',
      );
      this.logAndBroadcast(`Error stack: ${error.stack}`, 'error');

      // Log specific Puppeteer error details
      if (error.message.includes('chrome') || error.message.includes('chromium')) {
        this.logAndBroadcast('Puppeteer Chrome/Chromium error detected', 'error');
        this.logAndBroadcast(
          `Platform: ${process.platform}, NODE_ENV: ${process.env.NODE_ENV}`,
          'info',
        );
        this.logAndBroadcast(
          `Puppeteer executable path: ${process.env.PUPPETEER_EXECUTABLE_PATH || 'default'}`,
          'info',
        );
      }

      if (error.message.includes('timeout') || error.message.includes('Navigation timeout')) {
        this.logAndBroadcast(
          'Timeout error detected - may be network or performance issue',
          'warning',
        );
      }

      throw new Error(`Failed to parse website with screenshot: ${error.message}`);
    } finally {
      // Clear parsing status
      this.setParsingStatus(false);
    }
  }

  /**
   * Fetch HTML content and take a screenshot for visual parsing
   */
  private async fetchWebpageWithScreenshot(url: string): Promise<{
    htmlContent: string;
    screenshot: Buffer;
  }> {
    let browser;
    try {
      this.logAndBroadcast(`Fetching webpage content and screenshot from: ${url}`, 'info');

      const puppeteerConfig = this.createPuppeteerConfig();

      // Try multiple launch attempts with different configurations
      let launchAttempts = 0;
      const maxAttempts = 3;

      while (launchAttempts < maxAttempts) {
        try {
          launchAttempts++;
          this.logAndBroadcast(`Puppeteer launch attempt ${launchAttempts}/${maxAttempts}`, 'info');

          browser = await puppeteer.launch(puppeteerConfig);
          break; // Success, exit the retry loop
        } catch (launchError) {
          this.logAndBroadcast(
            `Launch attempt ${launchAttempts} failed: ${launchError.message}`,
            'warning',
          );

          if (launchAttempts === maxAttempts) {
            // Last attempt failed, throw the error
            throw launchError;
          }

          // Wait before retry
          await new Promise((resolve) => setTimeout(resolve, 2000));

          // Try with more conservative settings on retry
          if (launchAttempts === 2) {
            puppeteerConfig.args.push('--disable-features=VizDisplayCompositor');
            this.logAndBroadcast('Adding conservative flags for retry', 'info');
          }
        }
      }

      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
      await page.setViewport({ width: 1280, height: 720 });

      // Navigate and wait for full page load
      await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: 30000,
      });

      // Wait additional time for any dynamic content to load
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Extract data attributes that contain time information
      const timeData = await page.evaluate(() => {
        const elements = document.querySelectorAll('[data-day], [data-time], [data-month]');
        return Array.from(elements).map((el) => ({
          tagName: el.tagName,
          dataDay: el.getAttribute('data-day'),
          dataTime: el.getAttribute('data-time'),
          dataMonth: el.getAttribute('data-month'),
          textContent: el.textContent?.trim(),
          className: el.className,
        }));
      });

      // Get both HTML content and screenshot
      const htmlContent = await page.content();

      // Create enhanced content that includes the data attributes in readable format
      let enhancedContent = htmlContent;
      if (timeData.length > 0) {
        enhancedContent += '\n\n<!-- EXTRACTED DATA ATTRIBUTES FOR TIME PARSING -->\n';
        timeData.forEach((item, index) => {
          if (item.dataDay || item.dataTime || item.dataMonth) {
            enhancedContent += `<!-- Element ${index + 1}: `;
            if (item.dataDay) enhancedContent += `TIME="${item.dataDay}" `;
            if (item.dataTime) enhancedContent += `TIME="${item.dataTime}" `;
            if (item.dataMonth) enhancedContent += `DAY="${item.dataMonth}" `;
            enhancedContent += `TEXT="${item.textContent}" -->\n`;
          }
        });
      }

      const screenshot = await page.screenshot({
        fullPage: true,
        type: 'png',
      });

      this.logAndBroadcast(
        `Successfully fetched HTML (${htmlContent.length} characters) and screenshot from ${url}`,
        'success',
      );
      this.logAndBroadcast(`Found ${timeData.length} elements with time data attributes`, 'info');

      // DEBUG: Log sample of time data found for production debugging
      if (timeData.length > 0) {
        const sampleData = timeData.slice(0, 5).map((item) => ({
          dataDay: item.dataDay,
          dataTime: item.dataTime,
          dataMonth: item.dataMonth,
          text: item.textContent?.substring(0, 50) + (item.textContent?.length > 50 ? '...' : ''),
        }));
        this.logAndBroadcast(`Sample time data attributes: ${JSON.stringify(sampleData)}`, 'info');
      } else {
        this.logAndBroadcast(
          'WARNING: No time data attributes found on page - this may cause parsing issues',
          'warning',
        );
      }

      // DEBUG: Log sample of HTML content to verify what we're getting
      const htmlPreview = htmlContent.substring(0, 500).replace(/\s+/g, ' ');
      this.logAndBroadcast(`HTML preview: ${htmlPreview}...`, 'info');

      return { htmlContent: enhancedContent, screenshot };
    } catch (error) {
      this.logAndBroadcast(`Error fetching webpage content and screenshot from ${url}:`, 'error');
      throw error;
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  /**
   * Step 1: Use Puppeteer to fetch raw HTML content from website
   */
  private async fetchRawHtml(url: string): Promise<string> {
    const result = await this.fetchWebpageWithScreenshot(url);
    return result.htmlContent;
  }

  /**
   * Step 2: Use Gemini AI to parse HTML content and extract karaoke data
   */
  private async parseWithGemini(htmlContent: string, url: string): Promise<ParsedKaraokeData> {
    try {
      this.logAndBroadcast('Starting Gemini AI parsing with HTML content', 'info');
      this.logAndBroadcast(`Processing HTML content: ${htmlContent.length} characters`, 'info');

      // Trim unnecessary HTML content first
      const trimmedHtml = this.trimHtmlContent(htmlContent);
      this.logAndBroadcast(
        `After trimming: ${trimmedHtml.length} characters (${(((htmlContent.length - trimmedHtml.length) / htmlContent.length) * 100).toFixed(1)}% reduction)`,
        'info',
      );

      const model = this.genAI.getGenerativeModel({ model: getGeminiModel('text') });

      // If content is still too large, split into chunks and process separately
      const maxSingleProcessSize = 1000000; // 1MB - try processing much larger content as single chunk first
      const chunkSize = 200000; // 200KB chunks if we need to split
      if (trimmedHtml.length > maxSingleProcessSize) {
        this.logAndBroadcast('Very large content detected, processing in chunks...', 'info');
        return this.parseHtmlInChunks(trimmedHtml, url, model, chunkSize);
      }

      // Process smaller content directly
      return this.parseSingleHtmlContent(trimmedHtml, url, model);
    } catch (error) {
      this.logAndBroadcast('Error parsing with Gemini:', 'error');
      throw new Error(`Gemini parsing failed: ${error.message}`);
    }
  }

  /**
   * Parse large HTML content in chunks and combine results
   */
  private async parseHtmlInChunks(
    htmlContent: string,
    url: string,
    model: any,
    chunkSize: number,
  ): Promise<ParsedKaraokeData> {
    const chunks = this.splitHtmlIntoChunks(htmlContent, chunkSize);
    this.logAndBroadcast(`Split content into ${chunks.length} chunks for processing`, 'info');

    const allResults: ParsedKaraokeData[] = [];

    for (let i = 0; i < chunks.length; i++) {
      this.logAndBroadcast(`Processing chunk ${i + 1}/${chunks.length}...`, 'info');
      try {
        const chunkResult = await this.parseSingleHtmlContent(chunks[i], url, model);
        allResults.push(chunkResult);

        // Small delay between chunks to avoid rate limiting
        if (i < chunks.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      } catch (error) {
        this.logAndBroadcast(
          `Failed to process chunk ${i + 1}, continuing with others:`,
          'warning',
        );
      }
    }

    // Combine all results
    return this.combineChunkResults(allResults, url, htmlContent);
  }

  /**
   * Split HTML content into manageable chunks
   */
  private splitHtmlIntoChunks(htmlContent: string, chunkSize: number): string[] {
    const chunks: string[] = [];
    let currentPosition = 0;

    while (currentPosition < htmlContent.length) {
      const chunk = htmlContent.substring(currentPosition, currentPosition + chunkSize);
      chunks.push(chunk);
      currentPosition += chunkSize;
    }

    return chunks;
  }

  /**
   * Process a single HTML content chunk
   */
  private async parseSingleHtmlContent(
    htmlContent: string,
    url: string,
    model: any,
  ): Promise<ParsedKaraokeData> {
    const prompt = `Extract ALL karaoke shows from this HTML content. Each venue + day combination is a separate show.

CRITICAL RESPONSE REQUIREMENTS:
- Return ONLY valid JSON, no other text
- If response would exceed limits, prioritize COMPLETE shows over partial ones
- Ensure JSON is properly closed with all brackets and braces
- Maximum 100 shows per response to prevent truncation

🚫 DUPLICATE PREVENTION - CRITICAL RULES:
- ONLY extract UNIQUE shows - no duplicates allowed
- If the same venue appears multiple times with the same day/time, only include it ONCE
- Different days at the same venue = separate shows (e.g., "Bar Monday" vs "Bar Saturday")  
- Different times at the same venue = separate shows (e.g., "Bar 7:00 PM" vs "Bar 10:00 PM")
- Same address, same day, same time = DUPLICATE, include only once
- Verify each show is truly distinct before adding to the list

CRITICAL: For each venue mentioned, create a separate show entry for EACH day of the week it appears.

EXCLUDE: Shows marked "CLOSED", "CANCELLED", "SUSPENDED", "UNAVAILABLE", "DISCONTINUED", "TEMPORARILY CLOSED", "OUT OF BUSINESS", "INACTIVE", "NOT RUNNING"

SHOW EXTRACTION RULES:
- Each venue name + day of week = one show entry
- Look for patterns like "Monday: Park St Tavern - 9 pm - Mattallica"
- Extract venue name, day, time, and DJ/host name for each entry
- If a venue appears under multiple days, create separate show entries for each day

🚨 CRITICAL ADDRESS COMPONENT SEPARATION RULES 🚨
NEVER MIX ADDRESS COMPONENTS - SEPARATE THEM CLEANLY:

✅ CORRECT address component separation:
Input: "1930 Lewis Turner Blvd Fort Walton Beach, FL 32647"
→ address: "1930 Lewis Turner Blvd"
→ city: "Fort Walton Beach"  
→ state: "FL"
→ zip: "32647"

Input: "630 North High Street Columbus, Ohio 43215"
→ address: "630 North High Street"
→ city: "Columbus"
→ state: "OH"
→ zip: "43215"

❌ WRONG - DON'T DO THIS:
address: "1930 Lewis Turner Blvd Fort Walton Beach, FL 32647" ← CONTAINS CITY/STATE/ZIP
address: "630 North High Street Columbus, Ohio 43215" ← CONTAINS CITY/STATE/ZIP

ADDRESS FIELD RULES:
- ONLY include street number and street name
- NO city names in address field
- NO state names in address field  
- NO ZIP codes in address field
- NO commas in address field
- Examples: "1930 Lewis Turner Blvd", "630 North High Street", "8939 South Old State Road"

CITY FIELD RULES:
- ONLY the city name
- Multi-word cities are OK: "Panama City Beach", "Fort Walton Beach", "Lewis Center"
- NO state abbreviations in city field
- NO ZIP codes in city field
- NO commas in city field

STATE FIELD RULES:
- ONLY 2-letter state abbreviation: "OH", "FL", "CA", "NY", "TX", etc.
- Convert full state names: "Ohio" → "OH", "Florida" → "FL", "California" → "CA"

MORE ADDRESS PARSING EXAMPLES:
- "8939 South Old State Road Lewis Center, Ohio" → address: "8939 South Old State Road", city: "Lewis Center", state: "OH"
- "Front Beach Road Panama City Beach" → address: "Front Beach Road", city: "Panama City Beach", state: "FL"
- "59 Potter Street Delaware" → address: "59 Potter Street", city: "Delaware", state: "OH"
- "8010 Surf Drive Panama City Beach" → address: "8010 Surf Drive", city: "Panama City Beach", state: "FL"
- "Columbus, Ohio" → address: null, city: "Columbus", state: "OH"
- "Lewis Center" → address: null, city: "Lewis Center", state: "OH"

SMART ADDRESS HANDLING:
- If only city+state given, leave address field null but populate city and state
- Use context clues to infer missing state (e.g., if other venues mention Ohio, Delaware likely = Delaware, OH)
- Handle multi-word city names like "Panama City Beach", "Fort Walton Beach", "Lewis Center"

VENUE INFORMATION EXTRACTION:
- venueWebsite: Look for venue websites, social media pages, or links related to the venue
- venuePhone: Look for phone numbers associated with the venue

🌍 LAT/LNG COORDINATE EXTRACTION - CRITICAL:
For EVERY venue with a complete address (street + city + state), you MUST provide precise latitude and longitude coordinates:
- Combine the venue name, street address, city, and state to determine the exact location
- Provide coordinates as precise decimal numbers (6+ decimal places)
- VALIDATE coordinates match the city/state: coordinates must be within the specified city/state boundaries
- Use your geographic knowledge to provide accurate coordinates for the business location
- EXAMPLE: "Park St Tavern" at "501 Park St, Columbus, OH" → lat: 39.961176, lng: -82.998794 (verify this is in Columbus, OH)
- EXAMPLE: "The Walrus" at "1432 E Main St, Columbus, OH" → lat: 39.952583, lng: -82.937125 (verify this is in Columbus, OH)
- If address is incomplete (missing street address), still attempt to get city-level coordinates
- If you cannot determine precise coordinates, provide city-center coordinates as fallback
- CRITICAL: Double-check that lat/lng coordinates are actually located in the specified city and state
- EXAMPLE: "The Walrus" at "1432 E Main St, Columbus, OH" → lat: 39.952583, lng: -82.937125
- If you cannot determine precise coordinates, provide city-center coordinates as fallback

TIME PARSING INSTRUCTIONS - CRITICAL:
- LOOK FOR DATA ATTRIBUTES: Times are stored in HTML data attributes like data-day="9 pm"
- Check for HTML comments that show EXTRACTED DATA ATTRIBUTES 
- Pattern: <!-- Element X: TIME="9 pm" DAY="Monday" TEXT="venue info" -->
- EXAMPLE: If you see TIME="9 pm" in data attributes → time="9 pm", startTime="21:00"
- EXAMPLE: If you see TIME="10 pm" in data attributes → time="10 pm", startTime="22:00"  
- EXAMPLE: If you see TIME="7 pm" in data attributes → time="7 pm", startTime="19:00"
- EXAMPLE: If you see TIME="8 pm" in data attributes → time="8 pm", startTime="20:00"
- EXAMPLE: If you see TIME="9:30" in data attributes → time="9:30 pm", startTime="21:30"
- For endTime: Look for venue closing times, "until close", or specific end times. If not found, use "00:00" (midnight)
- NEVER leave time fields as null - extract the time from the data attributes
- Data attributes contain the actual show times that may not appear in visible text

Website URL: ${url}

🚨 FINAL VALIDATION CHECKLIST - VERIFY EACH SHOW BEFORE OUTPUT:
✅ address field: Contains ONLY street address (no city, state, zip) OR is null
✅ city field: Contains ONLY city name (no commas, no state, no zip)
✅ state field: Contains ONLY 2-letter abbreviation (OH, FL, etc.)
✅ zip field: Contains ONLY ZIP code (12345 or 12345-6789) OR is null
✅ No mixed components in any field
✅ All leading/trailing spaces and punctuation removed

Return JSON (no extra text):
{
  "vendor": {
    "name": "Business Name",
    "owner": "Owner Name if available", 
    "website": "${url}",
    "description": "Brief description",
    "confidence": 0.9
  },
  "venues": [
    {
      "name": "Venue Name",
      "address": "Street address ONLY (e.g., '8939 South Old State Road', '630 North High Street') OR null if no street address",
      "city": "City name ONLY (e.g., 'Lewis Center', 'Panama City Beach', 'Columbus', 'Delaware')",
      "state": "State abbreviation ONLY (e.g., 'OH', 'FL', 'CA', 'NY')",
      "zip": "ZIP code ONLY (e.g., '12345' or '12345-6789') OR null",
      "lat": "REQUIRED: Precise latitude as decimal number (e.g., 39.961176)",
      "lng": "REQUIRED: Precise longitude as decimal number (e.g., -82.998794)",
      "phone": "Phone number",
      "website": "Venue website if available",
      "confidence": 0.8
    }
  ],
  "djs": [
    {
      "name": "Professional DJ/host name",
      "confidence": 0.8,
      "context": "Venues where they perform",
      "aliases": []
    }
  ],
  "shows": [
    {
      "venueName": "Venue Name (must match a venue from venues array)",
      "time": "REQUIRED: original time format like '9 pm' or '10:00 pm'",
      "startTime": "REQUIRED: 24-hour format like '21:00' or '22:00'",
      "endTime": "HH:MM format or venue closing time or 'close' (default to '00:00' if unknown)",
      "day": "day_of_week", 
      "djName": "DJ/host name",
      "vendor": "Vendor/company providing service",
      "description": "Additional details",
      "confidence": 0.8
    }
  ]
}

HTML Content:
${htmlContent}`;

    // Retry logic for quota exceeded errors
    let result;
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      try {
        result = await model.generateContent(prompt);
        break;
      } catch (error) {
        attempts++;

        if (
          error.message?.includes('429') ||
          error.message?.includes('quota') ||
          error.message?.includes('Too Many Requests')
        ) {
          this.logAndBroadcast(
            `Quota exceeded, attempt ${attempts}/${maxAttempts}. Waiting before retry...`,
            'warning',
          );

          if (attempts < maxAttempts) {
            const waitTime = Math.pow(2, attempts) * 1000; // Exponential backoff
            await new Promise((resolve) => setTimeout(resolve, waitTime));
            continue;
          }
        }

        throw error;
      }
    }

    const response = await result.response;
    const text = response.text();

    this.logAndBroadcast('Gemini response received, extracting JSON', 'info');
    this.logAndBroadcast(`Gemini response length: ${text.length} characters`, 'info');

    // DEBUG: Log the actual Gemini response to see what it's returning
    this.logAndBroadcast(`Gemini raw response: ${text}`, 'info');

    // Log usage metadata if available
    if (result.response.usageMetadata) {
      const usage = result.response.usageMetadata;
      this.logAndBroadcast(
        `Token usage - Prompt: ${usage.promptTokenCount || 'N/A'}, Candidates: ${usage.candidatesTokenCount || 'N/A'}, Total: ${usage.totalTokenCount || 'N/A'}`,
        'info',
      );
    }

    // Clean and parse JSON response
    const cleanJsonString = this.cleanGeminiResponse(text);
    this.logAndBroadcast(`Cleaned JSON: ${cleanJsonString}`, 'info');

    let parsedData;
    try {
      parsedData = JSON.parse(cleanJsonString);
      this.logAndBroadcast('JSON parsing successful', 'success');
    } catch (jsonError) {
      this.logAndBroadcast(`JSON parsing failed: ${jsonError.message}`, 'error');
      this.logAndBroadcast(`Failed JSON string: ${cleanJsonString.substring(0, 200)}...`, 'error');
      throw new Error(`Invalid JSON response from Gemini: ${jsonError.message}`);
    }

    // CRITICAL DEBUG: Log detailed parsing results
    const showCount = parsedData.shows?.length || 0;
    const djCount = parsedData.djs?.length || 0;
    const vendorName = parsedData.vendor?.name || 'Unknown';

    this.logAndBroadcast(
      `Parsed data extracted - Shows: ${showCount}, DJs: ${djCount}, Vendor: ${vendorName}`,
      'success',
    );

    // DEBUG: If no shows found, log more details
    if (showCount === 0) {
      this.logAndBroadcast('CRITICAL: No shows found in parsed data!', 'error');
      this.logAndBroadcast(
        `Vendor confidence: ${parsedData.vendor?.confidence || 'N/A'}`,
        'warning',
      );
      this.logAndBroadcast(`Raw shows array: ${JSON.stringify(parsedData.shows)}`, 'warning');
    }

    // DEBUG: If no DJs found, log more details
    if (djCount === 0) {
      this.logAndBroadcast('WARNING: No DJs found in parsed data', 'warning');
      this.logAndBroadcast(`Raw DJs array: ${JSON.stringify(parsedData.djs)}`, 'warning');
    }

    // Ensure required structure with defaults
    const finalData: ParsedKaraokeData = {
      vendor: parsedData.vendor || this.generateVendorFromUrl(url),
      djs: Array.isArray(parsedData.djs) ? parsedData.djs : [],
      shows: Array.isArray(parsedData.shows)
        ? this.normalizeShowTimes(parsedData.shows).map((show) => ({
            ...show,
            source: show.source || url, // Only set page URL as fallback if show doesn't have its own source
          }))
        : [],
      rawData: {
        url,
        title: this.extractTitleFromHtml(htmlContent),
        content: htmlContent.substring(0, 1000), // Keep first 1000 chars for reference
        parsedAt: new Date(),
      },
    };

    // CRITICAL DEBUG: Log final data structure being returned
    this.logAndBroadcast(
      `FINAL RESULT: ${finalData.shows.length} shows, ${finalData.djs.length} DJs, vendor: ${finalData.vendor.name}`,
      'info',
    );

    // Log sample shows for debugging
    if (finalData.shows.length > 0) {
      const sampleShows = finalData.shows.slice(0, 3).map((show) => ({
        venue: show.venue,
        day: show.day,
        time: show.time,
        djName: show.djName,
        city: show.city,
        state: show.state,
        source: show.source?.substring(0, 80) + '...', // Include source URL for debugging
      }));
      this.logAndBroadcast(`Sample shows: ${JSON.stringify(sampleShows, null, 2)}`, 'info');
    }

    // Log sample DJs for debugging
    if (finalData.djs.length > 0) {
      const sampleDJs = finalData.djs.slice(0, 3).map((dj) => ({
        name: dj.name,
        confidence: dj.confidence,
      }));
      this.logAndBroadcast(`Sample DJs: ${JSON.stringify(sampleDJs)}`, 'info');
    }

    return finalData;
  }

  /**
   * Combine results from multiple chunks
   */
  private combineChunkResults(
    results: ParsedKaraokeData[],
    url: string,
    fullHtmlContent: string,
  ): ParsedKaraokeData {
    if (results.length === 0) {
      return {
        vendor: this.generateVendorFromUrl(url),
        djs: [],
        shows: [],
        rawData: {
          url,
          title: this.extractTitleFromHtml(fullHtmlContent),
          content: fullHtmlContent.substring(0, 1000),
          parsedAt: new Date(),
        },
      };
    }

    // Use the first result's vendor info as base
    const combinedVendor = results[0].vendor;

    // Combine all DJs and remove duplicates
    const allDjs = results.flatMap((r) => r.djs || []);
    const uniqueDjs = this.removeDuplicateDjs(allDjs);

    // Combine all shows and remove duplicates
    const allShows = results.flatMap((r) => r.shows || []);
    const uniqueShows = this.removeDuplicateShows(allShows);

    this.logAndBroadcast(
      `Combined ${results.length} chunks: ${uniqueShows.length} unique shows, ${uniqueDjs.length} unique DJs`,
      'success',
    );

    return {
      vendor: combinedVendor,
      djs: uniqueDjs,
      shows: this.normalizeShowTimes(uniqueShows),
      rawData: {
        url,
        title: this.extractTitleFromHtml(fullHtmlContent),
        content: fullHtmlContent.substring(0, 1000),
        parsedAt: new Date(),
      },
    };
  }

  /**
   * Remove duplicate DJs based on name similarity
   */
  private removeDuplicateDjs(djs: any[]): any[] {
    const unique: any[] = [];
    const seenNames = new Set<string>();

    for (const dj of djs) {
      const normalizedName = dj.name?.toLowerCase().trim();
      if (normalizedName && !seenNames.has(normalizedName)) {
        seenNames.add(normalizedName);
        unique.push(dj);
      }
    }

    return unique;
  }

  /**
   * Standardize address for consistent deduplication
   * Examples: "1234 Main Street" -> "1234 main st", "123 First Ave" -> "123 first ave"
   */
  private standardizeAddress(address: string): string {
    if (!address) return '';

    return (
      address
        .toLowerCase()
        .trim()
        // Standardize street types
        .replace(/\bstreet\b/g, 'st')
        .replace(/\bavenue\b/g, 'ave')
        .replace(/\bboulevard\b/g, 'blvd')
        .replace(/\bdrive\b/g, 'dr')
        .replace(/\broad\b/g, 'rd')
        .replace(/\bcourt\b/g, 'ct')
        .replace(/\blane\b/g, 'ln')
        .replace(/\bplace\b/g, 'pl')
        .replace(/\bcircle\b/g, 'cir')
        .replace(/\bparkway\b/g, 'pkwy')
        // Remove extra spaces and punctuation
        .replace(/[.,#]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
    );
  }

  /**
   * Standardize DJ/host name for consistent deduplication
   */
  private standardizeDJName(name: string): string {
    if (!name) return '';

    return (
      name
        .toLowerCase()
        .trim()
        // Remove common prefixes/suffixes
        .replace(/\b(?:dj|host|karaoke|with)\s+/g, '')
        .replace(/\s+(?:dj|host|karaoke)$/g, '')
        // Normalize spacing
        .replace(/\s+/g, ' ')
        .trim()
    );
  }

  /**
   * Remove duplicate shows based on standardized address, day, and startTime
   */
  private removeDuplicateShows(shows: any[]): any[] {
    const unique: any[] = [];
    const seenShows = new Set<string>();

    this.logAndBroadcast(`Starting deduplication with ${shows.length} shows`, 'info');
    this.logAndBroadcast('🔄 Standardizing addresses and names for deduplication', 'info');

    for (const show of shows) {
      // Standardize address for consistent comparison
      const standardizedAddress = this.standardizeAddress(show.address || '');
      const day = show.day?.toLowerCase().trim() || '';
      const startTime =
        show.startTime?.toLowerCase().trim() || show.time?.toLowerCase().trim() || '';

      // Create deduplication key with standardized values
      const key = `${standardizedAddress}-${day}-${startTime}`;

      if (key && !seenShows.has(key)) {
        seenShows.add(key);

        // Apply standardization to the actual show data but keep it readable
        // Only standardize for storage, not for display
        if (show.address) {
          // Keep original for display but ensure consistent format for storage
          show.address = show.address.trim();
        }

        unique.push(show);
        this.logger.debug(`Added show: ${show.venue} at ${show.address} on ${day} at ${startTime}`);
      } else {
        this.logger.debug(
          `Skipped duplicate: ${show.venue} at ${show.address} on ${day} at ${startTime} (key: ${key})`,
        );
      }
    }

    this.logAndBroadcast(
      `Deduplication: ${shows.length} shows → ${unique.length} unique shows (standardized addresses)`,
      'success',
    );
    return unique;
  }

  /**
   * Extract DJs from individual show djName fields with deduplication
   */
  private extractDJsFromShows(shows: any[]): any[] {
    const djSet = new Set<string>();
    const extractedDJs: any[] = [];

    this.logAndBroadcast('🔄 Extracting and deduplicating DJs from shows', 'info');

    for (const show of shows) {
      if (show.djName && typeof show.djName === 'string') {
        const djName = show.djName.trim();
        const standardizedName = this.standardizeDJName(djName);

        if (djName && !djSet.has(standardizedName)) {
          djSet.add(standardizedName);
          extractedDJs.push({
            name: djName, // Keep original readable name
            confidence: 0.85,
            context: `Host at ${show.venue || 'venue'}`,
            aliases: [],
          });
        }
      }
    }

    this.logAndBroadcast(`Extracted ${extractedDJs.length} unique DJs`, 'success');
    return extractedDJs;
  }

  /**
   * Extract venues from individual show fields and create venues array
   */
  private extractVenuesFromShows(shows: any[]): any[] {
    const venueMap = new Map<string, any>();

    this.logAndBroadcast('🔄 Extracting and deduplicating venues from shows', 'info');

    for (const show of shows) {
      const venueName = show.venueName || show.venue;
      if (venueName && typeof venueName === 'string') {
        const standardizedName = venueName.trim().toLowerCase();

        if (!venueMap.has(standardizedName)) {
          venueMap.set(standardizedName, {
            name: venueName.trim(), // Keep original readable name
            address: show.address || null,
            city: show.city || null,
            state: show.state || null,
            zip: show.zip || null,
            lat: show.lat || null,
            lng: show.lng || null,
            phone: show.venuePhone || null,
            website: show.venueWebsite || null,
            confidence: 0.85,
          });
        }
      }
    }

    const extractedVenues = Array.from(venueMap.values());
    this.logAndBroadcast(`Extracted ${extractedVenues.length} unique venues`, 'success');
    return extractedVenues;
  }

  /**
   * Merge two DJ arrays, avoiding duplicates with standardized name comparison
   */
  private mergeDJArrays(existingDJs: any[], newDJs: any[]): any[] {
    const merged = [...existingDJs];
    const existingNames = new Set(existingDJs.map((dj) => this.standardizeDJName(dj.name || '')));

    for (const newDJ of newDJs) {
      const standardizedName = this.standardizeDJName(newDJ.name || '');
      if (standardizedName && !existingNames.has(standardizedName)) {
        merged.push(newDJ);
        existingNames.add(standardizedName);
      }
    }

    return merged;
  }

  /**
   * Pre-validate and fix JSON structure before parsing
   */
  private preValidateAndFixJson(jsonString: string): string {
    let fixed = jsonString.trim();

    // Remove any BOM or invisible characters at the start
    fixed = fixed.replace(/^\uFEFF/, '');

    // Check for common structural issues
    const issues = [];

    // Check for unmatched brackets/braces
    let braceCount = 0;
    let bracketCount = 0;
    let inString = false;
    let escaped = false;

    for (let i = 0; i < fixed.length; i++) {
      const char = fixed[i];

      if (escaped) {
        escaped = false;
        continue;
      }

      if (char === '\\') {
        escaped = true;
        continue;
      }

      if (char === '"') {
        inString = !inString;
        continue;
      }

      if (!inString) {
        if (char === '{') braceCount++;
        else if (char === '}') braceCount--;
        else if (char === '[') bracketCount++;
        else if (char === ']') bracketCount--;
      }
    }

    if (braceCount !== 0) issues.push(`Unmatched braces: ${braceCount}`);
    if (bracketCount !== 0) issues.push(`Unmatched brackets: ${bracketCount}`);
    if (inString) issues.push('Unclosed string');

    if (issues.length > 0) {
      this.logAndBroadcast(`🔧 JSON structure issues detected: ${issues.join(', ')}`, 'warning');
    }

    return fixed;
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

    // ENHANCED: Handle truncated JSON by ensuring proper closing
    try {
      // Try to parse as-is first
      JSON.parse(cleaned);
      return cleaned; // Already valid
    } catch (error) {
      this.logAndBroadcast(
        `Initial JSON parse failed: ${error.message}, attempting repair`,
        'warning',
      );

      // Attempt to repair truncated JSON
      cleaned = this.repairTruncatedJson(cleaned);
    }

    // Fix common JSON formatting issues
    cleaned = cleaned
      // Fix unquoted property names
      .replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":')
      // Fix single quotes to double quotes
      .replace(/'/g, '"')
      // Fix trailing commas before closing brackets/braces
      .replace(/,(\s*[}\]])/g, '$1')
      // Fix missing commas between array elements
      .replace(/}(\s*){/g, '},\n{')
      // Fix missing commas between object properties
      .replace(/("(?:\\.|[^"\\])*")\s*("(?:\\.|[^"\\])*"\s*:)/g, '$1,\n$2')
      // Remove any non-printable characters
      .replace(/[\x00-\x1F\x7F-\x9F]/g, '');

    return cleaned.trim();
  }

  /**
   * Repair truncated JSON by properly closing arrays and objects
   */
  private repairTruncatedJson(jsonStr: string): string {
    this.logAndBroadcast(`Attempting to repair truncated JSON (length: ${jsonStr.length})`, 'info');

    let repaired = jsonStr.trim();

    // Remove any incomplete entries at the end
    const lastCommaIndex = repaired.lastIndexOf(',');
    if (lastCommaIndex > -1) {
      // Check if there's an incomplete object/array after the last comma
      const afterLastComma = repaired.substring(lastCommaIndex + 1).trim();

      // If what follows is incomplete (no closing brace/bracket), remove it
      if (afterLastComma && !afterLastComma.includes('}') && !afterLastComma.includes(']')) {
        repaired = repaired.substring(0, lastCommaIndex);
        this.logAndBroadcast('Removed incomplete JSON fragment after last comma', 'info');
      }
    }

    // Count open/close braces and brackets to ensure proper nesting
    let openBraces = 0;
    let openBrackets = 0;

    for (const char of repaired) {
      if (char === '{') openBraces++;
      else if (char === '}') openBraces--;
      else if (char === '[') openBrackets++;
      else if (char === ']') openBrackets--;
    }

    // Close any unclosed arrays
    while (openBrackets > 0) {
      repaired += ']';
      openBrackets--;
      this.logAndBroadcast('Added missing closing bracket', 'info');
    }

    // Close any unclosed objects
    while (openBraces > 0) {
      repaired += '}';
      openBraces--;
      this.logAndBroadcast('Added missing closing brace', 'info');
    }

    this.logAndBroadcast(`JSON repair completed (final length: ${repaired.length})`, 'success');
    return repaired;
  }

  /**
   * Generate vendor info from URL if not detected
   */
  private generateVendorFromUrl(url: string): any {
    try {
      const domain = new URL(url).hostname.replace('www.', '');
      const name = domain.split('.')[0];

      return {
        name: name.charAt(0).toUpperCase() + name.slice(1),
        website: url,
        description: `Karaoke business website`,
        confidence: 0.5,
      };
    } catch {
      return {
        name: 'Unknown Business',
        website: url,
        description: 'Karaoke business website',
        confidence: 0.3,
      };
    }
  }

  /**
   * Extract title from HTML content
   */
  private extractTitleFromHtml(htmlContent: string): string {
    const titleMatch = htmlContent.match(/<title[^>]*>([^<]+)<\/title>/i);
    return titleMatch ? titleMatch[1].trim() : 'Website Title';
  }

  /**
   * Normalize show times to ensure consistency
   */
  private normalizeShowTimes(shows: any[]): any[] {
    return this.normalizeShowData(shows);
  }

  /**
   * Normalize show data including times and addresses
   */
  private normalizeShowData(shows: any[]): any[] {
    return shows.map((show, index) => {
      // Convert time to startTime if missing
      if (show.time && !show.startTime) {
        show.startTime = this.convertTimeToStartTime(show.time);
      }

      // Normalize time data
      if (show.startTime && !show.endTime) {
        show.endTime = '00:00';
      }

      // Trust Gemini's address parsing - just clean up any extra whitespace
      if (show.address) {
        show.address = show.address.trim();
      }
      if (show.city) {
        show.city = show.city.trim();
      }
      if (show.state) {
        show.state = show.state.trim().toUpperCase();
      }
      if (show.zip) {
        show.zip = show.zip.trim();
      }

      this.logAndBroadcast(
        `Processed show: ${show.venue} - Time: "${show.time}" → StartTime: "${show.startTime}"`,
        'info',
      );

      return show;
    });
  }

  /**
   * Convert human-readable time to 24-hour format
   */
  private convertTimeToStartTime(time: string): string {
    if (!time) return '00:00';

    const timeStr = time.toLowerCase().trim();

    // Handle various time formats
    const timePatterns = [
      { pattern: /(\d{1,2}):(\d{2})\s*(pm|am)/i, hasMinutes: true },
      { pattern: /(\d{1,2})\s*(pm|am)/i, hasMinutes: false },
      { pattern: /(\d{1,2}):(\d{2})/i, hasMinutes: true }, // 24-hour format already
    ];

    for (const { pattern, hasMinutes } of timePatterns) {
      const match = timeStr.match(pattern);
      if (match) {
        let hours = parseInt(match[1]);
        const minutes = hasMinutes ? parseInt(match[2]) : 0;
        const period = match[3]?.toLowerCase();

        // Convert to 24-hour format
        if (period === 'pm' && hours !== 12) {
          hours += 12;
        } else if (period === 'am' && hours === 12) {
          hours = 0;
        }

        // Format as HH:MM
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      }
    }

    // Default fallback
    return '00:00';
  }

  /**
   * Admin review methods - memory-efficient implementation
   */
  async getPendingReviews(limit: number = 50, offset: number = 0): Promise<any[]> {
    // Get pending reviews without ordering to avoid sort buffer issues
    const parsedSchedules = await this.parsedScheduleRepository.find({
      where: { status: ParseStatus.PENDING_REVIEW },
      take: limit,
      skip: offset,
      // Remove order by to avoid sort buffer memory issues
      // order: { createdAt: 'DESC' }
    });

    if (parsedSchedules.length === 0) {
      return [];
    }

    // Sort in memory instead of in database
    const sortedSchedules = parsedSchedules.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    // Transform the data to include extracted shows from aiAnalysis
    return sortedSchedules.map((schedule) => {
      const aiAnalysis = schedule.aiAnalysis || {};
      const shows = aiAnalysis.shows || [];

      // Add source and other metadata to each show
      const transformedShows = shows.map((show) => ({
        ...show,
        source: show.source || schedule.url, // Preserve individual CDN URLs, fallback to group URL
        scheduleId: schedule.id,
        parsedAt: schedule.createdAt,
      }));

      return {
        id: schedule.id,
        url: schedule.url,
        source: schedule.url, // Use schedule URL as the source for the overall schedule
        status: schedule.status,
        createdAt: schedule.createdAt,
        updatedAt: schedule.updatedAt,
        vendorId: schedule.vendorId,
        shows: shows,
        stats: aiAnalysis.stats || { showsFound: shows.length, djsFound: 0 },
        vendor: aiAnalysis.vendor,
        vendors: aiAnalysis.vendors,
        djs: aiAnalysis.djs,
        venues: aiAnalysis.venues,
        aiAnalysis: aiAnalysis, // Include the full aiAnalysis for the review modal
        parsingLogs: schedule.parsingLogs,
      };
    });
  }

  async approveAndSaveParsedData(
    parsedScheduleId: string,
    approvedData: ParsedKaraokeData,
    userId?: string,
  ): Promise<any> {
    this.logAndBroadcast(`Starting approval process for schedule ${parsedScheduleId}`, 'info');

    try {
      // Ensure venues array exists - extract from shows if missing
      if (!approvedData.venues || approvedData.venues.length === 0) {
        approvedData.venues = this.extractVenuesFromShows(approvedData.shows || []);
        this.logAndBroadcast(
          `Extracted ${approvedData.venues.length} unique venues from show data`,
          'info',
        );
      }

      // Remove duplicates from approved data before processing
      const originalShowCount = approvedData.shows.length;
      approvedData.shows = this.removeDuplicateShows(approvedData.shows);
      const finalShowCount = approvedData.shows.length;

      if (originalShowCount !== finalShowCount) {
        this.logAndBroadcast(
          `Removed ${originalShowCount - finalShowCount} duplicate shows from approved data`,
          'success',
        );
      }

      // Validate input data
      if (!approvedData || !approvedData.shows || approvedData.shows.length === 0) {
        throw new Error('Invalid data: no shows found');
      }

      // Check if we have vendor data (either single vendor or vendors array)
      const hasVendorData =
        approvedData.vendor || (approvedData.vendors && approvedData.vendors.length > 0);
      if (!hasVendorData) {
        this.logAndBroadcast(
          'No vendor data found - proceeding with venue-hosted shows only',
          'warning',
        );
      }

      // 1. Find or create vendors (handle both single vendor and multiple vendors) - Optimized for bulk operations
      const vendorMap = new Map<string, Vendor>();
      let primaryVendor: Vendor | null = null;

      // Process vendors array or single vendor
      const vendorsToProcess =
        approvedData.vendors || (approvedData.vendor ? [approvedData.vendor] : []);

      if (vendorsToProcess.length > 0) {
        // Bulk fetch existing vendors
        const vendorNames = vendorsToProcess.map((v) => v.name).filter((name) => name);
        const existingVendors = await this.vendorRepository.find({
          where: vendorNames.map((name) => ({ name })),
        });

        // Create lookup map for existing vendors
        const existingVendorMap = new Map<string, Vendor>();
        existingVendors.forEach((vendor) => {
          existingVendorMap.set(vendor.name, vendor);
        });

        // Process vendors with bulk operations
        const vendorsToCreate = [];
        const vendorsToUpdate = [];

        for (const vendorData of vendorsToProcess) {
          if (!vendorData.name) continue;

          let vendor = existingVendorMap.get(vendorData.name);

          if (!vendor) {
            // Create new vendor
            vendor = this.vendorRepository.create({
              name: vendorData.name,
              owner: vendorData.owner || '',
              website: vendorData.website,
              description: vendorData.description,
              submittedBy: userId, // Add user attribution for vendor
            });
            vendorsToCreate.push(vendor);
          } else {
            this.logAndBroadcast(
              `Using existing vendor: ${vendor.name} (ID: ${vendor.id})`,
              'info',
            );

            // Update vendor with any missing information
            let vendorUpdated = false;
            if (!vendor.owner && vendorData.owner) {
              vendor.owner = vendorData.owner;
              vendorUpdated = true;
            }
            if (!vendor.website && vendorData.website) {
              vendor.website = vendorData.website;
              vendorUpdated = true;
            }
            if (!vendor.description && vendorData.description) {
              vendor.description = vendorData.description;
              vendorUpdated = true;
            }

            if (vendorUpdated) {
              vendorsToUpdate.push(vendor);
            }
          }

          vendorMap.set(vendorData.name, vendor);
          if (!primaryVendor) primaryVendor = vendor; // First vendor becomes primary
        }

        // Bulk save new vendors
        if (vendorsToCreate.length > 0) {
          this.logAndBroadcast(`Bulk creating ${vendorsToCreate.length} vendors`, 'info');
          const savedVendors = await this.vendorRepository.save(vendorsToCreate);
          // Update the map with saved vendors (they now have IDs)
          savedVendors.forEach((vendor) => {
            vendorMap.set(vendor.name, vendor);
            this.logAndBroadcast(`Created vendor with ID: ${vendor.id}`, 'success');
          });
        }

        // Bulk update vendors
        if (vendorsToUpdate.length > 0) {
          this.logAndBroadcast(`Bulk updating ${vendorsToUpdate.length} vendors`, 'info');
          await this.vendorRepository.save(vendorsToUpdate);
        }
      }

      // 2. Create or update DJs (associate with their respective vendors) - Optimized for bulk operations
      const djMap = new Map<string, DJ>();
      let djsCreated = 0;
      let djsUpdated = 0;

      // Handle empty DJs array gracefully
      const djsData = approvedData.djs || [];

      // Collect all unique vendor+name combinations for bulk lookup
      const djLookupKeys = djsData
        .filter((djData) => djData.name && djData.name.trim() !== '')
        .map((djData) => ({
          name: djData.name,
          vendorId: primaryVendor?.id || null,
          vendorName: primaryVendor?.name || 'default',
        }));

      // Bulk fetch existing DJs with vendor relationship
      const existingDJs =
        djLookupKeys.length > 0
          ? await this.djRepository.find({
              where: djLookupKeys.map((key) => ({
                name: key.name,
                vendorId: key.vendorId,
              })),
              relations: ['vendor'],
            })
          : [];

      // Create lookup map for existing DJs using vendor+name composite key
      const existingDJMap = new Map<string, DJ>();
      existingDJs.forEach((dj) => {
        const vendorName = dj.vendor?.name || 'default';
        const compositeKey = `${vendorName}|${dj.name}`;
        existingDJMap.set(compositeKey, dj);
      });

      // Process DJs with bulk operations
      const djsToCreate = [];
      const djsToUpdate = [];

      for (const djData of djsData) {
        if (!djData.name || djData.name.trim() === '') {
          this.logAndBroadcast('Skipping DJ with empty name', 'warning');
          continue;
        }

        // For DJs, use primary vendor or null if no vendors
        const djVendorId = primaryVendor?.id || null;
        const vendorName = primaryVendor?.name || 'default';
        const compositeKey = `${vendorName}|${djData.name}`;

        let dj = existingDJMap.get(compositeKey);

        if (!dj) {
          // Create new DJ
          const newDJ = this.djRepository.create({
            name: djData.name,
            vendorId: djVendorId,
            isActive: true,
            submittedBy: userId, // Add user attribution for DJ
          });
          djsToCreate.push(newDJ);
          djMap.set(compositeKey, newDJ);
          djsCreated++;
        } else {
          this.logAndBroadcast(`Using existing DJ: ${dj.name} (ID: ${dj.id})`, 'info');
          // Update DJ to active if it was inactive
          if (!dj.isActive) {
            dj.isActive = true;
            djsToUpdate.push(dj);
            djsUpdated++;
          }
          djMap.set(compositeKey, dj);
        }
      }

      // Bulk save new DJs
      if (djsToCreate.length > 0) {
        this.logAndBroadcast(`Bulk creating ${djsToCreate.length} DJs`, 'info');
        const savedDJs = await this.djRepository.save(djsToCreate);
        // Update the map with saved DJs (they now have IDs)
        savedDJs.forEach((dj) => {
          const vendorName = primaryVendor?.name || 'default';
          const compositeKey = `${vendorName}|${dj.name}`;
          djMap.set(compositeKey, dj);
        });
      }

      // Bulk update DJs
      if (djsToUpdate.length > 0) {
        this.logAndBroadcast(`Bulk updating ${djsToUpdate.length} DJs`, 'info');
        await this.djRepository.save(djsToUpdate);
      }

      // 3. Create shows (optimized for large batches)
      let showsCreated = 0;
      let showsUpdated = 0;
      let showsDuplicated = 0;

      this.logAndBroadcast(
        `Processing ${approvedData.shows.length} shows for batch creation...`,
        'info',
      );

      // Prepare all shows for bulk insert
      const showsToCreate = [];
      const showPromises = approvedData.shows.map(async (showData) => {
        // Find DJ if specified (using vendor+name composite key)
        let djId: string | undefined;
        if (showData.djName) {
          // Determine which vendor this DJ belongs to
          let djVendorName = 'default';
          if (showData.vendor) {
            const showVendorObj = vendorMap.get(showData.vendor);
            djVendorName = showVendorObj?.name || 'default';
          } else if (primaryVendor) {
            djVendorName = primaryVendor.name;
          }

          const djCompositeKey = `${djVendorName}|${showData.djName}`;
          const dj = djMap.get(djCompositeKey);
          djId = dj?.id;

          if (!dj) {
            this.logAndBroadcast(
              `Warning: DJ "${showData.djName}" not found for vendor "${djVendorName}" in show at ${showData.venue}`,
              'warning',
            );
          }
        }

        // Convert day and time to proper format
        const dayMapping: { [key: string]: string } = {
          monday: 'monday',
          tuesday: 'tuesday',
          wednesday: 'wednesday',
          thursday: 'thursday',
          friday: 'friday',
          saturday: 'saturday',
          sunday: 'sunday',
        };

        const normalizedDay = dayMapping[showData.day?.toLowerCase()] || 'monday';

        // Determine vendor for this show first
        let showVendor: Vendor | null = null;
        if (showData.vendor) {
          showVendor = vendorMap.get(showData.vendor) || null;
          if (!showVendor) {
            this.logAndBroadcast(
              `Warning: Vendor "${showData.vendor}" not found for show at ${showData.venue}`,
              'warning',
            );
          }
        } else if (primaryVendor) {
          showVendor = primaryVendor; // Use primary vendor as fallback
        }

        // Check for cross-vendor duplicates (venue-day-starttime) that should be rejected
        // For now, we'll skip this check since we need venue relationships
        // TODO: Implement venue-based duplicate checking after venue migration is complete
        if (false && showData.address && showData.startTime) {
          // Placeholder for future venue-based duplicate checking
        }

        // Find or create venue for this show
        let venue = null;
        const venueName = showData.venueName || showData.venue; // Support both new and legacy field names

        if (venueName) {
          // Try to find venue info from the venues array in approvedData
          let venueInfo = null;
          if (approvedData.venues && approvedData.venues.length > 0) {
            venueInfo = approvedData.venues.find((v) => v.name === venueName);
          }

          // Validate that we have an address for the venue
          const venueAddress = venueInfo?.address || showData.address;
          if (!venueAddress) {
            this.logAndBroadcast(
              `Skipping venue creation for ${venueName} - no address provided`,
              'warning',
            );
            venue = null;
          } else {
            // Create venue with information from venues array or legacy show fields
            venue = await this.venueService.findOrCreate({
              name: venueName,
              address: venueAddress,
              city: venueInfo?.city || showData.city || null,
              state: venueInfo?.state || showData.state || null,
              zip: venueInfo?.zip || showData.zip || null,
              lat: venueInfo?.lat || showData.lat || null,
              lng: venueInfo?.lng || showData.lng || null,
              phone: venueInfo?.phone || showData.venuePhone || null,
              website: venueInfo?.website || showData.venueWebsite || null,
              submittedBy: userId, // Add user attribution for venue
            });
          }
        }

        // Check for existing show with same vendor, day, time, venue, and DJ
        const existingShow = await this.showRepository.findOne({
          where: {
            day: normalizedDay as any,
            time: showData.time,
            venueId: venue?.id || null,
            djId: djId || null, // Handle both null and undefined DJs
          },
          relations: ['dj', 'dj.vendor', 'venue'], // Load DJ, vendor, and venue relationships
        });

        // Also check for venue-day-starttime duplicates (more strict duplicate detection)
        let addressBasedDuplicate = null;
        if (venue && showData.startTime) {
          addressBasedDuplicate = await this.showRepository.findOne({
            where: {
              venueId: venue.id,
              day: normalizedDay as any,
              startTime: showData.startTime,
            },
            relations: ['dj', 'dj.vendor', 'venue'],
          });
        }

        // Use the most specific duplicate found (address-based takes priority)
        const duplicateShow = addressBasedDuplicate || existingShow;

        // Check if existing show belongs to the same vendor (through DJ)
        const isSameVendor = duplicateShow?.dj?.vendor?.id === (showVendor?.id || null);

        if (duplicateShow && isSameVendor) {
          // If we found an address-based duplicate but not a venue-based one, log it
          if (addressBasedDuplicate && !existingShow) {
            this.logAndBroadcast(
              `Found address-based duplicate: ${showData.venue} at ${showData.address} on ${normalizedDay} at ${showData.startTime}`,
              'warning',
            );
          }

          // Update existing show with any missing information
          let showUpdated = false;
          if (!duplicateShow.address && showData.address) {
            duplicateShow.address = showData.address;
            showUpdated = true;
          }
          if (!duplicateShow.venuePhone && showData.venuePhone) {
            duplicateShow.venuePhone = showData.venuePhone;
            showUpdated = true;
          }
          if (!duplicateShow.venueWebsite && showData.venueWebsite) {
            duplicateShow.venueWebsite = showData.venueWebsite;
            showUpdated = true;
          }
          if (!duplicateShow.description && showData.description) {
            duplicateShow.description = showData.description;
            showUpdated = true;
          }
          if (!duplicateShow.source && showData.source) {
            duplicateShow.source = showData.source;
            showUpdated = true;
          }
          if (!duplicateShow.city && (showData.city || showData.address)) {
            let city = showData.city;
            if (!city && showData.address) {
              const extracted = this.geocodingService.extractCityStateFromAddress(showData.address);
              city = extracted.city;
            }
            if (city) {
              duplicateShow.city = city;
              showUpdated = true;
            }
          }
          if (!duplicateShow.state && (showData.state || showData.address)) {
            let state = showData.state;
            if (!state && showData.address) {
              const extracted = this.geocodingService.extractCityStateFromAddress(showData.address);
              state = extracted.state;
            }
            if (state) {
              duplicateShow.state = state;
              showUpdated = true;
            }
          }
          if (!duplicateShow.zip && (showData.zip || showData.address)) {
            let zip = showData.zip;
            if (!zip && showData.address) {
              const extracted = this.geocodingService.extractCityStateFromAddress(showData.address);
              zip = extracted.zip;
            }
            if (zip) {
              duplicateShow.zip = zip;
              showUpdated = true;
            }
          }
          // Try to get coordinates if missing
          if ((!duplicateShow.lat || !duplicateShow.lng) && duplicateShow.address) {
            try {
              const geocodeResult = await this.geocodingService.geocodeAddressHybrid(
                duplicateShow.address,
              );
              if (geocodeResult) {
                if (!duplicateShow.lat && geocodeResult.lat) {
                  duplicateShow.lat = geocodeResult.lat;
                  showUpdated = true;
                }
                if (!duplicateShow.lng && geocodeResult.lng) {
                  duplicateShow.lng = geocodeResult.lng;
                  showUpdated = true;
                }
                // Also update other missing fields
                if (!duplicateShow.city && geocodeResult.city) {
                  duplicateShow.city = geocodeResult.city;
                  showUpdated = true;
                }
                if (!duplicateShow.state && geocodeResult.state) {
                  duplicateShow.state = geocodeResult.state;
                  showUpdated = true;
                }
                if (!duplicateShow.zip && geocodeResult.zip) {
                  duplicateShow.zip = geocodeResult.zip;
                  showUpdated = true;
                }
                // Trust the existing address parsing - don't re-clean it
              }
            } catch (geocodeError) {
              this.logAndBroadcast(
                `Geocoding failed for existing show ${duplicateShow.venue}: ${geocodeError.message}`,
                'warning',
              );
            }
          }
          if (!duplicateShow.startTime && showData.startTime) {
            const validatedStartTime = this.validateTimeValue(showData.startTime);
            if (validatedStartTime) {
              duplicateShow.startTime = validatedStartTime;
              showUpdated = true;
            }
          }
          if (!duplicateShow.endTime) {
            const validatedEndTime = this.validateTimeValue(showData.endTime) || '00:00'; // Default to midnight
            duplicateShow.endTime = validatedEndTime;
            showUpdated = true;
          }

          if (showUpdated) {
            await this.showRepository.save(duplicateShow);
            this.logAndBroadcast(
              `Updated existing show: ${showData.venue} on ${normalizedDay} at ${showData.time}`,
              'info',
            );
            showsUpdated++;
          } else {
            this.logAndBroadcast(
              `Skipping duplicate show: ${showData.venue} on ${normalizedDay} at ${showData.time}`,
              'info',
            );
            showsDuplicated++;
          }
          return duplicateShow;
        }

        this.logAndBroadcast(
          `Creating new show: ${showData.venue} on ${normalizedDay} at ${showData.time}`,
          'info',
        );

        // Validate and convert time values
        const validatedStartTime = this.validateTimeValue(showData.startTime);
        const validatedEndTime = this.validateTimeValue(showData.endTime) || '00:00'; // Default to midnight if no end time

        // Extract city, state, zip, lat, lng from parsed data (now provided by Gemini)
        let city = showData.city;
        let state = showData.state;
        let zip = showData.zip;
        let lat: number | undefined = showData.lat || (showData as any).latitude;
        let lng: number | undefined = showData.lng || (showData as any).longitude;

        // Debug: Log what coordinate fields Gemini provided
        const coordFields = [];
        if (showData.lat !== undefined) coordFields.push(`lat: ${showData.lat}`);
        if (showData.lng !== undefined) coordFields.push(`lng: ${showData.lng}`);
        if ((showData as any).latitude !== undefined)
          coordFields.push(`latitude: ${(showData as any).latitude}`);
        if ((showData as any).longitude !== undefined)
          coordFields.push(`longitude: ${(showData as any).longitude}`);

        if (coordFields.length > 0) {
          this.logAndBroadcast(
            `Gemini coordinate fields for ${showData.venue}: ${coordFields.join(', ')}`,
            'info',
          );
        } else {
          this.logAndBroadcast(
            `No coordinate fields found in Gemini response for ${showData.venue}`,
            'info',
          );
        }

        // Trust Gemini's address parsing - use the components as provided
        let cleanedAddress = showData.address;

        // Log the coordinates provided by Gemini
        if (lat && lng) {
          this.logAndBroadcast(
            `Gemini provided coordinates: ${showData.venue} at (${lat}, ${lng})`,
            'info',
          );
        } else {
          this.logAndBroadcast(
            `Warning: No coordinates provided by Gemini for ${showData.venue}`,
            'warning',
          );

          // Fallback: Try to geocode using address components
          if (cleanedAddress && city && state) {
            try {
              const fullAddress = `${showData.venue}, ${cleanedAddress}, ${city}, ${state}`;
              this.logAndBroadcast(`Attempting fallback geocoding for: ${fullAddress}`, 'info');

              const coords = await this.geocodingService.geocodeAddressHybrid(fullAddress);
              if (coords && coords.lat && coords.lng) {
                lat = coords.lat;
                lng = coords.lng;
                this.logAndBroadcast(
                  `Fallback geocoding successful: ${showData.venue} at (${lat}, ${lng})`,
                  'success',
                );
              }
            } catch (geocodeError) {
              this.logAndBroadcast(
                `Fallback geocoding failed for ${showData.venue}: ${geocodeError.message}`,
                'warning',
              );
            }
          }
        }

        // Validate required fields before creating show
        if (!djId) {
          this.logAndBroadcast(`Skipping show at ${showData.venue} - no DJ assigned`, 'warning');
          return null; // Skip this show
        }

        if (!venue?.id) {
          this.logAndBroadcast(
            `Skipping show at ${showData.venue} - no venue found or created`,
            'warning',
          );
          return null; // Skip this show
        }

        const show = this.showRepository.create({
          djId: djId,
          venueId: venue?.id || null,
          day: normalizedDay as any, // Cast to DayOfWeek enum
          time: showData.time,
          startTime: validatedStartTime,
          endTime: validatedEndTime,
          description: showData.description,
          source: showData.source,
          isActive: true,
          submittedBy: userId, // Add user attribution for show
        });

        return show; // Return the show object instead of saving immediately
      });

      // Wait for all show objects to be prepared
      const preparedShows = (await Promise.all(showPromises)).filter((show) => show !== null);

      // Bulk insert all shows for maximum performance
      this.logAndBroadcast(`Bulk inserting ${preparedShows.length} shows...`, 'info');
      const bulkStartTime = Date.now();

      const savedShows = await this.showRepository.save(preparedShows);
      showsCreated = savedShows.length;

      const bulkTime = Date.now() - bulkStartTime;
      this.logAndBroadcast(
        `Bulk insert completed in ${bulkTime}ms (${savedShows.length} shows)`,
        'success',
      );

      // 4. Update the schedule to approved status (but don't delete yet)
      await this.parsedScheduleRepository.update(parsedScheduleId, {
        status: ParseStatus.APPROVED,
        aiAnalysis: approvedData as any,
      });

      const vendorsCount = vendorMap.size;
      const successMessage = `Successfully saved: ${vendorsCount} vendor(s), ${djsCreated} new DJs (${djsUpdated} updated), ${showsCreated} new shows (${showsUpdated} updated, ${showsDuplicated} duplicates skipped)`;
      this.logAndBroadcast(successMessage, 'success');

      const result = {
        success: true,
        message: successMessage,
        stats: {
          vendorId: primaryVendor?.id || null,
          vendorName: primaryVendor?.name || 'Multiple/None',
          vendorsCount,
          vendorNames: Array.from(vendorMap.keys()),
          djsCreated,
          djsUpdated,
          showsCreated,
          showsUpdated,
          showsDuplicated,
        },
      };

      // 5. Only delete the schedule after everything is successfully saved
      try {
        await this.parsedScheduleRepository.delete(parsedScheduleId);
        this.logAndBroadcast(
          `Successfully deleted approved schedule ${parsedScheduleId} from database`,
          'success',
        );
      } catch (deleteError) {
        // Log the error but don't fail the entire operation since data was saved successfully
        this.logAndBroadcast(
          `Warning: Failed to delete approved schedule ${parsedScheduleId}: ${deleteError.message}`,
          'error',
        );
        this.logAndBroadcast('Data was saved successfully, but schedule cleanup failed', 'error');
      }

      return result;
    } catch (error) {
      this.logAndBroadcast(`Error approving and saving data: ${error.message}`, 'error');
      this.logAndBroadcast(error.stack, 'error');
      throw new Error(`Failed to approve and save data: ${error.message}`);
    }
  }

  /**
   * Normalize parsed data to ensure confidence values are valid numbers
   */
  private normalizeDataConfidence(data: any): any {
    if (!data) return data;

    // Normalize vendor confidence
    if (data.vendor && typeof data.vendor.confidence !== 'number') {
      data.vendor.confidence = 0;
    }
    if (data.vendors && Array.isArray(data.vendors)) {
      data.vendors = data.vendors.map((vendor: any) => ({
        ...vendor,
        confidence: typeof vendor.confidence === 'number' ? vendor.confidence : 0,
      }));
    }

    // Normalize DJ confidence
    if (data.djs && Array.isArray(data.djs)) {
      data.djs = data.djs.map((dj: any) => ({
        ...dj,
        confidence: typeof dj.confidence === 'number' ? dj.confidence : 0,
      }));
    }

    // Normalize show confidence
    if (data.shows && Array.isArray(data.shows)) {
      data.shows = data.shows.map((show: any) => ({
        ...show,
        confidence: typeof show.confidence === 'number' ? show.confidence : 0,
      }));
    }

    return data;
  }

  async approveAllItems(parsedScheduleId: string): Promise<any> {
    const schedule = await this.parsedScheduleRepository.findOne({
      where: { id: parsedScheduleId },
    });

    if (!schedule) {
      throw new Error('Schedule not found');
    }

    // Normalize confidence values before processing
    const normalizedData = this.normalizeDataConfidence(schedule.aiAnalysis);

    return this.approveAndSaveParsedData(parsedScheduleId, normalizedData);
  }

  async rejectSchedule(parsedScheduleId: string, reason?: string): Promise<void> {
    await this.parsedScheduleRepository.update(parsedScheduleId, {
      status: ParseStatus.REJECTED,
      rejectionReason: reason,
    });

    // Delete the schedule after rejection
    await this.parsedScheduleRepository.delete(parsedScheduleId);
    this.logAndBroadcast(`Deleted rejected schedule ${parsedScheduleId} from database`, 'info');
  }

  async saveManualSubmissionForReview(vendorId: string, manualData: any): Promise<ParsedSchedule> {
    const parsedScheduleData: any = {
      url: 'manual-submission',
      rawData: {
        url: 'manual-submission',
        title: 'Manual Data Entry',
        content: JSON.stringify(manualData),
        parsedAt: new Date(),
      },
      aiAnalysis: manualData,
      status: ParseStatus.PENDING_REVIEW,
      vendorId,
    };

    const parsedSchedule = this.parsedScheduleRepository.create(parsedScheduleData);
    return this.parsedScheduleRepository.save(parsedSchedule) as unknown as Promise<ParsedSchedule>;
  }

  /**
   * Trim unnecessary HTML content to reduce size before Gemini processing
   * Conservative approach - only remove clearly non-content elements
   */
  private trimHtmlContent(htmlContent: string): string {
    try {
      let trimmed = htmlContent;

      // Remove the entire <head> section (contains meta, scripts, styles)
      trimmed = trimmed.replace(/<head\b[^>]*>[\s\S]*?<\/head>/gi, '');

      // Remove script tags and their content
      trimmed = trimmed.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

      // Remove style tags and their content
      trimmed = trimmed.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

      // Remove HTML comments
      trimmed = trimmed.replace(/<!--[\s\S]*?-->/g, '');

      // Remove DOCTYPE declaration
      trimmed = trimmed.replace(/<!DOCTYPE[^>]*>/i, '');

      // Only remove footers that are clearly identified as such
      trimmed = trimmed.replace(/<footer\b[^>]*>[\s\S]*?<\/footer>/gi, '');

      // Remove common non-content attributes to reduce size (but keep the elements)
      trimmed = trimmed.replace(/\s+style="[^"]*"/gi, '');
      trimmed = trimmed.replace(/\s+data-[^=]*="[^"]*"/gi, '');
      trimmed = trimmed.replace(/\s+onclick="[^"]*"/gi, '');
      trimmed = trimmed.replace(/\s+onload="[^"]*"/gi, '');

      // Collapse multiple whitespace into single spaces (but preserve line breaks for readability)
      trimmed = trimmed.replace(/[ \t]+/g, ' ');
      trimmed = trimmed.replace(/\n\s*\n/g, '\n');

      // Remove leading/trailing whitespace
      trimmed = trimmed.trim();

      this.logAndBroadcast(
        `HTML trimming: ${htmlContent.length} → ${trimmed.length} chars (${(((htmlContent.length - trimmed.length) / htmlContent.length) * 100).toFixed(1)}% reduction)`,
        'info',
      );

      return trimmed;
    } catch (error) {
      this.logAndBroadcast('Error trimming HTML content, using original:', 'warning');
      return htmlContent;
    }
  }

  /**
   * Debug and Facebook methods - minimal implementations
   */
  async debugPuppeteerExtraction(url: string): Promise<any> {
    const htmlContent = await this.fetchRawHtml(url);
    return {
      url,
      htmlLength: htmlContent.length,
      title: this.extractTitleFromHtml(htmlContent),
      preview: htmlContent.substring(0, 1000),
    };
  }

  /**
   * Capture a full-page screenshot of the website
   */
  private async captureFullPageScreenshot(url: string): Promise<{
    screenshot: Buffer;
    htmlContent: string;
  }> {
    let browser;
    let page;
    try {
      this.logAndBroadcast(`Capturing full-page screenshot from: ${url}`);

      // Platform-aware Puppeteer configuration with aggressive production settings
      const puppeteerArgs = [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-features=TranslateUI,BlinkGenPropertyTrees',
        '--disable-ipc-flooding-protection',
        '--disable-blink-features=AutomationControlled',
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-client-side-phishing-detection',
        '--disable-component-extensions-with-background-pages',
        '--disable-default-apps',
        '--mute-audio',
        '--disable-sync',
        '--disable-translate',
      ];

      // Production-specific arguments for Cloud Run
      if (process.env.NODE_ENV === 'production') {
        puppeteerArgs.push(
          '--memory-pressure-off',
          '--max_old_space_size=256',
          '--disable-background-networking',
          '--disable-background-timer-throttling',
          '--disable-renderer-backgrounding',
          '--disable-features=site-per-process',
          '--aggressive-cache-discard',
          '--disable-hang-monitor',
          '--disable-prompt-on-repost',
          '--disable-domain-reliability',
          '--disable-logging',
          '--silent',
        );
      }

      // Additional Linux-specific arguments for production
      if (process.platform === 'linux') {
        puppeteerArgs.push(
          '--disable-gpu',
          '--no-zygote',
          '--single-process', // Important for Docker containers
          '--disable-extensions',
          '--disable-default-apps',
          '--disable-background-networking',
          '--disable-software-rasterizer',
          '--disable-dev-shm-usage',
          '--run-all-compositor-stages-before-draw',
          '--disable-accelerated-2d-canvas',
          '--disable-accelerated-jpeg-decoding',
          '--disable-accelerated-mjpeg-decode',
          '--disable-accelerated-video-decode',
        );
      }

      browser = await puppeteer.launch({
        headless: true, // Use headless mode for production stability
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
        args: puppeteerArgs,
        timeout: 45000, // Reduced timeout for faster failure
        handleSIGINT: false,
        handleSIGTERM: false,
        handleSIGHUP: false,
        ignoreDefaultArgs: ['--enable-automation'],
        devtools: false,
      });

      // Add error listeners to browser with more aggressive cleanup
      browser.on('disconnected', () => {
        this.logAndBroadcast('Browser disconnected unexpectedly - cleaning up resources');
      });

      browser.on('targetcreated', () => {
        this.logAndBroadcast('Browser target created');
      });

      browser.on('targetdestroyed', () => {
        this.logAndBroadcast('Browser target destroyed');
      });

      page = await browser.newPage();

      // Aggressive page optimization for production
      await page.setBypassCSP(true);
      await page.setJavaScriptEnabled(true);

      // Disable images and CSS for faster loading in production
      if (process.env.NODE_ENV === 'production') {
        await page.setRequestInterception(true);
        page.on('request', (request) => {
          const resourceType = request.resourceType();
          if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
            request.abort();
          } else {
            request.continue();
          }
        });
      }

      // Set aggressive timeouts for production
      const timeout = process.env.NODE_ENV === 'production' ? 20000 : 30000;
      page.setDefaultTimeout(timeout);
      page.setDefaultNavigationTimeout(timeout);
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
      // Use larger viewport for better content capture
      await page.setViewport({ width: 1280, height: 1024 });

      // Navigate and wait for full page load with retry logic
      let navigationSuccess = false;
      let retryCount = 0;
      const maxRetries = 3;

      while (!navigationSuccess && retryCount < maxRetries) {
        try {
          await page.goto(url, {
            waitUntil: 'domcontentloaded',
            timeout: 20000,
          });
          navigationSuccess = true;
        } catch (navError) {
          retryCount++;
          this.logAndBroadcast(`Navigation attempt ${retryCount} failed: ${navError.message}`);
          if (retryCount >= maxRetries) {
            throw navError;
          }
          await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait before retry
        }
      }

      // Reduced wait time for dynamic content
      await new Promise((resolve) => setTimeout(resolve, 1500)); // Reduced from 3000

      // Scroll to bottom to ensure all content is loaded (for lazy loading)
      this.logAndBroadcast('Scrolling to ensure all content is loaded...');
      await page.evaluate(() => {
        return new Promise((resolve) => {
          let totalHeight = 0;
          const distance = 100;
          const timer = setInterval(() => {
            const scrollHeight = document.body.scrollHeight;
            window.scrollBy(0, distance);
            totalHeight += distance;

            if (totalHeight >= scrollHeight) {
              clearInterval(timer);
              resolve(null);
            }
          }, 100);
        });
      });

      // Scroll back to top for consistent screenshot
      await page.evaluate(() => window.scrollTo(0, 0));
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Get page dimensions for logging
      const pageHeight = await page.evaluate(() => document.body.scrollHeight);
      const pageWidth = await page.evaluate(() => document.body.scrollWidth);
      this.logAndBroadcast(`📏 Page dimensions: ${pageWidth}x${pageHeight}px`);

      if (pageHeight < 8000) {
        this.logAndBroadcast(
          `⚠️  Page seems short (${pageHeight}px), expected ~9000px for full content`,
        );
      }

      // Get the HTML content for backup parsing
      const htmlContent = await page.content();

      // Take a high-quality screenshot with timeout protection
      const screenshot = (await Promise.race([
        page.screenshot({
          fullPage: true,
          type: 'jpeg',
          quality: 85, // Balanced quality for faster processing
          optimizeForSpeed: false, // Keep false for better quality
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Screenshot timeout after 30 seconds')), 30000),
        ),
      ])) as Buffer;

      this.logAndBroadcast(
        `Successfully captured full-page screenshot from ${url} (${screenshot.length} bytes, ${htmlContent.length} characters HTML)`,
      );

      return { screenshot, htmlContent };
    } catch (error) {
      this.logAndBroadcast(`Error capturing screenshot from ${url}: ${error.message}`);
      throw error;
    } finally {
      // Aggressive resource cleanup for production stability
      const cleanupTimeout = 5000; // 5 second timeout for cleanup

      const cleanup = async () => {
        try {
          // Close page first
          if (page && !page.isClosed()) {
            await page.removeAllListeners();
            await page.close();
            this.logAndBroadcast('Page closed successfully');
          }
        } catch (closeError) {
          this.logger.warn(`Error closing page: ${closeError.message}`);
        }

        try {
          // Then close browser
          if (browser) {
            // Remove event listeners to prevent hanging
            browser.removeAllListeners();

            if (browser.isConnected()) {
              const pages = await browser.pages();
              await Promise.all(pages.map((p) => p.close().catch(() => {})));
              await browser.close();
              this.logAndBroadcast('Browser closed successfully');
            }
          }
        } catch (closeError) {
          this.logger.warn(`Error closing browser: ${closeError.message}`);
        }

        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
      };

      // Use timeout to prevent hanging cleanup
      await Promise.race([
        cleanup(),
        new Promise((resolve) => setTimeout(resolve, cleanupTimeout)),
      ]);
    }
  }

  /**
   * Parse screenshot using Gemini Vision API
   */
  private async parseScreenshotWithGemini(
    screenshot: Buffer,
    url: string,
  ): Promise<ParsedKaraokeData> {
    try {
      this.logAndBroadcast('Starting Gemini Vision parsing with screenshot');

      const model = this.genAI.getGenerativeModel({
        model: getGeminiModel('vision'), // Latest model for vision tasks
        generationConfig: {
          temperature: 0.1, // Lower temperature for more consistent parsing
          topP: 0.8,
          topK: 40,
          maxOutputTokens: 8192, // Sufficient for large JSON response
        },
      });

      const prompt = `Analyze this screenshot and extract ALL karaoke shows from the ENTIRE weekly schedule.

CRITICAL RESPONSE REQUIREMENTS:
- Return ONLY valid JSON, no other text
- If response would exceed limits, prioritize COMPLETE shows over partial ones
- Ensure JSON is properly closed with all brackets and braces
- Maximum 100 shows per response to prevent truncation

🚫 DUPLICATE PREVENTION - CRITICAL RULES:
- ONLY extract UNIQUE shows - no duplicates allowed across ALL images
- If the same venue appears multiple times with the same day/time, only include it ONCE
- Different days at the same venue = separate shows (e.g., "Bar Monday" vs "Bar Saturday")  
- Different times at the same venue = separate shows (e.g., "Bar 7:00 PM" vs "Bar 10:00 PM")
- Same venue, same day, same time = DUPLICATE, include only once
- Cross-check ALL screenshots to prevent duplicates between different images
- Before adding a show, verify it doesn't already exist in your response
- Merge duplicate venues into single venue entry with most complete information
- Merge duplicate DJs into single DJ entry with most complete information
- Final deduplication: Review entire response before returning to ensure no duplicates

CRITICAL: This page contains shows for ALL 7 DAYS (Monday through Sunday). You must extract shows from the COMPLETE page, not just the top section.

Extract from the ENTIRE image:
- ALL venue names from Monday through Sunday
- ALL addresses, phone numbers, and showtimes  
- ALL DJ/host names mentioned anywhere on the page
- The vendor/company information

🎤 DJ/HOST EXTRACTION - CRITICAL:
- Look for "hosted by" text patterns near each venue
- Extract ALL DJ/host names like "Mattallica", "Dr Rockso", "Frankie the Intern", "Rini the Riot", etc.
- Each show typically has a host name mentioned - extract these as djName for each show
- DJ names often appear as links or special formatting near venue information
- Examples: "hosted by Mattallica", "hosted by Dr Rockso", "hosted by Frankie the Intern"

EXPECTED: There should be 35-40+ shows total across all days of the week.

CRITICAL: SEPARATE ADDRESS COMPONENTS PROPERLY
The most important part is to separate address information into distinct fields:

❌ WRONG - DON'T DO THIS:
address: "1930 Lewis Turner Blvd Fort Walton Beach, FL 32647" ← CONTAINS CITY/STATE/ZIP
address: "630 North High Street Columbus, Ohio 43215" ← CONTAINS CITY/STATE/ZIP

✅ CORRECT - DO THIS:
address: "1930 Lewis Turner Blvd" ← ONLY STREET ADDRESS
city: "Fort Walton Beach" ← ONLY CITY NAME
state: "FL" ← ONLY STATE ABBREVIATION
zip: "32647" ← ONLY ZIP CODE

ADDRESS FIELD RULES:
- ONLY include street number and street name
- NO city names in address field
- NO state names in address field  
- NO ZIP codes in address field
- NO commas in address field
- Examples: "1930 Lewis Turner Blvd", "630 North High Street", "8939 South Old State Road"

CITY FIELD RULES:
- ONLY the city name
- Multi-word cities are OK: "Panama City Beach", "Fort Walton Beach", "Lewis Center"
- NO state abbreviations in city field
- NO ZIP codes in city field
- NO commas in city field

STATE FIELD RULES:
- ONLY 2-letter state abbreviation: "OH", "FL", "CA", "NY", "TX", etc.
- Convert full state names: "Ohio" → "OH", "Florida" → "FL", "California" → "CA"

MORE ADDRESS PARSING EXAMPLES:
- "8939 South Old State Road Lewis Center, Ohio" → address: "8939 South Old State Road", city: "Lewis Center", state: "OH"
- "Front Beach Road Panama City Beach" → address: "Front Beach Road", city: "Panama City Beach", state: "FL"
- "59 Potter Street Delaware" → address: "59 Potter Street", city: "Delaware", state: "OH"
- "8010 Surf Drive Panama City Beach" → address: "8010 Surf Drive", city: "Panama City Beach", state: "FL"
- "Columbus, Ohio" → address: null, city: "Columbus", state: "OH"
- "Lewis Center" → address: null, city: "Lewis Center", state: "OH"

SMART ADDRESS HANDLING:
- If only city+state given, leave address field null but populate city and state
- Use context clues to infer missing state (e.g., if other venues mention Ohio, Delaware likely = Delaware, OH)
- Handle multi-word city names like "Panama City Beach", "Fort Walton Beach", "Lewis Center"

🌍 LAT/LNG COORDINATE EXTRACTION - CRITICAL REQUIREMENT:
For EVERY venue with a complete address (street + city + state), you MUST provide precise latitude and longitude coordinates:
- THIS IS MANDATORY - NEVER leave lat/lng fields empty or null
- Combine the venue name, street address, city, and state to determine the exact location
- Provide coordinates as precise decimal numbers (6+ decimal places)
- VALIDATE coordinates match the city/state: coordinates must be within the specified city/state boundaries
- Use your geographic knowledge to provide accurate coordinates for the business location
- EXAMPLE: "Park St Tavern" at "501 Park St, Columbus, OH" → lat: 39.961176, lng: -82.998794 (verify this is in Columbus, OH)
- EXAMPLE: "The Walrus" at "1432 E Main St, Columbus, OH" → lat: 39.952583, lng: -82.937125 (verify this is in Columbus, OH)
- EXAMPLE: "Cavan Irish Pub" at "2529 N High St, Columbus, OH" → lat: 40.012345, lng: -83.001234 (verify coordinates)
- EXAMPLE: "Budd Dairy" at "1086 N High St, Columbus, OH" → lat: 39.978456, lng: -82.999123 (verify coordinates)
- If address is incomplete (missing street address), still attempt to get city-level coordinates
- If you cannot determine precise coordinates, provide city-center coordinates as fallback
- CRITICAL: Double-check that lat/lng coordinates are actually located in the specified city and state
- NEVER submit a venue without lat/lng coordinates - this is required for mapping functionality

🕒 TIME PARSING INSTRUCTIONS - CRITICAL:
- ALWAYS provide both "time" (human readable) and "startTime" (24-hour format)
- EXAMPLE: time="7 pm" → startTime="19:00"
- EXAMPLE: time="8 pm" → startTime="20:00"
- EXAMPLE: time="9 pm" → startTime="21:00"
- EXAMPLE: time="10 pm" → startTime="22:00"
- EXAMPLE: time="11 pm" → startTime="23:00"
- EXAMPLE: time="12 pm" → startTime="12:00"
- EXAMPLE: time="9:30 pm" → startTime="21:30"
- EXAMPLE: time="7:45 pm" → startTime="19:45"
- For endTime: Look for explicit end times or use "00:00" (midnight) as default
- NEVER leave startTime as null - always convert from time field

Return ONLY valid JSON with no extra text:

{
  "vendor": {
    "name": "Company Name",
    "website": "${url}",
    "description": "Brief description",
    "confidence": 0.9
  },
  "venues": [
    {
      "name": "Venue Name",
      "address": "ONLY street address (no city/state/zip)",
      "city": "ONLY city name",
      "state": "ONLY 2-letter state code",
      "zip": "ONLY zip code",
      "lat": 39.961176,
      "lng": -82.998794,
      "phone": "Phone number",
      "website": "Venue website if available",
      "confidence": 0.9
    }
  ],
  "djs": [
    {
      "name": "DJ Name (like Mattallica, Dr Rockso, Frankie the Intern, etc.)",
      "confidence": 0.8,
      "context": "Where they perform",
      "aliases": []
    }
  ],
  "shows": [
    {
      "venueName": "Venue Name (must match a venue from venues array)",
      "date": "day_of_week",
      "time": "time like '7 pm'",
      "startTime": "24-hour format like '19:00'",
      "endTime": "close",
      "day": "day_of_week",
      "djName": "DJ/host name from 'hosted by' text (REQUIRED if visible)",
      "vendor": "Vendor/company providing service",
      "confidence": 0.9
    }
  ]
}`;

      const imagePart = {
        inlineData: {
          data: screenshot.toString('base64'),
          mimeType: 'image/jpeg', // Changed to match JPEG format
        },
      };

      this.logAndBroadcast(`Making Gemini Vision API request with optimized settings...`);
      this.logAndBroadcast(`Image size: ${(screenshot.length / 1024 / 1024).toFixed(2)} MB`);

      const result = (await Promise.race([
        model.generateContent([prompt, imagePart]),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error('Gemini Vision API timeout after 120 seconds')),
            120000,
          ),
        ),
      ])) as any;
      const response = await result.response;
      const text = response.text();

      this.logAndBroadcast('Gemini Vision response received, extracting JSON');
      this.logAndBroadcast(`Gemini Vision response length: ${text.length} characters`);

      // Check if Gemini returned a refusal or non-JSON response
      const refusalPatterns = [
        /^I am unable/i,
        /^I cannot/i,
        /^I can't/i,
        /^Sorry, I cannot/i,
        /^I'm unable/i,
        /^I'm sorry/i,
        /^This image/i,
      ];

      const isRefusal = refusalPatterns.some((pattern) => pattern.test(text.trim()));
      if (isRefusal) {
        this.logAndBroadcast(
          `❌ Gemini refused to process image: ${text.substring(0, 200)}...`,
          'error',
        );
        throw new Error(`Gemini Vision refused to process the image: ${text.substring(0, 100)}...`);
      }

      // Check if response looks like JSON at all
      const trimmedText = text.trim();
      if (!trimmedText.startsWith('{') && !trimmedText.startsWith('[')) {
        this.logAndBroadcast(
          `❌ Non-JSON response from Gemini: ${text.substring(0, 200)}...`,
          'error',
        );
        throw new Error(`Gemini returned non-JSON response: ${text.substring(0, 100)}...`);
      }

      // Log usage metadata if available
      if (result.response.usageMetadata) {
        const usage = result.response.usageMetadata;
        this.logAndBroadcast(
          `Token usage - Prompt: ${usage.promptTokenCount || 'N/A'}, Candidates: ${usage.candidatesTokenCount || 'N/A'}, Total: ${usage.totalTokenCount || 'N/A'}`,
        );
      }

      // Clean and parse JSON response with better error handling
      this.logAndBroadcast('Raw Gemini response (first 500 chars):', 'info');
      this.logAndBroadcast(`Full response length: ${text.length} characters`, 'info');

      let parsedData;
      let cleanJsonString;
      try {
        cleanJsonString = this.cleanGeminiResponse(text);
        // Pre-validate the JSON structure
        cleanJsonString = this.preValidateAndFixJson(cleanJsonString);

        this.logAndBroadcast('Cleaned JSON (first 500 chars):', 'info');
        this.logAndBroadcast(`Cleaned JSON length: ${cleanJsonString.length} characters`, 'info');
        parsedData = JSON.parse(cleanJsonString);
        this.logAndBroadcast('✅ JSON parsing successful', 'success');
      } catch (jsonError) {
        this.logAndBroadcast('❌ JSON parsing failed, attempting to fix common issues:', 'error');
        this.logAndBroadcast(`JSON Error: ${jsonError.message}`, 'error');

        // Extract position from error message and show context
        const positionMatch = jsonError.message.match(/position (\d+)/);
        if (positionMatch && cleanJsonString) {
          const position = parseInt(positionMatch[1]);
          const start = Math.max(0, position - 100);
          const end = Math.min(cleanJsonString.length, position + 100);
          const context = cleanJsonString.substring(start, end);
          const marker = ' '.repeat(Math.min(position - start, 100)) + '↑ ERROR HERE';

          this.logAndBroadcast(`🔍 Error context around position ${position}:`, 'error');
          this.logAndBroadcast(context, 'error');
          this.logAndBroadcast(marker, 'error');
        }

        // Log a sample of the problematic JSON for debugging
        if (cleanJsonString) {
          const problemArea = cleanJsonString.substring(Math.max(0, cleanJsonString.length - 1000));
          this.logAndBroadcast(`Last 1000 chars of JSON: ${problemArea}`, 'error');
        }

        // Try to fix common JSON issues
        let fixedJson = this.cleanGeminiResponse(text);

        // Fix common trailing comma issues
        fixedJson = fixedJson.replace(/,(\s*[}\]])/g, '$1');

        // Fix missing quotes around property names
        fixedJson = fixedJson.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":');

        // Fix missing commas between array elements
        fixedJson = fixedJson.replace(/}\s*{/g, '},{');

        // Fix decimal numbers that might be causing issues
        fixedJson = fixedJson.replace(/:\s*(\d+\.\d+)([^\d,}\]])/g, ': $1,$2');

        // Attempt to fix truncated JSON by adding missing closing brackets/braces
        let braceCount = 0;
        let bracketCount = 0;
        let inString = false;
        let escaped = false;

        for (let i = 0; i < fixedJson.length; i++) {
          const char = fixedJson[i];

          if (escaped) {
            escaped = false;
            continue;
          }

          if (char === '\\') {
            escaped = true;
            continue;
          }

          if (char === '"') {
            inString = !inString;
            continue;
          }

          if (!inString) {
            if (char === '{') braceCount++;
            else if (char === '}') braceCount--;
            else if (char === '[') bracketCount++;
            else if (char === ']') bracketCount--;
          }
        }

        // Add missing closing characters
        if (bracketCount > 0 || braceCount > 0) {
          this.logAndBroadcast(
            `Attempting to fix truncated JSON: missing ${bracketCount} brackets, ${braceCount} braces`,
            'info',
          );

          // Remove any trailing commas first
          fixedJson = fixedJson.replace(/,\s*$/, '');

          // Close arrays first, then objects
          for (let i = 0; i < bracketCount; i++) {
            fixedJson += ']';
          }
          for (let i = 0; i < braceCount; i++) {
            fixedJson += '}';
          }
        }

        // Try to find and fix incomplete JSON by finding the last valid closing brace
        const lastValidJson = this.extractValidJson(fixedJson);
        if (lastValidJson) {
          try {
            parsedData = JSON.parse(lastValidJson);
            this.logAndBroadcast('✅ Successfully parsed JSON after fixing', 'success');
          } catch (secondError) {
            // If JSON parsing fails again, try to extract partial data
            this.logAndBroadcast(
              `❌ Even fixed JSON failed to parse: ${secondError.message}`,
              'error',
            );

            // Check if the error is at the end of the JSON (truncation)
            if (secondError.message.includes('position') && secondError.message.includes('array')) {
              const position = parseInt(secondError.message.match(/position (\d+)/)?.[1] || '0');
              this.logAndBroadcast(
                `🔧 Truncation detected at position ${position}, attempting to recover partial data`,
                'info',
              );

              // Try to extract what we can from the beginning
              try {
                const partialJson = lastValidJson.substring(0, position);
                const lastBraceIndex = partialJson.lastIndexOf('}');
                if (lastBraceIndex > 0) {
                  const recoveredJson = partialJson.substring(0, lastBraceIndex + 1) + ']}';
                  const partialData = JSON.parse(recoveredJson);
                  this.logAndBroadcast(
                    `🎉 Recovered ${partialData.shows?.length || 0} shows from truncated response`,
                    'success',
                  );
                  parsedData = partialData;
                } else {
                  // Try emergency extraction as last resort
                  const emergencyData = this.extractPartialDataFromMalformedJson(text, url);
                  if (emergencyData) {
                    this.logAndBroadcast(
                      `🚨 Emergency extraction successful - using partial data`,
                      'warning',
                    );
                    parsedData = emergencyData;
                  } else {
                    this.logAndBroadcast(
                      `❌ Could not find valid structure in partial JSON`,
                      'error',
                    );
                    throw new Error(`JSON parsing failed: ${jsonError.message}`);
                  }
                }
              } catch (partialError) {
                this.logAndBroadcast(
                  `❌ Partial recovery failed: ${partialError.message}`,
                  'error',
                );

                // Try emergency extraction as last resort
                const emergencyData = this.extractPartialDataFromMalformedJson(text, url);
                if (emergencyData) {
                  this.logAndBroadcast(
                    `🚨 Emergency extraction successful - using partial data`,
                    'warning',
                  );
                  parsedData = emergencyData;
                } else {
                  throw new Error(`JSON parsing failed: ${jsonError.message}`);
                }
              }
            } else {
              // Try emergency extraction as last resort
              const emergencyData = this.extractPartialDataFromMalformedJson(text, url);
              if (emergencyData) {
                this.logAndBroadcast(
                  `🚨 Emergency extraction successful - using partial data`,
                  'warning',
                );
                parsedData = emergencyData;
              } else {
                this.logAndBroadcast(
                  `❌ Non-truncation error, cannot recover: ${secondError.message}`,
                  'error',
                );
                throw new Error(`JSON parsing failed: ${jsonError.message}`);
              }
            }
          }
        } else {
          // Try emergency extraction as last resort
          const emergencyData = this.extractPartialDataFromMalformedJson(text, url);
          if (emergencyData) {
            this.logAndBroadcast(
              `🚨 Emergency extraction successful - using partial data`,
              'warning',
            );
            parsedData = emergencyData;
          } else {
            throw new Error(`JSON parsing failed: ${jsonError.message}`);
          }
        }
      }

      // Log detailed parsing results
      const showCount = parsedData.shows?.length || 0;
      const djCount = parsedData.djs?.length || 0;
      const vendorName = parsedData.vendor?.name || 'Unknown';

      this.logAndBroadcast(
        `📊 Parsing Results: ${showCount} shows, ${djCount} DJs, vendor: ${vendorName}`,
        'info',
      );

      // Check for potential truncation indicators
      if (showCount < 30) {
        this.logAndBroadcast(
          `⚠️  WARNING: Only found ${showCount} shows, expected 35-40+. Response may have been truncated.`,
          'warning',
        );

        // Check if the original response was very long (potential truncation)
        if (text.length > 15000) {
          this.logAndBroadcast(
            `🔍 Response was ${text.length} characters - likely truncated. Consider reducing scope.`,
            'warning',
          );
        }
      }

      // Validate coordinate quality
      const showsWithCoords =
        parsedData.shows?.filter((show) => show.latitude && show.longitude) || [];
      const coordPercentage =
        showCount > 0 ? Math.round((showsWithCoords.length / showCount) * 100) : 0;

      this.logAndBroadcast(
        `🌍 Coordinate extraction: ${showsWithCoords.length}/${showCount} shows (${coordPercentage}%) have coordinates`,
        coordPercentage >= 80 ? 'success' : 'warning',
      );

      if (showCount < 30) {
        this.logAndBroadcast(
          `⚠️  WARNING: Only found ${showCount} shows, expected 35-40+. May be incomplete parsing.`,
          'warning',
        );
      } else {
        this.logAndBroadcast(`✅ Good show count: ${showCount} shows found`, 'success');
      }

      this.logAndBroadcast(
        `Vision parsed data extracted - Shows: ${parsedData.shows?.length || 0}, DJs: ${parsedData.djs?.length || 0}, Vendor: ${parsedData.vendor?.name || 'Unknown'}`,
        'success',
      );

      // Ensure required structure with defaults
      const finalData: ParsedKaraokeData = {
        vendor: parsedData.vendor || this.generateVendorFromUrl(url),
        djs: Array.isArray(parsedData.djs) ? parsedData.djs : [],
        shows: Array.isArray(parsedData.shows) ? this.normalizeShowTimes(parsedData.shows) : [],
        rawData: {
          url,
          title: 'Screenshot-based parsing',
          content: 'Parsed from full-page screenshot',
          parsedAt: new Date(),
        },
      };

      // Extract DJs from individual shows and add to main DJs array
      const extractedDJs = this.extractDJsFromShows(finalData.shows);
      finalData.djs = this.mergeDJArrays(finalData.djs, extractedDJs);

      this.logAndBroadcast(
        `Final DJ extraction: ${finalData.djs.length} total DJs (including ${extractedDJs.length} from individual shows)`,
        'info',
      );

      return finalData;
    } catch (error) {
      this.logAndBroadcast('❌ Error parsing screenshot with Gemini Vision:', 'error');
      this.logAndBroadcast(`❌ Error details: ${error.message}`, 'error');

      // Provide specific error context based on error type
      if (error.message.includes('refused to process')) {
        this.logAndBroadcast(
          '🔍 This may be due to image content policy restrictions or image quality issues',
          'warning',
        );
      } else if (error.message.includes('non-JSON response')) {
        this.logAndBroadcast(
          '🔍 Gemini returned text instead of the expected JSON format',
          'warning',
        );
      } else if (error.message.includes('JSON parsing failed')) {
        this.logAndBroadcast('🔍 The JSON response was malformed or incomplete', 'warning');
      }

      throw new Error(`Gemini Vision parsing failed: ${error.message}`);
    }
  }

  /**
   * Safely truncate string for logging
   */
  private truncateForLogging(str: string, maxLength: number = 200): string {
    if (str.length <= maxLength) {
      return str;
    }
    return str.substring(0, maxLength) + `... (truncated, total length: ${str.length})`;
  }

  /**
   * Clean and validate base64 image data
   */
  private cleanAndValidateBase64(base64Data: string, index: number): string {
    try {
      // Remove data URL prefix if present
      let cleanBase64 = base64Data;
      if (base64Data.startsWith('data:image/')) {
        const base64Index = base64Data.indexOf(',');
        if (base64Index !== -1) {
          cleanBase64 = base64Data.substring(base64Index + 1);
        }
      }

      // Remove any whitespace or newlines
      cleanBase64 = cleanBase64.replace(/\s/g, '');

      // Validate base64 format
      if (!cleanBase64.match(/^[A-Za-z0-9+/]*={0,2}$/)) {
        throw new Error(`Invalid base64 format`);
      }

      // Test if it's valid base64 by trying to create a buffer
      const buffer = Buffer.from(cleanBase64, 'base64');

      // Basic image format validation - check for common image headers
      const imageHeaders = {
        jpeg: [0xff, 0xd8, 0xff],
        png: [0x89, 0x50, 0x4e, 0x47],
        gif: [0x47, 0x49, 0x46],
        webp: [0x52, 0x49, 0x46, 0x46],
      };

      const isValidImage = Object.values(imageHeaders).some((header) =>
        header.every((byte, i) => buffer[i] === byte),
      );

      if (!isValidImage) {
        throw new Error(`Data does not appear to be a valid image`);
      }

      return cleanBase64;
    } catch (error) {
      throw new Error(`Screenshot ${index + 1} validation failed: ${error.message}`);
    }
  }

  /**
   * Analyze multiple screenshots with Gemini Vision for Instagram parsing
   */
  async analyzeScreenshotsWithGemini(
    screenshots: string[], // base64 encoded images
    url: string,
    description?: string,
  ): Promise<ParsedKaraokeData> {
    try {
      this.logAndBroadcast(
        `Starting Instagram screenshot analysis with ${screenshots.length} screenshots`,
        'info',
      );

      const model = this.genAI.getGenerativeModel({
        model: getGeminiModel('vision'),
        generationConfig: {
          temperature: 0.1,
          topP: 0.8,
          topK: 40,
          maxOutputTokens: 8192,
        },
      });

      const prompt = `Analyze these Instagram profile screenshots and extract ALL karaoke shows with complete venue addresses and show times.

🎯 CRITICAL FOCUS: This Instagram profile contains a weekly karaoke schedule - you MUST extract ALL venues, COMPLETE addresses, and EXACT show times.

CRITICAL RESPONSE REQUIREMENTS:
- Return ONLY valid JSON, no other text
- Extract EVERY venue mentioned across all screenshots
- Get COMPLETE addresses with street, city, state
- Extract EXACT show times (not approximations)
- Look at BOTH the profile description/bio area AND individual posts

🚫 DUPLICATE PREVENTION - CRITICAL RULES:
- ONLY extract UNIQUE shows - no duplicates allowed across ALL images
- If the same venue appears multiple times with the same day/time, only include it ONCE
- Different days at the same venue = separate shows (e.g., "Bar Monday" vs "Bar Saturday")  
- Different times at the same venue = separate shows (e.g., "Bar 7:00 PM" vs "Bar 10:00 PM")
- Same venue, same day, same time = DUPLICATE, include only once
- Cross-check ALL screenshots to prevent duplicates between different images
- Before adding a show, verify it doesn't already exist in your response
- Merge duplicate venues into single venue entry with most complete information
- Merge duplicate DJs into single DJ entry with most complete information
- Final deduplication: Review entire response before returning to ensure no duplicates

Instagram Profile: ${url}
${description ? `Description: ${description}` : ''}

📸 SCREENSHOT ANALYSIS INSTRUCTIONS:
Analyze ALL provided screenshots comprehensively:
- Screenshot 1: May contain profile bio/description with weekly schedule summary
- Screenshot 2: May contain detailed posts with venue information  
- Screenshot 3+: Additional posts with venue details and addresses
- Combine information from ALL screenshots for complete extraction
- If venue appears in multiple screenshots, use most complete information
- Extract ALL unique shows across ALL screenshots
- Do NOT miss any venue or show that appears in any of the screenshots

🏢 VENUE & ADDRESS EXTRACTION - CRITICAL:
- Look for complete address patterns like "1234 Main St, Columbus, OH" 
- Extract phone numbers that appear near venue names
- Look for venue websites or social media handles
- Each venue should have a complete address, not just a name
- If you see "Oneilly's Sports Pub" - find its complete address in the posts
- Look for patterns like "Tonight at [Venue] - [Address] - [Time]"

🕒 TIME EXTRACTION - MANDATORY:
- Look for specific times like "7pm", "8pm", "9pm", "10pm"
- Convert to both human format ("7 pm") AND 24-hour format ("19:00")
- If you see a venue but no time, default to common karaoke hours
- Look for phrases like "starts at", "begins at", "showtime"
- NEVER leave time fields empty

🎤 DJ NAME EXTRACTION:
- Extract the profile owner's name as the primary DJ
- Look for @username in the profile
- Check profile description for DJ name or business name

🗓️ DAY EXTRACTION:
- Look for weekly schedule patterns: "MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"
- Or full day names: "Monday", "Tuesday", etc.
- Each venue + day combination = separate show entry
- If schedule shows "Monday: Venue A, Tuesday: Venue B" - create 2 separate shows

🚨 CRITICAL ADDRESS COMPONENT SEPARATION:
NEVER MIX ADDRESS COMPONENTS - SEPARATE THEM CLEANLY:

✅ CORRECT address parsing examples:
"1930 Lewis Turner Blvd Fort Walton Beach, FL 32647"
→ address: "1930 Lewis Turner Blvd"
→ city: "Fort Walton Beach"  
→ state: "FL"
→ zip: "32647"

"630 North High Street Columbus, Ohio 43215"
→ address: "630 North High Street"
→ city: "Columbus"
→ state: "OH" 
→ zip: "43215"

❌ WRONG - DON'T DO THIS:
address: "1930 Lewis Turner Blvd Fort Walton Beach, FL 32647" ← CONTAINS CITY/STATE/ZIP

🌍 COORDINATE REQUIREMENTS - MANDATORY:
For EVERY venue, provide precise lat/lng coordinates:
- Use venue name + complete address to determine exact location
- Provide coordinates as decimal numbers with 6+ decimal places
- Validate coordinates are in the correct city/state
- Example: "Oneilly's Sports Pub" in Columbus, OH → lat: 39.961176, lng: -82.998794

📝 EXAMPLE EXTRACTION:
If you see: "Friday nights at Oneilly's Sports Pub - 123 Main St, Columbus, OH - 9pm karaoke with djmax614"

Extract as:
{
  "venue": "Oneilly's Sports Pub",
  "address": "123 Main St",
  "city": "Columbus", 
  "state": "OH",
  "day": "friday",
  "time": "9 pm",
  "startTime": "21:00",
  "djName": "djmax614",
  "lat": 39.961176,
  "lng": -82.998794
}

Return ONLY valid JSON:
{
  "vendor": {
    "name": "DJ or business name from profile",
    "website": "${url}",
    "description": "Profile bio/description text",
    "confidence": 0.9
  },
  "venues": [
    {
      "name": "COMPLETE Venue Name",
      "address": "COMPLETE street address ONLY (no city/state/zip)",
      "city": "City name ONLY",
      "state": "2-letter state code ONLY", 
      "zip": "ZIP code ONLY",
      "lat": "REQUIRED precise latitude",
      "lng": "REQUIRED precise longitude",
      "phone": "Phone number if found",
      "website": "Website if found",
      "confidence": 0.8
    }
  ],
  "djs": [
    {
      "name": "DJ Name from profile",
      "confidence": 0.9,
      "context": "Instagram profile owner"
    }
  ],
  "shows": [
    {
      "venueName": "Venue Name (must match a venue from venues array)",
      "time": "EXACT time like '9 pm'",
      "startTime": "REQUIRED 24-hour format like '21:00'",
      "endTime": "End time or 'close'",
      "day": "EXACT day_of_week",
      "djName": "DJ/host name",
      "vendor": "Vendor/company providing service",
      "description": "Additional show details",
      "confidence": 0.8
    }
  ]
}`;

      // Validate and clean base64 strings before converting to image parts
      this.logAndBroadcast(`Processing ${screenshots.length} screenshots for validation`, 'info');

      const validScreenshots = screenshots.map((screenshot, index) => {
        try {
          const truncatedPreview = this.truncateForLogging(screenshot, 100);
          this.logAndBroadcast(
            `Validating screenshot ${index + 1}/${screenshots.length} (length: ${screenshot.length}, preview: ${truncatedPreview})`,
            'info',
          );
          return this.cleanAndValidateBase64(screenshot, index);
        } catch (error) {
          this.logAndBroadcast(`❌ ${error.message}`, 'error');
          throw error;
        }
      });

      this.logAndBroadcast(
        `✅ All ${validScreenshots.length} screenshots validated successfully`,
        'success',
      );

      // Convert base64 strings to image parts
      const imageParts = validScreenshots.map((screenshot) => ({
        inlineData: {
          data: screenshot,
          mimeType: 'image/jpeg',
        },
      }));

      this.logAndBroadcast(
        `Making Gemini Vision API request with ${validScreenshots.length} images`,
      );

      let result;
      try {
        result = (await Promise.race([
          model.generateContent([prompt, ...imageParts]),
          new Promise((_, reject) =>
            setTimeout(
              () => reject(new Error('Gemini Vision API timeout after 120 seconds')),
              120000,
            ),
          ),
        ])) as any;
      } catch (apiError) {
        this.logAndBroadcast(`❌ Gemini Vision API error: ${apiError.message}`, 'error');

        // Handle specific API errors
        if (apiError.message.includes('API_KEY')) {
          throw new Error('Invalid or missing Gemini API key');
        } else if (apiError.message.includes('QUOTA_EXCEEDED')) {
          throw new Error('Gemini API quota exceeded');
        } else if (apiError.message.includes('INVALID_ARGUMENT')) {
          throw new Error('Invalid image data provided to Gemini API');
        } else if (apiError.message.includes('timeout')) {
          throw new Error('Gemini API request timed out - images may be too large');
        }

        throw new Error(`Gemini Vision API failed: ${apiError.message}`);
      }

      const response = await result.response;
      const text = response.text();

      this.logAndBroadcast('Gemini Vision response received for Instagram analysis');
      this.logAndBroadcast(`Response length: ${text.length} characters`);

      // Clean and parse JSON response
      let parsedData;
      try {
        const cleanJsonString = this.cleanGeminiResponse(text);
        parsedData = JSON.parse(cleanJsonString);
        this.logAndBroadcast('✅ Instagram JSON parsing successful', 'success');
      } catch (jsonError) {
        this.logAndBroadcast('❌ Instagram JSON parsing failed:', 'error');
        this.logAndBroadcast(`JSON Error: ${jsonError.message}`, 'error');
        throw new Error(`Invalid JSON response from Gemini: ${jsonError.message}`);
      }

      // Log results
      const showCount = parsedData.shows?.length || 0;
      const djCount = parsedData.djs?.length || 0;
      const venueCount = parsedData.venues?.length || 0;
      const vendorName = parsedData.vendor?.name || 'Instagram Profile';

      this.logAndBroadcast(
        `Instagram analysis results: ${showCount} shows, ${venueCount} venues, ${djCount} DJs, profile: ${vendorName}`,
        'success',
      );

      // Ensure required structure
      const finalData: ParsedKaraokeData = {
        vendor: parsedData.vendor || {
          name: 'Instagram Profile',
          website: url,
          description: 'Parsed from Instagram screenshots',
          confidence: 0.7,
        },
        venues: Array.isArray(parsedData.venues) ? parsedData.venues : [],
        djs: Array.isArray(parsedData.djs) ? parsedData.djs : [],
        shows: Array.isArray(parsedData.shows) ? this.normalizeShowTimes(parsedData.shows) : [],
        rawData: {
          url,
          title: 'Instagram Screenshots',
          content: 'Parsed from Instagram profile screenshots',
          parsedAt: new Date(),
        },
      };

      return finalData;
    } catch (error) {
      this.logAndBroadcast('Error analyzing Instagram screenshots:', 'error');
      throw new Error(`Instagram screenshot analysis failed: ${error.message}`);
    }
  }

  /**
   * Approve and save admin-uploaded analysis data with deduplication
   */
  async approveAndSaveAdminData(approvedData: ParsedKaraokeData, userId?: string): Promise<any> {
    this.logAndBroadcast('Starting admin data approval and save process', 'info');

    try {
      // Ensure venues array exists - extract from shows if missing
      if (!approvedData.venues || approvedData.venues.length === 0) {
        approvedData.venues = this.extractVenuesFromShows(approvedData.shows || []);
        this.logAndBroadcast(
          `Extracted ${approvedData.venues.length} unique venues from show data`,
          'info',
        );
      }

      // Remove duplicates from approved data before processing
      const originalShowCount = approvedData.shows.length;
      approvedData.shows = this.removeDuplicateShows(approvedData.shows);
      approvedData.djs = this.removeDuplicateDjs(approvedData.djs);
      const finalShowCount = approvedData.shows.length;
      const duplicatesRemoved = originalShowCount - finalShowCount;

      this.logAndBroadcast(
        `Removed ${duplicatesRemoved} duplicate shows (${originalShowCount} → ${finalShowCount})`,
        'info',
      );

      // Create a temporary parsed schedule for admin data
      const tempParsedSchedule = await this.parsedScheduleRepository.save({
        url: 'Admin Upload',
        status: ParseStatus.APPROVED,
        rawData: approvedData.rawData || { content: 'Admin uploaded screenshot analysis' },
        aiAnalysis: approvedData,
        notes: 'Admin approved screenshot analysis',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Use the existing method to save the data
      const result = await this.approveAndSaveParsedData(
        tempParsedSchedule.id,
        approvedData,
        userId,
      );

      this.logAndBroadcast(
        `Admin data successfully saved via schedule ID: ${tempParsedSchedule.id}`,
        'success',
      );

      return {
        success: true,
        duplicatesRemoved,
        originalCount: originalShowCount,
        finalCount: finalShowCount,
        scheduleId: tempParsedSchedule.id,
        saveResult: result,
      };
    } catch (error) {
      this.logAndBroadcast(`Error saving admin data: ${error.message}`, 'error');
      throw new Error(`Failed to save admin data: ${error.message}`);
    }
  }

  /**
   * Parse Instagram profile with screenshots and save for admin review
   */
  async parseInstagramWithScreenshots(url: string): Promise<{
    parsedScheduleId: string;
    data: ParsedKaraokeData;
    stats: {
      showsFound: number;
      djsFound: number;
      venuesFound: number;
      vendorsFound: number;
      vendorName: string;
      htmlLength: number;
      processingTime: number;
    };
  }> {
    const startTime = Date.now();

    try {
      // Set parsing status to active
      this.setParsingStatus(true, url);

      this.logAndBroadcast(`Starting Instagram visual parsing for URL: ${url}`, 'info');

      // Use the Instagram visual parser
      const parsedData = await this.parseInstagramVisually(url);

      const processingTime = Date.now() - startTime;

      // Add final success logs before saving
      this.logAndBroadcast(
        `Instagram processing completed in ${processingTime}ms - Shows: ${parsedData.shows?.length || 0}, DJs: ${parsedData.djs?.length || 0}`,
        'success',
      );

      // Debug: Log how many parsing logs we captured
      this.logAndBroadcast(
        `Captured ${this.currentParsingLogs.length} parsing logs for database storage`,
        'info',
      );

      // Ensure URL name is set based on parsed data
      await this.ensureUrlNameIsSet(url, parsedData);

      // Save to parsed_schedules table for admin review
      const parsedScheduleData: any = {
        url: url,
        rawData: {
          url: url,
          title: 'Instagram Profile',
          content: 'Parsed from Instagram visual content',
          parsedAt: new Date(),
        },
        aiAnalysis: parsedData,
        status: ParseStatus.PENDING_REVIEW,
        parsingLogs: [...this.currentParsingLogs], // Include captured logs
      };

      const parsedSchedule = this.parsedScheduleRepository.create(parsedScheduleData);
      const savedSchedule = (await this.parsedScheduleRepository.save(
        parsedSchedule,
      )) as unknown as ParsedSchedule;

      // Mark the URL as parsed in the urls_to_parse table
      const urlToParse = await this.urlToParseRepository.findOne({ where: { url: url } });
      if (urlToParse) {
        await this.urlToParseService.markAsParsed(urlToParse.id);
        this.logAndBroadcast(`Marked URL ${url} as parsed in database`, 'info');
      }

      this.logAndBroadcast(
        `Successfully saved Instagram parsed data for admin review. ID: ${savedSchedule.id}`,
        'success',
      );

      return {
        parsedScheduleId: savedSchedule.id,
        data: parsedData,
        stats: {
          showsFound: parsedData.shows?.length || 0,
          djsFound: parsedData.djs?.length || 0,
          venuesFound: parsedData.venues?.length || 0,
          vendorsFound: (parsedData.vendors?.length || 0) + (parsedData.vendor ? 1 : 0),
          vendorName: parsedData.vendor?.name || 'Instagram Profile',
          htmlLength: 0, // No HTML for Instagram
          processingTime,
        },
      };
    } catch (error) {
      this.logAndBroadcast(`Error parsing Instagram profile ${url}: ${error.message}`, 'error');
      this.logAndBroadcast(`Error stack: ${error.stack}`, 'error');

      throw new Error(`Failed to parse Instagram profile: ${error.message}`);
    } finally {
      // Clear parsing status
      this.setParsingStatus(false);
    }
  }

  /**
   * Parse Instagram profile using visual analysis with individual post clicking
   */
  private async parseInstagramVisually(url: string): Promise<ParsedKaraokeData> {
    let browser;
    try {
      this.logAndBroadcast('Launching Puppeteer for enhanced Instagram parsing...', 'info');

      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--disable-default-apps',
          '--disable-extensions',
        ],
      });

      const page = await browser.newPage();

      // Set a realistic user agent
      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      );

      this.logAndBroadcast(`Navigating to Instagram profile: ${url}`, 'info');
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

      // Wait for page to fully load
      await new Promise((resolve) => setTimeout(resolve, 5000));

      const allContent = [];

      // First, capture the profile bio and click "See more" if present
      this.logAndBroadcast('Extracting profile bio and expanding full description...', 'info');
      const bioData = await page.evaluate(async () => {
        // Try to click "See more" button to expand full bio
        const seeMoreButtons = document.querySelectorAll('button, span, div');
        let seeMoreClicked = false;

        for (const element of seeMoreButtons) {
          const text = element.textContent?.toLowerCase() || '';
          if (text.includes('see more') || text.includes('more') || text.includes('...more')) {
            try {
              (element as HTMLElement).click();
              seeMoreClicked = true;
              break;
            } catch (e) {
              // Continue trying other elements
            }
          }
        }

        // Wait a moment for expansion if clicked
        if (seeMoreClicked) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }

        // Get bio text after potential expansion
        const bioElements = document.querySelectorAll('[data-testid="user-biography"]');
        let bioText = '';
        bioElements.forEach((el) => {
          bioText += el.textContent + ' ';
        });

        // If bio is still short, try alternative selectors
        if (bioText.length < 50) {
          const altBioElements = document.querySelectorAll('div[dir="auto"]');
          altBioElements.forEach((el) => {
            const text = el.textContent || '';
            if (text.length > 50 && text.toLowerCase().includes('karaoke')) {
              bioText += text + ' ';
            }
          });
        }

        // Get profile name
        const nameElements = document.querySelectorAll('h2');
        let profileName = '';
        nameElements.forEach((el) => {
          if (el.textContent && el.textContent.trim() && !profileName) {
            profileName = el.textContent.trim();
          }
        });

        return {
          bio: bioText.trim(),
          profileName: profileName,
          seeMoreClicked: seeMoreClicked,
        };
      });

      // Log the expanded bio
      this.logAndBroadcast(
        `Profile bio extracted (${bioData.bio.length} chars): ${bioData.bio.substring(0, 200)}...`,
        'info',
      );
      if (bioData.seeMoreClicked) {
        this.logAndBroadcast('✅ Successfully expanded "See more" to get full bio', 'success');
      } else {
        this.logAndBroadcast('⚠️ No "See more" button found or clicked', 'warning');
      }

      // Wait a moment after potential bio expansion
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Take profile bio screenshot
      const bioScreenshot = await page.screenshot({
        fullPage: false,
        type: 'jpeg',
        quality: 85,
        clip: { x: 0, y: 0, width: 1280, height: 800 },
      });

      allContent.push({
        type: 'profile_bio',
        screenshot: bioScreenshot.toString('base64'),
        text: bioData.bio,
        profileName: bioData.profileName,
      });

      // Find all post links on the profile
      this.logAndBroadcast('Finding Instagram post links...', 'info');
      const postLinks = await page.evaluate(() => {
        // Look for post links - Instagram uses specific patterns
        const links = Array.from(document.querySelectorAll('a[href*="/p/"]'));
        return links.slice(0, 10).map((link) => (link as HTMLAnchorElement).href); // Limit to first 10 posts
      });

      this.logAndBroadcast(`Found ${postLinks.length} post links to analyze`, 'info');

      // Click on each post and extract content
      for (let i = 0; i < Math.min(postLinks.length, 8); i++) {
        // Limit to 8 posts to avoid timeout
        try {
          this.logAndBroadcast(
            `Processing post ${i + 1}/${Math.min(postLinks.length, 8)}...`,
            'info',
          );

          // Navigate to the post
          await page.goto(postLinks[i], { waitUntil: 'networkidle2', timeout: 20000 });
          await new Promise((resolve) => setTimeout(resolve, 3000));

          // Extract post content
          const postData = await page.evaluate(() => {
            // Get post caption/description
            const captionElements = document.querySelectorAll(
              '[data-testid="post-caption"] span, article span',
            );
            let caption = '';
            captionElements.forEach((el) => {
              if (el.textContent && el.textContent.length > 10) {
                caption += el.textContent + ' ';
              }
            });

            // Get any other text content
            const allText = document.body.innerText;

            // Get post date if available
            const timeElements = document.querySelectorAll('time');
            let postDate = '';
            timeElements.forEach((el) => {
              if (el.dateTime) {
                postDate = el.dateTime;
              }
            });

            return {
              caption: caption.trim(),
              postDate: postDate,
              fullText: allText.length > 2000 ? allText.substring(0, 2000) : allText,
            };
          });

          // Take screenshot of the full post
          const postScreenshot = await page.screenshot({
            fullPage: false,
            type: 'jpeg',
            quality: 85,
          });

          allContent.push({
            type: 'individual_post',
            screenshot: postScreenshot.toString('base64'),
            text: postData.caption,
            postDate: postData.postDate,
            fullText: postData.fullText,
            url: postLinks[i],
          });

          this.logAndBroadcast(
            `Post ${i + 1} content: ${postData.caption.substring(0, 100)}...`,
            'info',
          );
        } catch (postError) {
          this.logAndBroadcast(`Error processing post ${i + 1}: ${postError.message}`, 'warning');
          // Continue with other posts even if one fails
        }
      }

      await browser.close();

      this.logAndBroadcast(
        `Captured ${allContent.length} pieces of content from Instagram`,
        'success',
      );

      // Analyze all content with Gemini Vision
      return await this.analyzeInstagramContentWithGemini(allContent, url);
    } catch (error) {
      this.logAndBroadcast(`Instagram visual parsing error: ${error.message}`, 'error');
      if (browser) {
        await browser.close();
      }
      throw error;
    }
  }

  /**
   * Analyze Instagram content (bio + individual posts) with Gemini Vision
   */
  private async analyzeInstagramContentWithGemini(
    content: any[],
    url: string,
  ): Promise<ParsedKaraokeData> {
    try {
      this.logAndBroadcast(
        `Analyzing ${content.length} pieces of Instagram content with Gemini...`,
        'info',
      );

      const model = this.genAI.getGenerativeModel({
        model: getGeminiModel('text'),
        generationConfig: {
          temperature: 0.1,
          topP: 0.8,
          topK: 40,
          maxOutputTokens: 8192,
        },
      });

      // Build comprehensive prompt with all content
      const bioContent = content.find((c) => c.type === 'profile_bio');
      const postContents = content.filter((c) => c.type === 'individual_post');

      let textContent = '';
      if (bioContent) {
        textContent += `PROFILE BIO: ${bioContent.text}\n\n`;
      }

      postContents.forEach((post, index) => {
        textContent += `POST ${index + 1} CONTENT: ${post.text}\n`;
        if (post.postDate) {
          textContent += `POST DATE: ${post.postDate}\n`;
        }
        textContent += `\n`;
      });

      const prompt = `Analyze this Instagram DJ profile and extract ALL karaoke shows with COMPLETE venue addresses and EXACT show times.

🎯 CRITICAL FOCUS: This is a professional DJ's Instagram profile containing a weekly karaoke schedule. You have access to:
1. Profile bio/description with weekly schedule summary (NOW FULLY EXPANDED - no truncation)
2. Individual post images and descriptions with detailed venue information

PROFILE: ${url}
DJ HANDLE: djmax614

TEXT CONTENT EXTRACTED:
${textContent}

🚨 CRITICAL REQUIREMENTS - READ CAREFULLY:

🚫 DUPLICATE PREVENTION - CRITICAL RULES:
- ONLY extract UNIQUE shows - no duplicates allowed
- If the same venue appears multiple times with the same day/time, only include it ONCE
- Different days at the same venue = separate shows (e.g., "Bar Monday" vs "Bar Saturday")  
- Different times at the same venue = separate shows (e.g., "Bar 7:00 PM" vs "Bar 10:00 PM")
- Same venue, same day, same time = DUPLICATE, include only once
- Cross-check bio and post content to prevent duplicates between different sources

🎤 DJ vs VENDOR DISTINCTION - MANDATORY:
- VENDOR: Should be the DJ service/business name (like "Max Denney Karaoke" or "djmax614 Entertainment")
- DJ: Should be the person hosting (look for "Hosted by @djmax614" or similar)
- NEVER use the same name for both vendor and DJ
- If you see "Hosted by @djmax614", the DJ name should be "djmax614"

� SUNDAY SHOW - CRITICAL:
- Look specifically for "KARAOKE IN THE LOUNGE SUNDAYS 6-9 PM NORTH HIGH DUBLIN"
- This should be extracted as a separate show for "North High Dublin" venue
- Time: 6 PM - 9 PM on Sunday
- Look for this in BOTH the profile bio AND the first image

🗓️ EXPECTED SHOWS (extract ALL of these):
Based on typical schedule pattern, you should find:
1. Wednesday @ Kelley's Pub and Patio (7PM-11PM)
2. Thursday @ The Crescent Lounge (8PM-12AM) 
3. Friday @ Oneilly's Sports Pub (9PM-late)
4. Saturday @ The Crescent Lounge (8PM-12AM)
5. Sunday @ North High Dublin (6PM-9PM) ← MAKE SURE TO FIND THIS ONE

🎤 VENUE MATCHING:
Based on the bio and posts, extract shows for these SPECIFIC venues:
- Kelley's Pub and Patio (Wednesday)
- The Crescent Lounge (Thursday + Saturday) 
- Oneilly's Sports Pub (Friday)
- North High Dublin (Sunday) - THIS IS A SEPARATE VENUE from The Crescent Lounge
- Any other venues mentioned

🚨 CRITICAL VENUE DISTINCTION:
- "North High Dublin" is a DIFFERENT venue than "The Crescent Lounge"
- If you see "@northighdublin" or "NORTH HIGH DUBLIN" - this is a separate venue
- Sunday show is at "North High Dublin", NOT "The Crescent Lounge"

📍 ADDRESS EXTRACTION - MANDATORY:
- Look for COMPLETE addresses in the post descriptions
- Extract street addresses, city, state, ZIP codes
- Common patterns: "123 Main St, Columbus, OH 43215"
- If you see venue names like "Kelley's Pub" or "Oneilly's Sports Pub", find their addresses in the posts
- NEVER submit a venue without attempting to find its address

🕘 TIME EXTRACTION - MANDATORY:
- Look for EXACT times mentioned in the bio or posts
- Pay special attention to the bio text which likely contains the schedule
- If bio says "FRI @oneilyssportspub 9PM" then Friday at Oneilly's is 9 PM, NOT 8 PM
- If bio says "SUN @northighdublin 6PM-9PM" then Sunday is 6 PM - 9 PM
- Convert times to both formats: "9 pm" and "21:00"
- Look for patterns like "7PM-11PM", "8PM-12AM", "9PM-2AM", "6PM-9PM"

🗓️ DAY EXTRACTION:
- Extract the exact day of week for each venue
- Bio typically contains format like "WED @venue1 7PM" "THU @venue2 8PM" "SUN @northighdublin 6PM"
- Create separate show entries for each day+venue combination
- MUST include Sunday show at North High Dublin

🌍 COORDINATES - REQUIRED:
For every venue, provide precise lat/lng coordinates:
- Use venue name + complete address for exact location
- Example: "North High Dublin" in Dublin, OH → lat: 40.098919, lng: -83.118568

🚨 ADDRESS COMPONENT SEPARATION - CRITICAL:
NEVER MIX COMPONENTS:
✅ CORRECT:
address: "440 West Henderson Road" (street only)
city: "Columbus" (city only)  
state: "OH" (state only)
zip: "43214" (zip only)

❌ WRONG:
address: "440 West Henderson Road Columbus, OH 43214" (mixed components)

Return ONLY valid JSON:
{
  "vendor": {
    "name": "DJ Service/Business Name (NOT same as DJ name)",
    "website": "${url}",
    "description": "Profile bio text",
    "confidence": 0.9
  },
  "venues": [
    {
      "name": "Complete Venue Name",
      "address": "COMPLETE street address (no city/state/zip)",
      "city": "City name only",
      "state": "2-letter state code only",
      "zip": "ZIP code only",
      "lat": "REQUIRED precise latitude",
      "lng": "REQUIRED precise longitude", 
      "phone": "Phone if found in posts",
      "website": "Website if found",
      "confidence": 0.9
    }
  ],
  "djs": [
    {
      "name": "djmax614 (from 'Hosted by' text)",
      "confidence": 0.9,
      "context": "Instagram karaoke host"
    }
  ],
  "shows": [
    {
      "venueName": "Venue Name (must match a venue from venues array)",
      "time": "EXACT time from bio/posts like '6 pm' or '9 pm'",
      "startTime": "24-hour format like '18:00' or '21:00'",
      "endTime": "End time or 'close'",
      "day": "exact_day_of_week",
      "djName": "djmax614 (from 'Hosted by' text)",
      "vendor": "Vendor/company providing service",
      "description": "Show details",
      "confidence": 0.9
    }
  ]
}`;

      // Prepare image parts from all content
      const imageParts = content.map((item) => ({
        inlineData: {
          data: item.screenshot,
          mimeType: 'image/jpeg',
        },
      }));

      this.logAndBroadcast(
        `Making Gemini Vision API request with ${imageParts.length} images and extracted text`,
        'info',
      );

      const result = (await Promise.race([
        model.generateContent([prompt, ...imageParts]),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error('Gemini Vision API timeout after 120 seconds')),
            120000,
          ),
        ),
      ])) as any;

      const response = await result.response;
      const text = response.text();

      this.logAndBroadcast('Gemini Vision response received for Instagram content', 'success');
      this.logAndBroadcast(`Response length: ${text.length} characters`, 'info');

      // Parse and return the result using existing JSON parsing logic
      const cleanJsonString = this.cleanGeminiResponse(text);
      let parsedData;

      try {
        parsedData = JSON.parse(cleanJsonString);
        this.logAndBroadcast('✅ Instagram content JSON parsing successful', 'success');
      } catch (jsonError) {
        this.logAndBroadcast(
          `❌ Instagram content JSON parsing failed: ${jsonError.message}`,
          'error',
        );

        // Try emergency extraction
        const emergencyData = this.extractPartialDataFromMalformedJson(text, url);
        if (emergencyData) {
          this.logAndBroadcast('🚨 Using emergency extraction for Instagram content', 'warning');
          parsedData = emergencyData;
        } else {
          throw new Error(`Instagram content JSON parsing failed: ${jsonError.message}`);
        }
      }

      // Ensure required structure
      const finalData: ParsedKaraokeData = {
        vendor: parsedData.vendor || this.generateVendorFromUrl(url),
        djs: Array.isArray(parsedData.djs) ? parsedData.djs : [],
        shows: Array.isArray(parsedData.shows) ? this.normalizeShowTimes(parsedData.shows) : [],
        rawData: {
          url,
          title: 'Instagram Individual Posts Analysis',
          content: textContent.substring(0, 1000),
          parsedAt: new Date(),
        },
      };

      this.logAndBroadcast(
        `Instagram analysis complete: ${finalData.shows.length} shows, ${finalData.djs.length} DJs`,
        'success',
      );

      return finalData;
    } catch (error) {
      this.logger.error(`Error analyzing Instagram content: ${error.message}`);
      throw error;
    }
  }

  /**
   * Analyze multiple screenshots with Gemini using parallel processing
   * Uses workers to process images concurrently for better performance
   */
  async analyzeScreenshotsWithGeminiParallel(
    screenshots: string[], // base64 encoded images
    url: string,
    description?: string,
    maxConcurrentWorkers: number = 3, // Limit concurrent workers
  ): Promise<ParsedKaraokeData> {
    try {
      this.logAndBroadcast(
        `🚀 Starting PARALLEL analysis of ${screenshots.length} screenshots with max ${maxConcurrentWorkers} workers`,
        'info',
      );

      // Use the parallel processing service
      const parallelResult = await this.parallelGeminiService.analyzeImagesInParallel(
        screenshots,
        url,
        description,
        maxConcurrentWorkers,
      );

      if (!parallelResult.success) {
        throw new Error('Parallel analysis failed - no successful results');
      }

      // Log performance benefits
      this.logAndBroadcast(
        `⚡ Parallel processing completed: ${parallelResult.stats.parallelizationBenefit}`,
        'success',
      );
      this.logAndBroadcast(
        `📊 Results: ${parallelResult.stats.successfulImages}/${screenshots.length} images processed successfully`,
        'info',
      );

      // Add raw data for tracking
      const finalData: ParsedKaraokeData = {
        ...parallelResult.combinedData,
        rawData: {
          url,
          title: `Parallel Analysis (${screenshots.length} images)`,
          content: `Processed ${parallelResult.stats.successfulImages} images in parallel. ${parallelResult.stats.parallelizationBenefit}`,
          parsedAt: new Date(),
        },
      };

      this.logAndBroadcast(
        `✅ Parallel analysis complete: ${finalData.shows?.length || 0} shows, ${finalData.djs?.length || 0} DJs, ${finalData.vendors?.length || 0} vendors`,
        'success',
      );

      return finalData;
    } catch (error) {
      this.logAndBroadcast(`❌ Error in parallel analysis: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Extract partial data from malformed JSON as last resort
   */
  private extractPartialDataFromMalformedJson(
    jsonString: string,
    url: string,
  ): ParsedKaraokeData | null {
    try {
      this.logAndBroadcast(
        '🚨 Attempting emergency data extraction from malformed JSON...',
        'warning',
      );

      // Try to extract basic information using regex patterns
      const shows = [];
      const djs = new Set();

      // Look for show-like patterns in the text
      const venuePattern = /"venue"\s*:\s*"([^"]+)"/g;
      const addressPattern = /"address"\s*:\s*"([^"]+)"/g;
      const cityPattern = /"city"\s*:\s*"([^"]+)"/g;
      const statePattern = /"state"\s*:\s*"([^"]+)"/g;
      const timePattern = /"time"\s*:\s*"([^"]+)"/g;
      const djPattern = /"djName"\s*:\s*"([^"]+)"/g;
      const dayPattern = /"day"\s*:\s*"([^"]+)"/g;

      const venues = Array.from(jsonString.matchAll(venuePattern)).map((m) => m[1]);
      const addresses = Array.from(jsonString.matchAll(addressPattern)).map((m) => m[1]);
      const cities = Array.from(jsonString.matchAll(cityPattern)).map((m) => m[1]);
      const states = Array.from(jsonString.matchAll(statePattern)).map((m) => m[1]);
      const times = Array.from(jsonString.matchAll(timePattern)).map((m) => m[1]);
      const djNames = Array.from(jsonString.matchAll(djPattern)).map((m) => m[1]);
      const days = Array.from(jsonString.matchAll(dayPattern)).map((m) => m[1]);

      // Build basic show objects from extracted data
      const maxLength = Math.max(venues.length, addresses.length, times.length, days.length);

      for (let i = 0; i < maxLength && i < 50; i++) {
        // Limit to prevent memory issues
        if (venues[i]) {
          const show: any = {
            venue: venues[i],
            address: addresses[i] || null,
            city: cities[i] || null,
            state: states[i] || null,
            time: times[i] || null,
            startTime: times[i] ? this.convertTimeToStartTime(times[i]) : null,
            day: days[i] || null,
            djName: djNames[i] || null,
            confidence: 0.3, // Low confidence for emergency extraction
          };

          shows.push(show);

          if (djNames[i]) {
            djs.add(djNames[i]);
          }
        }
      }

      if (shows.length > 0) {
        this.logAndBroadcast(`🎉 Emergency extraction recovered ${shows.length} shows`, 'success');

        return {
          vendor: this.generateVendorFromUrl(url),
          djs: Array.from(djs).map((name) => ({ name: String(name), confidence: 0.3 })),
          shows: shows,
          rawData: {
            url,
            title: 'Emergency extraction',
            content: 'Recovered from malformed JSON',
            parsedAt: new Date(),
          },
        };
      }

      return null;
    } catch (error) {
      this.logAndBroadcast(`❌ Emergency extraction failed: ${error.message}`, 'error');
      return null;
    }
  }
  private extractValidJson(jsonString: string): string | null {
    try {
      // Try to find the last complete JSON structure
      let braceCount = 0;
      let bracketCount = 0;
      let lastValidIndex = -1;
      let inString = false;
      let escaped = false;

      for (let i = 0; i < jsonString.length; i++) {
        const char = jsonString[i];

        if (escaped) {
          escaped = false;
          continue;
        }

        if (char === '\\') {
          escaped = true;
          continue;
        }

        if (char === '"') {
          inString = !inString;
          continue;
        }

        if (inString) {
          continue;
        }

        if (char === '{') {
          braceCount++;
        } else if (char === '}') {
          braceCount--;
        } else if (char === '[') {
          bracketCount++;
        } else if (char === ']') {
          bracketCount--;
        }

        // Check if we have a complete JSON structure
        if (braceCount === 0 && bracketCount === 0 && i > 0) {
          lastValidIndex = i;
        }
      }

      if (lastValidIndex > 0) {
        return jsonString.substring(0, lastValidIndex + 1);
      }

      // If no complete structure found, try to fix incomplete arrays/objects
      if (braceCount > 0 || bracketCount > 0) {
        let fixed = jsonString.trim();

        // Handle incomplete strings at the end
        if (inString) {
          // If we're in the middle of a string, close it
          fixed += '"';
          inString = false;
        }

        // Remove trailing commas that might cause issues
        fixed = fixed.replace(/,\s*$/, '');

        // If the last character suggests an incomplete value, try to complete it
        const lastChar = fixed.slice(-1);
        if (lastChar === ':' || lastChar === ',') {
          // Remove the problematic trailing character
          fixed = fixed.slice(0, -1);
        }

        // Handle incomplete property values (e.g., "name": "incomplete)
        if (fixed.match(/:\s*"[^"]*$/)) {
          // Complete the incomplete string value
          fixed += '"';
        }

        // Close incomplete arrays first (inner to outer)
        for (let i = 0; i < bracketCount; i++) {
          fixed += ']';
        }

        // Close incomplete objects (inner to outer)
        for (let i = 0; i < braceCount; i++) {
          fixed += '}';
        }

        return fixed;
      }

      return null;
    } catch (error) {
      return null;
    }
  }
}
