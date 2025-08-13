import { GoogleGenerativeAI } from '@google/generative-ai';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as cheerio from 'cheerio';
import fetch from 'node-fetch';
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
    // Initialize Gemini AI
    this.genAI = new GoogleGenerativeAI('AIzaSyCMOfS4hJpako_FbMLmM7XXqh5PLWtDetg');
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
Analyze the following webpage content for karaoke-related information. I need you to extract:

1. VENDOR INFORMATION:
   - Business/company name that runs karaoke shows
   - Website URL
   - Brief description of the business
   - Confidence level (0-100)

2. KJ (Karaoke Jockey) INFORMATION:
   - Names of KJs/DJs mentioned
   - Any context about each KJ
   - Confidence level for each (0-100)

3. SHOW INFORMATION:
   - Venue names where shows happen
   - Dates and times of shows
   - Which KJ is hosting (if mentioned)
   - Any special details about shows
   - Confidence level for each (0-100)

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
      "name": "KJ Name",
      "confidence": 90,
      "context": "additional info about this KJ"
    }
  ],
  "shows": [
    {
      "venue": "Venue Name",
      "date": "YYYY-MM-DD format or 'recurring' or 'weekly'",
      "time": "HH:MM format or time description",
      "kjName": "KJ Name if specified",
      "description": "additional show details",
      "confidence": 80
    }
  ]
}

Only include information you're reasonably confident about. If no karaoke information is found, return empty arrays for kjs and shows, but still try to identify the vendor.

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
      vendor: Vendor;
      kjs: KJ[];
      shows: Show[];
    };
  }> {
    const url = 'https://stevesdj.com';
    this.logger.log(`Starting specialized parsing for Steve's DJ website: ${url}`);

    // Use the general parse and save method with auto-approval for trusted source
    return this.parseAndSaveWebsite(url, true);
  }
}
