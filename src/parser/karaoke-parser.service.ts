import { GoogleGenerativeAI } from '@google/generative-ai';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as cheerio from 'cheerio';
import fetch from 'node-fetch';
import { Repository } from 'typeorm';
import { KJ } from '../kj/kj.entity';
import { ParsedSchedule, ParseStatus } from '../modules/parser/parsed-schedule.entity';
import { Show } from '../show/show.entity';
import { Vendor } from '../vendor/vendor.entity';

export interface ParsedKaraokeData {
  vendor: {
    name: string;
    website: string;
    description?: string;
    confidence: number;
  };
  kjs: Array<{
    name: string;
    confidence: number;
    context?: string;
  }>;
  shows: Array<{
    venue: string;
    day: string;
    startTime: string;
    endTime?: string;
    address?: string;
    kjName?: string;
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
export class KaraokeParserService {
  private readonly logger = new Logger(KaraokeParserService.name);
  private readonly genAI: GoogleGenerativeAI;
  private lastRequestTime = 0;
  private requestCount = 0;
  private readonly rateLimitWindow = 60000; // 1 minute
  private readonly maxRequestsPerMinute = 10; // Conservative limit for free tier

  constructor(
    @InjectRepository(Vendor)
    private vendorRepository: Repository<Vendor>,
    @InjectRepository(KJ)
    private kjRepository: Repository<KJ>,
    @InjectRepository(Show)
    private showRepository: Repository<Show>,
    @InjectRepository(ParsedSchedule)
    private parsedScheduleRepository: Repository<ParsedSchedule>,
  ) {
    // Initialize Gemini AI with API key from environment
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      this.logger.error('GEMINI_API_KEY not found in environment variables');
      throw new Error('GEMINI_API_KEY environment variable is required');
    }

    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  /**
   * Check and enforce rate limiting for Gemini API calls
   */
  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();

    // Reset counter if window has passed
    if (now - this.lastRequestTime > this.rateLimitWindow) {
      this.requestCount = 0;
      this.lastRequestTime = now;
    }

    // Check if we've exceeded the limit
    if (this.requestCount >= this.maxRequestsPerMinute) {
      const waitTime = this.rateLimitWindow - (now - this.lastRequestTime);
      this.logger.warn(`Rate limit reached. Waiting ${waitTime}ms before next request.`);
      await new Promise((resolve) => setTimeout(resolve, waitTime));

      // Reset after waiting
      this.requestCount = 0;
      this.lastRequestTime = Date.now();
    }

    this.requestCount++;
  }

  async parseWebsite(url: string, customRules?: string): Promise<ParsedKaraokeData> {
    this.logger.log(`Starting to parse website: ${url}`);

    try {
      // Fetch the webpage content
      const response = await fetch(url);
      const html = await response.text();
      const $ = cheerio.load(html);

      // Extract text content and clean it
      const title = $('title').text() || '';
      const bodyText = $('body').text().replace(/\s+/g, ' ').trim();
      const links = $('a[href]')
        .map((_, el) => ({
          text: $(el).text().trim(),
          href: $(el).attr('href'),
        }))
        .get();

      // Prepare content for AI analysis
      const contentForAI = this.prepareContentForAI(title, bodyText, links, url);

      // Use Gemini AI to parse karaoke information
      const aiResult = await this.analyzeWithGemini(contentForAI, 0, customRules);

      // Save raw parsed data
      const parsedSchedule = new ParsedSchedule();
      parsedSchedule.url = url;
      parsedSchedule.rawData = {
        title,
        content: bodyText.substring(0, 5000), // Limit content size
        links: links.slice(0, 20), // Limit links
        parsedAt: new Date(),
      };
      parsedSchedule.aiAnalysis = aiResult;
      parsedSchedule.status = ParseStatus.PENDING_REVIEW;

      await this.parsedScheduleRepository.save(parsedSchedule);

      const result: ParsedKaraokeData = {
        vendor: aiResult.vendor,
        kjs: aiResult.kjs,
        shows: aiResult.shows,
        rawData: {
          url,
          title,
          content: bodyText.substring(0, 1000),
          parsedAt: new Date(),
        },
      };

      this.logger.log(
        `Successfully parsed website: ${url}. Found ${result.kjs.length} KJs and ${result.shows.length} shows`,
      );
      return result;
    } catch (error) {
      this.logger.error(`Error parsing website ${url}:`, error);
      throw error;
    }
  }

  private prepareContentForAI(title: string, bodyText: string, links: any[], url: string): string {
    const linkText = links.map((link) => `${link.text}: ${link.href}`).join('\n');

    return `
URL: ${url}
TITLE: ${title}

CONTENT:
${bodyText.substring(0, 3000)}

LINKS:
${linkText.substring(0, 1000)}
    `.trim();
  }

  private async analyzeWithGemini(
    content: string,
    retryCount = 0,
    customRules?: string,
  ): Promise<any> {
    const maxRetries = 3;
    const baseDelay = 2000; // 2 seconds

    // Enforce rate limiting before making the request
    await this.enforceRateLimit();

    try {
      // Try gemini-1.5-flash first, then fall back to gemini-1.5-pro if overloaded
      const modelName = retryCount >= 2 ? 'gemini-1.5-pro' : 'gemini-1.5-flash';
      const model = this.genAI.getGenerativeModel({ model: modelName });

      if (retryCount >= 2) {
        this.logger.log(`Switching to alternative model: ${modelName}`);
      }

      const rulesSection = customRules
        ? `

CUSTOM PARSING RULES:
${customRules}

Please follow these custom rules when parsing the content.
`
        : '';

      const prompt = `
You are an expert at parsing karaoke and DJ service websites to extract structured schedule information. Focus on finding:

1. VENDOR INFORMATION:
   - Business/company name that runs karaoke/DJ shows
   - Website URL  
   - Brief description of services offered
   - Contact information if available
   - Confidence level (0-100)

2. KJ/DJ INFORMATION (Look for staff pages, about sections, or team listings):
   - Names of KJs/DJs/hosts mentioned (they may be called "DJs", "KJs", "Hosts", "Staff", or "Team")
   - Look for pages like /staff, /team, /djs, /about, /our-team
   - Any bio or description for each person
   - Confidence level for each (0-100)

3. KARAOKE SCHEDULE INFORMATION (This is the most important - look for weekly schedules):
   - Look for schedule pages, calendar pages, or "where we play" sections
   - Extract SPECIFIC venues/locations where shows happen
   - Extract SPECIFIC days of the week (Monday, Tuesday, etc.)
   - Extract SPECIFIC times (start time and end time if available)
   - Format times as "HH:MM" (24-hour) or "HH:MM AM/PM" 
   - If it's a recurring weekly schedule, note that it's "recurring"
   - Match KJs/DJs to specific shows if mentioned
   - Look for addresses or location details
   - Confidence level for each (0-100)

IMPORTANT PARSING GUIDELINES:
- Look beyond just the homepage - check for schedule/calendar/venues pages
- "Multiple locations" or "various venues" should be parsed as separate shows if you can identify specific venues
- If times are listed as ranges (like "7PM-11PM"), separate into startTime and endTime
- Days should be full day names (Monday, Tuesday, etc.) not abbreviations  
- If no specific venues are found but there are time/day patterns, still extract them
- Pay special attention to tables, lists, or structured data that might contain schedules${rulesSection}

Please return the response as a valid JSON object with this exact structure:
{
  "vendor": {
    "name": "business name",
    "website": "website url", 
    "description": "brief description of services",
    "confidence": 85
  },
  "kjs": [
    {
      "name": "KJ/DJ Name",
      "confidence": 90,
      "context": "bio or additional info about this person"
    }
  ],
  "shows": [
    {
      "venue": "Specific Venue Name or Location",
      "day": "Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday", 
      "startTime": "19:00" or "7:00 PM",
      "endTime": "23:00" or "11:00 PM" (if available),
      "address": "street address if available",
      "kjName": "KJ Name if specified for this show",
      "description": "additional show details, special notes",
      "confidence": 80
    }
  ]
}

Only include information you're reasonably confident about. For shows, prioritize finding actual venue names and specific days/times over generic information.

WEBPAGE CONTENT TO ANALYZE:
${content}
      `;
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Try to parse JSON response
      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      } catch (parseError) {
        this.logger.warn('Failed to parse AI response as JSON, using fallback parsing');
      }

      // Fallback parsing if JSON parsing fails
      return this.fallbackParsing(text);
    } catch (error) {
      // Check for various API errors that warrant retries
      const shouldRetry =
        retryCount < maxRetries &&
        (error.message?.includes('503 Service Unavailable') ||
          error.message?.includes('429 Too Many Requests') ||
          error.message?.includes('exceeded your current quota') ||
          error.message?.includes('rate limit'));

      if (shouldRetry) {
        // Calculate delay based on error type
        let delay = baseDelay * Math.pow(2, retryCount); // Exponential backoff

        // For rate limiting errors, use a longer delay
        if (
          error.message?.includes('429') ||
          error.message?.includes('quota') ||
          error.message?.includes('rate limit')
        ) {
          delay = Math.max(delay, 60000); // At least 1 minute for rate limiting
          this.logger.warn(
            `Gemini API rate limit exceeded, retrying in ${delay / 1000}s... (attempt ${retryCount + 1}/${maxRetries + 1})`,
          );
        } else {
          this.logger.warn(
            `Gemini API overloaded, retrying in ${delay}ms... (attempt ${retryCount + 1}/${maxRetries + 1})`,
          );
        }

        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.analyzeWithGemini(content, retryCount + 1, customRules);
      }

      // If we've exhausted retries or it's a non-retryable error, handle gracefully
      if (error.message?.includes('429') || error.message?.includes('quota')) {
        this.logger.error('Gemini API quota exceeded. Using manual parsing fallback.');
        // For quota errors, use manual fallback instead of throwing
        return await this.manualParsingFallback(content, 'unknown');
      }

      this.logger.error('Error with Gemini AI analysis:', error);
      throw error;
    }
  }

