import { GoogleGenerativeAI } from '@google/generative-ai';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as puppeteer from 'puppeteer';
import { Repository } from 'typeorm';
import { DJ } from '../dj/dj.entity';
import { GeocodingService } from '../geocoding/geocoding.service';
import { Show } from '../show/show.entity';
import { Vendor } from '../vendor/vendor.entity';
import { KaraokeWebSocketGateway } from '../websocket/websocket.gateway';
import { ParsedSchedule, ParseStatus } from './parsed-schedule.entity';

export interface ParsedKaraokeData {
  vendor: {
    name: string;
    owner?: string;
    website: string;
    description?: string;
    confidence: number;
  };
  djs: Array<{
    name: string;
    confidence: number;
    context?: string;
    aliases?: string[];
  }>;
  shows: Array<{
    venue: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    lat?: number;
    lng?: number;
    time: string;
    startTime?: string;
    endTime?: string;
    day?: string;
    djName?: string;
    description?: string;
    venuePhone?: string;
    venueWebsite?: string;
    imageUrl?: string;
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

  constructor(
    @InjectRepository(ParsedSchedule)
    private parsedScheduleRepository: Repository<ParsedSchedule>,
    @InjectRepository(Vendor)
    private vendorRepository: Repository<Vendor>,
    @InjectRepository(DJ)
    private djRepository: Repository<DJ>,
    @InjectRepository(Show)
    private showRepository: Repository<Show>,
    private geocodingService: GeocodingService,
    private webSocketGateway: KaraokeWebSocketGateway,
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
   * Set parsing status
   */
  private setParsingStatus(isActive: boolean, url?: string) {
    this.isCurrentlyParsing = isActive;
    if (isActive) {
      this.currentParsingUrl = url || null;
      this.parsingStartTime = new Date();
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
   * Main parsing method - takes a URL and returns parsed karaoke data
   */
  async parseWebsite(url: string): Promise<ParsedKaraokeData> {
    try {
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

      const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });

      // Parse HTML content with enhanced prompt
      const parsedData = await this.parseSingleHtmlContent(trimmedHtml, url, model);

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

      // Save to parsed_schedules table for admin review
      const parsedSchedule = this.parsedScheduleRepository.create({
        url: url,
        rawData: {
          url: url,
          title: this.extractTitleFromHtml(htmlContent),
          content: truncatedContent,
          parsedAt: new Date(),
        },
        aiAnalysis: parsedData,
        status: ParseStatus.PENDING_REVIEW,
      });

      const savedSchedule = await this.parsedScheduleRepository.save(parsedSchedule);
      const processingTime = Date.now() - startTime;

      this.logAndBroadcast(
        `Successfully saved parsed data for admin review. ID: ${savedSchedule.id}`,
        'success',
      );
      this.logAndBroadcast(
        `Processing completed in ${processingTime}ms - Shows: ${parsedData.shows?.length || 0}, DJs: ${parsedData.djs?.length || 0}`,
        'success',
      );

      return {
        parsedScheduleId: savedSchedule.id,
        data: parsedData,
        stats: {
          showsFound: parsedData.shows?.length || 0,
          djsFound: parsedData.djs?.length || 0,
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
      vendorName: string;
      htmlLength: number;
      processingTime: number;
    };
  }> {
    const startTime = Date.now();

    try {
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
      const parsedData = await this.parseScreenshotWithGemini(screenshot, url);
      const geminiTime = Date.now() - geminiStartTime;
      this.logAndBroadcast(`Gemini Vision completed in ${geminiTime}ms`, 'success');

      // Save to parsed_schedules table for admin review
      const truncatedContent =
        htmlContent.length > 10000 ? htmlContent.substring(0, 10000) + '...' : htmlContent;

      const parsedSchedule = this.parsedScheduleRepository.create({
        url: url,
        rawData: {
          url: url,
          title: this.extractTitleFromHtml(htmlContent),
          content: truncatedContent,
          parsedAt: new Date(),
        },
        aiAnalysis: parsedData,
        status: ParseStatus.PENDING_REVIEW,
      });

      const savedSchedule = await this.parsedScheduleRepository.save(parsedSchedule);
      const processingTime = Date.now() - startTime;

      this.logAndBroadcast(
        `Successfully saved screenshot-parsed data for admin review. ID: ${savedSchedule.id}`,
        'success',
      );
      this.logAndBroadcast(
        `Screenshot processing completed in ${processingTime}ms - Shows: ${parsedData.shows?.length || 0}, DJs: ${parsedData.djs?.length || 0}`,
        'success',
      );

      return {
        parsedScheduleId: savedSchedule.id,
        data: parsedData,
        stats: {
          showsFound: parsedData.shows?.length || 0,
          djsFound: parsedData.djs?.length || 0,
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

      const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });

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
- imageUrl: Look for venue photos, logos, or images related to the venue
- venuePhone: Look for phone numbers associated with the venue

🌍 LAT/LNG COORDINATE EXTRACTION - CRITICAL:
For EVERY venue with a complete address (street + city + state), you MUST provide precise latitude and longitude coordinates:
- Combine the venue name, street address, city, and state to determine the exact location
- Provide coordinates as precise decimal numbers (6+ decimal places)
- If address is incomplete (missing street address), still attempt to get city-level coordinates
- Use your geographic knowledge to provide accurate coordinates for the business location
- EXAMPLE: "Park St Tavern" at "501 Park St, Columbus, OH" → lat: 39.961176, lng: -82.998794
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
      "venue": "Venue Name",
      "address": "Street address ONLY (e.g., '8939 South Old State Road', '630 North High Street') OR null if no street address",
      "city": "City name ONLY (e.g., 'Lewis Center', 'Panama City Beach', 'Columbus', 'Delaware')",
      "state": "State abbreviation ONLY (e.g., 'OH', 'FL', 'CA', 'NY')",
      "zip": "ZIP code ONLY (e.g., '12345' or '12345-6789') OR null",
      "lat": "REQUIRED: Precise latitude as decimal number (e.g., 39.961176)",
      "lng": "REQUIRED: Precise longitude as decimal number (e.g., -82.998794)",
      "venuePhone": "Phone number",
      "venueWebsite": "Venue website if available",
      "imageUrl": "Venue image URL if available",
      "time": "REQUIRED: original time format like '9 pm' or '10:00 pm'",
      "startTime": "REQUIRED: 24-hour format like '21:00' or '22:00'",
      "endTime": "HH:MM format or venue closing time or 'close' (default to '00:00' if unknown)",
      "day": "day_of_week", 
      "djName": "DJ/host name",
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
    const parsedData = JSON.parse(cleanJsonString);

    this.logAndBroadcast(
      `Parsed data extracted - Shows: ${parsedData.shows?.length || 0}, DJs: ${parsedData.djs?.length || 0}, Vendor: ${parsedData.vendor?.name || 'Unknown'}`,
      'success',
    );

    // Ensure required structure with defaults
    const finalData: ParsedKaraokeData = {
      vendor: parsedData.vendor || this.generateVendorFromUrl(url),
      djs: Array.isArray(parsedData.djs) ? parsedData.djs : [],
      shows: Array.isArray(parsedData.shows) ? this.normalizeShowTimes(parsedData.shows) : [],
      rawData: {
        url,
        title: this.extractTitleFromHtml(htmlContent),
        content: htmlContent.substring(0, 1000), // Keep first 1000 chars for reference
        parsedAt: new Date(),
      },
    };

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
   * Remove duplicate shows based on venue, day, and time
   */
  private removeDuplicateShows(shows: any[]): any[] {
    const unique: any[] = [];
    const seenShows = new Set<string>();

    this.logAndBroadcast(`Starting deduplication with ${shows.length} shows`, 'info');

    for (const show of shows) {
      // Create a more specific key that includes venue, day, and DJ name
      // Don't rely on startTime since it might be null
      const venue = show.venue?.toLowerCase().trim() || '';
      const day = show.day?.toLowerCase().trim() || '';
      const djName = show.djName?.toLowerCase().trim() || '';
      const key = `${venue}-${day}-${djName}`;

      if (key && !seenShows.has(key)) {
        seenShows.add(key);
        unique.push(show);
        this.logger.debug(`Added show: ${show.venue} on ${show.day} with ${show.djName}`);
      } else {
        this.logger.debug(
          `Skipped duplicate: ${show.venue} on ${show.day} with ${show.djName} (key: ${key})`,
        );
      }
    }

    this.logAndBroadcast(
      `Deduplication: ${shows.length} shows → ${unique.length} unique shows`,
      'success',
    );
    return unique;
  } /**
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
        `Processed show: ${show.venue} - Address: "${show.address}", City: "${show.city}", State: "${show.state}"`,
        'info',
      );

      return show;
    });
  }

  /**
   * Admin review methods - simplified implementations
   */
  async getPendingReviews(): Promise<ParsedSchedule[]> {
    return this.parsedScheduleRepository.find({
      where: { status: ParseStatus.PENDING_REVIEW },
      order: { createdAt: 'DESC' },
    });
  }

  async approveAndSaveParsedData(
    parsedScheduleId: string,
    approvedData: ParsedKaraokeData,
  ): Promise<any> {
    this.logAndBroadcast(`Starting approval process for schedule ${parsedScheduleId}`, 'info');

    try {
      // Validate input data
      if (
        !approvedData ||
        !approvedData.vendor ||
        !approvedData.shows ||
        approvedData.shows.length === 0
      ) {
        throw new Error('Invalid data: missing vendor information or no shows found');
      }

      // 1. Find or create the vendor
      let vendor = await this.vendorRepository.findOne({
        where: { name: approvedData.vendor.name },
      });

      if (!vendor) {
        this.logAndBroadcast(`Creating new vendor: ${approvedData.vendor.name}`, 'info');
        vendor = this.vendorRepository.create({
          name: approvedData.vendor.name,
          owner: approvedData.vendor.owner || '',
          website: approvedData.vendor.website,
          description: approvedData.vendor.description,
        });
        vendor = await this.vendorRepository.save(vendor);
        this.logAndBroadcast(`Created vendor with ID: ${vendor.id}`, 'success');
      } else {
        this.logAndBroadcast(`Using existing vendor: ${vendor.name} (ID: ${vendor.id})`, 'info');

        // Update vendor with any missing information
        let vendorUpdated = false;
        if (!vendor.owner && approvedData.vendor.owner) {
          vendor.owner = approvedData.vendor.owner;
          vendorUpdated = true;
        }
        if (!vendor.website && approvedData.vendor.website) {
          vendor.website = approvedData.vendor.website;
          vendorUpdated = true;
        }
        if (!vendor.description && approvedData.vendor.description) {
          vendor.description = approvedData.vendor.description;
          vendorUpdated = true;
        }

        if (vendorUpdated) {
          vendor = await this.vendorRepository.save(vendor);
          this.logAndBroadcast(
            `Updated existing vendor: ${vendor.name} with missing information`,
            'info',
          );
        }
      }

      // 2. Create or update DJs
      const djMap = new Map<string, DJ>();
      let djsCreated = 0;
      let djsUpdated = 0;

      // Handle empty DJs array gracefully
      const djsData = approvedData.djs || [];
      for (const djData of djsData) {
        if (!djData.name || djData.name.trim() === '') {
          this.logAndBroadcast('Skipping DJ with empty name', 'warning');
          continue;
        }

        let dj = await this.djRepository.findOne({
          where: { name: djData.name, vendorId: vendor.id },
        });

        if (!dj) {
          this.logAndBroadcast(`Creating new DJ: ${djData.name}`, 'info');
          dj = this.djRepository.create({
            name: djData.name,
            vendorId: vendor.id,
            isActive: true,
          });
          dj = await this.djRepository.save(dj);
          djsCreated++;
        } else {
          this.logAndBroadcast(`Using existing DJ: ${dj.name} (ID: ${dj.id})`, 'info');
          // Update DJ to active if it was inactive
          if (!dj.isActive) {
            dj.isActive = true;
            await this.djRepository.save(dj);
            djsUpdated++;
          }
        }
        djMap.set(djData.name, dj);
      }

      // 3. Create shows
      let showsCreated = 0;
      let showsUpdated = 0;
      let showsDuplicated = 0;
      const showPromises = approvedData.shows.map(async (showData) => {
        // Find DJ if specified
        let djId: string | undefined;
        if (showData.djName) {
          const dj = djMap.get(showData.djName);
          djId = dj?.id;
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

        // Check for existing show with same vendor, day, time, venue, and DJ
        const existingShow = await this.showRepository.findOne({
          where: {
            vendorId: vendor.id,
            day: normalizedDay as any,
            time: showData.time,
            venue: showData.venue,
            djId: djId || null, // Handle both null and undefined DJs
          },
        });

        if (existingShow) {
          // Update existing show with any missing information
          let showUpdated = false;
          if (!existingShow.address && showData.address) {
            existingShow.address = showData.address;
            showUpdated = true;
          }
          if (!existingShow.venuePhone && showData.venuePhone) {
            existingShow.venuePhone = showData.venuePhone;
            showUpdated = true;
          }
          if (!existingShow.venueWebsite && showData.venueWebsite) {
            existingShow.venueWebsite = showData.venueWebsite;
            showUpdated = true;
          }
          if (!existingShow.description && showData.description) {
            existingShow.description = showData.description;
            showUpdated = true;
          }
          if (!existingShow.city && (showData.city || showData.address)) {
            let city = showData.city;
            if (!city && showData.address) {
              const extracted = this.geocodingService.extractCityStateFromAddress(showData.address);
              city = extracted.city;
            }
            if (city) {
              existingShow.city = city;
              showUpdated = true;
            }
          }
          if (!existingShow.state && (showData.state || showData.address)) {
            let state = showData.state;
            if (!state && showData.address) {
              const extracted = this.geocodingService.extractCityStateFromAddress(showData.address);
              state = extracted.state;
            }
            if (state) {
              existingShow.state = state;
              showUpdated = true;
            }
          }
          if (!existingShow.zip && (showData.zip || showData.address)) {
            let zip = showData.zip;
            if (!zip && showData.address) {
              const extracted = this.geocodingService.extractCityStateFromAddress(showData.address);
              zip = extracted.zip;
            }
            if (zip) {
              existingShow.zip = zip;
              showUpdated = true;
            }
          }
          // Try to get coordinates if missing
          if ((!existingShow.lat || !existingShow.lng) && existingShow.address) {
            try {
              const geocodeResult = await this.geocodingService.geocodeAddressHybrid(
                existingShow.address,
              );
              if (geocodeResult) {
                if (!existingShow.lat && geocodeResult.lat) {
                  existingShow.lat = geocodeResult.lat;
                  showUpdated = true;
                }
                if (!existingShow.lng && geocodeResult.lng) {
                  existingShow.lng = geocodeResult.lng;
                  showUpdated = true;
                }
                // Also update other missing fields
                if (!existingShow.city && geocodeResult.city) {
                  existingShow.city = geocodeResult.city;
                  showUpdated = true;
                }
                if (!existingShow.state && geocodeResult.state) {
                  existingShow.state = geocodeResult.state;
                  showUpdated = true;
                }
                if (!existingShow.zip && geocodeResult.zip) {
                  existingShow.zip = geocodeResult.zip;
                  showUpdated = true;
                }
                // Trust the existing address parsing - don't re-clean it
              }
            } catch (geocodeError) {
              this.logAndBroadcast(
                `Geocoding failed for existing show ${existingShow.venue}: ${geocodeError.message}`,
                'warning',
              );
            }
          }
          if (!existingShow.startTime && showData.startTime) {
            const validatedStartTime = this.validateTimeValue(showData.startTime);
            if (validatedStartTime) {
              existingShow.startTime = validatedStartTime;
              showUpdated = true;
            }
          }
          if (!existingShow.endTime) {
            const validatedEndTime = this.validateTimeValue(showData.endTime) || '00:00'; // Default to midnight
            existingShow.endTime = validatedEndTime;
            showUpdated = true;
          }

          if (showUpdated) {
            await this.showRepository.save(existingShow);
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
          return existingShow;
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
        let lat: number | undefined = showData.lat;
        let lng: number | undefined = showData.lng;

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
        }

        const show = this.showRepository.create({
          vendorId: vendor.id,
          djId: djId,
          venue: showData.venue,
          address: cleanedAddress,
          city: city,
          state: state,
          zip: zip,
          lat: lat,
          lng: lng,
          day: normalizedDay as any, // Cast to DayOfWeek enum
          time: showData.time,
          startTime: validatedStartTime,
          endTime: validatedEndTime,
          description: showData.description,
          imageUrl: showData.imageUrl,
          venuePhone: showData.venuePhone,
          venueWebsite: showData.venueWebsite,
          isActive: true,
        });

        const savedShow = await this.showRepository.save(show);
        showsCreated++;
        return savedShow;
      });

      await Promise.all(showPromises);

      // 4. Update the schedule to approved status (but don't delete yet)
      await this.parsedScheduleRepository.update(parsedScheduleId, {
        status: ParseStatus.APPROVED,
        aiAnalysis: approvedData as any,
      });

      const successMessage = `Successfully saved: 1 vendor, ${djsCreated} new DJs (${djsUpdated} updated), ${showsCreated} new shows (${showsUpdated} updated, ${showsDuplicated} duplicates skipped)`;
      this.logAndBroadcast(successMessage, 'success');

      const result = {
        success: true,
        message: successMessage,
        stats: {
          vendorId: vendor.id,
          vendorName: vendor.name,
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

  async approveAllItems(parsedScheduleId: string): Promise<any> {
    const schedule = await this.parsedScheduleRepository.findOne({
      where: { id: parsedScheduleId },
    });

    if (!schedule) {
      throw new Error('Schedule not found');
    }

    return this.approveAndSaveParsedData(parsedScheduleId, schedule.aiAnalysis);
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
    const parsedSchedule = this.parsedScheduleRepository.create({
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
    });

    return this.parsedScheduleRepository.save(parsedSchedule);
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

  async parseFacebookEvent(url: string): Promise<ParsedKaraokeData> {
    // For now, use the same parsing method
    return this.parseWebsite(url);
  }

  async parseAndSaveFacebookEvent(url: string): Promise<any> {
    return this.parseAndSaveWebsite(url);
  }

  async parseFacebookShare(url: string): Promise<ParsedKaraokeData> {
    return this.parseWebsite(url);
  }

  async parseAndSaveFacebookShare(url: string): Promise<any> {
    return this.parseAndSaveWebsite(url);
  }

  async transformFacebookUrlWithGemini(url: string): Promise<any> {
    return {
      originalUrl: url,
      transformedUrl: url, // No transformation for now
      suggestions: [],
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
        model: 'gemini-1.5-flash', // Faster model for vision tasks
        generationConfig: {
          temperature: 0.1, // Lower temperature for more consistent parsing
          topP: 0.8,
          topK: 40,
          maxOutputTokens: 8192, // Sufficient for large JSON response
        },
      });

      const prompt = `Analyze this screenshot and extract ALL karaoke shows from the ENTIRE weekly schedule.

CRITICAL: This page contains shows for ALL 7 DAYS (Monday through Sunday). You must extract shows from the COMPLETE page, not just the top section.

Extract from the ENTIRE image:
- ALL venue names from Monday through Sunday
- ALL addresses, phone numbers, and showtimes  
- ALL DJ/host names mentioned anywhere on the page
- The vendor/company information

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

🌍 LAT/LNG COORDINATE EXTRACTION - CRITICAL:
For EVERY venue with a complete address (street + city + state), you MUST provide precise latitude and longitude coordinates:
- Combine the venue name, street address, city, and state to determine the exact location
- Provide coordinates as precise decimal numbers (6+ decimal places)
- If address is incomplete (missing street address), still attempt to get city-level coordinates
- Use your geographic knowledge to provide accurate coordinates for the business location
- EXAMPLE: "Park St Tavern" at "501 Park St, Columbus, OH" → lat: 39.961176, lng: -82.998794
- EXAMPLE: "The Walrus" at "1432 E Main St, Columbus, OH" → lat: 39.952583, lng: -82.937125
- If you cannot determine precise coordinates, provide city-center coordinates as fallback

Return ONLY valid JSON with no extra text:

{
  "vendor": {
    "name": "Company Name",
    "website": "${url}",
    "description": "Brief description",
    "confidence": 0.9
  },
  "djs": [
    {
      "name": "DJ Name",
      "confidence": 0.8,
      "context": "Where they perform",
      "aliases": []
    }
  ],
  "shows": [
    {
      "venue": "Venue Name",
      "address": "ONLY street address (no city/state/zip)",
      "city": "ONLY city name",
      "state": "ONLY 2-letter state code",
      "zip": "ONLY zip code",
      "lat": "REQUIRED: Precise latitude as decimal number (e.g., 39.961176)",
      "lng": "REQUIRED: Precise longitude as decimal number (e.g., -82.998794)",
      "venuePhone": "Phone number",
      "date": "day_of_week",
      "time": "time like '7 pm'",
      "startTime": "24-hour format like '19:00'",
      "endTime": "close",
      "day": "day_of_week",
      "djName": "DJ name if mentioned",
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
      try {
        const cleanJsonString = this.cleanGeminiResponse(text);
        this.logAndBroadcast('Cleaned JSON (first 500 chars):', 'info');
        this.logAndBroadcast(`Cleaned JSON length: ${cleanJsonString.length} characters`, 'info');
        parsedData = JSON.parse(cleanJsonString);
        this.logAndBroadcast('✅ JSON parsing successful', 'success');
      } catch (jsonError) {
        this.logAndBroadcast('❌ JSON parsing failed, attempting to fix common issues:', 'error');

        // Try to fix common JSON issues
        let fixedJson = this.cleanGeminiResponse(text);

        // Fix common trailing comma issues
        fixedJson = fixedJson.replace(/,(\s*[}\]])/g, '$1');

        // Fix missing quotes around property names
        fixedJson = fixedJson.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":');

        // Try to find and fix incomplete JSON by finding the last valid closing brace
        const lastValidJson = this.extractValidJson(fixedJson);
        if (lastValidJson) {
          try {
            parsedData = JSON.parse(lastValidJson);
            this.logAndBroadcast('✅ Successfully parsed JSON after fixing', 'success');
          } catch (secondError) {
            this.logAndBroadcast('❌ Even fixed JSON failed to parse:', 'error');
            throw new Error(`JSON parsing failed: ${jsonError.message}`);
          }
        } else {
          throw new Error(`JSON parsing failed: ${jsonError.message}`);
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

      return finalData;
    } catch (error) {
      this.logAndBroadcast('Error parsing screenshot with Gemini Vision:', 'error');
      throw new Error(`Gemini Vision parsing failed: ${error.message}`);
    }
  }

  /**
   * Extract valid JSON from potentially truncated/malformed response
   */
  private extractValidJson(jsonString: string): string | null {
    try {
      // Try to find the last complete JSON structure
      let braceCount = 0;
      let lastValidIndex = -1;

      for (let i = 0; i < jsonString.length; i++) {
        if (jsonString[i] === '{') {
          braceCount++;
        } else if (jsonString[i] === '}') {
          braceCount--;
          if (braceCount === 0) {
            lastValidIndex = i;
          }
        }
      }

      if (lastValidIndex > 0) {
        return jsonString.substring(0, lastValidIndex + 1);
      }

      return null;
    } catch (error) {
      return null;
    }
  }
}
