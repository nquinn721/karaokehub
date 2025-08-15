import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

export interface FacebookEventData {
  id: string;
  name: string;
  description?: string;
  start_time: string;
  end_time?: string;
  place?: {
    name: string;
    location?: {
      street?: string;
      city?: string;
      state?: string;
      zip?: string;
      country?: string;
      latitude?: number;
      longitude?: number;
    };
  };
  owner?: {
    name: string;
    id: string;
  };
  cover?: {
    source: string;
  };
  attending_count?: number;
  interested_count?: number;
}

@Injectable()
export class FacebookService {
  private readonly logger = new Logger(FacebookService.name);
  private readonly appId = process.env.FACEBOOK_APP_ID || '646464114624794';
  private readonly appSecret =
    process.env.FACEBOOK_APP_SECRET || '3ce6645105081d6f3a5442a30bd6b1ae';
  private readonly graphApiUrl = 'https://graph.facebook.com/v18.0';

  /**
   * Get app access token for Facebook Graph API
   */
  private async getAppAccessToken(): Promise<string> {
    try {
      const response = await axios.get(
        `${this.graphApiUrl}/oauth/access_token?client_id=${this.appId}&client_secret=${this.appSecret}&grant_type=client_credentials`,
      );
      return response.data.access_token;
    } catch (error) {
      this.logger.error(
        'Failed to get Facebook app access token:',
        error.response?.data || error.message,
      );
      throw new Error('Unable to authenticate with Facebook Graph API');
    }
  }

  /**
   * Extract Facebook event ID from URL
   */
  private extractEventId(url: string): string | null {
    const patterns = [
      /facebook\.com\/events\/(\d+)/,
      /fb\.com\/events\/(\d+)/,
      /facebook\.com\/events\/(\d+)\//,
      /m\.facebook\.com\/events\/(\d+)/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return null;
  }

  /**
   * Extract Facebook profile/page ID from URL
   */
  private extractProfileId(url: string): string | null {
    const patterns = [
      // Profile with custom username: facebook.com/username
      /facebook\.com\/([^\/\?&]+)(?:\?|$)/,
      // Profile with numeric ID: facebook.com/profile.php?id=123456
      /facebook\.com\/profile\.php\?id=(\d+)/,
      // Profile with username and parameters: facebook.com/username?param=value
      /facebook\.com\/([^\/\?&]+)\?/,
      // Mobile versions
      /m\.facebook\.com\/([^\/\?&]+)(?:\?|$)/,
      /m\.facebook\.com\/profile\.php\?id=(\d+)/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        // Skip common Facebook paths that aren't profiles
        const id = match[1];
        if (
          id &&
          !['events', 'pages', 'groups', 'share', 'login', 'register', 'help'].includes(id)
        ) {
          return id;
        }
      }
    }

    return null;
  }

  /**
   * Check if URL is a Facebook event URL
   */
  isFacebookEventUrl(url: string): boolean {
    return this.extractEventId(url) !== null;
  }

  /**
   * Check if URL is a Facebook profile/page URL
   */
  isFacebookProfileUrl(url: string): boolean {
    return this.extractProfileId(url) !== null;
  }

  /**
   * Get Facebook event data using Graph API
   */
  async getEventData(eventUrl: string): Promise<FacebookEventData> {
    const eventId = this.extractEventId(eventUrl);
    if (!eventId) {
      throw new Error('Invalid Facebook event URL');
    }

    try {
      const accessToken = await this.getAppAccessToken();

      // Request event data with all relevant fields
      const fields = [
        'id',
        'name',
        'description',
        'start_time',
        'end_time',
        'place',
        'owner',
        'cover',
        'attending_count',
        'interested_count',
      ].join(',');

      const response = await axios.get(
        `${this.graphApiUrl}/${eventId}?fields=${fields}&access_token=${accessToken}`,
      );

      this.logger.log(`Successfully fetched Facebook event data for ID: ${eventId}`);
      return response.data;
    } catch (error) {
      if (error.response?.status === 403) {
        this.logger.error(
          'Facebook API access forbidden - check app permissions and event privacy',
        );
        throw new Error('Event is private or app lacks necessary permissions');
      } else if (error.response?.status === 404) {
        this.logger.error('Facebook event not found');
        throw new Error('Event not found or has been deleted');
      } else {
        this.logger.error(
          'Failed to fetch Facebook event data:',
          error.response?.data || error.message,
        );
        throw new Error(
          `Facebook API error: ${error.response?.data?.error?.message || error.message}`,
        );
      }
    }
  }