  private fallbackParsing(text: string): any {
    // Basic fallback parsing in case JSON parsing fails
    return {
      vendor: {
        name: 'Unknown Vendor',
        website: '',
        description: 'Could not parse vendor information',
        confidence: 10,
      },
      kjs: [],
      shows: [],
      rawAiResponse: text,
    };
  }

  /**
   * Provides a basic manual parsing fallback when AI is unavailable
   */
  private async manualParsingFallback(content: string, url: string): Promise<any> {
    this.logger.warn('Using manual parsing fallback due to AI service unavailability');

    // Extract basic information using simple text parsing
    const lines = content.toLowerCase().split('\n');
    const words = content.toLowerCase().split(/\s+/);

    // Try to find business name from title or content
    const businessKeywords = ['karaoke', 'dj', 'entertainment', 'music', 'sound'];
    let businessName = 'Unknown Business';

    // Simple heuristics for business name
    const titleMatch = content.match(/<title[^>]*>([^<]+)</i);
    if (titleMatch && titleMatch[1]) {
      businessName = titleMatch[1].trim();
    }

    return {
      vendor: {
        name: businessName,
        website: url,
        description: 'Parsed using fallback method - AI service unavailable',
        confidence: 30,
      },
      kjs: [],
      shows: [],
      fallbackUsed: true,
      message: 'AI parsing service temporarily unavailable due to quota limits',
    };
  }

