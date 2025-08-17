import { GoogleGenerativeAI } from '@google/generative-ai';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as puppeteer from 'puppeteer';
import { Repository } from 'typeorm';
import { DJ } from '../dj/dj.entity';
import { Show } from '../show/show.entity';
import { Vendor } from '../vendor/vendor.entity';
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
    date: string;
    time: string;
    startTime?: string;
    endTime?: string;
    day?: string;
    djName?: string;
    description?: string;
    notes?: string;
    venuePhone?: string;
    venueWebsite?: string;
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

  constructor(
    @InjectRepository(ParsedSchedule)
    private parsedScheduleRepository: Repository<ParsedSchedule>,
    @InjectRepository(Vendor)
    private vendorRepository: Repository<Vendor>,
    @InjectRepository(DJ)
    private djRepository: Repository<DJ>,
    @InjectRepository(Show)
    private showRepository: Repository<Show>,
  ) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  /**
   * Main parsing method - takes a URL and returns parsed karaoke data
   */
  async parseWebsite(url: string): Promise<ParsedKaraokeData> {
    try {
      this.logger.log(`Starting parse for URL: ${url}`);

      // Step 1: Get webpage content and screenshot for visual parsing
      const webpageData = await this.fetchWebpageWithScreenshot(url);

      // Step 2: Parse with Gemini AI using both HTML and visual data
      const parsedData = await this.parseWithGeminiVision(webpageData, url);

      this.logger.log(
        `Parse completed successfully for ${url}: ${parsedData.shows.length} shows found`,
      );
      return parsedData;
    } catch (error) {
      this.logger.error(`Error parsing website ${url}:`, error);
      throw new Error(`Failed to parse website: ${error.message}`);
    }
  }

  /**
   * Fetch clean webpage content using intelligent content extraction
   */
  private async fetchWebpageContent(url: string): Promise<string> {
    this.logger.log(`Fetching webpage content for: ${url}`);

    try {
      // Use a mock of the fetch_webpage functionality for now
      // In a real implementation, you'd want to use a web scraping service
      // or implement intelligent content extraction

      // For now, fall back to Puppeteer but with better content extraction
      return await this.fetchRawHtml(url);
    } catch (error) {
      this.logger.error(`Error fetching webpage content: ${error.message}`);
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
      this.logger.log(`Starting parse and save operation for URL: ${url}`);

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

      this.logger.log(`Successfully saved parsed data for admin review. ID: ${savedSchedule.id}`);
      this.logger.log(
        `Processing completed in ${processingTime}ms - Shows: ${parsedData.shows?.length || 0}, DJs: ${parsedData.djs?.length || 0}`,
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
      this.logger.error(`Error parsing and saving website ${url}:`, error);
      throw new Error(`Failed to parse and save website: ${error.message}`);
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
      this.logger.log(`Starting screenshot-based parse and save operation for URL: ${url}`);

      // Take a full-page screenshot and parse with Gemini Vision
      this.logger.log('Step 1: Capturing screenshot...');
      const screenshotStartTime = Date.now();
      const { screenshot, htmlContent } = await this.captureFullPageScreenshot(url);
      const screenshotTime = Date.now() - screenshotStartTime;
      this.logger.log(
        `Screenshot captured in ${screenshotTime}ms (${(screenshot.length / 1024 / 1024).toFixed(2)} MB)`,
      );

      this.logger.log('Step 2: Processing with Gemini Vision...');
      const geminiStartTime = Date.now();
      const parsedData = await this.parseScreenshotWithGemini(screenshot, url);
      const geminiTime = Date.now() - geminiStartTime;
      this.logger.log(`Gemini Vision completed in ${geminiTime}ms`);

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

      this.logger.log(
        `Successfully saved screenshot-parsed data for admin review. ID: ${savedSchedule.id}`,
      );
      this.logger.log(
        `Screenshot processing completed in ${processingTime}ms - Shows: ${parsedData.shows?.length || 0}, DJs: ${parsedData.djs?.length || 0}`,
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
      this.logger.error(`Error parsing website with screenshot ${url}:`, error);
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
      this.logger.log(`Fetching webpage content and screenshot from: ${url}`);

      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-web-security',
        ],
      });

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

      this.logger.log(
        `Successfully fetched HTML (${htmlContent.length} characters) and screenshot from ${url}`,
      );
      this.logger.log(`Found ${timeData.length} elements with time data attributes`);

      return { htmlContent: enhancedContent, screenshot };
    } catch (error) {
      this.logger.error(`Error fetching webpage content and screenshot from ${url}:`, error);
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
      this.logger.log('Starting Gemini AI parsing with HTML content');
      this.logger.log(`Processing HTML content: ${htmlContent.length} characters`);

      // Trim unnecessary HTML content first
      const trimmedHtml = this.trimHtmlContent(htmlContent);
      this.logger.log(
        `After trimming: ${trimmedHtml.length} characters (${(((htmlContent.length - trimmedHtml.length) / htmlContent.length) * 100).toFixed(1)}% reduction)`,
      );

      const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });

      // If content is still too large, split into chunks and process separately
      const maxSingleProcessSize = 1000000; // 1MB - try processing much larger content as single chunk first
      const chunkSize = 200000; // 200KB chunks if we need to split
      if (trimmedHtml.length > maxSingleProcessSize) {
        this.logger.log('Very large content detected, processing in chunks...');
        return this.parseHtmlInChunks(trimmedHtml, url, model, chunkSize);
      }

      // Process smaller content directly
      return this.parseSingleHtmlContent(trimmedHtml, url, model);
    } catch (error) {
      this.logger.error('Error parsing with Gemini:', error);
      throw new Error(`Gemini parsing failed: ${error.message}`);
    }
  }

  /**
   * Use Gemini AI with vision to parse webpage using both HTML and screenshot
   */
  private async parseWithGeminiVision(
    webpageData: { htmlContent: string; screenshot: Buffer },
    url: string,
  ): Promise<ParsedKaraokeData> {
    try {
      this.logger.log('Starting Gemini AI vision parsing with HTML and screenshot');
      this.logger.log(`Processing HTML content: ${webpageData.htmlContent.length} characters`);

      // Trim unnecessary HTML content first
      const trimmedHtml = this.trimHtmlContent(webpageData.htmlContent);
      this.logger.log(
        `After trimming: ${trimmedHtml.length} characters (${(((webpageData.htmlContent.length - trimmedHtml.length) / webpageData.htmlContent.length) * 100).toFixed(1)}% reduction)`,
      );

      const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });

      // Process with enhanced HTML content that includes data attributes
      return this.parseSingleHtmlContent(trimmedHtml, url, model);
    } catch (error) {
      this.logger.error('Error parsing with Gemini vision:', error);
      throw new Error(`Gemini vision parsing failed: ${error.message}`);
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
    this.logger.log(`Split content into ${chunks.length} chunks for processing`);

    const allResults: ParsedKaraokeData[] = [];

    for (let i = 0; i < chunks.length; i++) {
      this.logger.log(`Processing chunk ${i + 1}/${chunks.length}...`);
      try {
        const chunkResult = await this.parseSingleHtmlContent(chunks[i], url, model);
        allResults.push(chunkResult);

        // Small delay between chunks to avoid rate limiting
        if (i < chunks.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      } catch (error) {
        this.logger.warn(
          `Failed to process chunk ${i + 1}, continuing with others:`,
          error.message,
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

TIME PARSING INSTRUCTIONS - CRITICAL:
- LOOK FOR DATA ATTRIBUTES: Times are stored in HTML data attributes like data-day="9 pm"
- Check for HTML comments that show EXTRACTED DATA ATTRIBUTES 
- Pattern: <!-- Element X: TIME="9 pm" DAY="Monday" TEXT="venue info" -->
- EXAMPLE: If you see TIME="9 pm" in data attributes → time="9 pm", startTime="21:00"
- EXAMPLE: If you see TIME="10 pm" in data attributes → time="10 pm", startTime="22:00"  
- EXAMPLE: If you see TIME="7 pm" in data attributes → time="7 pm", startTime="19:00"
- EXAMPLE: If you see TIME="8 pm" in data attributes → time="8 pm", startTime="20:00"
- EXAMPLE: If you see TIME="9:30" in data attributes → time="9:30 pm", startTime="21:30"
- For endTime: Use "close" since no specific end times are provided
- NEVER leave time fields as null - extract the time from the data attributes
- Data attributes contain the actual show times that may not appear in visible text

Website URL: ${url}

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
      "address": "Full address if available",
      "venuePhone": "Phone number",
      "venueWebsite": "Venue website if available",
      "date": "day_of_week",
      "time": "REQUIRED: original time format like '9 pm' or '10:00 pm'",
      "startTime": "REQUIRED: 24-hour format like '21:00' or '22:00'",
      "endTime": "HH:MM format or 'close'",
      "day": "day_of_week", 
      "djName": "DJ/host name",
      "description": "Additional details",
      "notes": "Special notes",
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
          this.logger.warn(
            `Quota exceeded, attempt ${attempts}/${maxAttempts}. Waiting before retry...`,
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

    this.logger.log('Gemini response received, extracting JSON');
    this.logger.log(`Gemini response length: ${text.length} characters`);

    // DEBUG: Log the actual Gemini response to see what it's returning
    this.logger.log(`Gemini raw response: ${text}`);

    // Log usage metadata if available
    if (result.response.usageMetadata) {
      const usage = result.response.usageMetadata;
      this.logger.log(
        `Token usage - Prompt: ${usage.promptTokenCount || 'N/A'}, Candidates: ${usage.candidatesTokenCount || 'N/A'}, Total: ${usage.totalTokenCount || 'N/A'}`,
      );
    }

    // Clean and parse JSON response
    const cleanJsonString = this.cleanGeminiResponse(text);
    this.logger.log(`Cleaned JSON: ${cleanJsonString}`);
    const parsedData = JSON.parse(cleanJsonString);

    this.logger.log(
      `Parsed data extracted - Shows: ${parsedData.shows?.length || 0}, DJs: ${parsedData.djs?.length || 0}, Vendor: ${parsedData.vendor?.name || 'Unknown'}`,
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

    this.logger.log(
      `Combined ${results.length} chunks: ${uniqueShows.length} unique shows, ${uniqueDjs.length} unique DJs`,
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

    this.logger.log(`Starting deduplication with ${shows.length} shows`);

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

    this.logger.log(`Deduplication: ${shows.length} shows → ${unique.length} unique shows`);
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
    return shows.map((show) => {
      // If no end time specified, default to midnight
      if (show.startTime && !show.endTime) {
        show.endTime = '00:00';
      }
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
    this.logger.log(`Starting approval process for schedule ${parsedScheduleId}`);

    try {
      // Validate input data
      if (!approvedData || !approvedData.vendor || !approvedData.shows || approvedData.shows.length === 0) {
        throw new Error('Invalid data: missing vendor information or no shows found');
      }

      // 1. Find or create the vendor
      let vendor = await this.vendorRepository.findOne({
        where: { name: approvedData.vendor.name },
      });

      if (!vendor) {
        this.logger.log(`Creating new vendor: ${approvedData.vendor.name}`);
        vendor = this.vendorRepository.create({
          name: approvedData.vendor.name,
          owner: approvedData.vendor.owner || '',
          website: approvedData.vendor.website,
          description: approvedData.vendor.description,
        });
        vendor = await this.vendorRepository.save(vendor);
        this.logger.log(`Created vendor with ID: ${vendor.id}`);
      } else {
        this.logger.log(`Using existing vendor: ${vendor.name} (ID: ${vendor.id})`);
      }

      // 2. Create or update DJs
      const djMap = new Map<string, DJ>();
      let djsCreated = 0;
      let djsUpdated = 0;

      // Handle empty DJs array gracefully
      const djsData = approvedData.djs || [];
      for (const djData of djsData) {
        if (!djData.name || djData.name.trim() === '') {
          this.logger.warn('Skipping DJ with empty name');
          continue;
        }

        let dj = await this.djRepository.findOne({
          where: { name: djData.name, vendorId: vendor.id },
        });

        if (!dj) {
          this.logger.log(`Creating new DJ: ${djData.name}`);
          dj = this.djRepository.create({
            name: djData.name,
            vendorId: vendor.id,
            isActive: true,
          });
          dj = await this.djRepository.save(dj);
          djsCreated++;
        } else {
          this.logger.log(`Using existing DJ: ${dj.name} (ID: ${dj.id})`);
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

        this.logger.log(`Creating show: ${showData.venue} on ${normalizedDay} at ${showData.time}`);

        const show = this.showRepository.create({
          vendorId: vendor.id,
          djId: djId,
          venue: showData.venue,
          address: showData.address,
          day: normalizedDay as any, // Cast to DayOfWeek enum
          time: showData.time,
          startTime: showData.startTime,
          endTime: showData.endTime,
          description: showData.description,
          notes: showData.notes,
          venuePhone: showData.venuePhone,
          venueWebsite: showData.venueWebsite,
          isActive: true,
        });

        const savedShow = await this.showRepository.save(show);
        showsCreated++;
        return savedShow;
      });

      await Promise.all(showPromises);

      // 4. Update the schedule to approved status
      await this.parsedScheduleRepository.update(parsedScheduleId, {
        status: ParseStatus.APPROVED,
        aiAnalysis: approvedData as any,
      });

      // 5. Delete the schedule after approval
      await this.parsedScheduleRepository.delete(parsedScheduleId);

      const successMessage = `Successfully saved data: 1 vendor, ${djsCreated} new DJs (${djsUpdated} updated), ${showsCreated} shows`;
      this.logger.log(successMessage);

      return {
        success: true,
        message: successMessage,
        stats: {
          vendorId: vendor.id,
          vendorName: vendor.name,
          djsCreated,
          djsUpdated,
          showsCreated,
        },
      };
    } catch (error) {
      this.logger.error(`Error approving and saving data: ${error.message}`);
      this.logger.error(error.stack);
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
    this.logger.log(`Deleted rejected schedule ${parsedScheduleId} from database`);
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

      this.logger.log(
        `HTML trimming: ${htmlContent.length} → ${trimmed.length} chars (${(((htmlContent.length - trimmed.length) / htmlContent.length) * 100).toFixed(1)}% reduction)`,
      );

      return trimmed;
    } catch (error) {
      this.logger.warn('Error trimming HTML content, using original:', error);
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
    try {
      this.logger.log(`Capturing full-page screenshot from: ${url}`);

      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-web-security',
        ],
      });

      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
      // Use larger viewport for better content capture
      await page.setViewport({ width: 1280, height: 1024 });

      // Navigate and wait for full page load
      await page.goto(url, {
        waitUntil: 'domcontentloaded', // Changed from 'networkidle2' to be faster
        timeout: 20000, // Reduced from 30000
      });

      // Reduced wait time for dynamic content
      await new Promise((resolve) => setTimeout(resolve, 1500)); // Reduced from 3000

      // Scroll to bottom to ensure all content is loaded (for lazy loading)
      this.logger.log('Scrolling to ensure all content is loaded...');
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
      this.logger.log(`📏 Page dimensions: ${pageWidth}x${pageHeight}px`);

      if (pageHeight < 8000) {
        this.logger.warn(
          `⚠️  Page seems short (${pageHeight}px), expected ~9000px for full content`,
        );
      }

      // Get the HTML content for backup parsing
      const htmlContent = await page.content();

      // Take a high-quality screenshot
      const screenshot = await page.screenshot({
        fullPage: true,
        type: 'jpeg',
        quality: 85, // Balanced quality for faster processing
        optimizeForSpeed: false, // Keep false for better quality
      });

      this.logger.log(
        `Successfully captured full-page screenshot from ${url} (${screenshot.length} bytes, ${htmlContent.length} characters HTML)`,
      );

      return { screenshot, htmlContent };
    } catch (error) {
      this.logger.error(`Error capturing screenshot from ${url}:`, error);
      throw error;
    } finally {
      if (browser) {
        await browser.close();
      }
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
      this.logger.log('Starting Gemini Vision parsing with screenshot');

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
      "address": "Full address",
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

      this.logger.log(`Making Gemini Vision API request with optimized settings...`);
      this.logger.log(`Image size: ${(screenshot.length / 1024 / 1024).toFixed(2)} MB`);

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

      this.logger.log('Gemini Vision response received, extracting JSON');
      this.logger.log(`Gemini Vision response length: ${text.length} characters`);

      // Log usage metadata if available
      if (result.response.usageMetadata) {
        const usage = result.response.usageMetadata;
        this.logger.log(
          `Token usage - Prompt: ${usage.promptTokenCount || 'N/A'}, Candidates: ${usage.candidatesTokenCount || 'N/A'}, Total: ${usage.totalTokenCount || 'N/A'}`,
        );
      }

      // Clean and parse JSON response with better error handling
      this.logger.log('Raw Gemini response (first 500 chars):', text.substring(0, 500));
      this.logger.log(`Full response length: ${text.length} characters`);

      let parsedData;
      try {
        const cleanJsonString = this.cleanGeminiResponse(text);
        this.logger.log('Cleaned JSON (first 500 chars):', cleanJsonString.substring(0, 500));
        this.logger.log(`Cleaned JSON length: ${cleanJsonString.length} characters`);
        parsedData = JSON.parse(cleanJsonString);
        this.logger.log('✅ JSON parsing successful');
      } catch (jsonError) {
        this.logger.error(
          '❌ JSON parsing failed, attempting to fix common issues:',
          jsonError.message,
        );

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
            this.logger.log('✅ Successfully parsed JSON after fixing');
          } catch (secondError) {
            this.logger.error('❌ Even fixed JSON failed to parse:', secondError.message);
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

      this.logger.log(
        `📊 Parsing Results: ${showCount} shows, ${djCount} DJs, vendor: ${vendorName}`,
      );

      if (showCount < 30) {
        this.logger.warn(
          `⚠️  WARNING: Only found ${showCount} shows, expected 35-40+. May be incomplete parsing.`,
        );
      } else {
        this.logger.log(`✅ Good show count: ${showCount} shows found`);
      }

      this.logger.log(
        `Vision parsed data extracted - Shows: ${parsedData.shows?.length || 0}, DJs: ${parsedData.djs?.length || 0}, Vendor: ${parsedData.vendor?.name || 'Unknown'}`,
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
      this.logger.error('Error parsing screenshot with Gemini Vision:', error);
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
