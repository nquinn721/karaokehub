import { GoogleGenerativeAI } from '@google/generative-ai';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as cheerio from 'cheerio';
import fetch from 'node-fetch';
import { JSDOM } from 'jsdom';
import { promises as fs } from 'fs';
import { join } from 'path';
import { Repository } from 'typeorm';
import { KJ } from '../../kj/kj.entity';
import { Show } from '../../show/show.entity';
import { Vendor } from '../../vendor/vendor.entity';
import { ParsedSchedule, ParseStatus } from './parsed-schedule.entity';

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
    date: string;
    time: string;
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

  async parseWebsite(url: string): Promise<ParsedKaraokeData> {
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
      const aiResult = await this.analyzeWithGemini(contentForAI);

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

  private async analyzeWithGemini(content: string): Promise<any> {
    try {
      const model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });

      const prompt = `
You are an expert at parsing karaoke and DJ service websites to extract structured schedule information. Focus on finding:

1. VENDOR INFORMATION:
   - Business/company name that runs karaoke shows
   - Website URL
   - Brief description of the business
   - Confidence level (0-100)

2. KJ (Karaoke Jockey) INFORMATION:
   - Names of KJs/DJs mentioned (they may be called "DJs", "KJs", "Hosts", "Staff", or "Team")
   - Look for staff pages, team pages, or about sections
   - Any context about each KJ/DJ
   - Confidence level for each (0-100)

3. SHOW INFORMATION (MOST IMPORTANT - Look for weekly schedules):
   - Extract SPECIFIC venue names where shows happen (bars, restaurants, clubs, halls)
   - Extract SPECIFIC days of the week (Monday, Tuesday, etc.) - not abbreviations
   - Extract SPECIFIC times (start and end times if available)
   - Look for recurring weekly schedules, not just one-time events
   - Match KJs/DJs to specific shows if mentioned
   - Look for addresses or location details
   - Pay special attention to schedule tables, lists, or structured data
   - If you see "Multiple locations" or similar, try to extract individual venue names
   - SPECIFICALLY look for formats like "SUNDAYS KARAOKE 7:00PM - 11:00PM with DJ Steve ALIBI BEACH LOUNGE"
   - Parse formats that start with day of week (SUNDAYS, MONDAYS, etc.) followed by time ranges and venue names
   - Extract venue names that appear after time ranges or DJ/KJ names
   - Look for patterns like "DAY + KARAOKE + TIME + with + DJ/KJ + VENUE"
   - Confidence level for each (0-100)

IMPORTANT PARSING GUIDELINES:
- Prioritize recurring weekly karaoke schedules over one-time events
- Look for venue names like "Joe's Bar", "Main Street Grill", "VFW Post 123", "ALIBI BEACH LOUNGE", etc.
- Times are often in evening hours (6PM-11PM range)
- If times are ranges like "7PM-11PM", use "19:00" for time field
- Days should be full day names (Monday, Tuesday, etc.) but may appear as "SUNDAYS", "MONDAYS" etc.
- If no specific date, use "recurring" for weekly shows
- Focus on actual venue names, not generic descriptions
- EXAMPLE FORMAT to look for: "SUNDAYS KARAOKE 7:00PM - 11:00PM with DJ Steve ALIBI BEACH LOUNGE"
  This should extract: venue="ALIBI BEACH LOUNGE", day="Sunday", time="19:00", kjName="DJ Steve"

Please return the response as a valid JSON object with this exact structure:
{
  "vendor": {
    "name": "business name",
    "website": "website url",
    "description": "brief description",
    "confidence": 85
  },
  "kjs": [
    {
      "name": "KJ/DJ Name",
      "confidence": 90,
      "context": "additional info about this person"
    }
  ],
  "shows": [
    {
      "venue": "Specific Venue Name",
      "date": "recurring" (for weekly shows) or "YYYY-MM-DD",
      "time": "19:00" (start time in HH:MM format),
      "kjName": "KJ Name if specified",
      "description": "day of week and additional details (e.g., 'Every Monday')",
      "confidence": 80
    }
  ]
}

Only include information you're reasonably confident about. For shows, prioritize finding actual venue names and specific days/times over generic information. Focus especially on weekly recurring karaoke schedules.

WEBPAGE CONTENT TO ANALYZE:
${content}
      `;

      // DEBUG: Log what content we're sending to AI
      console.log('=== CONTENT SENT TO AI ===');
      console.log('Content length:', content.length);
      console.log('Content preview (first 1000 chars):', content.substring(0, 1000));
      console.log('Contains "SUNDAYS":', content.includes('SUNDAYS'));
      console.log('Contains "KARAOKE":', content.includes('KARAOKE'));
      console.log('Contains "ALIBI":', content.includes('ALIBI'));
      console.log('Contains "7:00PM":', content.includes('7:00PM'));
      console.log('=======================');

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // DEBUG: Log the raw AI response
      console.log('=== RAW AI RESPONSE FROM GEMINI ===');
      console.log('Length:', text.length);
      console.log('First 500 characters:', text.substring(0, 500));
      console.log('Contains "SUNDAYS":', text.includes('SUNDAYS'));
      console.log('Contains "KARAOKE":', text.includes('KARAOKE'));
      console.log('Contains "ALIBI":', text.includes('ALIBI'));
      console.log('Contains "7:00PM":', text.includes('7:00PM'));
      console.log('===============================');

      // Try to parse JSON response
      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsedResponse = JSON.parse(jsonMatch[0]);
          
          // DEBUG: Log the parsed response structure
          console.log('=== PARSED AI RESPONSE ===');
          console.log('Vendor:', parsedResponse.vendor?.name);
          console.log('KJs count:', parsedResponse.kjs?.length);
          console.log('Shows count:', parsedResponse.shows?.length);
          console.log('Shows data:');
          parsedResponse.shows?.forEach((show, index) => {
            console.log(`  Show ${index + 1}:`, {
              venue: show.venue,
              day: show.day,
              time: show.time,
              kjName: show.kjName
            });
          });
          console.log('========================');
          
          return parsedResponse;
        }
      } catch (parseError) {
        console.log('=== JSON PARSING FAILED ===');
        console.log('Error:', parseError.message);
        console.log('Raw text to parse:', text);
        console.log('========================');
        this.logger.warn('Failed to parse AI response as JSON, using fallback parsing');
      }

      // Fallback parsing if JSON parsing fails
      return this.fallbackParsing(text);
    } catch (error) {
      this.logger.error('Error with Gemini AI analysis:', error);
      throw error;
    }
  }

  private extractCleanText(html: string): string {
    try {
      // Parse HTML and extract readable text using JSDOM
      const dom = new JSDOM(html);
      const document = dom.window.document;
      
      // Remove script, style, and other non-content elements
      const elementsToRemove = document.querySelectorAll('script, style, head, nav, footer, .nav, .menu, .header');
      elementsToRemove.forEach(el => el.remove());
      
      // Get the text content
      let textContent = document.body.textContent || document.body.innerText || '';
      
      // Clean up the text - normalize whitespace but preserve line breaks where meaningful
      textContent = textContent
        .replace(/\s*\n\s*/g, ' ') // Replace newlines with spaces
        .replace(/\s{2,}/g, ' ')   // Replace multiple spaces with single space
        .replace(/\s*([.!?])\s*/g, '$1\n') // Add line breaks after sentences
        .replace(/([A-Z]{2,})\s+([A-Z]{2,})/g, '$1\n$2') // Break up consecutive all-caps words
        .replace(/(\d+:\d+[AP]M)\s*-\s*(\d+:\d+[AP]M)/g, '$1-$2') // Keep time ranges together
        .replace(/([A-Z]+DAY[S]?)\s+(KARAOKE)/g, '$1 $2') // Keep day+karaoke together
        .replace(/(with\s+DJ\s+\w+)\s+([A-Z][A-Z\s]+)/g, '$1\n$2') // Break line after DJ name
        .trim();
      
      return textContent;
    } catch (error) {
      this.logger.warn('Failed to parse HTML with JSDOM, falling back to text extraction');
      // Fallback to simple text extraction
      return html
        .replace(/<script[^>]*>.*?<\/script>/gsi, '')
        .replace(/<style[^>]*>.*?<\/style>/gsi, '')
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
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
      show.date = this.parseDate(showData.date);
      show.time = showData.time;
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

  // Enhanced approval methods for granular control
  async approveSelectedItems(
    parsedScheduleId: string,
    selectedItems: {
      vendor?: boolean;
      kjIds?: string[];
      showIds?: string[];
    }
  ): Promise<{
    vendor?: Vendor;
    kjs: KJ[];
    shows: Show[];
  }> {
    const parsedSchedule = await this.parsedScheduleRepository.findOne({
      where: { id: parsedScheduleId },
    });

    if (!parsedSchedule) {
      throw new Error('Parsed schedule not found');
    }

    const aiAnalysis = parsedSchedule.aiAnalysis;
    const result = {
      vendor: undefined as Vendor | undefined,
      kjs: [] as KJ[],
      shows: [] as Show[],
    };

    // Create or find vendor if selected
    if (selectedItems.vendor && aiAnalysis.vendor) {
      let vendor = await this.vendorRepository.findOne({
        where: { name: aiAnalysis.vendor.name },
      });

      if (!vendor) {
        vendor = new Vendor();
        vendor.name = aiAnalysis.vendor.name;
        vendor.website = aiAnalysis.vendor.website || parsedSchedule.url;
        vendor.owner = 'Auto-parsed';
        vendor.description = aiAnalysis.vendor.description || `Parsed from ${parsedSchedule.url}`;
        vendor.isActive = true;
        vendor = await this.vendorRepository.save(vendor);
        this.logger.log(`Created vendor: ${vendor.name}`);
      }
      result.vendor = vendor;
    }

    // Get existing vendor if not selected but needed for KJs/shows
    let vendor = result.vendor;
    if (!vendor && (selectedItems.kjIds?.length || selectedItems.showIds?.length)) {
      vendor = await this.vendorRepository.findOne({
        where: { name: aiAnalysis.vendor.name },
      });
      if (!vendor) {
        throw new Error('Vendor must be approved first to create KJs and shows');
      }
    }

    // Create selected KJs
    if (selectedItems.kjIds?.length && vendor) {
      for (const kjId of selectedItems.kjIds) {
        const kjData = aiAnalysis.kjs.find((kj, index) => index.toString() === kjId);
        if (kjData) {
          const existingKj = await this.kjRepository.findOne({
            where: { name: kjData.name, vendorId: vendor.id },
          });

          if (!existingKj) {
            const kj = new KJ();
            kj.name = kjData.name;
            kj.vendorId = vendor.id;
            kj.isActive = true;
            const savedKj = await this.kjRepository.save(kj);
            result.kjs.push(savedKj);
            this.logger.log(`Created KJ: ${kj.name}`);
          } else {
            result.kjs.push(existingKj);
          }
        }
      }
    }

    // Create selected shows
    if (selectedItems.showIds?.length && vendor) {
      for (const showId of selectedItems.showIds) {
        const showData = aiAnalysis.shows.find((show, index) => index.toString() === showId);
        if (showData) {
          // Find the KJ if specified
          let kj: KJ | null = null;
          if (showData.kjName) {
            kj = await this.kjRepository.findOne({
              where: { name: showData.kjName, vendorId: vendor.id },
            });
          }

          const show = new Show();
          show.venue = showData.venue;
          show.date = this.parseDate(showData.date);
          show.time = showData.time;
          show.vendorId = vendor.id;
          show.kjId = kj?.id || null;
          show.isActive = true;
          show.notes = showData.description;

          // Handle image URL if present
          if (showData.imageUrl) {
            show.imageUrl = showData.imageUrl;
          }

          const savedShow = await this.showRepository.save(show);
          result.shows.push(savedShow);
          this.logger.log(`Created show: ${show.venue} on ${show.date}`);
        }
      }
    }

    // Check if all items have been processed
    const totalSelectedItems = 
      (selectedItems.vendor ? 1 : 0) +
      (selectedItems.kjIds?.length || 0) +
      (selectedItems.showIds?.length || 0);

    const totalAvailableItems = 
      1 + // vendor
      aiAnalysis.kjs.length +
      aiAnalysis.shows.length;

    // If all items were selected, remove the parsed schedule record
    if (totalSelectedItems === totalAvailableItems) {
      await this.parsedScheduleRepository.remove(parsedSchedule);
      this.logger.log(`Removed parsed schedule ${parsedScheduleId} - all items processed`);
    } else {
      // Update status to partially processed
      parsedSchedule.status = ParseStatus.APPROVED;
      await this.parsedScheduleRepository.save(parsedSchedule);
    }

    return result;
  }

  async approveAllItems(parsedScheduleId: string): Promise<{
    vendor?: Vendor;
    kjs: KJ[];
    shows: Show[];
  }> {
    const parsedSchedule = await this.parsedScheduleRepository.findOne({
      where: { id: parsedScheduleId },
    });

    if (!parsedSchedule) {
      throw new Error('Parsed schedule not found');
    }

    const aiAnalysis = parsedSchedule.aiAnalysis;
    
    // Approve everything
    const selectedItems = {
      vendor: true,
      kjIds: aiAnalysis.kjs.map((_, index) => index.toString()),
      showIds: aiAnalysis.shows.map((_, index) => index.toString()),
    };

    const result = await this.approveSelectedItems(parsedScheduleId, selectedItems);

    this.logger.log(`Approved all items for parsed schedule ${parsedScheduleId}`);
    return result;
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
            date: this.parseDate(showData.date),
            time: showData.time,
            vendorId: vendor.id,
          },
        });

        if (!existingShow) {
          const show = new Show();
          show.venue = showData.venue;
          show.date = this.parseDate(showData.date);
          show.time = showData.time;
          show.vendorId = vendor.id;
          show.kjId = kj?.id || null;
          show.isActive = true;
          show.notes = showData.description;

          const savedShow = await this.showRepository.save(show);
          savedShows.push(savedShow);
          this.logger.log(
            `Created new show at ${show.venue} on ${show.date || 'recurring'} at ${show.time}`,
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
      vendor: Vendor | null;
      kjs: KJ[];
      shows: Show[];
    };
  }> {
    const baseUrl = 'https://stevesdj.com';
    this.logger.log(`Starting enhanced parsing for Steve's DJ website: ${baseUrl}`);

    try {
      // Define key pages to crawl for show information
      const pagesToCrawl = [
        baseUrl, // Homepage
        `${baseUrl}/karaoke-schedule`, // Main karaoke schedule page
        `${baseUrl}/music-bingo-trivia`, // Music bingo schedule page
        `${baseUrl}/schedule`,
        `${baseUrl}/calendar`,
        `${baseUrl}/events`,
        `${baseUrl}/venues`,
        `${baseUrl}/where-we-play`,
        `${baseUrl}/weekly-schedule`,
        `${baseUrl}/locations`,
        `${baseUrl}/shows`,
        `${baseUrl}/staff`,
        `${baseUrl}/team`,
        `${baseUrl}/djs`,
        `${baseUrl}/about`,
      ];

      let combinedContent = '';
      let allLinks: any[] = [];
      let pageTitle = '';

      // Crawl multiple pages to gather comprehensive information
      for (const url of pagesToCrawl) {
        try {
          this.logger.log(`Crawling page: ${url}`);
          const response = await fetch(url);

          if (response.status === 200) {
            const html = await response.text();
            const $ = cheerio.load(html);

            if (!pageTitle) {
              pageTitle = $('title').text() || "Steve's DJ Website";
            }

            const bodyText = this.extractCleanText(html);
            const links = $('a[href]')
              .map((_, el) => ({
                text: $(el).text().trim(),
                href: $(el).attr('href'),
                page: url,
              }))
              .get();

            combinedContent += `\n\n--- Content from ${url} ---\n${bodyText}`;
            allLinks.push(...links);

            this.logger.log(`Successfully crawled ${url} - ${bodyText.length} characters`);
          } else {
            this.logger.log(`Page ${url} not found (${response.status}), skipping`);
          }
        } catch (error) {
          this.logger.log(`Error crawling ${url}: ${error.message}, continuing with other pages`);
        }

        // Add delay between requests to be respectful
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      this.logger.log(
        `Crawling completed. Total content length: ${combinedContent.length} characters`,
      );
      this.logger.log(`Total links found: ${allLinks.length}`);

      // Prepare enhanced content for AI analysis with specific rules for Steve's DJ
      const contentForAI = this.prepareContentForAI(pageTitle, combinedContent, allLinks, baseUrl);

      // Debug: Log key information about the content being analyzed
      this.logger.log(`Content for AI analysis: ${contentForAI.length} characters`);
      this.logger.log(
        `Content includes "SUNDAYS": ${contentForAI.includes('SUNDAYS') ? 'YES' : 'NO'}`,
      );
      this.logger.log(`Content includes "ALIBI": ${contentForAI.includes('ALIBI') ? 'YES' : 'NO'}`);
      this.logger.log(
        `Content includes "7:00PM": ${contentForAI.includes('7:00PM') ? 'YES' : 'NO'}`,
      );
      this.logger.log(
        `Content includes "BEACH LOUNGE": ${contentForAI.includes('BEACH LOUNGE') ? 'YES' : 'NO'}`,
      );
      this.logger.log(
        `Content includes "karaoke" (case-insensitive): ${contentForAI.toLowerCase().includes('karaoke') ? 'YES' : 'NO'}`,
      );

      // Log content from karaoke-schedule page specifically
      const karaokeScheduleContent =
        combinedContent.split('--- Content from ')[1]?.split('---')[0] || '';
      if (karaokeScheduleContent.includes('/karaoke-schedule')) {
        const schedulePageContent =
          combinedContent
            .split('--- Content from https://stevesdj.com/karaoke-schedule ---')[1]
            ?.split('--- Content from ')[0] || '';
        this.logger.log(`[KARAOKE-SCHEDULE PAGE] Content length: ${schedulePageContent.length}`);
        this.logger.log(
          `[KARAOKE-SCHEDULE PAGE] First 1500 chars: ${schedulePageContent.substring(0, 1500)}`,
        );
        this.logger.log(
          `[KARAOKE-SCHEDULE PAGE] Contains SUNDAYS: ${schedulePageContent.includes('SUNDAYS')}`,
        );
        this.logger.log(
          `[KARAOKE-SCHEDULE PAGE] Contains ALIBI: ${schedulePageContent.includes('ALIBI')}`,
        );
      }

      this.logger.log(`Content preview (first 500 chars): ${contentForAI.substring(0, 500)}`);

      // Use the enhanced content with the existing AI analysis
      const aiResult = await this.analyzeWithGemini(contentForAI);

      // Save raw parsed data for the main URL
      const parsedSchedule = new ParsedSchedule();
      parsedSchedule.url = baseUrl;
      parsedSchedule.rawData = {
        title: pageTitle,
        content: combinedContent.substring(0, 10000), // Limit for storage
        links: allLinks.slice(0, 50), // Limit links
        parsedAt: new Date(),
      };
      parsedSchedule.aiAnalysis = aiResult;
      parsedSchedule.status = ParseStatus.PENDING_REVIEW; // Put in pending reviews instead of auto-approving

      await this.parsedScheduleRepository.save(parsedSchedule);

      const parsedData: ParsedKaraokeData = {
        vendor: aiResult.vendor,
        kjs: aiResult.kjs || [],
        shows: aiResult.shows || [],
        rawData: {
          url: baseUrl,
          title: pageTitle,
          content: combinedContent.substring(0, 1000),
          parsedAt: new Date(),
        },
      };

      this.logger.log(
        `Enhanced parsing found: ${parsedData.kjs.length} KJs and ${parsedData.shows.length} shows`,
      );

      // Return the parsed data without creating entities immediately
      // The entities will be created when the admin approves the data
      return {
        parsedData,
        savedEntities: {
          vendor: null, // No entities created yet - waiting for approval
          kjs: [],
          shows: [],
        },
      };
    } catch (error) {
      this.logger.error(`Error in enhanced Steve's DJ parsing:`, error);
      throw error;
    }
  }

  private async createEntitiesFromParsedData(parsedData: ParsedKaraokeData): Promise<{
    parsedData: ParsedKaraokeData;
    savedEntities: {
      vendor: Vendor;
      kjs: KJ[];
      shows: Show[];
    };
  }> {
    // Step 1: Create or find vendor
    let vendor = await this.vendorRepository.findOne({
      where: { name: parsedData.vendor.name },
    });

    if (!vendor) {
      vendor = new Vendor();
      vendor.name = parsedData.vendor.name;
      vendor.website = parsedData.vendor.website || parsedData.rawData.url;
      vendor.description = parsedData.vendor.description;
      vendor.isActive = true;
      vendor = await this.vendorRepository.save(vendor);
      this.logger.log(`Created new vendor: ${vendor.name}`);
    } else {
      this.logger.log(`Using existing vendor: ${vendor.name}`);
    }

    // Step 2: Create KJs
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
        this.logger.log(`Created new KJ: ${kj.name}`);
      } else {
        savedKjs.push(existingKj);
        this.logger.log(`Using existing KJ: ${existingKj.name}`);
      }
    }

    // Step 3: Create Shows (using the existing show interface format)
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

      // Parse the existing interface fields
      const parsedDate = this.parseDate(showData.date);

      // Check if show already exists to avoid duplicates
      const existingShow = await this.showRepository.findOne({
        where: {
          venue: showData.venue,
          date: parsedDate,
          time: showData.time,
          vendorId: vendor.id,
        },
      });

      if (!existingShow) {
        const show = new Show();
        show.venue = showData.venue;
        show.date = parsedDate;
        show.time = showData.time;
        show.vendorId = vendor.id;
        show.kjId = kj?.id || null;
        show.isActive = true;
        show.notes = showData.description;

        const savedShow = await this.showRepository.save(show);
        savedShows.push(savedShow);
        this.logger.log(
          `Created new show at ${show.venue} on ${show.date || 'recurring'} at ${show.time}`,
        );
      } else {
        savedShows.push(existingShow);
        this.logger.log(`Show already exists at ${showData.venue}, skipping duplicate`);
      }
    }

    return {
      parsedData,
      savedEntities: {
        vendor,
        kjs: savedKjs,
        shows: savedShows,
      },
    };
  }
}