  async approveAndSaveParsedData(parsedScheduleId: string, approvedData: any): Promise<void> {
    const parsedSchedule = await this.parsedScheduleRepository.findOne({
      where: { id: parsedScheduleId },
    });

    if (!parsedSchedule) {
      throw new Error('Parsed schedule not found');
    }

    // Create or find vendor
    let vendor = await this.vendorRepository.findOne({
      where: { name: approvedData.vendor.name },
    });

    if (!vendor) {
      vendor = new Vendor();
      vendor.name = approvedData.vendor.name;
      vendor.website = approvedData.vendor.website;
      vendor.owner = 'Auto-parsed'; // You might want to make this configurable
      vendor.description = approvedData.vendor.description;
      vendor.isActive = true;
      vendor = await this.vendorRepository.save(vendor);
    }

    // Create KJs
    for (const kjData of approvedData.kjs) {
      const existingKj = await this.kjRepository.findOne({
        where: { name: kjData.name, vendorId: vendor.id },
      });

      if (!existingKj) {
        const kj = new KJ();
        kj.name = kjData.name;
        kj.vendorId = vendor.id;
        kj.isActive = true;
        await this.kjRepository.save(kj);
      }
    }

    // Create Shows
    for (const showData of approvedData.shows) {
      // Find the KJ if specified
      let kj: KJ | null = null;
      if (showData.kjName) {
        kj = await this.kjRepository.findOne({
          where: { name: showData.kjName, vendorId: vendor.id },
        });
      }

      const show = new Show();
      show.venue = showData.venue;
      show.address = showData.address || showData.venue || null; // Use address or venue as fallback
      show.day = this.parseDayOfWeek(showData.day);
      show.startTime = showData.startTime;
      show.endTime = showData.endTime;
      show.vendorId = vendor.id;
      show.kjId = kj?.id || null;
      show.isActive = true;
      show.notes = showData.description;

      await this.showRepository.save(show);
    }

    // Update parsed schedule status
    parsedSchedule.status = ParseStatus.APPROVED;
    await this.parsedScheduleRepository.save(parsedSchedule);

    this.logger.log(`Approved and saved parsed data for schedule ${parsedScheduleId}`);
  }

