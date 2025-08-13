import { GoogleGenerativeAI } from '@google/generative-ai';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { load } from 'cheerio';
import fetch from 'node-fetch';
import OpenAI from 'openai';
import { Repository } from 'typeorm';
import { KJ } from '../kj/kj.entity';
import { Show } from '../show/show.entity';
import { Vendor } from '../vendor/vendor.entity';
import { ParsedSchedule, ParseStatus } from './parsed-schedule.entity';
const NodeCache = require('node-cache');

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
  private readonly genAI: GoogleGenerativeAI | null;
  private readonly openai: OpenAI | null;
  private readonly cache: any; // NodeCache instance
  private geminiQuotaExhausted = false;
  private dailyGeminiCalls = 0;
  private readonly MAX_DAILY_GEMINI_CALLS = 100; // Adjust based on your quota

  constructor(
    @InjectRepository(Vendor)
    private vendorRepository: Repository<Vendor>,
    @InjectRepository(KJ)
    private kjRepository: Repository<KJ>,
    @InjectRepository(Show)
    private showRepository: Repository<Show>,
    @InjectRepository(ParsedSchedule)
    private parsedScheduleRepository: Repository<ParsedSchedule>,
    private configService: ConfigService,
  ) {
    // Initialize cache (TTL: 24 hours)
    this.cache = new (NodeCache as any)({ stdTTL: 86400, checkperiod: 3600 });

    // Initialize Gemini AI (primary)
    const geminiApiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (geminiApiKey) {
      this.genAI = new GoogleGenerativeAI(geminiApiKey);
      this.logger.log('Gemini AI initialized successfully');
    } else {
      this.logger.warn('GEMINI_API_KEY not found - Gemini AI disabled');
      this.genAI = null;
      this.geminiQuotaExhausted = true;
    }

    // Initialize OpenAI (fallback)
    const openaiApiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (openaiApiKey) {
      this.openai = new OpenAI({ apiKey: openaiApiKey });
      this.logger.log('OpenAI initialized successfully as fallback');
    } else {
      this.logger.warn('OPENAI_API_KEY not found - OpenAI fallback disabled');
      this.openai = null;
    }

    // Using Gemini and OpenAI cloud providers only
    this.logger.log('AI providers initialized - using Gemini and OpenAI cloud providers');

    if (!this.genAI && !this.openai) {
      this.logger.error('No AI providers available - Both Gemini and OpenAI are disabled');
      throw new Error('At least one AI provider (GEMINI_API_KEY or OPENAI_API_KEY) is required');
    }

    // Reset daily call counter at midnight
    const now = new Date();
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const msUntilMidnight = tomorrow.getTime() - now.getTime();
    setTimeout(() => {
      this.dailyGeminiCalls = 0;
      this.geminiQuotaExhausted = false;
      // Set up daily reset
      setInterval(
        () => {
          this.dailyGeminiCalls = 0;
          this.geminiQuotaExhausted = false;
        },
        24 * 60 * 60 * 1000,
      );
    }, msUntilMidnight);
  }

  async parseWebsite(url: string): Promise<ParsedKaraokeData> {
    this.logger.log(`Starting to parse website: ${url}`);

    try {
      // Check cache first (temporarily disabled for debugging)
      const cacheKey = `parsed_${Buffer.from(url).toString('base64')}`;
      // const cached = this.cache.get(cacheKey) as ParsedKaraokeData;
      // if (cached) {
      //   this.logger.log(`Returning cached result for ${url}`);
      //   return cached;
      // }
      this.logger.log(`Cache disabled for debugging - parsing fresh data for ${url}`);

      // Fetch the webpage content
      const response = await fetch(url);
      const html = await response.text();

      // Try Cheerio-based parsing first (no AI quota usage)
      const cheerioResult = this.parseWithCheerio(html, url);

      // If Cheerio parsing was successful enough, use it
      if (this.isParsingSuccessful(cheerioResult)) {
        this.logger.log(`Successfully parsed ${url} with Cheerio (no AI quota used)`);
        this.cache.set(cacheKey, cheerioResult);
        return cheerioResult;
      }

      // Fallback to AI parsing with smart provider selection
      const truncatedHtml = html.length > 100000 ? html.substring(0, 100000) + '...' : html;
      const contentForAI = this.prepareContentForAI(truncatedHtml, url);
      const aiResult = await this.analyzeWithSmartAI(contentForAI);

      // Save raw parsed data
      const parsedSchedule = new ParsedSchedule();
      parsedSchedule.url = url;
      parsedSchedule.rawData = {
        title: this.extractTitleFromHtml(html),
        content: truncatedHtml.substring(0, 5000), // Limit content size for storage
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
          title: this.extractTitleFromHtml(html),
          content: truncatedHtml.substring(0, 1000),
          parsedAt: new Date(),
        },
      };

      // Cache the result
      this.cache.set(cacheKey, result);

      this.logger.log(
        `Successfully parsed website: ${url}. Found ${result.kjs.length} KJs and ${result.shows.length} shows`,
      );
      return result;
    } catch (error) {
      this.logger.error(`Error parsing website ${url}:`, error);
      throw error;
    }
  }

  private prepareContentForAI(html: string, url: string): string {
    // Extract a basic title from HTML using regex (simple fallback)
    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    const title = titleMatch ? titleMatch[1] : 'No title found';

    return `
URL: ${url}
TITLE: ${title}

RAW HTML CONTENT:
${html.substring(0, 50000)} ${html.length > 50000 ? '...[truncated]' : ''}
    `.trim();
  }

  private extractTitleFromHtml(html: string): string {
    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    return titleMatch ? titleMatch[1].trim() : 'No title found';
  }

  private async analyzeWithGemini(content: string): Promise<any> {
    try {
      const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

      const prompt = `
You are an expert at parsing HTML content from karaoke and DJ service websites to extract structured schedule information. 

IMPORTANT: You will receive raw HTML content that may include tags, scripts, styles, and formatting. Focus on finding the actual content within the HTML and ignore structural elements.

Focus on finding:

1. VENDOR INFORMATION:
   - Business/company name that runs karaoke shows (look in <title>, <h1>, business contact info)
   - Website URL (from the provided URL)
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
   - Pay special attention to schedule tables, lists, or structured data within HTML
   - If you see "Multiple locations" or similar, try to extract individual venue names
   - Look for venue names like "Joe's Bar", "Main Street Grill", "VFW Post 123", "ALIBI BEACH LOUNGE", etc.
   - Times are often in evening hours (6PM-11PM range)
   - If times are ranges like "7PM-11PM", use "19:00" for time field
   - Days should be full day names (Monday, Tuesday, etc.) but may appear as "SUNDAYS", "MONDAYS" etc.
   - If no specific date, use "recurring" for weekly shows
   - Focus on actual venue names, not generic descriptions
   - EXAMPLE FORMAT to look for: "SUNDAYS KARAOKE 7:00PM - 11:00PM with DJ Steve ALIBI BEACH LOUNGE"
     This should extract: venue="ALIBI BEACH LOUNGE", day="Sunday", time="19:00", kjName="DJ Steve"

PARSING NOTES FOR HTML:
- Ignore <script>, <style>, <nav>, <footer> content
- Focus on <body>, <main>, <div>, <table> content
- Table rows (<tr>) often contain schedule information
- Links (<a href="">) may point to venue websites or contact pages
- Pay attention to structured data and repeated patterns

Please return the response as a valid JSON object with this exact structure:
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
              kjName: show.kjName,
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

  // Smart AI provider selection with quota management (Gemini > OpenAI)
  private async analyzeWithSmartAI(content: string): Promise<any> {
    this.logger.log('🔍 Analyzing with Smart AI - checking providers...');

    // Using cloud AI providers only
    this.logger.log('📡 Using cloud AI providers - Gemini primary, OpenAI fallback');

    // Try Gemini first if available and quota not exhausted
    if (
      this.genAI &&
      !this.geminiQuotaExhausted &&
      this.dailyGeminiCalls < this.MAX_DAILY_GEMINI_CALLS
    ) {
      try {
        this.logger.log('💎 Trying Gemini AI...');
        this.dailyGeminiCalls++;
        const result = await this.analyzeWithGemini(content);
        this.logger.log(
          `✅ Used Gemini AI (call ${this.dailyGeminiCalls}/${this.MAX_DAILY_GEMINI_CALLS})`,
        );
        return result;
      } catch (error) {
        this.logger.warn('❌ Gemini AI failed, switching to OpenAI fallback:', error.message);
        if (error.message.includes('quota') || error.message.includes('limit')) {
          this.geminiQuotaExhausted = true;
        }
      }
    } else {
      this.logger.log('⚠️ Gemini not available or quota exhausted');
    }

    // Final fallback to OpenAI
    if (this.openai) {
      try {
        this.logger.log('🤖 Trying OpenAI as final fallback...');
        const result = await this.analyzeWithOpenAI(content);
        this.logger.log('✅ Used OpenAI as final fallback');
        return result;
      } catch (error) {
        this.logger.error('❌ OpenAI also failed:', error);
        throw error;
      }
    } else {
      this.logger.log('⚠️ OpenAI not available');
    }

    throw new Error('No AI providers available or all failed');
  }

  // OpenAI fallback method
  private async analyzeWithOpenAI(content: string): Promise<any> {
    const prompt = this.buildAIPrompt(content);

    const response = await this.openai.chat.completions.create({
      model: 'gpt-3.5-turbo', // More cost-effective than GPT-4
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      max_tokens: 2000,
    });

    const text = response.choices[0]?.message?.content;
    if (!text) {
      throw new Error('Empty response from OpenAI');
    }

    // Parse JSON response (same as Gemini)
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      this.logger.warn('Failed to parse OpenAI response as JSON, using fallback parsing');
    }

    return this.fallbackParsing(text);
  }
  // Cheerio-based parsing (no AI quota usage)
  private parseWithCheerio(html: string, url: string): ParsedKaraokeData {
    const $ = load(html);

    // Extract vendor information
    const title = $('title').text() || $('h1').first().text() || 'Unknown Venue';
    const vendor = {
      name: this.cleanVendorName(title),
      website: url,
      description: $('meta[name="description"]').attr('content') || '',
      confidence: 60, // Lower confidence for non-AI parsing
    };

    // Look for common karaoke/DJ patterns
    const kjs: any[] = [];
    const shows: any[] = [];

    // Find KJ names (look for common patterns)
    const kjPatterns = [
      /DJ\s+([A-Za-z\s]+)/gi,
      /KJ\s+([A-Za-z\s]+)/gi,
      /Host[:\s]+([A-Za-z\s]+)/gi,
    ];

    const textContent = $('body').text() || $.html();
    kjPatterns.forEach((pattern) => {
      let match;
      while ((match = pattern.exec(textContent)) !== null) {
        const name = match[1].trim();
        if (name && name.length > 1 && name.length < 30) {
          kjs.push({
            name,
            confidence: 70,
            context: 'Found via pattern matching',
          });
        }
      }
    });

    // Look for schedule patterns
    const schedulePatterns = [
      /([A-Za-z]+day)s?\s+.*?(\d{1,2}(?::\d{2})?\s*(?:PM|AM))/gi,
      /([A-Za-z]+day)s?\s+.*?karaoke.*?(\d{1,2}(?::\d{2})?\s*(?:PM|AM))/gi,
    ];

    schedulePatterns.forEach((pattern) => {
      let match;
      while ((match = pattern.exec(textContent)) !== null) {
        const day = this.standardizeDayName(match[1]);
        const time = this.standardizeTime(match[2]);

        if (day && time) {
          shows.push({
            venue: vendor.name,
            date: 'recurring',
            time,
            description: `Every ${day}`,
            confidence: 65,
          });
        }
      }
    });

    return {
      vendor,
      kjs: this.deduplicateKJs(kjs),
      shows: this.deduplicateShows(shows),
      rawData: {
        url,
        title,
        content: textContent.substring(0, 1000),
        parsedAt: new Date(),
      },
    };
  }

  // Check if parsing was successful enough to skip AI
  private isParsingSuccessful(result: ParsedKaraokeData): boolean {
    const hasVendor = result.vendor && result.vendor.name !== 'Unknown Venue';
    const hasShows = result.shows && result.shows.length > 0;
    const hasKJs = result.kjs && result.kjs.length > 0;

    // Consider successful if we have vendor + (shows OR KJs)
    return hasVendor && (hasShows || hasKJs);
  }

  // Helper methods for Cheerio parsing
  private cleanVendorName(name: string): string {
    return name
      .replace(/\s+/g, ' ')
      .replace(/[|•·]/g, ' ')
      .split(' ')[0] // Take first part if multiple
      .trim()
      .substring(0, 50); // Limit length
  }

  private standardizeDayName(day: string): string {
    const dayMap = {
      monday: 'Monday',
      mon: 'Monday',
      tuesday: 'Tuesday',
      tue: 'Tuesday',
      tues: 'Tuesday',
      wednesday: 'Wednesday',
      wed: 'Wednesday',
      thursday: 'Thursday',
      thu: 'Thursday',
      thur: 'Thursday',
      friday: 'Friday',
      fri: 'Friday',
      saturday: 'Saturday',
      sat: 'Saturday',
      sunday: 'Sunday',
      sun: 'Sunday',
    };

    const normalized = day.toLowerCase().replace(/s$/, ''); // Remove plural 's'
    return dayMap[normalized] || null;
  }

  private standardizeTime(time: string): string {
    const match = time.match(/(\d{1,2})(?::(\d{2}))?\s*(PM|AM)/i);
    if (!match) return null;

    let hour = parseInt(match[1]);
    const minute = match[2] || '00';
    const ampm = match[3].toUpperCase();

    if (ampm === 'PM' && hour !== 12) hour += 12;
    if (ampm === 'AM' && hour === 12) hour = 0;

    return `${hour.toString().padStart(2, '0')}:${minute}`;
  }

  private deduplicateKJs(kjs: any[]): any[] {
    const seen = new Set();
    return kjs.filter((kj) => {
      const key = kj.name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private deduplicateShows(shows: any[]): any[] {
    const seen = new Set();
    return shows.filter((show) => {
      const key = `${show.venue}-${show.date}-${show.time}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  // Centralized AI prompt building
  private buildAIPrompt(content: string): string {
    return `
You are an expert at parsing HTML content from karaoke and DJ service websites to extract structured schedule information.

IMPORTANT: You will receive raw HTML content that may include tags, scripts, styles, and formatting. Focus on finding the actual content within the HTML and ignore structural elements.

Focus on finding:

1. VENDOR INFORMATION:
   - Business/company name that runs karaoke shows
   - Website URL 
   - Brief description
   - Confidence level (0-100)

2. KJ/DJ INFORMATION:  
   - Names of KJs/DJs mentioned
   - Context about each person
   - Confidence level (0-100)

3. SHOW INFORMATION:
   - Specific venue names where shows happen
   - Days of the week (full names: Monday, Tuesday, etc.)
   - Specific times (in HH:MM format, 24-hour)
   - Match KJs to shows if possible
   - Look for recurring weekly schedules
   - Confidence level (0-100)

Return valid JSON with this structure:
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
      "context": "additional info"
    }
  ],
  "shows": [
    {
      "venue": "Venue Name",
      "date": "recurring",
      "time": "19:00",
      "kjName": "KJ Name",
      "description": "Every Monday",
      "confidence": 80
    }
  ]
}

WEBPAGE CONTENT:
${content}
    `;
  }

  private extractCleanText(html: string): string {
    try {
      // Simple HTML to text conversion using regex (no JSDOM needed)
      let textContent = html
        // Remove script, style, and other non-content elements
        .replace(/<script[^>]*>.*?<\/script>/gis, '')
        .replace(/<style[^>]*>.*?<\/style>/gis, '')
        .replace(/<head[^>]*>.*?<\/head>/gis, '')
        .replace(/<nav[^>]*>.*?<\/nav>/gis, '')
        .replace(/<footer[^>]*>.*?<\/footer>/gis, '')
        // Remove all remaining HTML tags
        .replace(/<[^>]*>/g, ' ')
        // Decode HTML entities
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#x27;/g, "'")
        .replace(/&#x2F;/g, '/')
        // Clean up whitespace
        .replace(/\s*\n\s*/g, ' ')
        .replace(/\s{2,}/g, ' ')
        .replace(/\s*([.!?])\s*/g, '$1\n')
        .replace(/([A-Z]{2,})\s+([A-Z]{2,})/g, '$1\n$2')
        .replace(/(\d+:\d+[AP]M)\s*-\s*(\d+:\d+[AP]M)/g, '$1-$2')
        .replace(/([A-Z]+DAY[S]?)\s+(KARAOKE)/g, '$1 $2')
        .replace(/(with\s+DJ\s+\w+)\s+([A-Z][A-Z\s]+)/g, '$1\n$2')
        .trim();

      return textContent;
    } catch (error) {
      this.logger.warn('Failed to parse HTML with JSDOM, falling back to text extraction');
      // Fallback to simple text extraction
      return html
        .replace(/<script[^>]*>.*?<\/script>/gis, '')
        .replace(/<style[^>]*>.*?<\/style>/gis, '')
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
    },
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
      this.logger.log(`Processing vendor: ${aiAnalysis.vendor.name}`);

      let vendor = await this.vendorRepository.findOne({
        where: { name: aiAnalysis.vendor.name },
      });

      if (!vendor) {
        this.logger.log(`Creating new vendor: ${aiAnalysis.vendor.name}`);
        vendor = new Vendor();
        vendor.name = aiAnalysis.vendor.name;
        vendor.website = aiAnalysis.vendor.website || parsedSchedule.url;
        vendor.owner = 'Auto-parsed';
        vendor.description = aiAnalysis.vendor.description || `Parsed from ${parsedSchedule.url}`;
        vendor.isActive = true;

        try {
          vendor = await this.vendorRepository.save(vendor);
          this.logger.log(`✅ Created vendor: ${vendor.name} (ID: ${vendor.id})`);
        } catch (error) {
          this.logger.error(`❌ Failed to save vendor: ${vendor.name}`, error);
          throw error;
        }
      } else {
        this.logger.log(`Vendor already exists: ${vendor.name} (ID: ${vendor.id})`);
      }
      result.vendor = vendor;
    }

    // Get existing vendor if not selected but needed for KJs/shows
    let vendor = result.vendor;
    if (!vendor && (selectedItems.kjIds?.length || selectedItems.showIds?.length)) {
      this.logger.log(`Looking up existing vendor: ${aiAnalysis.vendor.name}`);
      vendor = await this.vendorRepository.findOne({
        where: { name: aiAnalysis.vendor.name },
      });

      if (vendor) {
        this.logger.log(`Found existing vendor: ${vendor.name} (ID: ${vendor.id})`);
      } else {
        this.logger.warn(
          `Vendor not found: ${aiAnalysis.vendor.name} - cannot create KJs/shows without vendor`,
        );
      }
      if (!vendor) {
        throw new Error('Vendor must be approved first to create KJs and shows');
      }
    }

    // Create selected KJs
    if (selectedItems.kjIds?.length && vendor) {
      this.logger.log(`Creating ${selectedItems.kjIds.length} KJs for vendor ${vendor.name}`);

      for (const kjId of selectedItems.kjIds) {
        const kjData = aiAnalysis.kjs.find((kj, index) => index.toString() === kjId);
        if (kjData) {
          this.logger.log(`Processing KJ: ${JSON.stringify(kjData)}`);

          const existingKj = await this.kjRepository.findOne({
            where: { name: kjData.name, vendorId: vendor.id },
          });

          if (!existingKj) {
            const kj = new KJ();
            kj.name = kjData.name;
            kj.vendorId = vendor.id;
            kj.isActive = true;

            try {
              const savedKj = await this.kjRepository.save(kj);
              result.kjs.push(savedKj);
              this.logger.log(`✅ Created KJ: ${kj.name} (ID: ${savedKj.id})`);
            } catch (error) {
              this.logger.error(`❌ Failed to save KJ: ${kj.name}`, error);
              // Continue with other KJs even if one fails
            }
          } else {
            result.kjs.push(existingKj);
            this.logger.log(`KJ already exists: ${kjData.name} (ID: ${existingKj.id})`);
          }
        } else {
          this.logger.warn(`KJ data not found for ID: ${kjId}`);
        }
      }

      this.logger.log(
        `Successfully processed ${result.kjs.length} KJs out of ${selectedItems.kjIds.length} attempted`,
      );
    }

    // Create selected shows
    if (selectedItems.showIds?.length && vendor) {
      this.logger.log(`Creating ${selectedItems.showIds.length} shows for vendor ${vendor.name}`);

      for (const showId of selectedItems.showIds) {
        const showData = aiAnalysis.shows.find((show, index) => index.toString() === showId);
        if (showData) {
          this.logger.log(`Processing show: ${JSON.stringify(showData)}`);

          // Find the KJ if specified
          let kj: KJ | null = null;
          if (showData.kjName) {
            kj = await this.kjRepository.findOne({
              where: { name: showData.kjName, vendorId: vendor.id },
            });
            if (kj) {
              this.logger.log(`Found KJ: ${kj.name} (ID: ${kj.id})`);
            } else {
              this.logger.log(`KJ not found: ${showData.kjName}`);
            }
          }

          // Check for required fields
          if (!showData.venue) {
            this.logger.warn(`Skipping show with missing venue: ${JSON.stringify(showData)}`);
            continue;
          }

          const show = new Show();
          show.venue = showData.venue;
          show.date = this.parseDate(showData.date);
          show.time = showData.time || '19:00'; // Default time if missing
          show.vendorId = vendor.id;
          show.kjId = kj?.id || null;
          show.isActive = true;
          show.notes = showData.description || '';

          // Handle image URL if present
          if (showData.imageUrl) {
            show.imageUrl = showData.imageUrl;
          }

          try {
            const savedShow = await this.showRepository.save(show);
            result.shows.push(savedShow);
            this.logger.log(
              `✅ Created show: ${show.venue} on ${show.date || 'recurring'} at ${show.time} (ID: ${savedShow.id})`,
            );
          } catch (error) {
            this.logger.error(`❌ Failed to save show: ${show.venue}`, error);
            // Continue with other shows even if one fails
          }
        } else {
          this.logger.warn(`Show data not found for ID: ${showId}`);
        }
      }

      this.logger.log(
        `Successfully created ${result.shows.length} shows out of ${selectedItems.showIds.length} attempted`,
      );
    }

    // Check if all items have been processed - always remove the record when approving all items
    const totalSelectedItems =
      (selectedItems.vendor ? 1 : 0) +
      (selectedItems.kjIds?.length || 0) +
      (selectedItems.showIds?.length || 0);

    const totalAvailableItems =
      1 + // vendor
      (aiAnalysis.kjs?.length || 0) +
      (aiAnalysis.shows?.length || 0);

    this.logger.log(
      `Selected items: ${totalSelectedItems}, Available items: ${totalAvailableItems}`,
    );

    // Always remove the parsed schedule record after processing (approved items are now in the database)
    await this.parsedScheduleRepository.remove(parsedSchedule);
    this.logger.log(
      `✅ Removed parsed schedule ${parsedScheduleId} - items processed and saved to database`,
    );

    // Final summary
    this.logger.log(`📋 APPROVAL SUMMARY:
      - Vendor: ${result.vendor ? `${result.vendor.name} (ID: ${result.vendor.id})` : 'None'}
      - KJs created/found: ${result.kjs.length}
      - Shows created: ${result.shows.length}
      - Parsed schedule record: DELETED
    `);

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

            if (!pageTitle) {
              pageTitle = this.extractTitleFromHtml(html) || "Steve's DJ Website";
            }

            const bodyText = this.extractCleanText(html);
            // Extract links using regex instead of cheerio
            const linkMatches = [
              ...html.matchAll(/<a[^>]*href\s*=\s*["']([^"']*)["'][^>]*>([^<]*)<\/a>/gi),
            ];
            const links = linkMatches.map((match) => ({
              text: match[2].trim(),
              href: match[1],
              page: url,
            }));

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

      // Prepare enhanced content for AI analysis - combine all content into HTML-like format
      const combinedHtml = `<html>
<head><title>${pageTitle}</title></head>
<body>
${combinedContent}

Links found:
${allLinks.map((link) => `<a href="${link.href}">${link.text}</a> (from ${link.page})`).join('\n')}
</body>
</html>`;

      const contentForAI = this.prepareContentForAI(combinedHtml, baseUrl);

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
      let aiResult;
      try {
        this.logger.log('🤖 Starting AI analysis...');
        aiResult = await this.analyzeWithSmartAI(contentForAI);
        this.logger.log(`🤖 AI analysis completed. Result: ${JSON.stringify(aiResult, null, 2)}`);

        if (!aiResult) {
          throw new Error('AI analysis returned null/undefined');
        }
      } catch (error) {
        this.logger.error('❌ AI analysis failed, using fallback data:', error);
        aiResult = {
          vendor: {
            name: "Steve's DJ",
            website: baseUrl,
            description: 'Karaoke and entertainment services (fallback)',
            confidence: 0.3,
          },
          kjs: [],
          shows: [],
        };
      }

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
        vendor: aiResult.vendor || {
          name: "Steve's DJ",
          website: baseUrl,
          description: 'Karaoke and entertainment services',
          confidence: 0.5,
        },
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
        `Enhanced parsing found: ${parsedData.kjs?.length || 0} KJs and ${parsedData.shows?.length || 0} shows`,
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
