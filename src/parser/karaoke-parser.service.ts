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
      this.logger.log(`Starting multi-page crawling and AI analysis for ${url}`);

      // Step 1: Use Cheerio to discover all relevant pages on the site
      const discoveredPages = await this.discoverSitePages(url);
      this.logger.log(`Discovered ${discoveredPages.length} pages to analyze`);

      // Step 2: Crawl each page and combine content
      const combinedContent = await this.crawlAndCombinePages(discoveredPages);
      this.logger.log(
        `Combined content from ${discoveredPages.length} pages: ${combinedContent.length} characters`,
      );

      // Step 3: Use AI to analyze the combined content
      const contentForAI = this.prepareContentForAI(combinedContent, url);
      const aiResult = await this.analyzeWithSmartAI(contentForAI);

      // Step 4: Save raw parsed data
      const parsedSchedule = new ParsedSchedule();
      parsedSchedule.url = url;
      parsedSchedule.rawData = {
        title: this.extractTitleFromHtml(combinedContent),
        content: combinedContent.substring(0, 5000), // Limit content size for storage
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
          title: this.extractTitleFromHtml(combinedContent),
          content: combinedContent.substring(0, 1000),
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

  private prepareContentForAI(html: string, url: string): string {
    // Extract a basic title from HTML using regex (simple fallback)
    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    const title = titleMatch ? titleMatch[1] : 'No title found';

    // Extract clean text content focusing on schedule information
    const cleanText = this.extractCleanText(html);

    // Increase content size to avoid losing schedule data, but prioritize schedule-relevant content
    const contentLength = Math.min(cleanText.length, 80000); // Increased from 50000
    const truncatedContent = cleanText.substring(0, contentLength);

    return `
URL: ${url}
TITLE: ${title}

CLEAN TEXT CONTENT (focusing on schedule information):
${truncatedContent} ${cleanText.length > contentLength ? '...[truncated]' : ''}
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
You are an expert at parsing website content from karaoke and DJ service websites to extract structured schedule information.

Focus on finding:

1. VENDOR INFORMATION:
   - Business/company name that runs karaoke shows
   - Website URL (from the provided URL)
   - Brief description of the business
   - Confidence level (0-100)

2. KJ (Karaoke Jockey) INFORMATION:
   - Names of KJs/DJs mentioned (they may be called "DJs", "KJs", "Hosts", "Staff", or "Team")
   - Any context about each KJ/DJ
   - Confidence level for each (0-100)

3. SHOW INFORMATION (MOST IMPORTANT):
   - Extract SPECIFIC venue names where shows happen (bars, restaurants, clubs, halls)
   - Extract SPECIFIC days of the week (Monday, Tuesday, etc.)
   - Extract SPECIFIC times (convert to 24-hour format like "19:00")
   - Look for recurring weekly schedules, not just one-time events
   - Match KJs/DJs to specific shows if mentioned
   - Focus on actual venue names, not generic descriptions
   - EXAMPLE: "SUNDAYS KARAOKE 7:00PM - 11:00PM with DJ Steve ALIBI BEACH LOUNGE"
     Should extract: venue="ALIBI BEACH LOUNGE", day="Sunday", time="19:00", kjName="DJ Steve"

IMPORTANT GUIDELINES:
- Prioritize recurring weekly karaoke schedules over one-time events
- If times are ranges like "7PM-11PM", use start time ("19:00")
- If no specific date, use "recurring" for weekly shows
- Only include information you're reasonably confident about

Return valid JSON with this exact structure:
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
      "date": "recurring",
      "time": "19:00",
      "kjName": "KJ Name if specified",
      "description": "Every Monday",
      "confidence": 80
    }
  ]
}

WEBSITE CONTENT TO ANALYZE:
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

    // Only consider successful if we have vendor + shows (KJs are optional)
    // This ensures we don't skip AI parsing when we haven't found actual show data
    const success = hasVendor && hasShows;

    this.logger.log(
      `Cheerio parsing assessment: vendor=${hasVendor}, shows=${result.shows?.length || 0}, kjs=${result.kjs?.length || 0}, success=${success}`,
    );

    return success;
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

  // NEW: Discover all relevant pages on a website using Cheerio
  private async discoverSitePages(baseUrl: string): Promise<string[]> {
    this.logger.log(`Discovering pages on ${baseUrl}`);

    try {
      const response = await fetch(baseUrl);
      const html = await response.text();
      const $ = load(html);

      const discoveredUrls = new Set<string>();
      discoveredUrls.add(baseUrl); // Always include the base URL

      // Extract all internal links
      $('a[href]').each((_, element) => {
        const href = $(element).attr('href');
        if (href) {
          const fullUrl = this.resolveUrl(href, baseUrl);
          if (this.isRelevantPage(fullUrl, baseUrl)) {
            discoveredUrls.add(fullUrl);
          }
        }
      });

      // Add common karaoke/DJ related pages that might not be linked
      const commonPages = [
        '/schedule',
        '/karaoke',
        '/karaoke-schedule',
        '/shows',
        '/events',
        '/calendar',
        '/locations',
        '/venues',
        '/where-we-play',
        '/weekly-schedule',
        '/staff',
        '/team',
        '/djs',
        '/about',
        '/music-bingo',
        '/trivia',
        '/services',
      ];

      for (const page of commonPages) {
        const fullUrl = this.resolveUrl(page, baseUrl);
        discoveredUrls.add(fullUrl);
      }

      const pages = Array.from(discoveredUrls);
      this.logger.log(
        `Discovered ${pages.length} pages: ${pages.slice(0, 10).join(', ')}${pages.length > 10 ? '...' : ''}`,
      );

      return pages;
    } catch (error) {
      this.logger.warn(`Error discovering pages for ${baseUrl}:`, error.message);
      return [baseUrl]; // Fallback to just the base URL
    }
  }

  // NEW: Crawl multiple pages and combine their content
  private async crawlAndCombinePages(urls: string[]): Promise<string> {
    let combinedContent = '';
    let successCount = 0;

    for (const url of urls) {
      try {
        this.logger.log(`Crawling page: ${url}`);
        const response = await fetch(url);

        if (response.status === 200) {
          const html = await response.text();
          const cleanText = this.extractCleanText(html);

          if (cleanText.length > 100) {
            // Only include pages with substantial content
            combinedContent += `\n\n--- Content from ${url} ---\n${cleanText}`;
            successCount++;
            this.logger.log(`✅ Successfully crawled ${url} - ${cleanText.length} characters`);
          } else {
            this.logger.log(`⚠️ Skipped ${url} - insufficient content (${cleanText.length} chars)`);
          }
        } else {
          this.logger.log(`❌ Failed to crawl ${url} - HTTP ${response.status}`);
        }
      } catch (error) {
        this.logger.log(`❌ Error crawling ${url}: ${error.message}`);
      }

      // Be respectful - add delay between requests
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    this.logger.log(`Crawling completed: ${successCount}/${urls.length} pages successful`);
    return combinedContent;
  }

  // Helper: Resolve relative URLs to absolute URLs
  private resolveUrl(href: string, baseUrl: string): string {
    try {
      const base = new URL(baseUrl);
      return new URL(href, base).toString();
    } catch {
      return href; // Return as-is if URL resolution fails
    }
  }

  // Helper: Check if a URL is relevant for parsing (same domain, relevant paths)
  private isRelevantPage(url: string, baseUrl: string): boolean {
    try {
      const urlObj = new URL(url);
      const baseObj = new URL(baseUrl);

      // Must be same domain
      if (urlObj.hostname !== baseObj.hostname) {
        return false;
      }

      // Skip certain file types and paths
      const pathname = urlObj.pathname.toLowerCase();
      const skipPatterns = [
        '.jpg',
        '.jpeg',
        '.png',
        '.gif',
        '.pdf',
        '.doc',
        '.docx',
        '/admin',
        '/wp-admin',
        '/login',
        '/cart',
        '/checkout',
        '/api/',
        '/assets/',
        '/images/',
        '/css/',
        '/js/',
      ];

      if (skipPatterns.some((pattern) => pathname.includes(pattern))) {
        return false;
      }

      // Include relevant paths
      const relevantPatterns = [
        'schedule',
        'karaoke',
        'shows',
        'events',
        'calendar',
        'locations',
        'venues',
        'staff',
        'team',
        'dj',
        'about',
        'music',
        'bingo',
        'trivia',
        'entertainment',
        'services',
      ];

      // Include homepage and pages with relevant keywords
      return (
        pathname === '/' ||
        pathname === '' ||
        relevantPatterns.some((pattern) => pathname.includes(pattern))
      );
    } catch {
      return false;
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
    this.logger.log(`Starting Steve's DJ parsing using new multi-page approach: ${baseUrl}`);

    try {
      // Use the new parseWebsite method which handles multi-page crawling
      const parsedData = await this.parseWebsite(baseUrl);

      this.logger.log(
        `Steve's DJ parsing completed: ${parsedData.kjs?.length || 0} KJs and ${parsedData.shows?.length || 0} shows found`,
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
      this.logger.error(`Error in Steve's DJ parsing:`, error);
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