  private parseDate(dateString: string): Date | null {
    if (!dateString || dateString === 'recurring' || dateString === 'weekly') {
      return null;
    }

    try {
      return new Date(dateString);
    } catch {
      return null;
    }
  }

  private parseDayOfWeek(dayString: string): any {
    if (!dayString) return null;

    const dayMap: Record<string, any> = {
      monday: 'monday',
      tuesday: 'tuesday',
      wednesday: 'wednesday',
      thursday: 'thursday',
      friday: 'friday',
      saturday: 'saturday',
      sunday: 'sunday',
      mon: 'monday',
      tue: 'tuesday',
      wed: 'wednesday',
      thu: 'thursday',
      fri: 'friday',
      sat: 'saturday',
      sun: 'sunday',
    };

    return dayMap[dayString.toLowerCase()] || null;
  }

  async getPendingReviews(): Promise<ParsedSchedule[]> {
    return this.parsedScheduleRepository.find({
      where: { status: ParseStatus.PENDING_REVIEW },
      order: { createdAt: 'DESC' },
    });
  }

  async rejectParsedData(parsedScheduleId: string, reason?: string): Promise<void> {
    const parsedSchedule = await this.parsedScheduleRepository.findOne({
      where: { id: parsedScheduleId },
    });

    if (!parsedSchedule) {
      throw new Error('Parsed schedule not found');
    }

    parsedSchedule.status = ParseStatus.REJECTED;
    parsedSchedule.rejectionReason = reason;
    await this.parsedScheduleRepository.save(parsedSchedule);

    this.logger.log(`Rejected parsed data for schedule ${parsedScheduleId}: ${reason}`);
  }

