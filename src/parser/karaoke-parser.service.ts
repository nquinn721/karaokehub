import { GoogleGenerativeAI } from '@google/generative-ai';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as puppeteer from 'puppeteer';
import { In, Repository } from 'typeorm';
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
    @InjectRepository(Vendor)
    private vendorRepository: Repository<Vendor>,
    @InjectRepository(DJ)
    private djRepository: Repository<DJ>,
    @InjectRepository(Show)
    private showRepository: Repository<Show>,
    @InjectRepository(ParsedSchedule)
    private parsedScheduleRepository: Repository<ParsedSchedule>,
  ) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async parseWebsite(url: string): Promise<ParsedKaraokeData> {
    try {
      this.logger.log(`Starting Puppeteer-based parse for URL: ${url}`);

      // Extract clean text content using Puppeteer
      const textContent = await this.extractTextContentWithPuppeteer(url);

      // Parse with Gemini AI using the clean text
      const result = await this.parseWithGemini(textContent, url);

      this.logger.log(`Parse completed successfully for ${url}`);
      return result;
    } catch (error) {
      this.logger.error(`Error parsing website ${url}:`, error);
      throw new Error(`Failed to parse website: ${error.message}`);
    }
  }

  async parseAndSaveWebsite(
    url: string,
  ): Promise<{ parsedScheduleId: string; data: ParsedKaraokeData }> {
    try {
      this.logger.log(`Starting parse and save operation for URL: ${url}`);

      // Extract clean text content using Puppeteer
      const textContent = await this.extractTextContentWithPuppeteer(url);

      // Parse with Gemini AI using the clean text
      const parsedData = await this.parseWithGemini(textContent, url);

      // Save to parsed_schedules table for admin review
      const parsedSchedule = this.parsedScheduleRepository.create({
        url: url,
        rawData: {
          url: url,
          title: this.extractTitleFromContent(textContent),
          content: textContent,
          parsedAt: new Date(),
        },
        aiAnalysis: parsedData,
        status: ParseStatus.PENDING_REVIEW, // Requires admin review
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

  private async extractTextContentWithPuppeteer(url: string): Promise<string> {
    let browser;
    try {
      this.logger.log(`Launching Puppeteer for: ${url}`);

      // Launch browser with optimized settings
      browser = await puppeteer.launch({
        headless: true,
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH, // Use system Chromium in production
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
        ],
      });

      const page = await browser.newPage();

      // Set user agent and viewport
      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      );
      await page.setViewport({ width: 1280, height: 720 });

      // Navigate to the page
      this.logger.log(`Navigating to: ${url}`);
      await page.goto(url, {
        waitUntil: 'networkidle2', // Wait until network activity is minimal
        timeout: 30000,
      });

      // Wait a bit more for any dynamic content to load
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Extract clean text content
      const textContent = await page.evaluate(() => {
        // Remove script and style elements
        const scripts = document.querySelectorAll('script, style, noscript');
        scripts.forEach((el) => el.remove());

        // Get all text content, preserving some structure
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
          acceptNode: (node) => {
            // Skip if parent is hidden
            const parent = node.parentElement;
            if (parent) {
              const style = window.getComputedStyle(parent);
              if (style.display === 'none' || style.visibility === 'hidden') {
                return NodeFilter.FILTER_REJECT;
              }
            }

            // Skip empty or whitespace-only text nodes
            const text = node.textContent?.trim();
            return text && text.length > 0 ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
          },
        });

        const textNodes = [];
        let node;
        while ((node = walker.nextNode())) {
          const text = node.textContent?.trim();
          if (text && text.length > 0) {
            textNodes.push(text);
          }
        }

        // Join with spaces and clean up
        return textNodes
          .join(' ')
          .replace(/\s+/g, ' ') // Replace multiple spaces with single space
          .trim();
      });

      this.logger.log(
        `Successfully extracted ${textContent.length} characters of text from ${url}`,
      );

      if (!textContent || textContent.length < 50) {
        throw new Error('No meaningful text content found on the page');
      }

      return textContent;
    } catch (error) {
      this.logger.error(`Error extracting text content from ${url}:`, error);
      throw error;
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  private async fetchWebContent(url: string): Promise<string> {
    // Legacy method - now using Puppeteer instead
    // Kept for backward compatibility if needed
    try {
      this.logger.log(`Fetching content from: ${url} (legacy method)`);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        },
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const content = await response.text();
      this.logger.log(`Successfully fetched ${content.length} characters from ${url}`);
      return content;
    } catch (error) {
      this.logger.error(`Error fetching content from ${url}:`, error);
      throw error;
    }
  }

  private async parseWithGemini(textContent: string, url: string): Promise<ParsedKaraokeData> {
    try {
      this.logger.log('Starting Gemini AI parsing with clean text content');

      // Use gemini-1.5-pro for better quality parsing
      const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });

      const prompt = `You are parsing text content extracted from a karaoke business website. Extract ALL karaoke shows, events, and schedule information in JSON format.

Look for:
1. Business/venue name and details (including owner/contact information)
2. ALL karaoke events, shows, nights, or scheduled performances
3. Dates, times, locations, and DJ/host names
4. Regular weekly schedules (e.g., "Karaoke every Tuesday")
5. Special events or one-time shows
6. Full addresses when available
7. Start and end times separately when possible

Be thorough - extract every karaoke-related event you find, even if incomplete.

Return JSON in this exact format (no additional text or markdown):
{
  "vendor": {
    "name": "Business Name",
    "owner": "Owner/Contact Name or Business Name",
    "website": "${url}",
    "description": "Brief description", 
    "confidence": 0.9
  },
  "djs": [
    {
      "name": "DJ/Host Name",
      "confidence": 0.8,
      "context": "Where mentioned"
    }
  ],
  "shows": [
    {
      "venue": "Venue/Location Name",
      "address": "Full address if available",
      "date": "YYYY-MM-DD or day-of-week",
      "time": "HH:MM or time description",
      "startTime": "HH:MM start time if available",
      "endTime": "HH:MM end time if available", 
      "day": "monday|tuesday|wednesday|thursday|friday|saturday|sunday",
      "djName": "DJ/Host Name",
      "description": "Event description/details",
      "notes": "Additional notes or special info",
      "confidence": 0.8
    }
  ]
}

IMPORTANT: 
- Include ALL karaoke events you find, even recurring weekly ones
- For recurring events, create multiple show entries or use descriptive dates
- If you find "Karaoke every Tuesday 8pm", create a show entry
- Extract partial information rather than skipping events
- Use high confidence for clearly stated information
- If no shows found, use empty arrays
- Focus on karaoke-specific events

Website Text Content:
${textContent}`;

      // Retry logic for quota exceeded errors
      let result;
      let attempts = 0;
      const maxAttempts = 3;

      while (attempts < maxAttempts) {
        try {
          result = await model.generateContent(prompt);
          break; // Success, exit retry loop
        } catch (error) {
          attempts++;

          // Check if it's a quota exceeded error
          if (
            error.message?.includes('429') ||
            error.message?.includes('quota') ||
            error.message?.includes('Too Many Requests')
          ) {
            this.logger.warn(
              `Quota exceeded, attempt ${attempts}/${maxAttempts}. Waiting before retry...`,
            );

            if (attempts < maxAttempts) {
              // Exponential backoff: 2^attempts seconds
              const waitTime = Math.pow(2, attempts) * 1000;
              await new Promise((resolve) => setTimeout(resolve, waitTime));
              continue;
            }
          }

          // If not a quota error or max attempts reached, throw
          throw error;
        }
      }

      const response = await result.response;
      const text = response.text();

      this.logger.log('Gemini response received, extracting JSON');
      this.logger.debug(`Raw Gemini response: ${text.substring(0, 500)}...`);

      // Extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        this.logger.error(`No JSON found in response: ${text}`);
        throw new Error('No valid JSON found in AI response');
      }

      const parsedData = JSON.parse(jsonMatch[0]);
      this.logger.debug(`Parsed JSON data:`, parsedData);

      // Ensure required structure with defaults
      const finalData: ParsedKaraokeData = {
        vendor: parsedData.vendor || {
          name: 'Unknown Business',
          website: url,
          confidence: 0.1,
        },
        djs: Array.isArray(parsedData.djs) ? parsedData.djs : [],
        shows: Array.isArray(parsedData.shows) ? parsedData.shows : [],
        rawData: {
          url,
          title: this.extractTitleFromContent(textContent),
          content: textContent.substring(0, 5000),
          parsedAt: new Date(),
        },
      };

      this.logger.log(
        `Parsing completed: ${finalData.shows.length} shows, ${finalData.djs.length} DJs found`,
      );
      return finalData;
    } catch (error) {
      this.logger.error('Error parsing with Gemini:', error);
      throw new Error(`AI parsing failed: ${error.message}`);
    }
  }

  private extractTitleFromContent(content: string): string {
    // Extract a reasonable title from the first part of the content
    const firstLine = content.split('\n')[0] || content.split('.')[0];
    return firstLine.trim().substring(0, 100) || 'Unknown Title';
  }

  // Save parsed data directly to database for admin review
  async saveParsedDataToDB(
    parsedScheduleId: string,
    approvedData: ParsedKaraokeData,
  ): Promise<void> {
    try {
      const parsedSchedule = await this.parsedScheduleRepository.findOne({
        where: { id: parsedScheduleId },
      });

      if (!parsedSchedule) {
        throw new Error(`Parsed schedule with ID ${parsedScheduleId} not found`);
      }

      // Update the parsed schedule with approved data
      parsedSchedule.aiAnalysis = approvedData;
      parsedSchedule.status = ParseStatus.APPROVED;

      await this.parsedScheduleRepository.save(parsedSchedule);

      this.logger.log(`Successfully saved approved data for parsed schedule ${parsedScheduleId}`);
    } catch (error) {
      this.logger.error(`Error saving parsed data to DB:`, error);
      throw error;
    }
  }

  async approveAndSaveParsedData(
    parsedScheduleId: string,
    approvedData: ParsedKaraokeData,
  ): Promise<void> {
    try {
      const parsedSchedule = await this.parsedScheduleRepository.findOne({
        where: { id: parsedScheduleId },
      });

      if (!parsedSchedule) {
        throw new Error(`Parsed schedule with ID ${parsedScheduleId} not found`);
      }

      // Update the parsed schedule with approved status and data
      parsedSchedule.aiAnalysis = approvedData;
      parsedSchedule.status = ParseStatus.APPROVED;

      await this.parsedScheduleRepository.save(parsedSchedule);

      // Create actual entities from approved data
      await this.createEntitiesFromApprovedData(approvedData);

      // Remove the parsed schedule from the database after successful approval
      await this.parsedScheduleRepository.delete({ id: parsedScheduleId });

      this.logger.log(
        `Successfully approved, saved, and cleaned up data for parsed schedule ${parsedScheduleId}`,
      );
    } catch (error) {
      this.logger.error(`Error approving and saving parsed data:`, error);
      throw error;
    }
  }

  private async createEntitiesFromApprovedData(data: ParsedKaraokeData): Promise<void> {
    try {
      // 1. Create or find Vendor
      let vendor = await this.vendorRepository.findOne({
        where: { name: data.vendor.name },
      });

      if (!vendor) {
        vendor = this.vendorRepository.create({
          name: data.vendor.name,
          owner: data.vendor.owner || data.vendor.name, // Use vendor name as owner if not specified
          website: data.vendor.website,
          description: data.vendor.description || `Vendor imported from ${data.vendor.website}`,
          isActive: true,
        });
        vendor = await this.vendorRepository.save(vendor);
        this.logger.log(`Created new vendor: ${vendor.name}`);
      }

      // 2. Create or find DJs
      const djMap = new Map<string, any>();
      for (const djData of data.djs) {
        let dj = await this.djRepository.findOne({
          where: { name: djData.name, vendorId: vendor.id },
        });

        if (!dj) {
          dj = this.djRepository.create({
            name: djData.name,
            vendorId: vendor.id,
            isActive: true,
          });
          dj = await this.djRepository.save(dj);
          this.logger.log(`Created new DJ: ${dj.name} for vendor: ${vendor.name}`);
        }

        djMap.set(djData.name, dj);
      }

      // 3. Create Shows
      const showsCreated = [];
      for (const showData of data.shows) {
        // Parse the date and time
        let parsedDate: Date;
        try {
          parsedDate = new Date(showData.date);
          if (isNaN(parsedDate.getTime())) {
            // If date parsing fails, try to create a date from the string
            parsedDate = new Date();
            this.logger.warn(`Could not parse date: ${showData.date}, using current date`);
          }
        } catch (error) {
          parsedDate = new Date();
          this.logger.warn(`Error parsing date: ${showData.date}, using current date`);
        }

        // Find the appropriate DJ
        const dj = showData.djName ? djMap.get(showData.djName) : null;

        // Check if show already exists to avoid duplicates
        const existingShow = await this.showRepository.findOne({
          where: {
            venue: showData.venue,
            date: parsedDate,
            vendorId: vendor.id,
          },
        });

        if (!existingShow) {
          // Parse day of week from the day field
          let dayOfWeek = null;
          if (showData.day) {
            const dayLower = showData.day.toLowerCase();
            const validDays = [
              'monday',
              'tuesday',
              'wednesday',
              'thursday',
              'friday',
              'saturday',
              'sunday',
            ];
            if (validDays.includes(dayLower)) {
              dayOfWeek = dayLower;
            }
          }

          // Parse start and end times
          let startTime = null;
          let endTime = null;

          if (showData.startTime) {
            try {
              startTime = showData.startTime;
            } catch (error) {
              this.logger.warn(`Could not parse startTime: ${showData.startTime}`);
            }
          }

          if (showData.endTime) {
            try {
              endTime = showData.endTime;
            } catch (error) {
              this.logger.warn(`Could not parse endTime: ${showData.endTime}`);
            }
          }

          const show = this.showRepository.create({
            venue: showData.venue,
            address: showData.address || null,
            date: parsedDate,
            time: showData.time,
            startTime: startTime,
            endTime: endTime,
            day: dayOfWeek,
            description: showData.description || `Show at ${showData.venue}`,
            notes: showData.notes || null,
            vendorId: vendor.id,
            djId: dj?.id || null,
            isActive: true,
          });

          const savedShow = await this.showRepository.save(show);
          showsCreated.push(savedShow);
          this.logger.log(
            `Created show: ${savedShow.venue} on ${savedShow.date} ${dj ? `with DJ: ${dj.name}` : ''}`,
          );
        }
      }

      this.logger.log(
        `Successfully created entities: Vendor: ${vendor.name}, DJs: ${djMap.size}, Shows: ${showsCreated.length}`,
      );
    } catch (error) {
      this.logger.error(`Error creating entities from approved data:`, error);
      throw error;
    }
  }

  async rejectParsedData(parsedScheduleId: string, reason?: string): Promise<void> {
    try {
      const parsedSchedule = await this.parsedScheduleRepository.findOne({
        where: { id: parsedScheduleId },
      });

      if (!parsedSchedule) {
        throw new Error(`Parsed schedule with ID ${parsedScheduleId} not found`);
      }

      parsedSchedule.status = ParseStatus.REJECTED;
      parsedSchedule.rejectionReason = reason || 'No reason provided';

      await this.parsedScheduleRepository.save(parsedSchedule);

      this.logger.log(`Successfully rejected parsed schedule ${parsedScheduleId}: ${reason}`);
    } catch (error) {
      this.logger.error(`Error rejecting parsed data:`, error);
      throw error;
    }
  }

  async getPendingReviews(): Promise<ParsedSchedule[]> {
    return await this.parsedScheduleRepository.find({
      where: {
        status: In([ParseStatus.PENDING, ParseStatus.PENDING_REVIEW, ParseStatus.NEEDS_REVIEW]),
      },
      order: { createdAt: 'DESC' },
    });
  }

  async cleanupInvalidPendingReviews(): Promise<number> {
    const result = await this.parsedScheduleRepository.delete({ status: ParseStatus.REJECTED });
    return result.affected || 0;
  }

  async cleanupAllPendingReviews(): Promise<number> {
    const result = await this.parsedScheduleRepository.delete({ status: ParseStatus.PENDING });
    return result.affected || 0;
  }

  async getAllParsedSchedulesForDebug(): Promise<ParsedSchedule[]> {
    return await this.parsedScheduleRepository.find({
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }
}