  /**
   * Get events from a Facebook profile/page
   */
  async getProfileEvents(profileUrl: string): Promise<FacebookEventData[]> {
    const profileId = this.extractProfileId(profileUrl);
    if (!profileId) {
      throw new Error('Invalid Facebook profile URL');
    }

    try {
      const accessToken = await this.getAppAccessToken();

      // Request events from the profile/page
      const fields = [
        'id',
        'name',
        'description',
        'start_time',
        'end_time',
        'place',
        'owner',
        'cover',
        'attending_count',
        'interested_count',
      ].join(',');

      // Try different endpoints for events
      const endpoints = [
        `${profileId}/events?fields=${fields}`,
        `${profileId}?fields=events{${fields}}`,
      ];

      let events = [];
      for (const endpoint of endpoints) {
        try {
          const response = await axios.get(
            `${this.graphApiUrl}/${endpoint}&access_token=${accessToken}`,
          );

          if (response.data.data) {
            events = response.data.data;
            break;
          } else if (response.data.events?.data) {
            events = response.data.events.data;
            break;
          }
        } catch (endpointError) {
          this.logger.warn(
            `Endpoint ${endpoint} failed:`,
            endpointError.response?.data?.error?.message || endpointError.message,
          );
          continue;
        }
      }

      this.logger.log(`Successfully fetched ${events.length} events from profile ID: ${profileId}`);
      return events;
    } catch (error) {
      if (error.response?.status === 403) {
        this.logger.error(
          'Facebook API access forbidden - check app permissions and profile privacy',
        );
        throw new Error('Profile is private or app lacks necessary permissions');
      } else if (error.response?.status === 404) {
        this.logger.error('Facebook profile not found');
        throw new Error('Profile not found or has been deleted');
      } else {
        this.logger.error(
          'Failed to fetch Facebook profile events:',
          error.response?.data || error.message,
        );
        throw new Error(
          `Facebook API error: ${error.response?.data?.error?.message || error.message}`,
        );
      }
    }
  }

  /**
   * Convert Facebook event data to parsed format
   */
  convertToKaraokeData(eventData: FacebookEventData, eventUrl: string) {
    const venue = eventData.place?.name || eventData.owner?.name || 'Unknown Venue';
    const address = this.formatAddress(eventData.place?.location);
    const description = eventData.description || '';

    // Parse date and time
    const startDate = new Date(eventData.start_time);
    const dateStr = startDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const timeStr = startDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    const djName = this.extractDjFromDescription(description);

    return {
      vendor: {
        name: 'Facebook',
        owner: 'Meta',
        website: 'https://www.facebook.com',
        description: 'Social media platform',
        confidence: 1.0,
      },
      shows: [
        {
          venue,
          address,
          date: dateStr,
          time: timeStr,
          djName,
          description,
          confidence: 0.9, // High confidence for Graph API data
          // Store additional Facebook data in notes
          notes: `Facebook Event ID: ${eventData.id}${eventData.attending_count ? `, Attending: ${eventData.attending_count}` : ''}${eventData.interested_count ? `, Interested: ${eventData.interested_count}` : ''}`,
        },
      ],
      djs: djName
        ? [
            {
              name: djName,
              confidence: 0.8,
              context: `Extracted from Facebook event: ${eventData.name}`,
            },
          ]
        : [],
      rawData: {
        url: eventUrl,
        title: eventData.name,
        content: `Facebook Event: ${eventData.name}\n${description}`,
        parsedAt: new Date(),
      },
    };
  }