  async updateReviewComments(parsedScheduleId: string, comments: string): Promise<void> {
    const parsedSchedule = await this.parsedScheduleRepository.findOne({
      where: { id: parsedScheduleId },
    });

    if (!parsedSchedule) {
      throw new Error('Parsed schedule not found');
    }

    parsedSchedule.reviewComments = comments;
    await this.parsedScheduleRepository.save(parsedSchedule);

    this.logger.log(`Updated review comments for schedule ${parsedScheduleId}`);
  }

  async parseAndSaveWebsite(
    url: string,
    autoApprove: boolean = false,
  ): Promise<{
    parsedData: ParsedKaraokeData;
    savedEntities: {
      vendor: Vendor;
      kjs: KJ[];
      shows: Show[];
    };
  }> {
    this.logger.log(`Starting parse and save workflow for: ${url}`);

    try {
      // Step 1: Parse the website
      const parsedData = await this.parseWebsite(url);

      this.logger.log(`Parsed website successfully. Found:
        - Vendor: ${parsedData.vendor.name} (confidence: ${parsedData.vendor.confidence}%)
        - KJs: ${parsedData.kjs.length} found
        - Shows: ${parsedData.shows.length} found`);

      // Step 2: Create or find vendor
      let vendor = await this.vendorRepository.findOne({
        where: { name: parsedData.vendor.name },
      });

      if (!vendor) {
        vendor = new Vendor();
        vendor.name = parsedData.vendor.name;
        vendor.website = parsedData.vendor.website || url;
        vendor.owner = 'Auto-parsed'; // You might want to make this configurable
        vendor.description = parsedData.vendor.description || `Automatically parsed from ${url}`;
        vendor.isActive = true;
        vendor = await this.vendorRepository.save(vendor);
        this.logger.log(`Created new vendor: ${vendor.name} (ID: ${vendor.id})`);
      } else {
        // Update existing vendor with new information if it's better
        if (parsedData.vendor.website && !vendor.website) {
          vendor.website = parsedData.vendor.website;
        }
        if (parsedData.vendor.description && !vendor.description) {
          vendor.description = parsedData.vendor.description;
        }
        vendor = await this.vendorRepository.save(vendor);
        this.logger.log(`Updated existing vendor: ${vendor.name} (ID: ${vendor.id})`);
      }

      // Step 3: Create KJs
      const savedKjs: KJ[] = [];
      for (const kjData of parsedData.kjs) {
        const existingKj = await this.kjRepository.findOne({
          where: { name: kjData.name, vendorId: vendor.id },
        });

        if (!existingKj) {
          const kj = new KJ();
          kj.name = kjData.name;
          kj.vendorId = vendor.id;
          kj.isActive = true;
          const savedKj = await this.kjRepository.save(kj);
          savedKjs.push(savedKj);
          this.logger.log(`Created new KJ: ${kj.name} for vendor ${vendor.name}`);
        } else {
          savedKjs.push(existingKj);
          this.logger.log(`Using existing KJ: ${existingKj.name} for vendor ${vendor.name}`);
        }
      }

      // Step 4: Create Shows
      const savedShows: Show[] = [];
      for (const showData of parsedData.shows) {
        // Find the KJ if specified
        let kj: KJ | null = null;
        if (showData.kjName) {
          kj =
            savedKjs.find((k) => k.name === showData.kjName) ||
            (await this.kjRepository.findOne({
              where: { name: showData.kjName, vendorId: vendor.id },
            }));
        }

        // Check if show already exists to avoid duplicates
        const existingShow = await this.showRepository.findOne({
          where: {
            venue: showData.venue,
            day: this.parseDayOfWeek(showData.day),
            startTime: showData.startTime,
            vendorId: vendor.id,
          },
        });

        if (!existingShow) {
          const show = new Show();
          show.venue = showData.venue;
          show.address = showData.address || showData.venue || null; // Use address or venue as fallback
          show.day = this.parseDayOfWeek(showData.day);
          show.startTime = showData.startTime;
          show.endTime = showData.endTime;
          show.vendorId = vendor.id;
          show.kjId = kj?.id || null;
          show.isActive = true;
          show.notes = showData.description;

          const savedShow = await this.showRepository.save(show);
          savedShows.push(savedShow);
          this.logger.log(
            `Created new show at ${show.venue} on ${show.day || 'recurring'} at ${show.startTime}${show.endTime ? '-' + show.endTime : ''}`,
          );
        } else {
          savedShows.push(existingShow);
          this.logger.log(`Show already exists at ${showData.venue}, skipping duplicate`);
        }
      }

      // Step 5: Update parsed schedule status if auto-approving
      if (autoApprove) {
        const parsedSchedule = await this.parsedScheduleRepository.findOne({
          where: { url: url },
          order: { createdAt: 'DESC' },
        });

        if (parsedSchedule) {
          parsedSchedule.status = ParseStatus.APPROVED;
          await this.parsedScheduleRepository.save(parsedSchedule);
        }
      }

      const result = {
        parsedData,
        savedEntities: {
          vendor,
          kjs: savedKjs,
          shows: savedShows,
        },
      };

      this.logger.log(`Successfully completed parse and save workflow for ${url}:
        - Vendor: ${vendor.name}
        - KJs: ${savedKjs.length} saved
        - Shows: ${savedShows.length} saved`);

      return result;
    } catch (error) {
      this.logger.error(`Error in parse and save workflow for ${url}:`, error);
      throw error;
    }
  }

