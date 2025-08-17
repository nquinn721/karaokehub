import { GoogleGenerativeAI } from '@google/generative-ai';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as puppeteer from 'puppeteer';
import { Repository } from 'typeorm';
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

      // Step 1: Get clean webpage content
      const webpageContent = await this.fetchWebpageContent(url);

      // Step 2: Parse with Gemini AI
      const parsedData = await this.parseWithGemini(webpageContent, url);

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
   * Step 1: Use Puppeteer to fetch raw HTML content from website
   */
  private async fetchRawHtml(url: string): Promise<string> {
    let browser;
    try {
      this.logger.log(`Fetching raw HTML content from: ${url}`);

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
        waitUntil: 'networkidle2', // Wait until network is idle
        timeout: 30000,
      });

      // Wait additional time for any dynamic content
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Get the raw HTML content
      const htmlContent = await page.content();

      this.logger.log(
        `Successfully fetched HTML content from ${url} (${htmlContent.length} characters)`,
      );
      return htmlContent;
    } catch (error) {
      this.logger.error(`Error fetching HTML content from ${url}:`, error);
      throw error;
    } finally {
      if (browser) {
        await browser.close();
      }
    }
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
    const prompt = `Find all karaoke shows in this HTML content.

EXCLUDE: Shows marked "CLOSED", "CANCELLED", "SUSPENDED", "UNAVAILABLE", "DISCONTINUED", "TEMPORARILY CLOSED", "OUT OF BUSINESS", "INACTIVE", "NOT RUNNING"

TIME PARSING: Look for times anywhere in the content (formats: "9 pm", "9:30", "10:00 pm"). Times may not be inline with venue details. Convert to 24-hour format. If only start time found, use "close" for end time.

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
      "time": "start_time - end_time (or start_time - close)",
      "startTime": "HH:MM (24-hour format)",
      "endTime": "HH:MM (24-hour format, or 'close')",
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

    // Log usage metadata if available
    if (result.response.usageMetadata) {
      const usage = result.response.usageMetadata;
      this.logger.log(
        `Token usage - Prompt: ${usage.promptTokenCount || 'N/A'}, Candidates: ${usage.candidatesTokenCount || 'N/A'}, Total: ${usage.totalTokenCount || 'N/A'}`,
      );
    }

    // Clean and parse JSON response
    const cleanJsonString = this.cleanGeminiResponse(text);
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
    // Update the schedule to approved
    await this.parsedScheduleRepository.update(parsedScheduleId, {
      status: ParseStatus.APPROVED,
      aiAnalysis: approvedData as any,
    });

    // Delete the schedule after approval
    await this.parsedScheduleRepository.delete(parsedScheduleId);
    this.logger.log(`Deleted approved schedule ${parsedScheduleId} from database`);

    return { success: true, message: 'Data approved and saved, schedule removed' };
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
}