  /**
   * Convert multiple Facebook events to parsed format
   */
  convertProfileEventsToKaraokeData(events: FacebookEventData[], profileUrl: string) {
    const allShows = [];
    const allDjs = [];
    const seenDjNames = new Set();

    for (const eventData of events) {
      const venue = eventData.place?.name || eventData.owner?.name || 'Unknown Venue';
      const address = this.formatAddress(eventData.place?.location);
      const description = eventData.description || '';

      // Parse date and time
      const startDate = new Date(eventData.start_time);
      const dateStr = startDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      const timeStr = startDate.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });

      const djName =
        this.extractDjFromDescription(description) || this.extractDjFromEventName(eventData.name);

      allShows.push({
        venue,
        address,
        date: dateStr,
        time: timeStr,
        djName,
        description,
        confidence: 0.9, // High confidence for Graph API data
        notes: `Facebook Event ID: ${eventData.id}${eventData.attending_count ? `, Attending: ${eventData.attending_count}` : ''}${eventData.interested_count ? `, Interested: ${eventData.interested_count}` : ''}`,
      });

      if (djName && !seenDjNames.has(djName)) {
        seenDjNames.add(djName);
        allDjs.push({
          name: djName,
          confidence: 0.8,
          context: `Extracted from Facebook events profile`,
        });
      }
    }

    return {
      vendor: {
        name: 'Facebook Profile/Page',
        owner: 'Meta',
        website: profileUrl,
        description: 'Facebook profile or page events',
        confidence: 1.0,
      },
      shows: allShows,
      djs: allDjs,
      rawData: {
        url: profileUrl,
        title: `Facebook Profile Events (${events.length} events)`,
        content: `Facebook Profile Events:\n${events.map((e) => `${e.name}: ${e.description || 'No description'}`).join('\n')}`,
        parsedAt: new Date(),
      },
    };
  }

  /**
   * Format address from Facebook location data
   */
  private formatAddress(location?: FacebookEventData['place']['location']): string {
    if (!location) return '';

    const parts = [location.street, location.city, location.state, location.zip].filter(Boolean);

    return parts.join(', ');
  }

  /**
   * Extract DJ information from event description
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

  /**
   * Extract DJ information from event name
   */
  private extractDjFromEventName(eventName: string): string {
    if (!eventName) return '';

    // Common patterns for DJ mentions in event names
    const djPatterns = [
      /(?:dj|DJ)\s+([A-Za-z\s]+?)(?:\s|$|,|\.|!|@|\||:)/,
      /(?:with|featuring|feat\.?)\s+(?:dj|DJ)?\s*([A-Za-z\s]+?)(?:\s|$|,|\.|!|@|\||:)/,
      /([A-Za-z\s]+?)\s+(?:dj|DJ)(?:\s|$|,|\.|!|@|\||:)/,
      /karaoke\s+(?:with|by)\s+([A-Za-z\s]+?)(?:\s|$|,|\.|!|@|\||:)/i,
    ];

    for (const pattern of djPatterns) {
      const match = eventName.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }

    return '';
  }

  /**
   * Extract additional karaoke data from Facebook profile using web scraping
   * This includes posts, bio information, and schedule details not available via Graph API
   */
  async extractProfileKaraokeData(profileUrl: string): Promise<{
    profileInfo: {
      name: string;
      followers: string;
      location: string;
      instagram: string;
      bio: string;
    };
    schedule: Array<{
      day: string;
      venue: string;
      time: string;
      dayOfWeek?: string;
    }>;
    recentPosts: Array<{
      timeAgo: string;
      content: string;
      venue?: string;
      time?: string;
      date?: string;
    }>;
    venues: string[];
    additionalShows: Array<{
      venue: string;
      time: string;
      day: string;
      confidence: number;
    }>;
  }> {
    const puppeteer = require('puppeteer');
    let browser;

    try {
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
      });

      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

      await page.goto(profileUrl, {
        waitUntil: 'networkidle0',
        timeout: 30000
      });

      await new Promise(resolve => setTimeout(resolve, 3000));

      const extractedData = await page.evaluate(() => {
        const text = document.body.innerText;
        
        const result = {
          profileInfo: {
            name: '',
            followers: '',
            location: '',
            instagram: '',
            bio: ''
          },
          schedule: [],
          recentPosts: [],
          venues: [],
          additionalShows: []
        };

        // Extract profile information
        const nameMatch = text.match(/([A-Z][a-z]+ [A-Z][a-z]+)/);
        if (nameMatch) result.profileInfo.name = nameMatch[1];

        const followersMatch = text.match(/(\d+[KM]?) followers/);
        if (followersMatch) result.profileInfo.followers = followersMatch[1];

        const locationMatch = text.match(/Lives in ([^\n]+)/);
        if (locationMatch) result.profileInfo.location = locationMatch[1];

        const instagramMatch = text.match(/(DJ[A-Z0-9]+)/);
        if (instagramMatch) result.profileInfo.instagram = instagramMatch[1];

        // Extract bio information
        const bioMatch = text.match(/Profile · ([^\n]+)/);
        if (bioMatch) result.profileInfo.bio = bioMatch[1];

        // Parse weekly schedule from intro/bio
        const scheduleLines = [
          'WED Kelley\'s Pub 8-12am',
          'TH+SAT Crescent Lounge 8-12am', 
          'FRI O\'Nelly\'s 9-2am',
          'SUN North High Dublin 6-9pm'
        ];

        const schedulePattern = /(WED|TH|THU|THURSDAY|FRI|FRIDAY|SAT|SATURDAY|SUN|SUNDAY|MON|MONDAY|TUE|TUESDAY)\+?(SAT)?\s+([^\n]+?)\s+(\d+[ap]m?[-–]\d+[ap]m?)/gi;
        let scheduleMatch;
        while ((scheduleMatch = schedulePattern.exec(text)) !== null) {
          const days = [scheduleMatch[1]];
          if (scheduleMatch[2]) days.push(scheduleMatch[2]); // Handle TH+SAT format
          
          days.forEach(day => {
            result.schedule.push({
              day: day,
              venue: scheduleMatch[3].trim(),
              time: scheduleMatch[4],
              dayOfWeek: this.convertDayAbbreviation(day)
            });
          });
        }

        // Extract recent posts with karaoke content
        const postPattern = /(\d+[hmsdw])\s*·[^\n]*([^\n]*(?:karaoke|Karaoke|#Karaoke|@[a-z]+pub|@[a-z]+lounge)[^\n]*)/gi;
        let postMatch;
        while ((postMatch = postPattern.exec(text)) !== null) {
          const postContent = postMatch[2].trim();
          
          // Extract venue from post
          const venueMatch = postContent.match(/@([a-z]+(?:pub|lounge|bar|grill))/i);
          const timeMatch = postContent.match(/(\d+[ap]m?[-–]\d+[ap]m?)/);
          const dayMatch = postContent.match(/(monday|tuesday|wednesday|thursday|friday|saturday|sunday|tonight|today)/i);
          
          result.recentPosts.push({
            timeAgo: postMatch[1],
            content: postContent,
            venue: venueMatch ? venueMatch[1] : undefined,
            time: timeMatch ? timeMatch[1] : undefined,
            date: dayMatch ? dayMatch[1] : undefined
          });
        }

        // Extract venue names
        const venueKeywords = ['Pub', 'Lounge', 'Bar', 'Sports', 'Grill', 'Club', 'Tavern'];
        venueKeywords.forEach(keyword => {
          const venuePattern = new RegExp(`([A-Z][a-zA-Z']*\\s*)+${keyword}(?:s|\\b)`, 'g');
          let venueMatch;
          while ((venueMatch = venuePattern.exec(text)) !== null) {
            const venueName = venueMatch[0].trim();
            if (!result.venues.includes(venueName) && venueName.length < 50) {
              result.venues.push(venueName);
            }
          }
        });

        // Look for additional show information in posts/text
        const showPattern = /([A-Z][a-zA-Z'\s]+(?:Pub|Lounge|Bar|Grill|Club))\s+.*?(\d+[ap]m?[-–]\d+[ap]m?)/gi;
        let showMatch;
        while ((showMatch = showPattern.exec(text)) !== null) {
          const isInSchedule = result.schedule.some(s => s.venue.includes(showMatch[1]));
          if (!isInSchedule) {
            result.additionalShows.push({
              venue: showMatch[1].trim(),
              time: showMatch[2],
              day: 'Various', // Would need more context to determine specific days
              confidence: 0.8
            });
          }
        }

        return result;
      });

      return extractedData;

    } catch (error) {
      this.logger.error('Error extracting profile karaoke data:', error);
      throw new Error(`Failed to extract profile data: ${error.message}`);
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  /**
   * Convert day abbreviations to full day names
   */
  private convertDayAbbreviation(day: string): string {
    const dayMap = {
      'MON': 'Monday',
      'TUE': 'Tuesday', 
      'WED': 'Wednesday',
      'TH': 'Thursday',
      'THU': 'Thursday',
      'FRI': 'Friday',
      'SAT': 'Saturday',
      'SUN': 'Sunday'
    };
    return dayMap[day.toUpperCase()] || day;
  }

  /**
   * Enhanced profile events method that combines Graph API events with scraped profile data
   */
  async getEnhancedProfileEvents(profileUrl: string): Promise<any> {
    try {
      // First try to get events via Graph API
      const graphApiEvents = await this.getProfileEvents(profileUrl);
      
      // Then get additional data via web scraping
      const scrapedData = await this.extractProfileKaraokeData(profileUrl);
      
      // Combine and enhance the data
      const enhancedData = {
        ...graphApiEvents,
        profileInfo: scrapedData.profileInfo,
        weeklySchedule: scrapedData.schedule,
        recentPosts: scrapedData.recentPosts,
        allVenues: scrapedData.venues,
        additionalShows: scrapedData.additionalShows,
        dataSource: 'enhanced' // Indicates this includes both API and scraped data
      };

      return enhancedData;
      
    } catch (error) {
      this.logger.error('Error getting enhanced profile events:', error);
      // If Graph API fails, fall back to just scraped data
      const scrapedData = await this.extractProfileKaraokeData(profileUrl);
      return {
        shows: this.convertScheduleToShows(scrapedData.schedule),
        profileInfo: scrapedData.profileInfo,
        weeklySchedule: scrapedData.schedule,
        recentPosts: scrapedData.recentPosts,
        allVenues: scrapedData.venues,
        additionalShows: scrapedData.additionalShows,
        dataSource: 'scraped-only'
      };
    }
  }

  /**
   * Convert weekly schedule to show format
   */
  private convertScheduleToShows(schedule: Array<{day: string; venue: string; time: string; dayOfWeek?: string}>): any[] {
    return schedule.map((item, index) => ({
      id: `schedule-${index}`,
      name: `Karaoke with DJ`,
      description: `Weekly karaoke show at ${item.venue}`,
      start_time: this.getNextDateForDay(item.dayOfWeek || item.day, item.time.split('-')[0]),
      place: {
        name: item.venue
      },
      source: 'weekly-schedule'
    }));
  }

  /**
   * Get next occurrence of a specific day
   */
  private getNextDateForDay(dayName: string, time: string): string {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const targetDay = days.indexOf(dayName);
    if (targetDay === -1) return new Date().toISOString();

    const today = new Date();
    const currentDay = today.getDay();
    const daysUntilTarget = (targetDay - currentDay + 7) % 7 || 7;
    
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + daysUntilTarget);
    
    // Parse time (e.g., "8pm" -> 20:00)
    const timeMatch = time.match(/(\d+)([ap]m?)/i);
    if (timeMatch) {
      let hour = parseInt(timeMatch[1]);
      const period = timeMatch[2].toLowerCase();
      
      if (period.includes('p') && hour !== 12) hour += 12;
      if (period.includes('a') && hour === 12) hour = 0;
      
      targetDate.setHours(hour, 0, 0, 0);
    }
    
    return targetDate.toISOString();
  }
}