  async parseStevesdj(): Promise<{
    parsedData: ParsedKaraokeData;
    savedEntities: {
      vendor: Vendor;
      kjs: KJ[];
      shows: Show[];
    };
  }> {
    const url = 'https://stevesdj.com';
    this.logger.log(`Starting specialized parsing for Steve's DJ website: ${url}`);

    try {
      // Parse using multi-page crawling approach specific to Steve's DJ
      const parsedData = await this.parseStevesdjWebsite(url);

      this.logger.log(`Parsed website successfully. Found:
        - Vendor: ${parsedData.vendor.name} (confidence: ${parsedData.vendor.confidence}%)
        - KJs: ${parsedData.kjs.length} found
        - Shows: ${parsedData.shows.length} found`);

      // Step 2: Create or find vendor
      let vendor = await this.vendorRepository.findOne({
        where: { name: parsedData.vendor.name },
      });

      if (!vendor) {
        vendor = new Vendor();
        vendor.name = parsedData.vendor.name;
        vendor.website = parsedData.vendor.website || url;
        vendor.owner = 'Auto-parsed';
        vendor.description = parsedData.vendor.description || `Automatically parsed from ${url}`;
        vendor.isActive = true;
        vendor = await this.vendorRepository.save(vendor);
        this.logger.log(`Created new vendor: ${vendor.name} (ID: ${vendor.id})`);
      } else {
        // Update existing vendor with new information if it's better
        if (parsedData.vendor.website && !vendor.website) {
          vendor.website = parsedData.vendor.website;
        }
        if (parsedData.vendor.description && !vendor.description) {
          vendor.description = parsedData.vendor.description;
        }
        vendor = await this.vendorRepository.save(vendor);
        this.logger.log(`Updated existing vendor: ${vendor.name} (ID: ${vendor.id})`);
      }

      // Step 3: Create KJs
      const savedKjs: KJ[] = [];
      for (const kjData of parsedData.kjs) {
        const existingKj = await this.kjRepository.findOne({
          where: { name: kjData.name, vendorId: vendor.id },
        });

        if (!existingKj) {
          const kj = new KJ();
          kj.name = kjData.name;
          kj.vendorId = vendor.id;
          kj.isActive = true;
          const savedKj = await this.kjRepository.save(kj);
          savedKjs.push(savedKj);
          this.logger.log(`Created new KJ: ${kj.name} for vendor ${vendor.name}`);
        } else {
          savedKjs.push(existingKj);
          this.logger.log(`Using existing KJ: ${existingKj.name} for vendor ${vendor.name}`);
        }
      }

      // Step 4: Create Shows
      const savedShows: Show[] = [];
      for (const showData of parsedData.shows) {
        // Find the KJ if specified
        let kj: KJ | null = null;
        if (showData.kjName) {
          kj = savedKjs.find(k => k.name.toLowerCase().includes(showData.kjName.toLowerCase())) || null;
        }

        // Check if show already exists
        const existingShow = await this.showRepository.findOne({
          where: {
            venue: showData.venue,
            day: this.parseDayOfWeek(showData.day),
            startTime: showData.startTime,
            vendorId: vendor.id,
          },
        });

        if (!existingShow) {
          const show = new Show();
          show.venue = showData.venue;
          show.day = this.parseDayOfWeek(showData.day);
          show.startTime = showData.startTime;
          show.endTime = showData.endTime;
          show.address = showData.address;
          show.description = showData.description;
          show.vendorId = vendor.id;
          show.kjId = kj?.id;
          show.isActive = true;
          
          const savedShow = await this.showRepository.save(show);
          savedShows.push(savedShow);
          this.logger.log(`Created new show: ${show.venue} on ${show.day} at ${show.startTime}`);
        } else {
          // Update existing show if needed
          if (showData.endTime && !existingShow.endTime) {
            existingShow.endTime = showData.endTime;
          }
          if (showData.address && !existingShow.address) {
            existingShow.address = showData.address;
          }
          if (kj && !existingShow.kjId) {
            existingShow.kjId = kj.id;
          }
          const updatedShow = await this.showRepository.save(existingShow);
          savedShows.push(updatedShow);
          this.logger.log(`Updated existing show: ${existingShow.venue} on ${existingShow.day}`);
        }
      }

      this.logger.log(`Successfully completed parse and save workflow for ${url}:
        - Vendor: ${vendor.name}
        - KJs: ${savedKjs.length} saved
        - Shows: ${savedShows.length} saved`);

      return {
        parsedData,
        savedEntities: {
          vendor,
          kjs: savedKjs,
          shows: savedShows,
        },
      };
    } catch (error) {
      this.logger.error(`Error in parseStevesdj:`, error);
      throw error;
    }
  }

