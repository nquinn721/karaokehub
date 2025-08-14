import { GoogleGenerativeAI } from '@google/generative-ai';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { load } from 'cheerio';
import fetch from 'node-fetch';
import OpenAI from 'openai';
import * as puppeteer from 'puppeteer';
import { Repository } from 'typeorm';
import { DJ } from '../dj/dj.entity';
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
  djs: Array<{
    name: string;
    confidence: number;
    context?: string;
  }>;
  shows: Array<{
    venue: string;
    date: string;
    time: string;
    kjName?: string;
    djName?: string;
    description?: string;
    confidence: number;
  }>;
  rawData: {
    url: string;
    title: string;
    content: string;
    parsedAt: Date;
    urls?: string[];
    totalPages?: number;
    contentLength?: number;
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
    @InjectRepository(DJ)
    private djRepository: Repository<DJ>,
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
      // Step 1: Try fast fetch first, fallback to Puppeteer only if needed
      this.logger.log(`📄 Attempting fast HTTP fetch...`);
      let html: string;
      let usedPuppeteer = false;

      try {
        // Create AbortController for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

        const response = await fetch(url, {
          signal: controller.signal,
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          },
        });
        clearTimeout(timeoutId);
        html = await response.text();
        this.logger.log(`✅ Fast fetch successful - ${html.length} characters`);
      } catch (fetchError) {
        this.logger.warn(`⚠️ Fast fetch failed, trying Puppeteer: ${fetchError.message}`);
        try {
          html = await this.fetchWithPuppeteer(url);
          usedPuppeteer = true;
          this.logger.log(`🎭 Puppeteer fetch successful - ${html.length} characters`);
        } catch (puppeteerError) {
          this.logger.error(`❌ Both fetch methods failed: ${puppeteerError.message}`);
          throw new Error(`Failed to fetch content: ${puppeteerError.message}`);
        }
      }

      // Step 2: For Steve's DJ, also fetch the karaoke schedule page (with timeout)
      let scheduleHtml = '';
      if (url.includes('stevesdj.com')) {
        this.logger.log("🎯 Detected Steve's DJ - fetching schedule page...");
        try {
          // Add timeout for schedule page fetch
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout

          const scheduleResponse = await fetch('https://stevesdj.com/karaoke-schedule', {
            signal: controller.signal,
          });
          clearTimeout(timeoutId);
          scheduleHtml = await scheduleResponse.text();
          html = html + '\n\n=== KARAOKE SCHEDULE PAGE ===\n\n' + scheduleHtml;
          this.logger.log(`📅 Schedule page added - combined ${html.length} characters`);
        } catch (scheduleError) {
          this.logger.warn('Failed to fetch schedule page:', scheduleError.message);
        }
      } // Step 2: Try Cheerio parsing first (fast and reliable)
      this.logger.log('� Attempting Cheerio-based parsing...');
      const cheerioResult = this.parseWithCheerio(html, url);

      // Step 3: Check if we need AI enhancement (be more conservative to save time)
      let finalResult: ParsedKaraokeData = cheerioResult;

      // Only use AI if Cheerio parsing completely failed AND we have AI available
      const cheerioFailed =
        !cheerioResult.vendor.name ||
        cheerioResult.vendor.name === 'Unknown Venue' ||
        cheerioResult.shows.length === 0;

      const shouldEnhanceWithAI =
        this.shouldUseAI() && cheerioFailed && !this.isParsingSuccessful(cheerioResult);

      if (shouldEnhanceWithAI) {
        this.logger.log('🤖 Cheerio results insufficient, enhancing with AI analysis...');
        try {
          const aiContent = this.prepareContentForAI(html, url);
          const aiResult = await this.analyzeWithSmartAI(aiContent);

          if (aiResult && aiResult.vendor && aiResult.shows && aiResult.shows.length > 0) {
            // Use AI results if they're better
            finalResult = {
              vendor:
                aiResult.vendor.name !== 'Unknown Vendor' ? aiResult.vendor : cheerioResult.vendor,
              kjs: [...(cheerioResult.kjs || []), ...(aiResult.kjs || [])],
              djs: [...(cheerioResult.djs || []), ...(aiResult.djs || [])],
              shows:
                aiResult.shows.length > cheerioResult.shows.length
                  ? aiResult.shows
                  : cheerioResult.shows,
              rawData: {
                url,
                title: this.extractTitleFromHtml(html),
                content: html.substring(0, 2000),
                parsedAt: new Date(),
              },
            };
            this.logger.log('✅ Used AI enhancement');
          }
        } catch (error) {
          this.logger.warn('AI enhancement failed, using Cheerio results:', error.message);
        }
      }

      // Step 4: Save to database for admin review if we found meaningful data (make async for speed)
      if (finalResult.shows.length > 0 || finalResult.kjs.length > 0) {
        // Don't await database save to speed up response time
        this.saveToDatabase(finalResult, html, url).catch((error) => {
          this.logger.error('Background database save failed:', error.message);
        });
      }

      return finalResult;
    } catch (error) {
      this.logger.error(`Error parsing website ${url}:`, error);
      throw error;
    }
  }

  // Separate method for database saving (can be async)
  private async saveToDatabase(
    finalResult: ParsedKaraokeData,
    html: string,
    url: string,
  ): Promise<void> {
    try {
      const parsedSchedule = new ParsedSchedule();
      parsedSchedule.url = url;
      parsedSchedule.rawData = {
        title: finalResult.rawData.title,
        content: html.substring(0, 5000),
        parsedAt: new Date(),
      };
      parsedSchedule.aiAnalysis = finalResult;
      parsedSchedule.status = ParseStatus.PENDING_REVIEW;

      await this.parsedScheduleRepository.save(parsedSchedule);
      this.logger.log(
        `✅ Saved parsed data for admin review - Found ${finalResult.kjs.length} KJs and ${finalResult.shows.length} shows`,
      );
    } catch (error) {
      this.logger.error('Failed to save to database:', error.message);
      throw error;
    }
  }

  // New method for Puppeteer-based content fetching
  private async fetchWithPuppeteer(url: string): Promise<string> {
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu',
      ],
    });

    try {
      const page = await browser.newPage();

      // Set user agent to avoid bot detection
      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      );

      // Navigate to page and wait for content (reduced timeout)
      await page.goto(url, {
        waitUntil: 'domcontentloaded', // Faster than 'networkidle0'
        timeout: 15000, // Reduced from 30000
      });

      // Reduced wait time for lazy-loaded content
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Reduced from 2000

      // Try to wait for common content indicators
      try {
        await Promise.race([
          page.waitForSelector('body', { timeout: 5000 }),
          page.waitForSelector('[class*="schedule"]', { timeout: 5000 }),
          page.waitForSelector('[class*="karaoke"]', { timeout: 5000 }),
          page.waitForSelector('[class*="event"]', { timeout: 5000 }),
        ]);
      } catch (waitError) {
        this.logger.log('No specific selectors found, proceeding with page content');
      }

      // Get the rendered HTML content
      const html = await page.content();

      return html;
    } finally {
      await browser.close();
    }
  }

  private prepareContentForAI(html: string, url: string): string {
    // Extract a basic title from HTML using regex (simple fallback)
    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    const title = titleMatch ? titleMatch[1] : 'No title found';

    // Extract clean text content focusing on schedule information
    const cleanText = this.extractCleanText(html);

    // Significantly reduce content size for much faster processing
    const contentLength = Math.min(cleanText.length, 15000); // Reduced from 40000 for much faster AI processing
    const truncatedContent = cleanText.substring(0, contentLength);

    return `
URL: ${url}
TITLE: ${title}

CLEAN TEXT CONTENT (focusing on schedule information):
${truncatedContent} ${cleanText.length > contentLength ? '...[truncated for performance]' : ''}
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

2. DJ/KJ (Disc Jockey / Karaoke Jockey) INFORMATION:
   - Names of DJs/KJs mentioned (they may be called "DJs", "KJs", "Hosts", "Staff", or "Team")
   - NOTE: DJs and KJs are the same people in karaoke context - people who host karaoke shows
   - Any context about each DJ/KJ
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
  "djs": [
    {
      "name": "DJ/KJ Name",
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
      "djName": "DJ Name if specified",
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

  // Smart AI provider selection with quota management (Gemini only, avoid OpenAI)
  private async analyzeWithSmartAI(content: string): Promise<any> {
    this.logger.log('🔍 Analyzing with Smart AI - checking providers...');

    // Using cloud AI providers only - GEMINI ONLY to avoid OpenAI quota issues
    this.logger.log('� Using Gemini AI only to avoid OpenAI quota issues');

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
        this.logger.warn('❌ Gemini AI failed:', error.message);
        if (error.message.includes('quota') || error.message.includes('limit')) {
          this.geminiQuotaExhausted = true;
        }
        // Don't fall back to OpenAI - just throw the error
        throw error;
      }
    } else {
      this.logger.log('⚠️ Gemini not available or quota exhausted');
      throw new Error(
        'No AI providers available - Gemini quota exhausted and OpenAI disabled to prevent quota issues',
      );
    }
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
  // Enhanced Cheerio-based parsing (no AI quota usage)
  private parseWithCheerio(html: string, url: string): ParsedKaraokeData {
    const $ = load(html);

    // Extract vendor information with multiple strategies
    const titleText = $('title').text() || '';
    const h1Text = $('h1').first().text() || '';
    const businessName = this.extractBusinessName($, titleText, h1Text);

    const vendor = {
      name: businessName,
      website: url,
      description: $('meta[name="description"]').attr('content') || '',
      confidence: businessName !== 'Unknown Venue' ? 75 : 30,
    };

    // Enhanced KJ/DJ detection
    const kjs = this.extractKJsFromContent($);
    const djs = this.extractDJsFromContent($);

    // Enhanced show/schedule detection
    const shows = this.extractShowsFromContent($, vendor.name);

    const textContent = $('body').text() || $.html();

    this.logger.log(`🔧 Cheerio parsing results:
      - Vendor: ${vendor.name} (confidence: ${vendor.confidence}%)
      - KJs: ${kjs.length} found
      - DJs: ${djs.length} found
      - Shows: ${shows.length} found`);

    return {
      vendor,
      kjs: this.deduplicateKJs(kjs),
      djs: this.deduplicateDJs(djs),
      shows: this.deduplicateShows(shows),
      rawData: {
        url,
        title: titleText || h1Text || 'No title found',
        content: textContent.substring(0, 1000),
        parsedAt: new Date(),
      },
    };
  }

  // Enhanced business name extraction
  private extractBusinessName($: any, titleText: string, h1Text: string): string {
    // Try various strategies to get business name
    const candidates = [
      titleText.split(' - ')[0].split(' | ')[0],
      h1Text,
      $('.business-name').text(),
      $('.company-name').text(),
      $('.logo-text').text(),
      $('meta[property="og:site_name"]').attr('content'),
    ].filter((name) => name && name.trim() && name.length > 2);

    if (candidates.length > 0) {
      // Clean and return the best candidate
      return this.cleanVendorName(candidates[0]);
    }

    return 'Unknown Venue';
  }

  // Enhanced KJ extraction
  private extractKJsFromContent($: any): any[] {
    const kjs: any[] = [];
    const textContent = $('body').text();

    // Enhanced patterns for KJ detection
    const kjPatterns = [
      /(?:DJ|KJ|Host|Jockey)\s+([A-Za-z][A-Za-z\s]{1,25})/gi,
      /with\s+([A-Za-z][A-Za-z\s]{1,25})\s*(?:DJ|KJ)/gi,
      /([A-Za-z][A-Za-z\s]{1,25})\s*(?:will be|is)\s*(?:your\s*)?(?:DJ|KJ|host)/gi,
      /(?:featuring|with|hosted by)\s+([A-Za-z][A-Za-z\s]{1,25})/gi,
    ];

    // Look in specific sections
    const kjSections = $(
      '.staff, .team, .dj, .kj, .host, [class*="staff"], [class*="team"], [class*="dj"]',
    );
    kjSections.each((_, element) => {
      const sectionText = $(element).text();
      kjPatterns.forEach((pattern) => {
        let match;
        while ((match = pattern.exec(sectionText)) !== null) {
          const name = match[1].trim();
          if (this.isValidKJName(name)) {
            kjs.push({
              name,
              confidence: 80,
              context: 'Found in staff/team section',
            });
          }
        }
      });
    });

    // Fallback to general content if no specific sections found
    if (kjs.length === 0) {
      kjPatterns.forEach((pattern) => {
        let match;
        while ((match = pattern.exec(textContent)) !== null) {
          const name = match[1].trim();
          if (this.isValidKJName(name)) {
            kjs.push({
              name,
              confidence: 70,
              context: 'Found via pattern matching',
            });
          }
        }
      });
    }

    return kjs;
  }

  // Enhanced DJ extraction (same as KJ but for DJ patterns)
  private extractDJsFromContent($: any): any[] {
    const djs: any[] = [];
    const textContent = $('body').text();

    // Enhanced patterns for DJ detection
    const djPatterns = [
      /(?:DJ|KJ|Host|Jockey)\s+([A-Za-z][A-Za-z\s]{1,25})/gi,
      /with\s+([A-Za-z][A-Za-z\s]{1,25})\s*(?:DJ|KJ)/gi,
      /([A-Za-z][A-Za-z\s]{1,25})\s*(?:will be|is)\s*(?:your\s*)?(?:DJ|KJ|host)/gi,
      /(?:featuring|with|hosted by)\s+([A-Za-z][A-Za-z\s]{1,25})/gi,
    ];

    // Look in specific sections
    const djSections = $(
      '.staff, .team, .dj, .kj, .host, [class*="staff"], [class*="team"], [class*="dj"]',
    );
    djSections.each((_, element) => {
      const sectionText = $(element).text();
      djPatterns.forEach((pattern) => {
        let match;
        while ((match = pattern.exec(sectionText)) !== null) {
          const name = match[1].trim();
          if (this.isValidDJName(name)) {
            djs.push({
              name,
              confidence: 80,
              context: 'Found in staff/team section',
            });
          }
        }
      });
    });

    // Fallback to general content if no specific sections found
    if (djs.length === 0) {
      djPatterns.forEach((pattern) => {
        let match;
        while ((match = pattern.exec(textContent)) !== null) {
          const name = match[1].trim();
          if (this.isValidDJName(name)) {
            djs.push({
              name,
              confidence: 70,
              context: 'Found via pattern matching',
            });
          }
        }
      });
    }

    return djs;
  }

  // Enhanced show extraction
  private extractShowsFromContent($: any, vendorName: string): any[] {
    const shows: any[] = [];
    const textContent = $('body').text();

    // Look for schedule sections first
    const scheduleSections = $(
      '.schedule, .calendar, .events, [class*="schedule"], [class*="calendar"], [class*="event"]',
    );

    if (scheduleSections.length > 0) {
      scheduleSections.each((_, element) => {
        const sectionText = $(element).text();
        const sectionShows = this.extractShowsFromText(sectionText, vendorName, 85);
        shows.push(...sectionShows);
      });
    }

    // Enhanced and simplified patterns for schedule detection
    const schedulePatterns = [
      // "Monday 8PM" or "Monday 8:00 PM"
      /([A-Za-z]+day)s?\s+(\d{1,2}(?::\d{2})?\s*(?:PM|AM))/gi,

      // "Karaoke Monday 8PM" or "DJ Monday 8PM"
      /(?:karaoke|dj|music)\s+([A-Za-z]+day)s?\s+(\d{1,2}(?::\d{2})?\s*(?:PM|AM))/gi,

      // "Monday Night Karaoke 8PM"
      /([A-Za-z]+day)\s+(?:night\s+)?(?:karaoke|dj|music)\s+(\d{1,2}(?::\d{2})?\s*(?:PM|AM))/gi,

      // "Every Monday 8PM"
      /every\s+([A-Za-z]+day)s?\s+(\d{1,2}(?::\d{2})?\s*(?:PM|AM))/gi,

      // "Sundays 7PM-11PM" (with time ranges)
      /([A-Za-z]+day)s?\s+(\d{1,2}(?::\d{2})?\s*(?:PM|AM))\s*[-–]\s*\d{1,2}(?::\d{2})?\s*(?:PM|AM)/gi,

      // "SUNDAYS KARAOKE 7:00PM" (all caps)
      /([A-Z]+DAYS?)\s+(?:KARAOKE|DJ|MUSIC)\s+(\d{1,2}(?::\d{2})?\s*(?:PM|AM))/gi,
    ];

    schedulePatterns.forEach((pattern) => {
      let match;
      while ((match = pattern.exec(textContent)) !== null) {
        const day = this.standardizeDayName(match[1]);
        const time = this.standardizeTime(match[2]);

        if (day && time) {
          shows.push({
            venue: this.cleanVenueName(vendorName),
            date: 'recurring',
            time,
            kjName: null,
            description: `Every ${day}`,
            confidence: 80,
          });
        }
      }
    });

    return shows;
  }

  // Helper: Extract shows from text content
  private extractShowsFromText(text: string, defaultVenue: string, confidence: number): any[] {
    const shows: any[] = [];

    // Enhanced schedule patterns
    const patterns = [
      /([A-Za-z]+day)s?\s+.*?(\d{1,2}(?::\d{2})?\s*(?:PM|AM))/gi,
      /([A-Za-z]+day)s?\s+.*?karaoke.*?(\d{1,2}(?::\d{2})?\s*(?:PM|AM))/gi,
    ];

    patterns.forEach((pattern) => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const day = this.standardizeDayName(match[1]);
        const time = this.standardizeTime(match[2]);

        if (day && time) {
          shows.push({
            venue: defaultVenue,
            date: 'recurring',
            time,
            description: `Every ${day}`,
            confidence,
          });
        }
      }
    });

    return shows;
  }

  // Helper: Validate KJ names
  private isValidKJName(name: string): boolean {
    if (!name || name.length < 2 || name.length > 30) return false;

    // Filter out common false positives
    const blacklist = [
      'and',
      'the',
      'with',
      'your',
      'our',
      'will',
      'more',
      'info',
      'call',
      'night',
      'music',
      'karaoke',
      'party',
    ];
    const lowercaseName = name.toLowerCase().trim();

    return !blacklist.some((word) => lowercaseName.includes(word));
  }

  // Helper: Validate DJ names (same as KJ names)
  private isValidDJName(name: string): boolean {
    if (!name || name.length < 2 || name.length > 30) return false;

    // Filter out common false positives
    const blacklist = [
      'and',
      'the',
      'with',
      'your',
      'our',
      'will',
      'more',
      'info',
      'call',
      'night',
      'music',
      'karaoke',
      'party',
    ];
    const lowercaseName = name.toLowerCase().trim();

    return !blacklist.some((word) => lowercaseName.includes(word));
  }

  // Helper: Clean venue names
  private cleanVenueName(venue: string): string {
    return venue
      .replace(/[^\w\s&'-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 100);
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

  // Check if we should use AI (quota available and not exhausted)
  private shouldUseAI(): boolean {
    const hasGemini =
      this.genAI &&
      !this.geminiQuotaExhausted &&
      this.dailyGeminiCalls < this.MAX_DAILY_GEMINI_CALLS;
    const hasOpenAI = this.openai; // We'll be more careful with OpenAI usage

    const shouldUse = hasGemini; // Only use Gemini for now, avoid OpenAI to prevent quota issues

    this.logger.log(`AI availability check:
      - Gemini available: ${hasGemini} (calls: ${this.dailyGeminiCalls}/${this.MAX_DAILY_GEMINI_CALLS})
      - OpenAI available: ${hasOpenAI} (but avoiding due to quota)
      - Will use AI: ${shouldUse}`);

    return shouldUse;
  }

  // Merge Cheerio results with AI results for better data
  private mergeCheerioAndAIResults(
    cheerioResult: ParsedKaraokeData,
    aiResult: any,
    url: string,
  ): ParsedKaraokeData {
    this.logger.log('🔄 Merging Cheerio and AI results...');

    // Use AI vendor info if it's better than Cheerio's
    const vendor = {
      name:
        aiResult.vendor?.name && aiResult.vendor.name !== 'Unknown Vendor'
          ? aiResult.vendor.name
          : cheerioResult.vendor.name,
      website: aiResult.vendor?.website || cheerioResult.vendor.website || url,
      description: aiResult.vendor?.description || cheerioResult.vendor.description,
      confidence: Math.max(aiResult.vendor?.confidence || 0, cheerioResult.vendor.confidence),
    };

    // Combine KJs from both sources (deduped)
    const combinedKJs = [...(cheerioResult.kjs || [])];
    if (aiResult.kjs) {
      for (const aiKj of aiResult.kjs) {
        if (!combinedKJs.some((kj) => kj.name.toLowerCase() === aiKj.name.toLowerCase())) {
          combinedKJs.push(aiKj);
        }
      }
    }

    // Combine shows from both sources (prefer AI shows if they have better data)
    const combinedShows = [...(cheerioResult.shows || [])];
    if (aiResult.shows) {
      for (const aiShow of aiResult.shows) {
        // Check if we already have a similar show from Cheerio
        const existingIndex = combinedShows.findIndex(
          (show) =>
            show.venue.toLowerCase().includes(aiShow.venue.toLowerCase()) ||
            aiShow.venue.toLowerCase().includes(show.venue.toLowerCase()),
        );

        if (existingIndex >= 0) {
          // Replace with AI version if it has more complete data
          if (aiShow.venue && aiShow.time && aiShow.confidence > 40) {
            combinedShows[existingIndex] = aiShow;
          }
        } else {
          combinedShows.push(aiShow);
        }
      }
    }

    const mergedResult: ParsedKaraokeData = {
      vendor,
      kjs: combinedKJs,
      djs: [], // Initialize empty DJs for now, will be populated from AI results
      shows: combinedShows,
      rawData: cheerioResult.rawData,
    };

    this.logger.log(
      `Merge results: ${mergedResult.kjs.length} KJs, ${mergedResult.shows.length} shows`,
    );
    return mergedResult;
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

  private deduplicateDJs(djs: any[]): any[] {
    const seen = new Set();
    return djs.filter((dj) => {
      const key = dj.name.toLowerCase();
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
You are an expert at parsing comprehensive HTML content from karaoke and DJ service websites to extract structured schedule information.

IMPORTANT: You are receiving COMPLETE website content from multiple pages that has been crawled and combined. This includes all relevant pages from the website (homepage, schedule pages, about pages, staff pages, etc.). Focus on finding ALL karaoke/DJ show information across the entire website.

COMPREHENSIVE ANALYSIS INSTRUCTIONS:

1. VENDOR INFORMATION (Look across ALL pages):
   - Business/company name that runs karaoke shows
   - Primary website URL
   - Business description or mission
   - Contact information or location details
   - Confidence level (0-100) based on clarity and consistency

2. KJ/DJ INFORMATION (Extract from ALL pages):  
   - ALL names of KJs/DJs mentioned anywhere on the website
   - Staff pages, about pages, show descriptions
   - Look for patterns like "with DJ Name", "hosted by", "featuring"
   - Include context about each person if available
   - Confidence level (0-100) based on how clearly they're identified

3. SHOW INFORMATION (Complete schedule extraction):
   - ALL venue names where shows happen (may be multiple locations)
   - ALL days of the week (convert to full names: Monday, Tuesday, etc.)
   - ALL specific times (convert to 24-hour HH:MM format)
   - Match KJs to specific shows when possible
   - Look for recurring weekly schedules AND one-time events
   - Include venue addresses or location details when available
   - Special events, themed nights, or unique shows
   - Confidence level (0-100) based on completeness and clarity

PARSING PRIORITIES:
- Extract EVERYTHING - this is complete website content, not just one page
- Look for patterns across multiple pages that might contain schedule info
- Pay attention to navigation menus, footer links, and page titles
- Cross-reference information between pages for accuracy
- Include both regular weekly shows AND special events

Return valid JSON with this structure:
{
  "vendor": {
    "name": "business name",
    "website": "website url", 
    "description": "comprehensive business description",
    "confidence": 95
  },
  "kjs": [
    {
      "name": "Full KJ/DJ Name",
      "confidence": 90,
      "context": "where found and additional details"
    }
  ],
  "shows": [
    {
      "venue": "Complete Venue Name",
      "date": "recurring",
      "time": "19:00",
      "kjName": "KJ Name if specified",
      "description": "Every Monday - additional details",
      "confidence": 85
    }
  ]
}

COMPLETE WEBSITE CONTENT:
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

  // NEW: Check if parsed data has enough meaningful content (for informational purposes)
  private hasValidParsedData(aiResult: any): boolean {
    // Check if we have basic structure
    if (!aiResult) {
      this.logger.warn('❌ No AI result received');
      return false;
    }

    // Must have shows to be considered valid (KJs are optional)
    const hasShows = aiResult.shows && aiResult.shows.length > 0;

    // Vendor should exist and have a name
    const hasVendor = aiResult.vendor && aiResult.vendor.name && aiResult.vendor.name.trim() !== '';

    // Check vendor confidence (informational)
    const hasDecentVendorConfidence = aiResult.vendor && aiResult.vendor.confidence > 30;

    // Check if vendor name looks meaningful
    const hasReasonableVendorName =
      hasVendor &&
      aiResult.vendor.name !== 'Unknown Vendor' &&
      aiResult.vendor.name !== 'Unknown Venue' &&
      aiResult.vendor.name.length > 2;

    // At least one show should have reasonable confidence
    const hasConfidentShows = hasShows && aiResult.shows.some((show: any) => show.confidence > 30);

    // At least one show should have required fields
    const hasCompleteShows =
      hasShows &&
      aiResult.shows.some((show: any) => show.venue && show.venue.trim() !== '' && show.time);

    const isValid =
      hasShows &&
      hasReasonableVendorName &&
      hasDecentVendorConfidence &&
      hasConfidentShows &&
      hasCompleteShows;

    this.logger.log(`📊 Parsed data quality assessment:
      ✅ Has AI result: ${!!aiResult}
      ${hasShows ? '✅' : '❌'} Has shows: ${aiResult.shows?.length || 0}
      ${hasVendor ? '✅' : '❌'} Has vendor name: "${aiResult.vendor?.name || 'None'}"
      ${hasDecentVendorConfidence ? '✅' : '❌'} Vendor confidence: ${aiResult.vendor?.confidence || 0}%
      ${hasReasonableVendorName ? '✅' : '❌'} Reasonable vendor name: ${hasReasonableVendorName}
      ${hasConfidentShows ? '✅' : '❌'} Has confident shows: ${hasConfidentShows}
      ${hasCompleteShows ? '✅' : '❌'} Has complete show data: ${hasCompleteShows}
      🎯 Overall quality: ${isValid ? 'HIGH' : 'NEEDS_MANUAL_REVIEW'}`);

    return isValid;
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

  // NEW: Clean up pending reviews that have no useful data
  async cleanupInvalidPendingReviews(): Promise<number> {
    this.logger.log('Starting cleanup of invalid pending reviews...');

    const pendingReviews = await this.getPendingReviews();
    let removedCount = 0;

    for (const review of pendingReviews) {
      const hasValidData = this.hasValidParsedData(review.aiAnalysis);

      if (!hasValidData) {
        this.logger.log(`Removing invalid pending review for ${review.url} - no useful data found`);
        await this.parsedScheduleRepository.remove(review);
        removedCount++;
      }
    }

    this.logger.log(
      `Cleanup completed: removed ${removedCount} invalid pending reviews out of ${pendingReviews.length} total`,
    );
    return removedCount;
  }

  // NEW: Clean up ALL pending reviews (for development/testing)
  async cleanupAllPendingReviews(): Promise<number> {
    this.logger.log('Starting cleanup of ALL pending reviews...');

    const pendingReviews = await this.getPendingReviews();
    const removedCount = pendingReviews.length;

    if (removedCount > 0) {
      await this.parsedScheduleRepository.remove(pendingReviews);
      this.logger.log(`Cleanup completed: removed ${removedCount} pending reviews`);
    } else {
      this.logger.log('No pending reviews to clean up');
    }

    return removedCount;
  }

  // NEW: Debug method to check entities state
  async getEntitiesDebugInfo(): Promise<{
    vendors: { count: number; recent: any[] };
    kjs: { count: number; recent: any[] };
    shows: { count: number; recent: any[] };
    pendingReviews: { count: number; recent: any[] };
  }> {
    const vendorsCount = await this.vendorRepository.count();
    const recentVendors = await this.vendorRepository.find({
      take: 5,
      order: { createdAt: 'DESC' },
    });

    const kjsCount = await this.kjRepository.count();
    const recentKJs = await this.kjRepository.find({
      take: 5,
      order: { createdAt: 'DESC' },
      relations: ['vendor'],
    });

    const showsCount = await this.showRepository.count();
    const recentShows = await this.showRepository.find({
      take: 5,
      order: { createdAt: 'DESC' },
      relations: ['vendor', 'kj'],
    });

    const pendingReviewsCount = await this.parsedScheduleRepository.count({
      where: { status: ParseStatus.PENDING_REVIEW },
    });
    const recentPendingReviews = await this.parsedScheduleRepository.find({
      where: { status: ParseStatus.PENDING_REVIEW },
      take: 5,
      order: { createdAt: 'DESC' },
    });

    return {
      vendors: {
        count: vendorsCount,
        recent: recentVendors.map((v) => ({
          id: v.id,
          name: v.name,
          createdAt: v.createdAt,
        })),
      },
      kjs: {
        count: kjsCount,
        recent: recentKJs.map((kj) => ({
          id: kj.id,
          name: kj.name,
          vendor: kj.vendor?.name,
          createdAt: kj.createdAt,
        })),
      },
      shows: {
        count: showsCount,
        recent: recentShows.map((s) => ({
          id: s.id,
          venue: s.venue,
          time: s.time,
          vendor: s.vendor?.name,
          kj: s.kj?.name,
          createdAt: s.createdAt,
        })),
      },
      pendingReviews: {
        count: pendingReviewsCount,
        recent: recentPendingReviews.map((pr) => ({
          id: pr.id,
          url: pr.url,
          status: pr.status,
          createdAt: pr.createdAt,
        })),
      },
    };
  }

  // NEW: Debug method to get all parsed schedules
  async getAllParsedSchedulesForDebug(): Promise<any[]> {
    const allParsedSchedules = await this.parsedScheduleRepository.find({
      take: 20,
      order: { createdAt: 'DESC' },
    });

    return allParsedSchedules.map((ps) => ({
      id: ps.id,
      url: ps.url,
      status: ps.status,
      createdAt: ps.createdAt,
      vendorName: ps.aiAnalysis?.vendor?.name || 'No vendor',
      vendorConfidence: ps.aiAnalysis?.vendor?.confidence || 0,
      kjsCount: ps.aiAnalysis?.kjs?.length || 0,
      showsCount: ps.aiAnalysis?.shows?.length || 0,
      hasRawData: !!ps.rawData,
      hasAiAnalysis: !!ps.aiAnalysis,
    }));
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

              // Immediately verify the save worked
              const verifyKj = await this.kjRepository.findOne({ where: { id: savedKj.id } });
              if (!verifyKj) {
                this.logger.error(`❌ KJ save verification failed for: ${kj.name}`);
              } else {
                this.logger.log(`✅ KJ save verified: ${verifyKj.name}`);
              }
            } catch (error) {
              this.logger.error(`❌ Failed to save KJ: ${kj.name}`, error);
              this.logger.error(`KJ data being saved:`, {
                name: kj.name,
                vendorId: kj.vendorId,
                isActive: kj.isActive,
              });
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

            // Immediately verify the save worked
            const verifyShow = await this.showRepository.findOne({ where: { id: savedShow.id } });
            if (!verifyShow) {
              this.logger.error(`❌ Show save verification failed for: ${show.venue}`);
            } else {
              this.logger.log(`✅ Show save verified: ${verifyShow.venue}`);
            }
          } catch (error) {
            this.logger.error(`❌ Failed to save show: ${show.venue}`, error);
            this.logger.error(`Show data being saved:`, {
              venue: show.venue,
              date: show.date,
              time: show.time,
              vendorId: show.vendorId,
              kjId: show.kjId,
              isActive: show.isActive,
              notes: show.notes,
            });
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

    // Re-fetch the created entities with their full data to ensure they were saved correctly
    if (result.vendor) {
      const refreshedVendor = await this.vendorRepository.findOne({
        where: { id: result.vendor.id },
      });
      if (refreshedVendor) {
        result.vendor = refreshedVendor;
        this.logger.log(`✅ Verified vendor in database: ${refreshedVendor.name}`);
      } else {
        this.logger.error(`❌ Vendor not found in database after save: ${result.vendor.id}`);
      }
    }

    // Re-fetch KJs to verify they were saved
    const refreshedKJs = [];
    for (const kj of result.kjs) {
      const refreshedKJ = await this.kjRepository.findOne({
        where: { id: kj.id },
        relations: ['vendor'],
      });
      if (refreshedKJ) {
        refreshedKJs.push(refreshedKJ);
        this.logger.log(`✅ Verified KJ in database: ${refreshedKJ.name}`);
      } else {
        this.logger.error(`❌ KJ not found in database after save: ${kj.id}`);
      }
    }
    result.kjs = refreshedKJs;

    // Re-fetch shows to verify they were saved
    const refreshedShows = [];
    for (const show of result.shows) {
      const refreshedShow = await this.showRepository.findOne({
        where: { id: show.id },
        relations: ['vendor', 'kj'],
      });
      if (refreshedShow) {
        refreshedShows.push(refreshedShow);
        this.logger.log(`✅ Verified show in database: ${refreshedShow.venue}`);
      } else {
        this.logger.error(`❌ Show not found in database after save: ${show.id}`);
      }
    }
    result.shows = refreshedShows;

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
    const scheduleUrl = 'https://stevesdj.com/karaoke-schedule';
    this.logger.log(`Starting Steve's DJ schedule parsing: ${scheduleUrl}`);

    try {
      // Parse the specific karaoke schedule page directly
      const parsedData = await this.parseWebsite(scheduleUrl);

      // Override vendor information since we know it's Steve's DJ
      parsedData.vendor = {
        name: "Steve's DJ & Karaoke",
        website: 'https://stevesdj.com',
        description: 'Professional DJ and karaoke services',
        confidence: 95,
      };

      // Clear KJs since we're not focusing on them for this parsing
      parsedData.kjs = [];
      parsedData.djs = [];

      this.logger.log(
        `Steve's DJ schedule parsing completed: ${parsedData.shows?.length || 0} shows found`,
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
      this.logger.error(`Error in Steve's DJ schedule parsing:`, error);
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

  // Calculate overall confidence score for parsed data
  private calculateOverallConfidence(parsedData: ParsedKaraokeData): number {
    const vendorConfidence = parsedData.vendor?.confidence || 0;
    const kjsAvgConfidence =
      parsedData.kjs?.length > 0
        ? parsedData.kjs.reduce((sum, kj) => sum + (kj.confidence || 50), 0) / parsedData.kjs.length
        : 50;
    const showsAvgConfidence =
      parsedData.shows?.length > 0
        ? parsedData.shows.reduce((sum, show) => sum + (show.confidence || 50), 0) /
          parsedData.shows.length
        : 50;

    // Weight vendor confidence most heavily, then shows, then KJs
    const overallConfidence = Math.round(
      vendorConfidence * 0.5 + showsAvgConfidence * 0.3 + kjsAvgConfidence * 0.2,
    );

    return Math.min(Math.max(overallConfidence, 1), 100); // Ensure 1-100 range
  }
}
