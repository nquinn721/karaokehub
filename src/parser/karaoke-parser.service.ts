import { GoogleGenerativeAI } from '@google/generative-ai';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as puppeteer from 'puppeteer';
import { In, Repository } from 'typeorm';
import { DJ } from '../dj/dj.entity';
import { DJNickname } from '../entities/dj-nickname.entity';
import { GeocodingService } from '../geocoding/geocoding.service';
import { DJNicknameService } from '../services/dj-nickname.service';
import { FacebookService } from '../services/facebook.service';
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
    aliases?: string[]; // Add aliases support for enhanced DJ matching
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
    @InjectRepository(Vendor)
    private vendorRepository: Repository<Vendor>,
    @InjectRepository(DJ)
    private djRepository: Repository<DJ>,
    @InjectRepository(Show)
    private showRepository: Repository<Show>,
    @InjectRepository(ParsedSchedule)
    private parsedScheduleRepository: Repository<ParsedSchedule>,
    @InjectRepository(DJNickname)
    private djNicknameRepository: Repository<DJNickname>,
    private djNicknameService: DJNicknameService,
    private geocodingService: GeocodingService,
    private facebookService: FacebookService,
  ) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async parseWebsite(url: string): Promise<ParsedKaraokeData> {
    try {
      this.logger.log(`Starting parse for URL: ${url}`);

      // Facebook URL Routing Logic
      if (this.isFacebookUrl(url)) {
        this.logger.log('Detected Facebook URL, using Facebook-specific parsing pipeline');

        // Step 1: Check if it's a Facebook event URL - use Graph API directly
        if (this.facebookService.isFacebookEventUrl(url)) {
          this.logger.log('Detected Facebook event URL, using Graph API');
          try {
            const eventData = await this.facebookService.getEventData(url);
            const result = this.facebookService.convertToKaraokeData(eventData, url);

            // Apply address lookup if needed
            if (result.shows.length > 0 && !result.shows[0].address) {
              result.shows[0].address = await this.lookupVenueAddress(result.shows[0].venue);
            }

            this.logger.log(`Facebook Graph API parse completed successfully for ${url}`);
            return result;
          } catch (facebookError) {
            this.logger.warn(
              `Facebook Graph API failed for event URL, falling back to Puppeteer: ${facebookError.message}`,
            );
            // Continue with Puppeteer fallback below
          }
        } else if (this.facebookService.isFacebookProfileUrl(url)) {
          // Step 2: Check if it's a Facebook profile URL - try Graph API first, then fall back to Puppeteer
          this.logger.log('Detected Facebook profile URL, trying Graph API first');

          try {
            let facebookProfileData;
            let useGraphAPI = true;

            try {
              // Try Graph API approach first
              this.logger.log('Attempting Graph API profile extraction...');

              // Try to get profile events via Graph API
              const graphApiEvents = await this.facebookService.getProfileEvents(url);

              if (graphApiEvents && graphApiEvents.length > 0) {
                this.logger.log(`Found ${graphApiEvents.length} events via Graph API`);
                // Convert Graph API events to karaoke data format
                const graphApiData = {
                  profileInfo: { name: '', followers: '', location: '', instagram: '', bio: '' },
                  schedule: [],
                  recentPosts: [],
                  venues: [],
                  additionalShows: graphApiEvents.map((event) => ({
                    venue: event.place?.name || 'Unknown Venue',
                    time: event.start_time || '',
                    day: new Date(event.start_time).toLocaleDateString('en-US', {
                      weekday: 'long',
                    }),
                    confidence: 0.9,
                  })),
                };
                facebookProfileData = graphApiData;
              } else {
                throw new Error('No events found via Graph API');
              }
            } catch (graphApiError) {
              this.logger.log(
                `Graph API failed, falling back to Puppeteer: ${graphApiError.message}`,
              );
              useGraphAPI = false;

              // Fall back to Puppeteer approach
              this.logger.log('Using Puppeteer for profile extraction...');
              facebookProfileData = await this.facebookService.extractProfileKaraokeData(url);
            }

            this.logger.log(
              `Facebook profile data extracted successfully using ${useGraphAPI ? 'Graph API' : 'Puppeteer'}, sending to Gemini for intelligent parsing`,
            );

            // Send the extracted Facebook data to Gemini for intelligent parsing
            const result = await this.parseWithGeminiFromFacebookData(facebookProfileData, url);

            // Apply address lookup for venues that don't have addresses
            for (const show of result.shows) {
              if (!show.address && show.venue) {
                show.address = await this.lookupVenueAddress(show.venue);
              }
            }

            this.logger.log(
              `Facebook profile + Gemini parse completed successfully for ${url} (${result.shows.length} shows found)`,
            );
            return result;
          } catch (profileError) {
            this.logger.warn(
              `Facebook profile extraction failed, falling back to standard Puppeteer: ${profileError.message}`,
            );
            // Continue with Puppeteer fallback below
          }

          // Step 3: For Facebook profile URLs without events, use Gemini to transform URL
          this.logger.log('Facebook profile URL detected, using Gemini URL transformation');
          try {
            const transformResult = await this.transformFacebookUrlWithGemini(url);

            // Check if Gemini suggested a better URL to try
            if (transformResult.transformedUrl) {
              this.logger.log(
                `Gemini suggested transformed URL: ${transformResult.transformedUrl}`,
              );

              // If the transformed URL is an event URL, try Graph API
              if (this.facebookService.isFacebookEventUrl(transformResult.transformedUrl)) {
                try {
                  const eventData = await this.facebookService.getEventData(
                    transformResult.transformedUrl,
                  );
                  const result = this.facebookService.convertToKaraokeData(
                    eventData,
                    transformResult.transformedUrl,
                  );

                  // Apply address lookup if needed
                  if (result.shows.length > 0 && !result.shows[0].address) {
                    result.shows[0].address = await this.lookupVenueAddress(result.shows[0].venue);
                  }

                  this.logger.log(
                    `Facebook Graph API parse completed successfully for transformed URL`,
                  );
                  return result;
                } catch (graphError) {
                  this.logger.warn(
                    `Facebook Graph API failed for transformed URL, continuing with Puppeteer: ${graphError.message}`,
                  );
                  // Continue with Puppeteer fallback below
                }
              }
            }
          } catch (geminiError) {
            this.logger.warn(
              `Gemini URL transformation failed, proceeding with Puppeteer: ${geminiError.message}`,
            );
            // Continue with Puppeteer fallback below
          }
        } else {
          // Step 4: For other Facebook URLs, use Gemini to transform URL first
          this.logger.log('Other Facebook URL detected, using Gemini URL transformation');
          try {
            const transformResult = await this.transformFacebookUrlWithGemini(url);

            // Check if Gemini suggested a better URL to try
            if (transformResult.transformedUrl) {
              this.logger.log(
                `Gemini suggested transformed URL: ${transformResult.transformedUrl}`,
              );

              // If the transformed URL is an event URL, try Graph API
              if (this.facebookService.isFacebookEventUrl(transformResult.transformedUrl)) {
                try {
                  const eventData = await this.facebookService.getEventData(
                    transformResult.transformedUrl,
                  );
                  const result = this.facebookService.convertToKaraokeData(
                    eventData,
                    transformResult.transformedUrl,
                  );

                  // Apply address lookup if needed
                  if (result.shows.length > 0 && !result.shows[0].address) {
                    result.shows[0].address = await this.lookupVenueAddress(result.shows[0].venue);
                  }

                  this.logger.log(
                    `Facebook Graph API parse completed successfully for transformed URL`,
                  );
                  return result;
                } catch (graphError) {
                  this.logger.warn(
                    `Facebook Graph API failed for transformed URL, continuing with Puppeteer: ${graphError.message}`,
                  );
                  // Continue with Puppeteer fallback below
                }
              }
            }
          } catch (geminiError) {
            this.logger.warn(
              `Gemini URL transformation failed, proceeding with Puppeteer: ${geminiError.message}`,
            );
            // Continue with Puppeteer fallback below
          }
        }

        // Step 5: Facebook URL Puppeteer fallback with enhanced parsing
        this.logger.log('Using Puppeteer for Facebook URL with enhanced parsing');
      } else {
        // Non-Facebook URL - use standard Puppeteer parsing
        this.logger.log(`Using standard Puppeteer-based parse for non-Facebook URL: ${url}`);
      }

      // Extract clean text content using Puppeteer (for both Facebook fallback and regular URLs)
      const textContent = await this.extractTextContentWithPuppeteer(url);

      // Log content preview for debugging
      this.logger.debug(`Content preview (first 500 chars): ${textContent.substring(0, 500)}...`);
      this.logger.log(`Extracted content length: ${textContent.length} characters`);

      // Parse with Gemini AI using the clean text (enhanced for Facebook if needed)
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

      // Extract clean text content and links
      const extractedData = await page.evaluate(() => {
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

        // Extract links with their text
        const links = Array.from(document.querySelectorAll('a[href]'))
          .map((a) => {
            const href = a.getAttribute('href');
            const text = a.textContent?.trim();

            // Convert relative URLs to absolute URLs
            let fullUrl = href;
            if (
              href &&
              !href.startsWith('http') &&
              !href.startsWith('mailto:') &&
              !href.startsWith('tel:')
            ) {
              try {
                fullUrl = new URL(href, window.location.href).href;
              } catch (e) {
                fullUrl = href; // Keep original if URL parsing fails
              }
            }

            return {
              text: text || '',
              href: fullUrl || '',
              original: href || '',
            };
          })
          .filter((link) => link.text && link.href && link.href.length > 0)
          .slice(0, 50); // Limit to first 50 links to avoid overwhelming the AI

        // Join text with spaces and clean up
        const textContent = textNodes
          .join(' ')
          .replace(/\s+/g, ' ') // Replace multiple spaces with single space
          .trim();

        return {
          textContent,
          links,
        };
      });

      const { textContent, links } = extractedData;

      this.logger.log(
        `Successfully extracted ${textContent.length} characters of text and ${links.length} links from ${url}`,
      );

      if (!textContent || textContent.length < 50) {
        throw new Error('No meaningful text content found on the page');
      }

      // Format links for AI
      const linkInfo = links.map((link) => `"${link.text}" -> ${link.href}`).join('\n');

      // Combine text content with link information
      const fullContent = `TEXT CONTENT:
${textContent}

LINKS FOUND:
${linkInfo}`;

      return fullContent;
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

VENDOR DETECTION PRIORITY:
- Look for business names in titles, headers, contact information
- Check for "DJ" services or "Entertainment" companies  
- Extract from domain names when business names aren't clear (e.g., "stevesdj.com" = "Steve's DJ")
- Look for "About", "Contact", "Owner" sections
- Company names in copyright notices or footers

VENUE WEBSITE/CONTACT EXTRACTION:
- Look for venue websites in links that mention the venue name
- Find phone numbers near venue names or in contact sections
- Extract venue-specific contact information from the text
- Match links to venue names when possible
- Look for "Visit [Venue Name]" or "[Venue Name] Website" type links
- Check for venue contact info in event descriptions

MULTIPLE DAYS HANDLING - CRITICAL:
When you find a single entry that mentions multiple days, you MUST create separate show entries for each day.

Examples:
- "Wednesday, Friday & Sundays 9:30 - 1:30" → Create 3 separate shows (Wednesday, Friday, Sunday)
- "Tuesdays and Thursdays 8-12" → Create 2 separate shows (Tuesday, Thursday)
- "Monday through Friday 7pm" → Create 5 separate shows (Monday, Tuesday, Wednesday, Thursday, Friday)
- "Weekends 9pm-1am" → Create 2 separate shows (Saturday, Sunday)

DIFFERENT TIME HANDLING:
If different days have different times in the same listing, create separate shows with correct times:
- "Wednesday, Friday & Sundays 9:30 - 1:30 (till 2 on Fridays)" →
  * Wednesday: 9:30-1:30
  * Friday: 9:30-2:00 (note the different end time)
  * Sunday: 9:30-1:30

FILTERING RULES - EXCLUDE THESE SHOWS:
- Shows marked as "CLOSED", "CANCELLED", "SUSPENDED", "TEMPORARILY CLOSED"
- Events listed as "UNAVAILABLE", "NO LONGER AVAILABLE", "DISCONTINUED"
- Shows with "PERMANENTLY CLOSED" or "OUT OF BUSINESS"
- Any events explicitly marked as "INACTIVE" or "NOT RUNNING"
- Shows that say "CALL TO CONFIRM" or "MAY BE CANCELLED"

Look for:
1. Business/venue name and details (including owner/contact information)
2. ALL karaoke events, shows, nights, or scheduled performances
3. Dates, times, locations, and DJ/host names
4. Regular weekly schedules (e.g., "Karaoke every Tuesday")
5. Special events or one-time shows
6. **ADDRESSES - SEARCH THOROUGHLY**: Look for ANY location information including street addresses, city names, zip codes, neighborhood names, venue location details
7. Start and end times separately when possible
8. **VENUE CONTACT INFORMATION** - phone numbers and websites for each venue
9. Links that correspond to venue names or locations

CRITICAL ADDRESS EXTRACTION:
- Search the entire content for address information
- Look for patterns like "123 Main St", "Downtown Columbus", "Near OSU Campus"
- Check venue descriptions, contact sections, footer information
- Extract partial addresses if full addresses aren't available
- Look for city, state, zip code information
- Even neighborhood or area names are valuable

Be thorough - extract every karaoke-related event you find, even if incomplete.
IMPORTANT: When you find a venue name, look for any associated website URL or phone number in the surrounding text or links.
CRITICAL: Do NOT include shows that are marked as closed, cancelled, suspended, or unavailable in any way.
CRITICAL: When a single text entry mentions multiple days, create separate show objects for EACH DAY mentioned.

Return JSON in this exact format (no additional text or markdown):
{
  "vendor": {
    "name": "Business Name (if unclear, derive from URL like 'stevesdj.com' = 'Steve's DJ')",
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
      "venuePhone": "Venue phone number if found (format: (xxx) xxx-xxxx)",
      "venueWebsite": "Venue website URL if found (include http:// or https://)",
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

EXAMPLE: If you find "O'Bryan's on Sancus - Wednesday, Friday & Sundays 9:30 - 1:30 (till 2 on Fridays) With KJ John"
Create THREE separate show entries:
{
  "venue": "O'Bryan's on Sancus",
  "address": "Address if available in the content",
  "day": "wednesday", 
  "startTime": "21:30",
  "endTime": "01:30",
  "djName": "KJ John"
},
{
  "venue": "O'Bryan's on Sancus",
  "address": "Address if available in the content",
  "day": "friday",
  "startTime": "21:30", 
  "endTime": "02:00",
  "djName": "KJ John"
},
{
  "venue": "O'Bryan's on Sancus",
  "address": "Address if available in the content",
  "day": "sunday",
  "startTime": "21:30",
  "endTime": "01:30", 
  "djName": "KJ John"
}

IMPORTANT: 
- Include ALL karaoke events you find, even recurring weekly ones
- For recurring events, create multiple show entries or use descriptive dates
- If you find "Karaoke every Tuesday 8pm", create a show entry
- Extract partial information rather than skipping events
- Use high confidence for clearly stated information
- If no shows found, use empty arrays
- Focus on karaoke-specific events
- ALWAYS provide a vendor name, even if derived from the URL domain

Website URL: ${url}
Website Content:
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

      // Log vendor detection for debugging
      if (
        !parsedData.vendor ||
        !parsedData.vendor.name ||
        parsedData.vendor.name === 'Unknown Business'
      ) {
        this.logger.warn(
          `Vendor not detected from AI, falling back to URL-based generation for ${url}`,
        );
      } else {
        this.logger.log(
          `Vendor detected: ${parsedData.vendor.name} (confidence: ${parsedData.vendor.confidence})`,
        );
      }

      // Ensure required structure with defaults
      const finalData: ParsedKaraokeData = {
        vendor: parsedData.vendor || this.generateVendorFromUrl(url),
        djs: Array.isArray(parsedData.djs)
          ? this.filterDuplicateDjs(parsedData.djs, parsedData)
          : [],
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

      // Debug logging for address fields
      if (finalData.shows) {
        finalData.shows.forEach((show, index) => {
          this.logger.debug(
            `Show ${index + 1}: ${show.venue} - Address: ${show.address || 'No address'}`,
          );
          if (!show.address) {
            this.logger.warn(`Missing address for venue: ${show.venue}`);
          }
        });
      }

      return finalData;
    } catch (error) {
      this.logger.error('Error parsing with Gemini:', error);
      throw new Error(`AI parsing failed: ${error.message}`);
    }
  }

  /**
   * Parse Facebook profile data using Gemini AI
   * Takes structured Facebook data and sends it to Gemini for intelligent karaoke show extraction
   */
  private async parseWithGeminiFromFacebookData(
    facebookData: any,
    url: string,
  ): Promise<ParsedKaraokeData> {
    try {
      this.logger.log('Starting Gemini AI parsing with Facebook profile data');

      // Use gemini-1.5-pro for better quality parsing
      const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });

      // Create a focused prompt that handles both schedule and posts
      const prompt = `Extract karaoke shows from this Facebook profile data.

IMPORTANT: Process BOTH the "schedule" array AND "recentPosts" array for complete show information.

Requirements:
1. For each item in "schedule" array - create a show entry
2. For items in "recentPosts" - extract any additional shows mentioned  
3. Convert day names to lowercase (wednesday → wednesday, etc.)
4. Convert times to 24-hour format (8pm → 20:00, 2am → 02:00)
5. Use high confidence (0.9) for schedule data, medium (0.7) for posts

Return JSON only (no markdown):
{
  "vendor": {
    "name": "${facebookData.profileInfo?.name || 'Facebook Profile'}",
    "owner": "${facebookData.profileInfo?.name || 'Profile Owner'}",
    "website": "${url}",
    "description": "${facebookData.profileInfo?.bio || 'Facebook profile'}",
    "confidence": 0.95
  },
  "djs": [
    {
      "name": "${facebookData.profileInfo?.name || 'DJ'}",
      "confidence": 0.9,
      "context": "Facebook Profile",
      "aliases": ["${facebookData.profileInfo?.instagram || 'instagram'}"]
    }
  ],
  "shows": [
    {
      "venue": "venue name",
      "address": "city if available", 
      "date": "day-of-week",
      "time": "original time format",
      "startTime": "HH:MM",
      "endTime": "HH:MM", 
      "day": "lowercase day name",
      "djName": "${facebookData.profileInfo?.name || 'DJ'}",
      "confidence": 0.9
    }
  ]
}

Facebook Data:
${JSON.stringify(facebookData, null, 2)}`;

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
              `Quota exceeded for Facebook data parsing, attempt ${attempts}/${maxAttempts}. Waiting before retry...`,
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

      this.logger.log('Gemini response received for Facebook data, extracting JSON');
      this.logger.debug(`Raw Gemini response for Facebook data: ${text.substring(0, 500)}...`);

      // Extract JSON from response
      const cleanedResponse = this.cleanGeminiResponse(text);
      let parsedData: ParsedKaraokeData;

      try {
        parsedData = JSON.parse(cleanedResponse);
      } catch (parseError) {
        this.logger.error('Failed to parse Gemini JSON response for Facebook data:', parseError);
        this.logger.error('Raw response:', cleanedResponse);
        throw new Error('Invalid JSON response from Gemini for Facebook data');
      }

      // Log parsing results
      if (parsedData.vendor) {
        this.logger.log(
          `Facebook vendor detected: ${parsedData.vendor.name} (confidence: ${parsedData.vendor.confidence})`,
        );
      }

      // Ensure required structure with defaults for Facebook data
      const finalData: ParsedKaraokeData = {
        vendor: parsedData.vendor || {
          name: facebookData.profileInfo?.name || 'Unknown DJ',
          website: url,
          description: facebookData.profileInfo?.bio || 'Facebook DJ Profile',
          confidence: 0.8,
        },
        djs: Array.isArray(parsedData.djs)
          ? this.filterDuplicateDjs(parsedData.djs, parsedData)
          : facebookData.profileInfo?.name
            ? [
                {
                  name: facebookData.profileInfo.name,
                  confidence: 0.9,
                  context: 'Facebook Profile',
                  aliases: facebookData.profileInfo.instagram
                    ? [facebookData.profileInfo.instagram]
                    : [],
                },
              ]
            : [],
        shows: Array.isArray(parsedData.shows) ? parsedData.shows : [],
        rawData: {
          url: url,
          title: `Facebook Profile: ${facebookData.profileInfo?.name || 'Unknown'}`,
          content: JSON.stringify(facebookData, null, 2),
          parsedAt: new Date(),
        },
      };

      this.logger.log(
        `Facebook data parsing completed: ${finalData.shows.length} shows, ${finalData.djs.length} DJs found`,
      );

      // Debug logging for Facebook shows
      if (finalData.shows) {
        finalData.shows.forEach((show, index) => {
          this.logger.debug(
            `Facebook Show ${index + 1}: ${show.venue} on ${show.day} at ${show.time} - Address: ${show.address || 'No address'}`,
          );
        });
      }

      return finalData;
    } catch (error) {
      this.logger.error('Error parsing Facebook data with Gemini:', error);
      throw new Error(`Facebook AI parsing failed: ${error.message}`);
    }
  }

  private extractTitleFromContent(content: string): string {
    // Extract a reasonable title from the first part of the content
    const firstLine = content.split('\n')[0] || content.split('.')[0];
    return firstLine.trim().substring(0, 100) || 'Unknown Title';
  }

  private cleanGeminiResponse(text: string): string {
    // Remove markdown code blocks and other formatting
    let cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '');

    // Extract JSON from response if it contains extra text
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      cleaned = jsonMatch[0];
    }

    return cleaned.trim();
  }

  private generateVendorFromUrl(url: string): any {
    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname.replace('www.', '');

      // Extract business name from domain
      let businessName = 'Unknown Business';

      if (domain.includes('stevesdj.com')) {
        businessName = "Steve's DJ Services";
      } else if (domain.includes('dj')) {
        // Generic DJ domain
        const domainParts = domain.split('.')[0];
        businessName = domainParts.charAt(0).toUpperCase() + domainParts.slice(1) + ' DJ Services';
      } else {
        // Try to extract from domain name
        const domainParts = domain.split('.')[0];
        businessName = domainParts.charAt(0).toUpperCase() + domainParts.slice(1);
      }

      return {
        name: businessName,
        website: url,
        description: `Karaoke and entertainment services from ${domain}`,
        confidence: 0.3, // Lower confidence since it's derived from URL
      };
    } catch (error) {
      return {
        name: 'Unknown Business',
        website: url,
        confidence: 0.1,
      };
    }
  }

  /**
   * Filter out DJs that match venue names
   * More precise check: only filter if DJ name exactly matches a venue name
   */
  private filterDuplicateDjs(djs: any[], parsedData: any): any[] {
    if (!Array.isArray(djs) || !parsedData?.shows) {
      return djs;
    }

    // Get all venue names from shows
    const venueNames = parsedData.shows
      .map((show) => show.venue?.toLowerCase().trim())
      .filter(Boolean);

    const filteredDjs = djs.filter((dj) => {
      if (!dj.name) return false;

      const djName = dj.name.toLowerCase().trim();

      // Only filter if DJ name exactly matches a venue name (not partial matches)
      const exactlyMatchesVenue = venueNames.some((venueName) => {
        return djName === venueName;
      });

      if (exactlyMatchesVenue) {
        this.logger.log(`Filtered out DJ "${dj.name}" as it exactly matches venue name`);
        return false;
      }

      return true;
    });

    this.logger.log(
      `DJ filtering: ${djs.length} -> ${filteredDjs.length} (removed ${djs.length - filteredDjs.length} exact venue matches)`,
    );
    return filteredDjs;
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

      if (vendor) {
        // Vendor exists - merge missing data
        let hasUpdates = false;

        if (!vendor.description && data.vendor.description) {
          vendor.description = data.vendor.description;
          hasUpdates = true;
        }

        if (!vendor.website && data.vendor.website) {
          vendor.website = data.vendor.website;
          hasUpdates = true;
        }

        // Save updates if any
        if (hasUpdates) {
          vendor = await this.vendorRepository.save(vendor);
          this.logger.log(`Updated vendor ${vendor.name} with missing data`);
        }
      } else {
        // Create new vendor
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

      // 2. Create or find DJs with enhanced nickname matching
      const djMap = await this.enhancedDJMatching(data.djs);

      // For any DJs that didn't match, create new ones
      for (const djData of data.djs) {
        if (!djMap.has(djData.name)) {
          // Create new DJ
          const dj = this.djRepository.create({
            name: djData.name,
            vendorId: vendor.id,
            isActive: true,
          });
          const savedDJ = await this.djRepository.save(dj);
          djMap.set(djData.name, savedDJ);
          this.logger.log(`Created new DJ: ${savedDJ.name} for vendor: ${vendor.name}`);

          // Add any aliases found in the AI data
          if (djData.aliases && Array.isArray(djData.aliases)) {
            for (const alias of djData.aliases) {
              try {
                await this.djNicknameService.addNickname(
                  savedDJ.id,
                  alias,
                  alias.startsWith('@') ? 'social_handle' : 'alias',
                  alias.startsWith('@') ? 'facebook' : undefined,
                );
              } catch (error) {
                this.logger.warn(
                  `Could not add nickname ${alias} for new DJ ${savedDJ.name}:`,
                  error,
                );
              }
            }
          }
        }
      }

      // 3. Create or Update Shows
      const showsCreated = [];
      const showsUpdated = [];

      for (const showData of data.shows) {
        // Filter out closed or unavailable shows
        if (this.isShowClosed(showData)) {
          this.logger.log(
            `Filtering out closed show: ${showData.venue} - ${showData.description || 'no description'}`,
          );
          continue;
        }

        // Enhance show with address lookup if address is missing
        const enhancedShowData = await this.enhanceShowWithAddress(showData);

        // Handle date parsing for recurring shows vs specific dates
        let parsedDate: Date | null = null;
        let dayOfWeek: string | null = null;

        // Check if this is a day of the week (recurring show) or a specific date
        const validDays = [
          'monday',
          'tuesday',
          'wednesday',
          'thursday',
          'friday',
          'saturday',
          'sunday',
        ];
        if (
          validDays.includes(enhancedShowData.date?.toLowerCase()) ||
          validDays.includes(enhancedShowData.day?.toLowerCase())
        ) {
          // This is a recurring weekly show
          dayOfWeek = (enhancedShowData.day || enhancedShowData.date).toLowerCase();
          parsedDate = null; // No specific date for recurring shows
          this.logger.log(`Processing recurring show: ${enhancedShowData.venue} on ${dayOfWeek}s`);
        } else {
          // Try to parse as a specific date
          try {
            parsedDate = new Date(enhancedShowData.date);
            if (isNaN(parsedDate.getTime())) {
              // If date parsing fails, treat as recurring show
              parsedDate = null;
              dayOfWeek = enhancedShowData.day?.toLowerCase() || null;
              this.logger.warn(
                `Could not parse date: ${enhancedShowData.date}, treating as recurring show`,
              );
            }
          } catch (error) {
            parsedDate = null;
            dayOfWeek = enhancedShowData.day?.toLowerCase() || null;
            this.logger.warn(
              `Error parsing date: ${enhancedShowData.date}, treating as recurring show`,
            );
          }
        }

        // Find the appropriate DJ
        const dj = enhancedShowData.djName ? djMap.get(enhancedShowData.djName) : null;

        // Exact duplicate detection - strict matching on all criteria
        const existingShow = await this.findExistingShowExact(
          enhancedShowData,
          vendor.id,
          dj?.id || null,
          dayOfWeek,
          parsedDate,
        );

        if (existingShow) {
          // Update existing show with new data (only if new data is not null/empty)
          const updated = await this.updateShowWithNewData(existingShow, enhancedShowData, dj?.id);
          if (updated) {
            showsUpdated.push(existingShow);
            this.logger.log(`Updated existing show: ${existingShow.venue} with new data`);
          }
        } else {
          // Create new show
          const newShow = await this.createNewShow(enhancedShowData, vendor.id, dj?.id, parsedDate);
          showsCreated.push(newShow);
          this.logger.log(
            `Created new show: ${newShow.venue} on ${newShow.date} ${dj ? `with DJ: ${dj.name}` : ''}`,
          );
        }
      }

      this.logger.log(
        `Successfully processed entities: Vendor: ${vendor.name}, DJs: ${djMap.size}, Shows Created: ${showsCreated.length}, Shows Updated: ${showsUpdated.length}`,
      );
    } catch (error) {
      this.logger.error(`Error creating entities from approved data:`, error);
      throw error;
    }
  }

  private async findExistingShow(showData: any, vendorId: string, parsedDate: Date): Promise<any> {
    // Try multiple matching strategies to find duplicates

    // Strategy 1: Exact venue, date, and vendor match
    let existingShow = await this.showRepository.findOne({
      where: {
        venue: showData.venue,
        date: parsedDate,
        vendorId: vendorId,
      },
    });

    if (existingShow) {
      return existingShow;
    }

    // Strategy 2: Venue and day of week match (for recurring shows)
    if (showData.day) {
      const dayLower = showData.day.toLowerCase();
      existingShow = await this.showRepository.findOne({
        where: {
          venue: showData.venue,
          day: dayLower as any,
          vendorId: vendorId,
        },
      });

      if (existingShow) {
        return existingShow;
      }
    }

    // Strategy 3: Venue and time match (for shows with same venue and time)
    if (showData.time) {
      existingShow = await this.showRepository.findOne({
        where: {
          venue: showData.venue,
          time: showData.time,
          vendorId: vendorId,
        },
      });

      if (existingShow) {
        return existingShow;
      }
    }

    // Strategy 4: Address match (for same venue with slightly different names)
    if (showData.address) {
      const allShowsForVendor = await this.showRepository.find({
        where: { vendorId: vendorId },
      });

      for (const show of allShowsForVendor) {
        if (show.address && this.isSimilarAddress(showData.address, show.address)) {
          // If addresses match and venues are similar, consider it a duplicate
          if (this.isSimilarVenue(showData.venue, show.venue)) {
            return show;
          }
        }
      }
    }

    return null;
  }

  private async findExistingShowExact(
    showData: any,
    vendorId: string,
    djId: string | null,
    dayOfWeek: string | null,
    parsedDate: Date,
  ): Promise<any> {
    // Simplified duplicate detection: venue + day + time (the core essentials)
    // Don't require DJ or address matching since those might be missing

    // First, get all shows for the same day
    const baseCondition: any = {
      vendorId: vendorId,
    };

    // For recurring shows (day of week provided), match by day
    if (dayOfWeek) {
      baseCondition.day = dayOfWeek;
    } else {
      // For specific date shows, match by date
      baseCondition.date = parsedDate;
    }

    // Get all potential matches for this vendor and day
    const potentialMatches = await this.showRepository.find({
      where: baseCondition,
    });

    // Now check each match for venue and time equivalence (core criteria)
    for (const existingShow of potentialMatches) {
      const venueMatches = this.isSimilarVenue(existingShow.venue, showData.venue);
      const timeMatches = this.areTimesEquivalent(existingShow.time, showData.time);

      // Core duplicate criteria: same venue + same time on same day
      if (venueMatches && timeMatches) {
        this.logger.log(
          `Found duplicate: ${showData.venue} on ${dayOfWeek || parsedDate.toDateString()} at ${showData.time} (matches existing: ${existingShow.venue} at ${existingShow.time})`,
        );
        return existingShow;
      }
    }

    return null;
  }

  /**
   * Normalize time strings for comparison
   * Handles formats like "9:30 PM - 2:00 AM", "fri 9-1", "9pm-1am", etc.
   */
  private normalizeTimeForComparison(
    timeStr: string,
  ): { startTime: string; endTime: string } | null {
    if (!timeStr) return null;

    try {
      // Remove day prefixes like "fri", "friday", etc.
      let cleanTime = timeStr.toLowerCase().replace(/^(mon|tue|wed|thu|fri|sat|sun)\w*\s*/i, '');

      // Handle various time formats
      const timePatterns = [
        // "9:30 PM - 2:00 AM"
        /(\d{1,2}):(\d{2})\s*(am|pm)\s*-\s*(\d{1,2}):(\d{2})\s*(am|pm)/i,
        // "9:30PM-2:00AM" (no spaces)
        /(\d{1,2}):(\d{2})(am|pm)\s*-\s*(\d{1,2}):(\d{2})(am|pm)/i,
        // "9pm-2am"
        /(\d{1,2})(am|pm)\s*-\s*(\d{1,2})(am|pm)/i,
        // "9-2" (assume PM to AM)
        /(\d{1,2})\s*-\s*(\d{1,2})$/,
        // "9:30-2:00"
        /(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})$/,
      ];

      for (const pattern of timePatterns) {
        const match = cleanTime.match(pattern);
        if (match) {
          let startHour,
            startMin = '00',
            startPeriod;
          let endHour,
            endMin = '00',
            endPeriod;

          if (pattern.source.includes('am|pm')) {
            // Patterns with AM/PM
            if (match.length >= 7) {
              // Full format with minutes
              [, startHour, startMin, startPeriod, endHour, endMin, endPeriod] = match;
            } else {
              // Simplified format without minutes
              [, startHour, startPeriod, endHour, endPeriod] = match;
            }
          } else {
            // Patterns without AM/PM - assume PM to AM for typical karaoke hours
            if (match.length >= 5) {
              // With minutes
              [, startHour, startMin, endHour, endMin] = match;
            } else {
              // Without minutes
              [, startHour, endHour] = match;
            }
            startPeriod = 'pm';
            endPeriod = 'am';
          }

          // Normalize to 24-hour format
          const startTime24 = this.convertTo24Hour(startHour, startMin, startPeriod);
          const endTime24 = this.convertTo24Hour(endHour, endMin, endPeriod);

          return {
            startTime: startTime24,
            endTime: endTime24,
          };
        }
      }

      this.logger.warn(`Could not parse time format: ${timeStr}`);
      return null;
    } catch (error) {
      this.logger.error(`Error normalizing time "${timeStr}":`, error);
      return null;
    }
  }

  private convertTo24Hour(hour: string, minute: string = '00', period?: string): string {
    let h = parseInt(hour);
    const m = parseInt(minute);

    if (period) {
      if (period.toLowerCase() === 'pm' && h !== 12) h += 12;
      if (period.toLowerCase() === 'am' && h === 12) h = 0;
    }

    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }

  /**
   * Compare two time strings for equivalence
   */
  private areTimesEquivalent(time1: string, time2: string): boolean {
    const normalized1 = this.normalizeTimeForComparison(time1);
    const normalized2 = this.normalizeTimeForComparison(time2);

    if (!normalized1 || !normalized2) {
      // Fallback to exact string comparison if parsing fails
      return time1.trim().toLowerCase() === time2.trim().toLowerCase();
    }

    return (
      normalized1.startTime === normalized2.startTime && normalized1.endTime === normalized2.endTime
    );
  }

  private isSimilarAddress(addr1: string, addr2: string): boolean {
    // Simple similarity check for addresses
    const normalize = (addr: string) => addr.toLowerCase().replace(/[^a-z0-9]/g, '');
    return normalize(addr1) === normalize(addr2);
  }

  private isSimilarVenue(venue1: string, venue2: string): boolean {
    // Simple similarity check for venue names
    const normalize = (venue: string) => venue.toLowerCase().replace(/[^a-z0-9]/g, '');
    const norm1 = normalize(venue1);
    const norm2 = normalize(venue2);

    // Check if one venue name contains the other or they're very similar
    return norm1.includes(norm2) || norm2.includes(norm1) || norm1 === norm2;
  }

  /**
   * Enhanced show update that intelligently merges new data with existing data
   * Updates fields only if they provide more detailed or accurate information
   */
  private async updateShowWithNewData(
    existingShow: any,
    showData: any,
    djId?: string,
  ): Promise<boolean> {
    let hasUpdates = false;

    // Address: Update if new data is more specific or existing is empty
    if (
      showData.address &&
      (!existingShow.address || showData.address.length > existingShow.address.length)
    ) {
      existingShow.address = showData.address;
      hasUpdates = true;
      this.logger.debug(`Updated address: "${existingShow.address}" -> "${showData.address}"`);
    }

    // Venue phone: Update if new data exists and existing is empty or new is more complete
    if (
      showData.venuePhone &&
      (!existingShow.venuePhone ||
        this.isPhoneNumberMoreComplete(showData.venuePhone, existingShow.venuePhone))
    ) {
      existingShow.venuePhone = showData.venuePhone;
      hasUpdates = true;
      this.logger.debug(
        `Updated venue phone: "${existingShow.venuePhone}" -> "${showData.venuePhone}"`,
      );
    }

    // Venue website: Update if new data exists and existing is empty
    if (showData.venueWebsite && !existingShow.venueWebsite) {
      existingShow.venueWebsite = showData.venueWebsite;
      hasUpdates = true;
      this.logger.debug(`Updated venue website: "${showData.venueWebsite}"`);
    }

    // Start time: Update if new data is more specific or existing is empty
    if (
      showData.startTime &&
      (!existingShow.startTime ||
        this.isTimeMoreSpecific(showData.startTime, existingShow.startTime))
    ) {
      existingShow.startTime = showData.startTime;
      hasUpdates = true;
      this.logger.debug(
        `Updated start time: "${existingShow.startTime}" -> "${showData.startTime}"`,
      );
    }

    // End time: Update if new data is more specific or existing is empty
    if (
      showData.endTime &&
      (!existingShow.endTime || this.isTimeMoreSpecific(showData.endTime, existingShow.endTime))
    ) {
      existingShow.endTime = showData.endTime;
      hasUpdates = true;
      this.logger.debug(`Updated end time: "${existingShow.endTime}" -> "${showData.endTime}"`);
    }

    // Description: Merge descriptions intelligently
    if (
      showData.description &&
      (!existingShow.description || showData.description.length > existingShow.description.length)
    ) {
      existingShow.description = showData.description;
      hasUpdates = true;
      this.logger.debug(`Updated description: "${showData.description}"`);
    }

    // Notes: Append new notes or replace if existing is empty
    if (showData.notes) {
      if (!existingShow.notes) {
        existingShow.notes = showData.notes;
        hasUpdates = true;
        this.logger.debug(`Added notes: "${showData.notes}"`);
      } else if (!existingShow.notes.includes(showData.notes)) {
        existingShow.notes = `${existingShow.notes}; ${showData.notes}`;
        hasUpdates = true;
        this.logger.debug(`Appended notes: "${showData.notes}"`);
      }
    }

    // DJ assignment: Update if new DJ provided and existing is empty
    if (djId && !existingShow.djId) {
      existingShow.djId = djId;
      hasUpdates = true;
      this.logger.debug(`Added DJ assignment: ${djId}`);
    }

    // Day of week: Update if new data exists and existing is empty
    if (showData.day && !existingShow.day) {
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
        existingShow.day = dayLower;
        hasUpdates = true;
        this.logger.debug(`Updated day: "${dayLower}"`);
      }
    }

    // Save updates if any were made
    if (hasUpdates) {
      await this.showRepository.save(existingShow);
      this.logger.log(
        `Updated show "${existingShow.venue}" with ${this.getUpdateSummary(showData)} new data`,
      );
    }

    return hasUpdates;
  }

  /**
   * Helper method to determine if a phone number is more complete
   */
  private isPhoneNumberMoreComplete(newPhone: string, existingPhone: string): boolean {
    const newClean = newPhone.replace(/\D/g, '');
    const existingClean = existingPhone.replace(/\D/g, '');
    return newClean.length > existingClean.length;
  }

  /**
   * Helper method to determine if a time is more specific
   */
  private isTimeMoreSpecific(newTime: string, existingTime: string): boolean {
    // Prefer HH:MM format over general descriptions
    const timeRegex = /^\d{1,2}:\d{2}$/;
    const newIsFormatted = timeRegex.test(newTime);
    const existingIsFormatted = timeRegex.test(existingTime);

    if (newIsFormatted && !existingIsFormatted) return true;
    if (!newIsFormatted && existingIsFormatted) return false;

    // If both are formatted or both are descriptions, prefer the new one if it's longer
    return newTime.length > existingTime.length;
  }

  /**
   * Helper method to create update summary for logging
   */
  private getUpdateSummary(showData: any): string {
    const updates = [];
    if (showData.address) updates.push('address');
    if (showData.venuePhone) updates.push('phone');
    if (showData.venueWebsite) updates.push('website');
    if (showData.startTime) updates.push('start time');
    if (showData.endTime) updates.push('end time');
    if (showData.description) updates.push('description');
    if (showData.notes) updates.push('notes');
    if (showData.day) updates.push('day');

    return updates.join(', ');
  }

  /**
   * Look up address for a venue using OpenStreetMap Nominatim API (free)
   */
  private async lookupVenueAddress(venueName: string): Promise<string | null> {
    try {
      // Rate limiting: Wait 1 second between requests (Nominatim requirement)
      await new Promise((resolve) => setTimeout(resolve, 1000));

      this.logger.log(`Looking up address for venue: ${venueName}`);

      // Try multiple search strategies for better results
      const searchQueries = [
        `${venueName} bar Columbus Ohio`, // Try as bar first
        `${venueName} pub Columbus Ohio`, // Try as pub
        `${venueName} restaurant Columbus Ohio`, // Try as restaurant
        `${venueName} Columbus Ohio`, // Generic search
      ];

      for (const searchQuery of searchQueries) {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=3&addressdetails=1`;

        this.logger.log(`Trying search: ${searchQuery}`);

        const response = await fetch(url, {
          headers: {
            'User-Agent': 'KaraokePal/1.0 (karaoke.app.contact@gmail.com)',
          },
        });

        if (!response.ok) {
          this.logger.warn(`Address lookup failed for ${venueName}: HTTP ${response.status}`);
          continue;
        }

        const data = await response.json();
        this.logger.log(`API returned ${data.length} results for "${searchQuery}"`);

        if (data.length > 0) {
          this.logger.log(
            `Sample results: ${JSON.stringify(data.slice(0, 2).map((r) => ({ display_name: r.display_name, type: r.type, class: r.class, has_house_number: !!r.address?.house_number })))}`,
          );
        }

        if (data.length > 0) {
          // Look for the best match - prefer specific venues over generic areas
          for (const result of data) {
            // Skip results that are just city/county level
            if (result.type === 'city' || result.type === 'county' || result.type === 'state') {
              continue;
            }

            // Prefer results with house numbers (indicating specific addresses)
            if (result.address && result.address.house_number) {
              const address = result.display_name;
              this.logger.log(`Found specific address for ${venueName}: ${address}`);
              return address;
            }
          }

          // If no specific address found, use the first non-city result
          const firstResult = data.find(
            (r) => r.type !== 'city' && r.type !== 'county' && r.type !== 'state',
          );
          if (firstResult) {
            const address = firstResult.display_name;
            this.logger.log(`Found general address for ${venueName}: ${address}`);
            return address;
          }
        }

        // Add delay between different search attempts
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      this.logger.log(`No specific address found for venue: ${venueName} using OpenStreetMap`);

      // Fallback to Google Geocoding
      this.logger.log(`Trying Google Geocoding as fallback for: ${venueName}`);
      try {
        const googleResult = await this.geocodingService.geocodeAddress(
          `${venueName} Columbus Ohio`,
        );
        if (googleResult && googleResult.formatted_address) {
          this.logger.log(
            `Found address via Google Geocoding for ${venueName}: ${googleResult.formatted_address}`,
          );
          return googleResult.formatted_address;
        }

        // Try without Columbus Ohio if first attempt fails
        const googleResult2 = await this.geocodingService.geocodeAddress(venueName);
        if (googleResult2 && googleResult2.formatted_address) {
          this.logger.log(
            `Found address via Google Geocoding (broader search) for ${venueName}: ${googleResult2.formatted_address}`,
          );
          return googleResult2.formatted_address;
        }
      } catch (error) {
        this.logger.warn(`Google Geocoding also failed for ${venueName}:`, error.message);
      }

      this.logger.log(`No address found for venue: ${venueName} using any service`);
      return null;
    } catch (error) {
      this.logger.warn(`Failed to lookup address for venue: ${venueName}`, error.message);
      return null;
    }
  }

  /**
   * Enhance show data with address lookup if address is missing
   */
  private async enhanceShowWithAddress(showData: any): Promise<any> {
    // If show already has an address, don't look it up
    if (showData.address && showData.address.trim() !== '') {
      this.logger.log(`Show already has address: ${showData.venue} - ${showData.address}`);
      return showData;
    }

    // Only look up if we have a venue name
    if (!showData.venue || showData.venue.trim() === '') {
      this.logger.log(`No venue name to lookup address for: ${JSON.stringify(showData)}`);
      return showData;
    }

    this.logger.log(`Looking up address for venue: ${showData.venue}`);
    try {
      const address = await this.lookupVenueAddress(showData.venue);
      if (address) {
        this.logger.log(`Found address for ${showData.venue}: ${address}`);
        return {
          ...showData,
          address: address,
        };
      } else {
        this.logger.log(`No address found for venue: ${showData.venue}`);
      }
    } catch (error) {
      this.logger.warn(`Address enhancement failed for venue: ${showData.venue}`, error);
    }

    return showData;
  }

  private async createNewShow(
    showData: any,
    vendorId: string,
    djId?: string,
    parsedDate?: Date,
  ): Promise<any> {
    // Parse day of week from the day field
    let dayOfWeek = null;
    let isRecurringShow = false;

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
        isRecurringShow = true;
      }
    }

    // For recurring shows, set date to null or a representative date
    // For specific date shows, use the parsed date
    let showDate = null;
    if (!isRecurringShow && parsedDate && !isNaN(parsedDate.getTime())) {
      showDate = parsedDate;
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
      venuePhone: showData.venuePhone || null,
      venueWebsite: showData.venueWebsite || null,
      date: showDate, // null for recurring shows, actual date for specific shows
      time: showData.time,
      startTime: startTime,
      endTime: endTime,
      day: dayOfWeek, // day of week for recurring shows
      description: showData.description || `Show at ${showData.venue}`,
      notes: showData.notes || null,
      vendorId: vendorId,
      djId: djId || null,
      isActive: true,
    });

    const savedShow = await this.showRepository.save(show);

    this.logger.log(
      `Created new ${isRecurringShow ? 'recurring' : 'specific'} show: ${savedShow.venue} ${
        isRecurringShow ? `every ${dayOfWeek}` : `on ${showDate?.toDateString()}`
      } at ${savedShow.time}`,
    );

    return savedShow;
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

  async approveAllItems(parsedScheduleId: string): Promise<any> {
    const parsedSchedule = await this.parsedScheduleRepository.findOne({
      where: { id: parsedScheduleId },
    });

    if (!parsedSchedule) {
      throw new Error('Parsed schedule not found');
    }

    const aiAnalysis = parsedSchedule.aiAnalysis;
    if (!aiAnalysis) {
      throw new Error('No AI analysis data found for this schedule');
    }

    // Use the existing approveAndSaveParsedData method with all data
    const result = await this.approveAndSaveParsedData(parsedScheduleId, aiAnalysis);

    this.logger.log(`Approved all items for parsed schedule ${parsedScheduleId}`);
    return result;
  }

  async rejectSchedule(parsedScheduleId: string, reason?: string): Promise<void> {
    const parsedSchedule = await this.parsedScheduleRepository.findOne({
      where: { id: parsedScheduleId },
    });

    if (!parsedSchedule) {
      throw new Error('Parsed schedule not found');
    }

    parsedSchedule.status = ParseStatus.REJECTED;
    parsedSchedule.rejectionReason = reason || 'Rejected by admin';
    parsedSchedule.updatedAt = new Date();

    await this.parsedScheduleRepository.save(parsedSchedule);
    this.logger.log(
      `Rejected parsed schedule ${parsedScheduleId}: ${reason || 'No reason provided'}`,
    );
  }

  async cleanupInvalidPendingReviews(): Promise<number> {
    const result = await this.parsedScheduleRepository.delete({ status: ParseStatus.REJECTED });
    return result.affected || 0;
  }

  async cleanupAllPendingReviews(): Promise<number> {
    const result = await this.parsedScheduleRepository.delete({ status: ParseStatus.PENDING });
    return result.affected || 0;
  }

  /**
   * Check if a show should be filtered out due to being closed, cancelled, or unavailable
   */
  private isShowClosed(show: any): boolean {
    if (!show) return false;

    const textToCheck = [
      show.venue?.toLowerCase() || '',
      show.description?.toLowerCase() || '',
      show.notes?.toLowerCase() || '',
      show.status?.toLowerCase() || '',
    ].join(' ');

    const closureKeywords = [
      'closed',
      'cancelled',
      'canceled',
      'suspended',
      'temporarily closed',
      'permanently closed',
      'unavailable',
      'no longer available',
      'discontinued',
      'out of business',
      'inactive',
      'not running',
      'call to confirm',
      'may be cancelled',
      'may be canceled',
    ];

    return closureKeywords.some((keyword) => textToCheck.includes(keyword));
  }

  async getAllParsedSchedulesForDebug(): Promise<ParsedSchedule[]> {
    return await this.parsedScheduleRepository.find({
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }

  /**
   * Save manual show submission for admin review
   */
  async saveManualSubmissionForReview(vendorId: string, manualData: any): Promise<ParsedSchedule> {
    try {
      // Get vendor info for the manual submission
      const vendor = await this.vendorRepository.findOne({
        where: { id: vendorId },
      });

      if (!vendor) {
        throw new Error(`Vendor with ID ${vendorId} not found`);
      }

      // Update the vendor info in manual data
      manualData.vendor.name = vendor.name;
      manualData.vendor.website = vendor.website || manualData.vendor.website;

      // Enhance shows with address lookup if missing
      if (manualData.shows && Array.isArray(manualData.shows)) {
        for (let i = 0; i < manualData.shows.length; i++) {
          manualData.shows[i] = await this.enhanceShowWithAddress(manualData.shows[i]);
        }
      }

      // Create a parsed schedule entry for the manual submission
      const parsedSchedule = this.parsedScheduleRepository.create({
        url: `manual-submission-${Date.now()}`,
        rawData: { manualSubmission: true, submittedAt: new Date() },
        aiAnalysis: manualData,
        status: ParseStatus.PENDING,
        vendorId: vendorId,
      });

      const savedSchedule = await this.parsedScheduleRepository.save(parsedSchedule);

      this.logger.log(`Created manual submission for review: ${savedSchedule.id}`);
      return savedSchedule;
    } catch (error) {
      this.logger.error('Error saving manual submission for review:', error);
      throw error;
    }
  }

  /**
   * Test method to verify time normalization works correctly
   */
  testTimeNormalization(): void {
    const testCases = [
      '9:30 PM - 2:00 AM',
      'fri 9-1',
      '9pm-1am',
      '9:30PM-2:00AM',
      '9-1',
      '9:30-2:00',
      'friday 9:30 PM - 2:00 AM',
    ];

    this.logger.log('Testing time normalization:');
    testCases.forEach((testCase) => {
      const normalized = this.normalizeTimeForComparison(testCase);
      this.logger.log(`"${testCase}" -> ${JSON.stringify(normalized)}`);
    });

    // Test equivalence
    const equivalentPairs = [
      ['9:30 PM - 2:00 AM', 'fri 9:30pm-2:00am'],
      ['9-1', '9pm-1am'],
      ['friday 9:30 PM - 2:00 AM', '9:30PM-2:00AM'],
    ];

    this.logger.log('Testing time equivalence:');
    equivalentPairs.forEach(([time1, time2]) => {
      const areEqual = this.areTimesEquivalent(time1, time2);
      this.logger.log(`"${time1}" === "${time2}": ${areEqual}`);
    });
  }

  /**
   * Test method for address lookup functionality
   */
  async testAddressLookup(venueName: string): Promise<string | null> {
    this.logger.log(`Testing address lookup for venue: ${venueName}`);
    return await this.lookupVenueAddress(venueName);
  }

  /**
   * Debug method to see what Puppeteer is extracting from a URL
   */
  async debugPuppeteerExtraction(url: string, takeScreenshot: boolean = false): Promise<any> {
    let browser;
    try {
      this.logger.log(`Starting debug Puppeteer extraction for: ${url}`);

      // Launch browser
      browser = await puppeteer.launch({
        headless: !takeScreenshot, // Use non-headless if taking screenshot for better debugging
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
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
      const response = await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: 30000,
      });

      // Wait for dynamic content
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const debugData: any = {
        url,
        responseStatus: response?.status(),
        finalUrl: page.url(),
        timestamp: new Date().toISOString(),
      };

      // Get page title
      debugData.title = await page.title();

      // Check for any login walls or restrictions
      const bodyText = await page.evaluate(() => document.body.innerText);
      debugData.containsLoginWall =
        bodyText.toLowerCase().includes('log in') ||
        bodyText.toLowerCase().includes('sign in') ||
        bodyText.toLowerCase().includes('create account');

      // Check for Facebook-specific restrictions
      if (url.includes('facebook.com')) {
        debugData.facebookRestrictions = {
          hasLoginPrompt: bodyText.toLowerCase().includes('log in to facebook'),
          hasPrivacyMessage:
            bodyText.toLowerCase().includes("content isn't available") ||
            bodyText.toLowerCase().includes("this content isn't available"),
          hasAgeRestriction: bodyText.toLowerCase().includes('age-restricted'),
        };
      }

      // Extract all text content
      const extractedData = await page.evaluate(() => {
        // Remove scripts and styles
        const scripts = document.querySelectorAll('script, style, noscript');
        scripts.forEach((el) => el.remove());

        // Get visible text
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
          acceptNode: (node) => {
            const parent = node.parentElement;
            if (parent) {
              const style = window.getComputedStyle(parent);
              if (style.display === 'none' || style.visibility === 'hidden') {
                return NodeFilter.FILTER_REJECT;
              }
            }
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

        return {
          textContent: textNodes.join(' ').replace(/\s+/g, ' ').trim(),
          htmlLength: document.body.innerHTML.length,
          visibleTextLength: textNodes.join(' ').length,
        };
      });

      debugData.extraction = extractedData;
      debugData.extractedTextPreview = extractedData.textContent.substring(0, 500) + '...';

      // Take screenshot if requested
      if (takeScreenshot) {
        try {
          const screenshotPath = `./debug_screenshots/puppeteer_${Date.now()}.png`;
          await page.screenshot({
            path: screenshotPath,
            fullPage: true,
            type: 'png',
          });
          debugData.screenshotPath = screenshotPath;
          this.logger.log(`Screenshot saved to: ${screenshotPath}`);
        } catch (screenshotError) {
          this.logger.warn('Failed to take screenshot:', screenshotError.message);
          debugData.screenshotError = screenshotError.message;
        }
      }

      return debugData;
    } catch (error) {
      this.logger.error(`Error in debug Puppeteer extraction for ${url}:`, error);
      return {
        url,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  /**
   * Parse social media posts that contain both text and images with karaoke event details
   * @param url - Social media post URL (Facebook, Instagram, etc.)
   * @returns Parsed karaoke data combining text and image content
   */
  async parseSocialMediaPost(url: string): Promise<ParsedKaraokeData> {
    try {
      this.logger.log(`Starting social media post parsing for URL: ${url}`);

      // Step 1: Extract text content and image URLs from the post
      const { textContent, imageUrls } = await this.extractPostContentAndImages(url);

      // Step 2: Parse images to extract text content
      const imageTextContent = await this.parseImagesWithGemini(imageUrls);

      // Step 3: Combine text and image content for comprehensive parsing
      const combinedContent = this.combineTextAndImageContent(textContent, imageTextContent);

      // Step 4: Parse combined content with Gemini AI
      const parsedData = await this.parseWithGemini(combinedContent, url);

      this.logger.log(`Successfully parsed social media post from ${url}`);
      return parsedData;
    } catch (error) {
      this.logger.error(`Error parsing social media post from ${url}:`, error);
      throw error;
    }
  }

  /**
   * Extract both text content and image URLs from a social media post
   */
  private async extractPostContentAndImages(url: string): Promise<{
    textContent: string;
    imageUrls: string[];
  }> {
    let browser: puppeteer.Browser | null = null;

    try {
      this.logger.log(`Extracting content and images from: ${url}`);

      browser = await puppeteer.launch({
        headless: true,
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
        ],
      });

      const page = await browser.newPage();

      // Set user agent to avoid blocking
      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      );

      // Navigate to the page
      await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: 30000,
      });

      // Wait for content to load
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Extract both text content and image URLs
      const extractedData = await page.evaluate(() => {
        // Extract text content (same as existing method)
        const textElements = document.querySelectorAll(
          'p, h1, h2, h3, h4, h5, h6, span, div, li, td, th',
        );
        const textNodes = Array.from(textElements)
          .map((el) => el.textContent?.trim())
          .filter((text) => text && text.length > 2)
          .filter((text) => {
            // Filter out common UI elements
            const lowercaseText = text.toLowerCase();
            return (
              !lowercaseText.includes('cookie') &&
              !lowercaseText.includes('accept') &&
              !lowercaseText.includes('privacy') &&
              !lowercaseText.includes('login') &&
              !lowercaseText.includes('sign in') &&
              !lowercaseText.includes('subscribe') &&
              !lowercaseText.includes('advertisement') &&
              text.length < 500
            );
          });

        // Extract image URLs
        const images = Array.from(document.querySelectorAll('img'))
          .map((img) => {
            const src =
              img.src || img.getAttribute('data-src') || img.getAttribute('data-lazy-src');
            const alt = img.alt || '';
            return { src, alt };
          })
          .filter((img) => img.src && img.src.startsWith('http'))
          .filter((img) => {
            // Filter out small images, icons, and advertisements
            const imgElement = document.querySelector(`img[src="${img.src}"]`) as HTMLImageElement;
            if (imgElement) {
              const width = imgElement.naturalWidth || imgElement.width || 0;
              const height = imgElement.naturalHeight || imgElement.height || 0;
              // Only include images that are likely to contain event details (larger images)
              return width > 200 && height > 200;
            }
            return true; // Include if we can't determine size
          })
          .slice(0, 5); // Limit to first 5 images to avoid overwhelming the AI

        const textContent = textNodes.join(' ').replace(/\s+/g, ' ').trim();
        const imageUrls = images.map((img) => img.src);

        return { textContent, imageUrls };
      });

      this.logger.log(
        `Extracted ${extractedData.textContent.length} characters of text and ${extractedData.imageUrls.length} images`,
      );

      return extractedData;
    } catch (error) {
      this.logger.error(`Error extracting post content from ${url}:`, error);
      throw error;
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  /**
   * Parse images using Gemini Vision to extract text and event details
   */
  private async parseImagesWithGemini(imageUrls: string[]): Promise<string[]> {
    if (!imageUrls.length) {
      return [];
    }

    const imageTextResults: string[] = [];

    try {
      // Use gemini-1.5-pro-vision for image analysis
      const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });

      for (const imageUrl of imageUrls) {
        try {
          this.logger.log(`Parsing image: ${imageUrl.substring(0, 100)}...`);

          // Download image as base64
          const imageData = await this.downloadImageAsBase64(imageUrl);

          const prompt = `
            Analyze this image and extract ALL text content, especially karaoke event details.
            
            Look for and extract:
            - Venue name and address
            - DJ name or performer
            - Date and time information
            - Event description or special notes
            - Contact information (phone, website)
            - Any other relevant event details
            
            Please provide a comprehensive transcription of ALL visible text in the image, maintaining the original structure and formatting where possible.
            
            Focus especially on:
            - Event titles (like "KARAOKE EVERY SATURDAY")
            - Venue information
            - Time details (8PM-12AM, etc.)
            - Address information
            - DJ or host names
            - Special features (food, drinks, parking, etc.)
            
            Return the text exactly as it appears in the image.
          `;

          const result = await model.generateContent([
            prompt,
            {
              inlineData: {
                data: imageData,
                mimeType: 'image/jpeg',
              },
            },
          ]);

          const response = await result.response;
          const text = response.text();

          if (text && text.trim().length > 10) {
            imageTextResults.push(text.trim());
            this.logger.log(`Successfully extracted ${text.length} characters from image`);
          }
        } catch (error) {
          this.logger.warn(`Failed to parse image ${imageUrl}:`, error.message);
          // Continue with other images even if one fails
        }
      }

      this.logger.log(
        `Successfully parsed ${imageTextResults.length} out of ${imageUrls.length} images`,
      );
      return imageTextResults;
    } catch (error) {
      this.logger.error('Error parsing images with Gemini:', error);
      return [];
    }
  }

  /**
   * Download an image and convert it to base64 for Gemini Vision
   */
  private async downloadImageAsBase64(imageUrl: string): Promise<string> {
    try {
      const response = await fetch(imageUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        },
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      return buffer.toString('base64');
    } catch (error) {
      this.logger.error(`Error downloading image ${imageUrl}:`, error);
      throw error;
    }
  }

  /**
   * Combine text content from the post and extracted image text
   */
  private combineTextAndImageContent(textContent: string, imageTextContent: string[]): string {
    const combinedParts = [
      'SOCIAL MEDIA POST CONTENT:',
      textContent || 'No text content found',
      '',
    ];

    if (imageTextContent.length > 0) {
      combinedParts.push('EXTRACTED FROM IMAGES:');
      imageTextContent.forEach((imageText, index) => {
        combinedParts.push(`--- Image ${index + 1} ---`);
        combinedParts.push(imageText);
        combinedParts.push('');
      });
    }

    return combinedParts.join('\n');
  }

  /**
   * Parse a direct image URL to extract karaoke event details
   * Useful for when you have a direct link to an event image
   */
  async parseImageDirectly(imageUrl: string): Promise<ParsedKaraokeData> {
    try {
      this.logger.log(`Parsing image directly: ${imageUrl}`);

      const imageTextContent = await this.parseImagesWithGemini([imageUrl]);

      if (!imageTextContent.length) {
        throw new Error('No text content could be extracted from the image');
      }

      const combinedContent = `EVENT IMAGE CONTENT:\n${imageTextContent[0]}`;
      const parsedData = await this.parseWithGemini(combinedContent, imageUrl);

      this.logger.log(`Successfully parsed image: ${imageUrl}`);
      return parsedData;
    } catch (error) {
      this.logger.error(`Error parsing image ${imageUrl}:`, error);
      throw error;
    }
  }

  /**
   * Parse and save social media post for admin review
   */
  async parseAndSaveSocialMediaPost(
    url: string,
  ): Promise<{ parsedScheduleId: string; data: ParsedKaraokeData }> {
    try {
      this.logger.log(`Starting parse and save operation for social media post: ${url}`);

      // Parse the social media post
      const parsedData = await this.parseSocialMediaPost(url);

      // Save to parsed_schedules table for admin review
      const parsedSchedule = this.parsedScheduleRepository.create({
        url: url,
        rawData: {
          url: url,
          title: 'Social Media Post',
          content: `Social media post parsed from: ${url}`,
          parsedAt: new Date(),
        },
        aiAnalysis: parsedData,
        status: ParseStatus.PENDING_REVIEW, // Requires admin review
      });

      const savedSchedule = await this.parsedScheduleRepository.save(parsedSchedule);

      this.logger.log(
        `Successfully saved parsed social media post for admin review. ID: ${savedSchedule.id}`,
      );

      return {
        parsedScheduleId: savedSchedule.id,
        data: parsedData,
      };
    } catch (error) {
      this.logger.error(`Error parsing and saving social media post from ${url}:`, error);
      throw error;
    }
  }

  /**
   * Parse and save image for admin review
   */
  async parseAndSaveImage(
    imageUrl: string,
  ): Promise<{ parsedScheduleId: string; data: ParsedKaraokeData }> {
    try {
      this.logger.log(`Starting parse and save operation for image: ${imageUrl}`);

      // Parse the image
      const parsedData = await this.parseImageDirectly(imageUrl);

      // Save to parsed_schedules table for admin review
      const parsedSchedule = this.parsedScheduleRepository.create({
        url: imageUrl,
        rawData: {
          url: imageUrl,
          title: 'Event Image',
          content: `Event image parsed from: ${imageUrl}`,
          parsedAt: new Date(),
        },
        aiAnalysis: parsedData,
        status: ParseStatus.PENDING_REVIEW, // Requires admin review
      });

      const savedSchedule = await this.parsedScheduleRepository.save(parsedSchedule);

      this.logger.log(`Successfully saved parsed image for admin review. ID: ${savedSchedule.id}`);

      return {
        parsedScheduleId: savedSchedule.id,
        data: parsedData,
      };
    } catch (error) {
      this.logger.error(`Error parsing and saving image from ${imageUrl}:`, error);
      throw error;
    }
  }

  /**
   * Parse Facebook event page to extract details
   */
  async parseFacebookEvent(eventUrl: string): Promise<ParsedKaraokeData> {
    try {
      this.logger.log(`Starting Facebook event parse for URL: ${eventUrl}`);

      // First check if URL is a Facebook event
      if (!this.isFacebookEventUrl(eventUrl)) {
        throw new Error('URL is not a Facebook event URL');
      }

      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      try {
        const page = await browser.newPage();

        // Set user agent to avoid blocking
        await page.setUserAgent(
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        );

        // Navigate to the event page
        await page.goto(eventUrl, { waitUntil: 'networkidle2', timeout: 30000 });

        // Wait for content to load
        await new Promise((resolve) => setTimeout(resolve, 3000));

        // First, try to close any login dialog by clicking the X button
        try {
          const closeButton = await page.$('[aria-label="Close"]');
          if (closeButton) {
            await closeButton.click();
            this.logger.log('Closed Facebook login dialog');
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        } catch (error) {
          this.logger.debug('No close button found or error clicking:', error.message);
        }

        // Scroll down a bit to trigger the fb-lightmode div to appear
        await page.evaluate(() => {
          window.scrollBy(0, 500);
        });
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // Remove scrolling blocking div to enable better page navigation
        await page.evaluate(() => {
          const blockingDiv = document.querySelector('.__fb-light-mode.x1n2onr6.xzkaem6');
          if (blockingDiv) {
            blockingDiv.remove();
            console.log('Removed Facebook blocking div for better scrolling');
          }
        });

        // Wait a bit more after removing the div
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Extract event details
        const eventData = await page.evaluate(() => {
          const getTextContent = (selector: string) => {
            const element = document.querySelector(selector);
            return element?.textContent?.trim() || '';
          };

          // Try various selectors for event details
          const title =
            getTextContent('[data-testid="event-title"]') ||
            getTextContent('h1') ||
            getTextContent('[role="heading"]');

          const description =
            getTextContent('[data-testid="event-description"]') ||
            getTextContent('[data-testid="event-permalink-details"]') ||
            getTextContent('.x1swvt13');

          const dateTime =
            getTextContent('[data-testid="event-date-time"]') ||
            getTextContent('.x1lliihq') ||
            document.querySelector('time')?.textContent ||
            '';

          const location =
            getTextContent('[data-testid="event-location"]') ||
            getTextContent('.x1iorvi4') ||
            getTextContent('[role="button"][aria-label*="location"]');

          // Extract host/organizer information
          const host =
            getTextContent('[data-testid="event-host"]') ||
            getTextContent('.x1lliihq.x6ikm8r.x10wlt62.x1n2onr6');

          // Get all text content for AI analysis
          const fullText = document.body.innerText;

          return {
            title,
            description,
            dateTime,
            location,
            host,
            fullText,
            url: window.location.href,
          };
        });

        this.logger.log(`Extracted Facebook event data: ${JSON.stringify(eventData, null, 2)}`);

        // Try to get event cover image
        let coverImageUrl = '';
        try {
          const imageElement = await page.$(
            '[data-testid="event-cover-photo"] img, .x1ey2m1c img, [role="img"]',
          );
          if (imageElement) {
            coverImageUrl = await page.evaluate((el) => (el as HTMLImageElement).src, imageElement);
          }
        } catch (imageError) {
          this.logger.warn('Could not extract cover image:', imageError);
        }

        // Combine text content for AI analysis
        const combinedContent = this.combineEventTextContent(eventData);

        // Parse with enhanced AI prompt for Facebook events
        const result = await this.parseEventWithGemini(combinedContent, eventUrl, coverImageUrl);

        this.logger.log(`Facebook event parse completed successfully for ${eventUrl}`);
        return result;
      } finally {
        await browser.close();
      }
    } catch (error) {
      this.logger.error(`Error parsing Facebook event ${eventUrl}:`, error);
      throw new Error(`Failed to parse Facebook event: ${error.message}`);
    }
  }

  /**
   * Check if URL is a Facebook event URL
   */
  private isFacebookEventUrl(url: string): boolean {
    return (
      /facebook\.com\/events\/\d+/.test(url) ||
      /fb\.com\/events\/\d+/.test(url) ||
      /facebook\.com\/.*\/events\/\d+/.test(url)
    );
  }

  /**
   * Check if URL is any Facebook URL
   */
  private isFacebookUrl(url: string): boolean {
    return (
      url.includes('facebook.com') ||
      url.includes('fb.com') ||
      url.includes('fb.me') ||
      url.includes('m.facebook.com')
    );
  }

  /**
   * Combine extracted Facebook event data into analyzable text
   */
  private combineEventTextContent(eventData: any): string {
    const parts = [
      eventData.title ? `Event Title: ${eventData.title}` : '',
      eventData.description ? `Description: ${eventData.description}` : '',
      eventData.dateTime ? `Date/Time: ${eventData.dateTime}` : '',
      eventData.location ? `Location: ${eventData.location}` : '',
      eventData.host ? `Host/Organizer: ${eventData.host}` : '',
      eventData.fullText ? `Additional Content: ${eventData.fullText}` : '',
    ].filter((part) => part.trim() !== '');

    return parts.join('\n\n');
  }

  /**
   * Enhanced AI parsing specifically for Facebook events with image analysis
   */
  private async parseEventWithGemini(
    textContent: string,
    eventUrl: string,
    imageUrl?: string,
  ): Promise<ParsedKaraokeData> {
    try {
      const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });

      let prompt = `You are an expert at extracting karaoke event information from Facebook events. You understand DJ culture and common naming patterns.

CRITICAL DJ NAME INTELLIGENCE:
- DJs often have multiple names: real names, stage names, social media handles
- @djmax614 might also be known as "Max", "Max Denney", "DJ Max", etc.
- Look for patterns like @username, "with [name]", "hosted by [name]", "DJ [name]", "KJ [name]"
- Be smart about variations: "Max" = "DJ Max" = "@djmax614" = "Max Denney"
- Social handles often contain numbers or underscores but refer to the same person

FACEBOOK EVENT SPECIFIC PATTERNS:
- Event titles often contain venue name and event type
- Descriptions contain detailed time/location info
- Host field contains DJ/organizer name
- Look for recurring patterns like "Every Thursday", "Weekly Karaoke"

CRITICAL ADDRESS EXTRACTION:
- Look for ANY location information in the text
- Search for street addresses, city names, zip codes
- Check for venue names with location details
- Look for patterns like "123 Main St", "Downtown", "Columbus, OH"
- Extract addresses from venue descriptions or event details
- If you see venue names like "Kelley's Pub", "Crescent Lounge", try to infer likely address information
- Use context clues to determine venue locations
- Even partial address information is valuable (street name, city, neighborhood)

Extract ALL karaoke event information with high accuracy. Return JSON in this exact format:

{
  "vendor": {
    "name": "Business/Venue Name",
    "owner": "Owner/Host Name", 
    "website": "${eventUrl}",
    "description": "Brief description from event",
    "confidence": 0.9
  },
  "djs": [
    {
      "name": "Primary DJ Name (use the most professional/complete name found)",
      "confidence": 0.9,
      "context": "Where/how this DJ was mentioned",
      "aliases": ["@socialhandle", "nickname", "alternate_name"] // Include all name variations found
    }
  ],
  "shows": [
    {
      "venue": "Venue Name",
      "address": "Full address if available - SEARCH THOROUGHLY for any location details",
      "date": "YYYY-MM-DD or recurring pattern",
      "time": "Event time description", 
      "startTime": "HH:MM",
      "endTime": "HH:MM",
      "day": "dayofweek if recurring",
      "djName": "DJ Name (match to djs array)",
      "description": "Event description/details",
      "notes": "Facebook event details",
      "venuePhone": "Phone if found",
      "venueWebsite": "Venue website if found",
      "confidence": 0.9
    }
  ],
  "rawData": {
    "url": "${eventUrl}",
    "title": "Event title",
    "content": "Combined content",
    "parsedAt": "${new Date().toISOString()}"
  }
}

Facebook Event Content:
${textContent}`;

      // If we have an image, include image analysis
      if (imageUrl) {
        try {
          const imageBase64 = await this.downloadImageAsBase64(imageUrl);
          const imagePart = {
            inlineData: {
              data: imageBase64,
              mimeType: 'image/jpeg',
            },
          };

          prompt += `

ADDITIONAL IMAGE ANALYSIS:
Analyze the event cover image for additional details like:
- Venue logos/branding
- Event times/dates in graphics
- DJ names/photos
- Special promotions or details
- Address information in graphics`;

          const result = await model.generateContent([prompt, imagePart]);
          const response = await result.response;
          let text = response.text();

          // Clean the response
          text = this.cleanGeminiResponse(text);
          return JSON.parse(text);
        } catch (imageError) {
          this.logger.warn('Image analysis failed, falling back to text-only:', imageError);
        }
      }

      // Text-only analysis
      const result = await model.generateContent(prompt);
      const response = await result.response;
      let text = response.text();

      text = this.cleanGeminiResponse(text);
      const parsedData = JSON.parse(text);

      // Apply DJ filtering to remove venue duplicates
      if (parsedData.djs) {
        parsedData.djs = this.filterDuplicateDjs(parsedData.djs, parsedData);
      }

      // Debug logging for address fields
      if (parsedData.shows) {
        parsedData.shows.forEach((show, index) => {
          this.logger.debug(
            `Show ${index + 1}: ${show.venue} - Address: ${show.address || 'No address'}`,
          );
          if (!show.address) {
            this.logger.warn(`Missing address for venue: ${show.venue}`);
          }
        });
      }

      return parsedData;
    } catch (error) {
      this.logger.error('Error parsing event with Gemini:', error);
      throw new Error(`Failed to parse event with AI: ${error.message}`);
    }
  }

  /**
   * Enhanced DJ matching with nickname intelligence
   */
  private async enhancedDJMatching(djsFromAI: any[]): Promise<Map<string, any>> {
    const djMap = new Map<string, any>();

    for (const djData of djsFromAI) {
      // Use the smart DJ matching service
      const matchResult = await this.djNicknameService.smartDJMatch(djData.name);

      let dj = matchResult.dj;

      if (!dj && matchResult.confidence < 0.7) {
        // If no good match found, try matching with aliases if provided
        if (djData.aliases && Array.isArray(djData.aliases)) {
          for (const alias of djData.aliases) {
            const aliasMatch = await this.djNicknameService.smartDJMatch(alias);
            if (aliasMatch.dj && aliasMatch.confidence > matchResult.confidence) {
              dj = aliasMatch.dj;
              break;
            }
          }
        }
      }

      if (dj) {
        // Update confidence based on match quality
        djData.confidence = Math.min(djData.confidence || 0.8, matchResult.confidence);
        djMap.set(djData.name, dj);

        // Add any new aliases found to the database
        if (djData.aliases && Array.isArray(djData.aliases)) {
          for (const alias of djData.aliases) {
            try {
              await this.djNicknameService.addNickname(
                dj.id,
                alias,
                alias.startsWith('@') ? 'social_handle' : 'alias',
                alias.startsWith('@') ? 'facebook' : undefined,
              );
            } catch (error) {
              this.logger.warn(`Could not add nickname ${alias} for DJ ${dj.name}:`, error);
            }
          }
        }

        this.logger.log(
          `Enhanced DJ match: "${djData.name}" -> ${dj.name} (confidence: ${matchResult.confidence})`,
        );
      } else {
        this.logger.warn(`No DJ match found for: "${djData.name}" with confidence > 0.7`);
      }
    }

    return djMap;
  }

  /**
   * Parse and save Facebook event for admin review
   */
  async parseAndSaveFacebookEvent(
    eventUrl: string,
  ): Promise<{ parsedScheduleId: string; data: ParsedKaraokeData }> {
    try {
      this.logger.log(`Starting parse and save operation for Facebook event: ${eventUrl}`);

      // Parse the Facebook event
      const parsedData = await this.parseFacebookEvent(eventUrl);

      // Save to parsed_schedules table for admin review
      const parsedSchedule = this.parsedScheduleRepository.create({
        url: eventUrl,
        rawData: parsedData.rawData || {
          url: eventUrl,
          title: 'Facebook Event',
          content: `Facebook event parsed from: ${eventUrl}`,
          parsedAt: new Date(),
        },
        aiAnalysis: parsedData,
        status: ParseStatus.PENDING_REVIEW, // Requires admin review
      });

      const savedSchedule = await this.parsedScheduleRepository.save(parsedSchedule);

      this.logger.log(
        `Successfully saved parsed Facebook event for admin review. ID: ${savedSchedule.id}`,
      );

      return {
        parsedScheduleId: savedSchedule.id,
        data: parsedData,
      };
    } catch (error) {
      this.logger.error(`Error parsing and saving Facebook event from ${eventUrl}:`, error);
      throw error;
    }
  }

  /**
   * Smart social media post parsing that detects event URLs and handles them appropriately
   */
  async parseSmartSocialMediaPost(url: string): Promise<ParsedKaraokeData> {
    try {
      this.logger.log(`Smart parsing social media URL: ${url}`);

      // Check if this is a Facebook event URL
      if (this.isFacebookEventUrl(url)) {
        this.logger.log('Detected Facebook event URL, using specialized event parser');
        return await this.parseFacebookEvent(url);
      }

      // Otherwise use the existing social media post parsing
      return await this.parseSocialMediaPost(url);
    } catch (error) {
      this.logger.error(`Error in smart social media parsing for ${url}:`, error);
      throw error;
    }
  }

  /**
   * Parse Facebook share URL to extract potential event information
   */
  async parseFacebookShare(url: string): Promise<ParsedKaraokeData> {
    try {
      this.logger.log(`Starting Facebook share parse for URL: ${url}`);

      // Extract share information from the URL
      const shareInfo = this.extractFacebookShareInfo(url);

      // If we found a nested share URL, try to parse that
      if (shareInfo.nestedShareUrl) {
        this.logger.log(`Found nested share URL: ${shareInfo.nestedShareUrl}`);

        // Check if the nested URL is an event URL
        if (this.isFacebookEventUrl(shareInfo.nestedShareUrl)) {
          return await this.parseFacebookEvent(shareInfo.nestedShareUrl);
        }

        // Otherwise try to parse it as a regular page
        return await this.parseWebsite(shareInfo.nestedShareUrl);
      }

      // If no nested URL, try to parse the profile/page directly
      return await this.parseWebsite(url);
    } catch (error) {
      this.logger.error(`Error parsing Facebook share from ${url}:`, error);
      throw error;
    }
  }

  /**
   * Parse and save Facebook share for admin review
   */
  async parseAndSaveFacebookShare(
    url: string,
  ): Promise<{ parsedScheduleId: string; data: ParsedKaraokeData }> {
    try {
      this.logger.log(`Starting parse and save operation for Facebook share: ${url}`);

      // Parse the Facebook share
      const parsedData = await this.parseFacebookShare(url);

      // Save to parsed_schedules table for admin review
      const parsedSchedule = this.parsedScheduleRepository.create({
        url: url,
        rawData: parsedData.rawData || {
          url: url,
          title: 'Facebook Share',
          content: `Facebook share parsed from: ${url}`,
          parsedAt: new Date(),
        },
        aiAnalysis: parsedData,
        status: ParseStatus.PENDING_REVIEW,
      });

      const savedSchedule = await this.parsedScheduleRepository.save(parsedSchedule);

      this.logger.log(
        `Successfully saved parsed Facebook share for admin review. ID: ${savedSchedule.id}`,
      );

      return {
        parsedScheduleId: savedSchedule.id,
        data: parsedData,
      };
    } catch (error) {
      this.logger.error(`Error parsing and saving Facebook share from ${url}:`, error);
      throw error;
    }
  }

  /**
   * Transform Facebook URL using Gemini AI to extract useful information and suggest alternatives
   */
  async transformFacebookUrlWithGemini(url: string): Promise<{
    transformedUrl?: string;
    extractedInfo: any;
    suggestions: string[];
  }> {
    try {
      this.logger.log(`Starting Gemini transformation for Facebook URL: ${url}`);

      const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });

      const prompt = `You are an expert at analyzing Facebook URLs and extracting useful information for karaoke event discovery.

I have this Facebook URL that contains share parameters and profile information:
${url}

Please analyze this URL and help me:

1. Extract any useful information from the URL structure (profile names, share IDs, etc.)
2. Suggest alternative URLs that might contain event information
3. Identify if this URL points to a DJ, venue, or event organizer
4. Recommend next steps for finding karaoke events from this source

Focus on:
- Profile identification (DJ names, venue names)
- Extracting share post IDs that might contain event information
- Converting to more useful Facebook URLs (events, pages, posts)
- Providing actionable suggestions for finding karaoke events

Return your analysis as JSON in this format:
{
  "extractedInfo": {
    "profileId": "extracted profile ID or username",
    "shareId": "extracted share ID if present",
    "profileType": "dj|venue|user|unknown",
    "extractedName": "best guess at name from URL"
  },
  "suggestedUrls": [
    {
      "url": "suggested alternative URL",
      "type": "events|posts|about|photos",
      "description": "why this URL might be useful"
    }
  ],
  "nextSteps": [
    "specific action suggestions",
    "how to find events from this profile"
  ],
  "confidence": 0.8
}`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      let text = response.text();

      // Clean the response
      text = this.cleanGeminiResponse(text);
      const analysisResult = JSON.parse(text);

      // Try to construct a better URL based on the analysis
      let transformedUrl = null;
      if (analysisResult.extractedInfo?.profileId) {
        // Try to create an events URL for this profile
        transformedUrl = `https://www.facebook.com/${analysisResult.extractedInfo.profileId}/events`;
      }

      this.logger.log(`Gemini transformation completed for ${url}`);

      return {
        transformedUrl,
        extractedInfo: analysisResult.extractedInfo || {},
        suggestions: [
          ...(analysisResult.suggestedUrls || []).map((u) => `${u.description}: ${u.url}`),
          ...(analysisResult.nextSteps || []),
        ],
      };
    } catch (error) {
      this.logger.error(`Error transforming Facebook URL with Gemini: ${error.message}`);

      // Fallback: basic URL analysis
      const shareInfo = this.extractFacebookShareInfo(url);
      return {
        extractedInfo: shareInfo,
        suggestions: [
          'Try visiting the profile page manually to look for events',
          'Check if the profile has an events section',
          'Look for recent posts that might mention karaoke events',
        ],
      };
    }
  }

  /**
   * Extract information from Facebook share URLs
   */
  private extractFacebookShareInfo(url: string): any {
    try {
      const urlObj = new URL(url);
      const params = new URLSearchParams(urlObj.search);

      // Extract profile ID from path
      const pathParts = urlObj.pathname.split('/').filter((p) => p);
      const profileId = pathParts.length > 0 ? pathParts[0] : null;

      // Extract share URL from parameters
      const shareUrl = params.get('share_url');
      let nestedShareUrl = null;

      if (shareUrl) {
        try {
          nestedShareUrl = decodeURIComponent(shareUrl);
        } catch (e) {
          this.logger.warn('Could not decode share_url parameter');
        }
      }

      return {
        profileId,
        nestedShareUrl,
        mibextid: params.get('mibextid'),
        rdid: params.get('rdid'),
        originalUrl: url,
      };
    } catch (error) {
      this.logger.warn(`Error extracting Facebook share info: ${error.message}`);
      return { originalUrl: url };
    }
  }

  /**
   * Extract time from datetime string
   */
  private extractTimeFromDateTime(datetime: string): string {
    try {
      const date = new Date(datetime);
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } catch (error) {
      return '';
    }
  }

  /**
   * Extract DJ information from description text
   */
  private extractDjFromDescription(description: string): string {
    if (!description) return '';

    // Common patterns for DJ mentions
    const djPatterns = [
      /(?:dj|DJ)\s+([A-Za-z\s]+?)(?:\s|$|,|\.|!)/,
      /(?:with|featuring)\s+(?:dj|DJ)\s+([A-Za-z\s]+?)(?:\s|$|,|\.|!)/,
      /(?:host|hosted by)\s+([A-Za-z\s]+?)(?:\s|$|,|\.|!)/,
    ];

    for (const pattern of djPatterns) {
      const match = description.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }

    return '';
  }
}
