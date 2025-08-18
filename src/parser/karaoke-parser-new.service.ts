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

      // Step 1: Get raw HTML content from the website
      const htmlContent = await this.fetchRawHtml(url);

      // Step 2: Parse with Gemini AI
      const parsedData = await this.parseWithGemini(htmlContent, url);

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
   * Parse and save website data to parsed_schedules for admin review
   */
  async parseAndSaveWebsite(
    url: string,
  ): Promise<{ parsedScheduleId: string; data: ParsedKaraokeData }> {
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

      this.logger.log(`Successfully saved parsed data for admin review. ID: ${savedSchedule.id}`);

      return {
        parsedScheduleId: savedSchedule.id,
        data: parsedData,
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
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
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

      const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });

      const prompt = `You are analyzing the HTML content of a karaoke business website. Extract ALL karaoke shows, events, and schedule information in JSON format.

COMPREHENSIVE EXTRACTION STRATEGY:
- Scan all HTML content thoroughly, not just obvious schedule sections
- Look for karaoke events in navigation menus, sidebars, footer content  
- Find recurring shows, special events, and regular schedules
- Extract venue information from structured content
- Look for contact information, addresses, and website links
- Identify DJ/host names from event descriptions

VENUE & CONTACT EXTRACTION:
- Extract venue addresses from any HTML text content
- Find phone numbers in the HTML (look for patterns like (xxx) xxx-xxxx)
- Identify venue websites from anchor tags and links
- Match contact information to specific venues when possible
- Look for structured venue information in lists, tables, or divs

DJ NAME EXTRACTION:
- Look for creative/professional stage names in "Hosted by:" sections
- Prioritize DJ names that appear prominently in event descriptions
- Use stage names like "La Vida Loca", "Karaoke Won Kenobi" as primary names
- Store social media handles and payment usernames as aliases only
- Distinguish between professional DJ names and contact/payment information

MULTIPLE DAYS HANDLING - CRITICAL:
When you find HTML content describing multiple days in one entry, create separate show entries:
- "Wednesday, Friday & Sundays 9:30 - 1:30" → Create 3 separate shows
- "Weekends 9pm" → Create Saturday and Sunday shows
- "Monday-Friday 7pm" → Create 5 separate shows

FILTERING - EXCLUDE THESE:
- Shows marked as "CLOSED", "CANCELLED", "SUSPENDED"
- Events listed as "UNAVAILABLE" or "DISCONTINUED"
- "TEMPORARILY CLOSED" or "OUT OF BUSINESS" venues
- Shows marked "INACTIVE" or "NOT RUNNING"

Website URL: ${url}

Return comprehensive JSON in this exact format (no additional text):
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
      "name": "Professional DJ/host name (prefer stage names)",
      "confidence": 0.8,
      "context": "Venues where they perform",
      "aliases": ["social_handle", "payment_username", "alternate_names"]
    }
  ],
  "shows": [
    {
      "venue": "Venue Name",
      "address": "Full address if available",
      "venuePhone": "Phone number",
      "venueWebsite": "Venue website if available",
      "date": "day_of_week",
      "time": "start_time - end_time",
      "startTime": "HH:MM",
      "endTime": "HH:MM",
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

      // Clean and parse JSON response
      const cleanJsonString = this.cleanGeminiResponse(text);
      const parsedData = JSON.parse(cleanJsonString);

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

      this.logger.log(
        `Gemini parsing completed: ${finalData.shows.length} shows, ${finalData.djs.length} DJs found`,
      );

      return finalData;
    } catch (error) {
      this.logger.error('Error parsing with Gemini:', error);
      throw new Error(`Gemini parsing failed: ${error.message}`);
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
}