  private async parseStevesdjWebsite(url: string): Promise<ParsedKaraokeData> {
    // Define all pages to crawl for comprehensive data extraction
    const pagesToCrawl = [
      'https://stevesdj.com',
      'https://stevesdj.com/karaoke-schedule',
      'https://stevesdj.com/calendar',
      'https://stevesdj.com/events',
      'https://stevesdj.com/venues',
      'https://stevesdj.com/schedule',
      'https://stevesdj.com/shows',
      'https://stevesdj.com/dj-services',
      'https://stevesdj.com/karaoke',
      'https://stevesdj.com/about',
      'https://stevesdj.com/contact',
      'https://stevesdj.com/locations',
      'https://stevesdj.com/weekly-schedule'
    ];

    const allPageContents: string[] = [];
    
    this.logger.log(`Crawling ${pagesToCrawl.length} pages for comprehensive analysis...`);

    // Crawl all pages with respectful delays
    for (const pageUrl of pagesToCrawl) {
      try {
        const response = await fetch(pageUrl);
        if (response.ok) {
          const html = await response.text();
          const $ = cheerio.load(html);
          const title = $('title').text() || '';
          const bodyText = $('body').text().replace(/\s+/g, ' ').trim();
          
          // Create page-specific content
          const pageContent = `
=== PAGE: ${pageUrl} ===
TITLE: ${title}
CONTENT: ${bodyText.substring(0, 5000)}
          `.trim();
          
          allPageContents.push(pageContent);
          this.logger.log(`Successfully crawled: ${pageUrl} (${bodyText.length} chars)`);
        } else {
          this.logger.log(`Failed to fetch ${pageUrl}: ${response.status}`);
        }
        
        // Respectful delay between requests
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        this.logger.error(`Error crawling ${pageUrl}:`, error.message);
      }
    }

    // Combine all content for AI analysis
    const contentForAI = allPageContents.join('\n\n--- PAGE SEPARATOR ---\n\n');
    
    // Add debugging to check for specific keywords
    this.logger.log('[DEBUG] Content analysis:');
    this.logger.log('- Contains "SUNDAYS": ' + contentForAI.includes('SUNDAYS'));
    this.logger.log('- Contains "ALIBI": ' + contentForAI.includes('ALIBI')); 
    this.logger.log('- Contains "7:00PM": ' + contentForAI.includes('7:00PM'));
    this.logger.log('- Contains "karaoke" (case insensitive): ' + contentForAI.toLowerCase().includes('karaoke'));
    this.logger.log('- Total content length: ' + contentForAI.length);
    
    // Log content from the karaoke-schedule page specifically if it exists
    const karaokeScheduleIndex = pagesToCrawl.findIndex(page => page.includes('/karaoke-schedule'));
    if (karaokeScheduleIndex >= 0 && allPageContents[karaokeScheduleIndex]) {
      this.logger.log('[DEBUG] Karaoke-schedule page content (first 1000 chars):');
      this.logger.log(allPageContents[karaokeScheduleIndex].substring(0, 1000));
    }

    // Enhanced prompt specifically targeting Steve's DJ format
    const customRules = `
SPECIFIC FORMAT TO DETECT:
Look for text patterns like "SUNDAYS KARAOKE 7:00PM - 11:00PM with DJ Steve ALIBI BEACH LOUNGE"

This website contains karaoke show schedules. Pay special attention to:
1. Day names (SUNDAY, MONDAY, etc.) followed by "KARAOKE"
2. Time ranges like "7:00PM - 11:00PM" 
3. DJ names like "DJ Steve"
4. Venue names like "ALIBI BEACH LOUNGE"
5. Any recurring weekly schedule information

EXAMPLE PATTERNS TO MATCH:
- "SUNDAYS KARAOKE 7:00PM - 11:00PM with DJ Steve ALIBI BEACH LOUNGE"
- "MONDAY KARAOKE 8:00PM - 12:00AM with DJ [Name] [Venue]"

Extract each show as a separate entry with:
- venue: The location name (e.g., "ALIBI BEACH LOUNGE")
- day: Day of week (e.g., "Sunday") 
- startTime: Start time (e.g., "7:00 PM")
- endTime: End time (e.g., "11:00 PM")
- kjName: DJ name (e.g., "DJ Steve")
    `;

    // Use Gemini AI to parse the comprehensive content
    const aiResult = await this.analyzeWithGemini(contentForAI, 0, customRules);

    // Save raw parsed data for debugging
    const parsedSchedule = new ParsedSchedule();
    parsedSchedule.url = url;
    parsedSchedule.rawData = {
      title: 'Steve\'s DJ Multi-Page Crawl',
      content: contentForAI.substring(0, 5000), // Limit content size for storage
      links: [],
      parsedAt: new Date(),
    };
    parsedSchedule.aiAnalysis = aiResult;
    parsedSchedule.status = ParseStatus.PENDING_REVIEW;

    await this.parsedScheduleRepository.save(parsedSchedule);

    const result: ParsedKaraokeData = {
      vendor: aiResult.vendor,
      kjs: aiResult.kjs,
      shows: aiResult.shows,
      rawData: {
        url,
        title: 'Steve\'s DJ Multi-Page Analysis',
        content: contentForAI.substring(0, 1000),
        parsedAt: new Date(),
      },
    };

    this.logger.log(
      `Multi-page parsing completed. Found ${result.kjs.length} KJs and ${result.shows.length} shows from ${allPageContents.length} pages`,
    );
    
    return result;
  }
}
