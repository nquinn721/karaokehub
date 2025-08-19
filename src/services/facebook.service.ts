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

  // Main Facebook App (for user authentication/login)
  private readonly authAppId = process.env.FACEBOOK_APP_ID || '646464114624794';
  private readonly authAppSecret =
    process.env.FACEBOOK_APP_SECRET || '3ce6645105081d6f3a5442a30bd6b1ae';

  // Facebook Parser App (for content parsing/scraping)
  private readonly parserAppId = process.env.FACEBOOK_PARSER_APP_ID || '1160707802576346';
  private readonly parserAppSecret =
    process.env.FACEBOOK_PARSER_APP_SECRET || '47f729de53981816dcce9b8776449b4b';

  private readonly graphApiUrl = 'https://graph.facebook.com/v18.0';

  /**
   * Get app access token for Facebook Graph API
   * @param useParser - Whether to use parser app credentials (default: true for parsing operations)
   */
  private async getAppAccessToken(useParser: boolean = true): Promise<string> {
    try {
      const appId = useParser ? this.parserAppId : this.authAppId;
      const appSecret = useParser ? this.parserAppSecret : this.authAppSecret;

      const response = await axios.get(
        `${this.graphApiUrl}/oauth/access_token?client_id=${appId}&client_secret=${appSecret}&grant_type=client_credentials`,
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
   * Exchange Facebook code for user access token
   * This is used after user logs in with Facebook Login
   */
  async exchangeCodeForUserToken(code: string, redirectUri: string): Promise<string> {
    try {
      const response = await axios.get(
        `${this.graphApiUrl}/oauth/access_token?client_id=${this.authAppId}&client_secret=${this.authAppSecret}&code=${code}&redirect_uri=${encodeURIComponent(redirectUri)}`,
      );
      return response.data.access_token;
    } catch (error) {
      this.logger.error(
        'Failed to exchange code for user token:',
        error.response?.data || error.message,
      );
      throw new Error('Unable to authenticate user with Facebook');
    }
  }

  /**
   * Get user's groups they are a member of
   * Requires user access token with groups_access_member_info permission
   */
  async getUserGroups(userAccessToken: string): Promise<any[]> {
    try {
      const response = await axios.get(
        `${this.graphApiUrl}/me/groups?access_token=${userAccessToken}&fields=id,name,description,member_count,privacy`,
      );
      return response.data.data || [];
    } catch (error) {
      this.logger.error('Failed to get user groups:', error.response?.data || error.message);
      throw new Error('Unable to fetch user groups from Facebook');
    }
  }

  /**
   * Get posts from a specific group (user must be a member)
   * Requires user access token with groups_access_member_info permission
   */
  async getGroupPosts(groupId: string, userAccessToken: string): Promise<any[]> {
    try {
      const response = await axios.get(
        `${this.graphApiUrl}/${groupId}/feed?access_token=${userAccessToken}&fields=id,message,created_time,from,attachments,event`,
      );
      return response.data.data || [];
    } catch (error) {
      this.logger.error(
        `Failed to get group ${groupId} posts:`,
        error.response?.data || error.message,
      );
      throw new Error(`Unable to fetch posts from group ${groupId}`);
    }
  }

  /**
   * Get events from a specific group (user must be a member)
   * Requires user access token with groups_access_member_info permission
   */
  async getGroupEvents(groupId: string, userAccessToken: string): Promise<any[]> {
    try {
      const response = await axios.get(
        `${this.graphApiUrl}/${groupId}/events?access_token=${userAccessToken}&fields=id,name,description,start_time,end_time,place,owner,attending_count,interested_count`,
      );
      return response.data.data || [];
    } catch (error) {
      this.logger.error(
        `Failed to get group ${groupId} events:`,
        error.response?.data || error.message,
      );
      throw new Error(`Unable to fetch events from group ${groupId}`);
    }
  }

  /**
   * Search for karaoke-related posts in user's groups
   */
  async searchKaraokeInUserGroups(userAccessToken: string): Promise<any[]> {
    try {
      const groups = await this.getUserGroups(userAccessToken);
      const karaokeResults = [];

      for (const group of groups) {
        try {
          const posts = await this.getGroupPosts(group.id, userAccessToken);
          const karaokePosts = posts.filter(
            (post) => post.message && post.message.toLowerCase().includes('karaoke'),
          );

          if (karaokePosts.length > 0) {
            karaokeResults.push({
              group: group,
              posts: karaokePosts,
            });
          }
        } catch (groupError) {
          this.logger.warn(`Skipping group ${group.name}: ${groupError.message}`);
        }
      }

      return karaokeResults;
    } catch (error) {
      this.logger.error(
        'Failed to search karaoke in user groups:',
        error.response?.data || error.message,
      );
      throw new Error('Unable to search for karaoke content in user groups');
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
   * Extract Facebook profile data from meta tags using HTTP request
   * This is more reliable than Puppeteer as it avoids browser detection
   */
  private async extractProfileMetaTags(profileUrl: string): Promise<{
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
    const https = require('https');
    const { URL } = require('url');

    return new Promise((resolve, reject) => {
      const url = new URL(profileUrl);

      const options = {
        hostname: url.hostname,
        path: url.pathname + url.search,
        method: 'GET',
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          Connection: 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
        },
      };

      const req = https.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            // Extract meta description containing schedule data
            const metaDescMatch = data.match(/<meta property="og:description" content="([^"]+)"/);
            const titleMatch = data.match(/<meta property="og:title" content="([^"]+)"/);

            if (!metaDescMatch) {
              reject(new Error('No meta description found'));
              return;
            }

            const description = metaDescMatch[1];
            const title = titleMatch ? titleMatch[1] : '';

            this.logger.log(`Extracted meta description: ${description}`);

            // Parse schedule from description
            // Example: "WED Kelley's Pub 8-12am TH+SAT Crescent Lounge 8-12am FRI O'Nelly's 9-2am SUN North High Dublin 6-9pm"
            const schedule = this.parseScheduleFromDescription(description);
            const venues = [...new Set(schedule.map((s) => s.venue))];

            const result = {
              profileInfo: {
                name: title || 'Facebook Profile',
                followers: '',
                location: '',
                instagram: '',
                bio: description,
              },
              schedule,
              recentPosts: [],
              venues,
              additionalShows: schedule.map((s) => ({
                venue: s.venue,
                time: s.time,
                day: s.day,
                confidence: 0.9,
              })),
            };

            resolve(result);
          } catch (error) {
            reject(error);
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.setTimeout(30000, () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      req.end();
    });
  }

  /**
   * Parse schedule information from Facebook profile description
   */
  private parseScheduleFromDescription(description: string): Array<{
    day: string;
    venue: string;
    time: string;
    dayOfWeek?: string;
  }> {
    const schedule = [];

    // Match patterns like "WED Kelley's Pub 8-12am" or "TH+SAT Crescent Lounge 8-12am"
    const patterns = [
      // Single day: "WED Kelley's Pub 8-12am"
      /\b(MON|TUE|WED|THU|FRI|SAT|SUN)\s+([^0-9]+?)\s+(\d+[:-]?\d*[ap]m?(?:\s*[-to]+\s*\d+[:-]?\d*[ap]m?)?)/gi,
      // Multiple days: "TH+SAT Crescent Lounge 8-12am"
      /\b(MON|TUE|WED|THU?|FRI|SAT|SUN)(?:\+(?:MON|TUE|WED|THU?|FRI|SAT|SUN))*\s+([^0-9]+?)\s+(\d+[:-]?\d*[ap]m?(?:\s*[-to]+\s*\d+[:-]?\d*[ap]m?)?)/gi,
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(description)) !== null) {
        const dayPart = match[1];
        const venue = match[2].trim();
        const time = match[3].trim();

        // Handle multiple days (TH+SAT)
        const days = dayPart.split('+');

        for (const day of days) {
          schedule.push({
            day: day.trim(),
            venue,
            time,
            dayOfWeek: this.expandDayAbbreviation(day.trim()),
          });
        }
      }
    }

    return schedule;
  }

  /**
   * Expand day abbreviations to full names
   */
  private expandDayAbbreviation(abbr: string): string {
    const dayMap = {
      MON: 'Monday',
      TUE: 'Tuesday',
      WED: 'Wednesday',
      THU: 'Thursday',
      TH: 'Thursday',
      FRI: 'Friday',
      SAT: 'Saturday',
      SUN: 'Sunday',
    };

    return dayMap[abbr.toUpperCase()] || abbr;
  }

  /**
   * Convert personal profile URL to business page URL if possible
   */
  private convertToBusinessPageUrl(profileUrl: string): string {
    // If it's already a business page URL, return as is
    if (
      profileUrl.includes('/pages/') ||
      /\/[^\/]+\/?$/.test(profileUrl.replace('https://www.facebook.com', ''))
    ) {
      return profileUrl;
    }

    // For personal profile URLs like /people/name/id, try to extract the username
    // This is a best-effort conversion - not all personal profiles have corresponding business pages
    const match = profileUrl.match(/facebook\.com\/people\/[^\/]+\/(\d+)/);
    if (match) {
      const userId = match[1];
      // This might not always work, but it's worth trying
      return profileUrl;
    }

    return profileUrl;
  }

  /**
   * Extract additional karaoke data from Facebook profile using web scraping
   * This includes posts, bio information, and schedule details not available via Graph API
   */
  /**
   * Extract profile/page data using Facebook Graph API
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
    const profileId = this.extractProfileId(profileUrl);
    if (!profileId) {
      throw new Error('Invalid Facebook profile URL');
    }

    this.logger.log(`Using Graph API to extract data for profile ID: ${profileId}`);

    try {
      const accessToken = await this.getAppAccessToken();

      // Get page/profile information
      let profileInfo = {
        name: '',
        followers: '',
        location: '',
        instagram: '',
        bio: '',
      };

      try {
        const profileFields = [
          'id',
          'name',
          'about',
          'bio',
          'description',
          'location',
          'fan_count',
          'followers_count',
          'link',
          'website',
          'instagram',
        ].join(',');

        const profileResponse = await axios.get(
          `${this.graphApiUrl}/${profileId}?fields=${profileFields}&access_token=${accessToken}`,
        );

        const profileData = profileResponse.data;
        profileInfo = {
          name: profileData.name || '',
          followers: profileData.fan_count
            ? profileData.fan_count.toString()
            : profileData.followers_count
              ? profileData.followers_count.toString()
              : '',
          location: profileData.location?.name || profileData.location?.city || '',
          instagram: profileData.instagram || '',
          bio: profileData.about || profileData.bio || profileData.description || '',
        };

        this.logger.log(`Retrieved profile info for: ${profileInfo.name}`);
      } catch (profileError) {
        const errorData = profileError.response?.data?.error;
        if (errorData?.code === 100) {
          if (
            errorData.message?.includes('pages_read_engagement') ||
            errorData.message?.includes('Page Public Content Access')
          ) {
            this.logger.warn(
              'Facebook app lacks required permissions for page access. Required: pages_read_engagement, Page Public Content Access, Page Public Metadata Access',
            );
            throw new Error(
              'Facebook app permissions insufficient. Please request pages_read_engagement permission and Page Public Content Access feature in Facebook App Dashboard.',
            );
          } else if (errorData.error_subcode === 33) {
            this.logger.warn('Facebook profile appears to be a personal profile or private page');
            throw new Error(
              'Cannot access personal Facebook profiles. Please provide a Facebook Business Page URL instead.',
            );
          }
        }
        this.logger.warn(
          'Could not retrieve profile info:',
          profileError.response?.data?.error?.message || profileError.message,
        );
      }

      // Get recent posts to extract schedule information
      let recentPosts = [];
      let schedule = [];
      let venues = new Set<string>();
      let additionalShows = [];

      try {
        const postsFields = [
          'id',
          'message',
          'story',
          'created_time',
          'full_picture',
          'place',
        ].join(',');

        const postsResponse = await axios.get(
          `${this.graphApiUrl}/${profileId}/posts?fields=${postsFields}&limit=50&access_token=${accessToken}`,
        );

        const posts = postsResponse.data.data || [];
        this.logger.log(`Retrieved ${posts.length} posts from profile`);

        for (const post of posts) {
          const createdDate = new Date(post.created_time);
          const timeAgo = this.getTimeAgo(createdDate);
          const content = post.message || post.story || '';

          // Extract venue and schedule information from post content
          const venueMatch = this.extractVenueFromContent(content);
          const timeMatch = this.extractTimeFromContent(content);
          const dayMatch = this.extractDayFromContent(content);

          if (venueMatch) {
            venues.add(venueMatch);
          }

          recentPosts.push({
            timeAgo,
            content,
            venue: venueMatch || post.place?.name,
            time: timeMatch,
            date: dayMatch,
          });

          // If we found venue, time, and day information, add to schedule
          if (venueMatch && timeMatch && dayMatch) {
            const existingSchedule = schedule.find(
              (s) => s.venue === venueMatch && s.day === dayMatch,
            );

            if (!existingSchedule) {
              schedule.push({
                day: dayMatch,
                venue: venueMatch,
                time: timeMatch,
                dayOfWeek: this.getDayOfWeek(dayMatch),
              });
            }

            additionalShows.push({
              venue: venueMatch,
              time: timeMatch,
              day: dayMatch,
              confidence: 0.8,
            });
          }
        }
      } catch (postsError) {
        this.logger.warn(
          'Could not retrieve posts:',
          postsError.response?.data?.error?.message || postsError.message,
        );
      }

      // Try to get events as well for additional schedule information
      try {
        const events = await this.getProfileEvents(profileUrl);
        this.logger.log(`Retrieved ${events.length} events from profile`);

        for (const event of events) {
          const eventDate = new Date(event.start_time);
          const dayOfWeek = eventDate.toLocaleDateString('en-US', { weekday: 'long' });
          const timeStr = eventDate.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
          });
          const venue = event.place?.name || event.owner?.name || 'Unknown Venue';

          if (venue) {
            venues.add(venue);
          }

          // Add to schedule if not already present
          const existingSchedule = schedule.find(
            (s) => s.venue === venue && s.dayOfWeek === dayOfWeek,
          );

          if (!existingSchedule) {
            schedule.push({
              day: eventDate.toLocaleDateString(),
              venue,
              time: timeStr,
              dayOfWeek,
            });
          }

          additionalShows.push({
            venue,
            time: timeStr,
            day: eventDate.toLocaleDateString(),
            confidence: 0.9,
          });
        }
      } catch (eventsError) {
        this.logger.warn(
          'Could not retrieve events:',
          eventsError.response?.data?.error?.message || eventsError.message,
        );
      }

      return {
        profileInfo,
        schedule,
        recentPosts,
        venues: Array.from(venues),
        additionalShows,
      };
    } catch (error) {
      this.logger.error(
        'Failed to extract profile data via Graph API:',
        error.response?.data || error.message,
      );
      throw new Error(
        `Facebook Graph API extraction failed: ${error.response?.data?.error?.message || error.message}`,
      );
    }
  }

  /**
   * Helper method to get time ago string
   */
  private getTimeAgo(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else if (diffMinutes > 0) {
      return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
    } else {
      return 'Just now';
    }
  }

  /**
   * Extract venue information from post content
   */
  private extractVenueFromContent(content: string): string | null {
    if (!content) return null;

    // Common venue patterns
    const venuePatterns = [
      /(?:at|@)\s+([A-Z][a-zA-Z'\s&-]+(?:Bar|Pub|Lounge|Club|Restaurant|Grill|Tavern|Inn))/i,
      /(?:playing at|performing at|tonight at)\s+([A-Z][a-zA-Z'\s&-]+)/i,
      /([A-Z][a-zA-Z'\s&-]+(?:Bar|Pub|Lounge|Club|Restaurant|Grill|Tavern|Inn))/i,
    ];

    for (const pattern of venuePatterns) {
      const match = content.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }

    return null;
  }

  /**
   * Extract time information from post content
   */
  private extractTimeFromContent(content: string): string | null {
    if (!content) return null;

    const timePatterns = [
      /(\d{1,2}:\d{2}\s*[ap]m)/i,
      /(\d{1,2}\s*[ap]m)/i,
      /(\d{1,2}:\d{2}\s*-\s*\d{1,2}:\d{2}\s*[ap]m)/i,
      /(\d{1,2}\s*-\s*\d{1,2}\s*[ap]m)/i,
    ];

    for (const pattern of timePatterns) {
      const match = content.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }

    return null;
  }

  /**
   * Extract day information from post content
   */
  private extractDayFromContent(content: string): string | null {
    if (!content) return null;

    const dayPatterns = [
      /(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i,
      /(mon|tue|wed|thu|fri|sat|sun)/i,
      /(today|tonight|tomorrow)/i,
    ];

    for (const pattern of dayPatterns) {
      const match = content.match(pattern);
      if (match) {
        return match[1].trim().toLowerCase();
      }
    }

    return null;
  }

  /**
   * Get day of week from day string
   */
  private getDayOfWeek(day: string): string | undefined {
    const dayMap: { [key: string]: string } = {
      monday: 'Monday',
      tuesday: 'Tuesday',
      wednesday: 'Wednesday',
      thursday: 'Thursday',
      friday: 'Friday',
      saturday: 'Saturday',
      sunday: 'Sunday',
      mon: 'Monday',
      tue: 'Tuesday',
      wed: 'Wednesday',
      thu: 'Thursday',
      fri: 'Friday',
      sat: 'Saturday',
      sun: 'Sunday',
    };

    return dayMap[day.toLowerCase()];
  }

  /**
   * Convert day abbreviations to full day names
   */
  private convertDayAbbreviation(day: string): string {
    const dayMap = {
      MON: 'Monday',
      TUE: 'Tuesday',
      WED: 'Wednesday',
      TH: 'Thursday',
      THU: 'Thursday',
      FRI: 'Friday',
      SAT: 'Saturday',
      SUN: 'Sunday',
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
        dataSource: 'enhanced', // Indicates this includes both API and scraped data
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
        dataSource: 'scraped-only',
      };
    }
  }

  /**
   * Convert weekly schedule to show format
   */
  private convertScheduleToShows(
    schedule: Array<{ day: string; venue: string; time: string; dayOfWeek?: string }>,
  ): any[] {
    return schedule.map((item, index) => ({
      id: `schedule-${index}`,
      name: `Karaoke with DJ`,
      description: `Weekly karaoke show at ${item.venue}`,
      start_time: this.getNextDateForDay(item.dayOfWeek || item.day, item.time.split('-')[0]),
      place: {
        name: item.venue,
      },
      source: 'weekly-schedule',
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
