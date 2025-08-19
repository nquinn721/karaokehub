/**
 * Max Denney Show Extractor
 * Extract all karaoke shows and events from Max Denney's Facebook profile
 */
require('dotenv').config();
const puppeteer = require('puppeteer');

class MaxDenneyShowExtractor {
  constructor() {
    this.profileUrl = 'https://www.facebook.com/max.denney.194690';
    this.browser = null;
    this.page = null;
  }

  async initialize() {
    console.log('🚀 Initializing Max Denney Show Extractor...');

    this.browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
      ],
    });

    this.page = await this.browser.newPage();

    // Use mobile user agent for better access
    await this.page.setUserAgent(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
    );
    await this.page.setViewport({ width: 375, height: 667 });

    console.log('✅ Browser initialized');
  }

  async navigateAndWait() {
    console.log(`📱 Navigating to Max Denney's profile...`);

    await this.page.goto(this.profileUrl, {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });

    // Wait for content to load
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Check if we need to handle any popups or overlays
    try {
      const popup = await this.page.$('[role="dialog"]');
      if (popup) {
        console.log('🔄 Handling popup...');
        await this.page.keyboard.press('Escape');
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    } catch (e) {
      // Ignore popup handling errors
    }
  }

  async extractProfileInfo() {
    console.log('\n👤 Extracting Profile Information...');

    const profileInfo = await this.page.evaluate(() => {
      const info = {};

      // Get profile name
      const nameSelectors = ['h1', '[data-testid*="name"]', 'title'];
      for (const selector of nameSelectors) {
        const elements = document.querySelectorAll(selector);
        for (const element of elements) {
          if (element && element.textContent.includes('Max')) {
            info.name = element.textContent.trim();
            break;
          }
        }
        if (info.name) break;
      }

      // Get bio/about information
      const bioKeywords = ['dj', 'karaoke', 'music', 'entertainment', 'host'];
      const allText = document.body.textContent.toLowerCase();

      info.hasDJBio = bioKeywords.some((keyword) => allText.includes(keyword));

      // Look for location info
      const locationWords = ['columbus', 'ohio', 'central ohio'];
      info.location = locationWords.find((loc) => allText.includes(loc));

      return info;
    });

    console.log('✅ Profile Info:', profileInfo);
    return profileInfo;
  }

  async scrollAndLoadPosts() {
    console.log('\n📜 Scrolling to load all posts...');

    // Scroll multiple times to load more content
    for (let i = 0; i < 10; i++) {
      await this.page.evaluate(() => {
        window.scrollBy(0, window.innerHeight);
      });

      // Wait between scrolls
      await new Promise((resolve) => setTimeout(resolve, 2000));

      console.log(`   Scroll ${i + 1}/10...`);
    }

    console.log('✅ Finished scrolling');
  }

  async extractAllShows() {
    console.log('\n🎤 Extracting All Show Information...');

    const shows = await this.page.evaluate(() => {
      const extractedShows = [];

      // Get all text content and look for show patterns
      const allText = document.body.textContent;
      const lines = allText
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 5);

      // Show indicators
      const showKeywords = [
        'karaoke',
        'dj',
        'hosting',
        'tonight',
        'tomorrow',
        'show',
        'event',
        'performance',
        'gig',
        'music',
        'singing',
        'bar',
        'club',
        'restaurant',
        'venue',
      ];

      // Day indicators
      const dayKeywords = [
        'monday',
        'tuesday',
        'wednesday',
        'thursday',
        'friday',
        'saturday',
        'sunday',
        'tonight',
        'tomorrow',
      ];

      // Time indicators
      const timePattern = /\b\d{1,2}:\d{2}\s?(am|pm|AM|PM)?\b|\b\d{1,2}\s?(pm|am|PM|AM)\b/;

      // Venue indicators (common patterns)
      const venuePatterns = [
        /at\s+([A-Z][a-zA-Z\s'&-]+)/,
        /\b([A-Z][a-zA-Z\s'&-]+\s+(bar|grill|restaurant|club|pub|tavern|brewery))/i,
        /\b([A-Z][a-zA-Z\s'&-]+\s+(lodge|hall|center|casino))/i,
      ];

      lines.forEach((line, index) => {
        const lowerLine = line.toLowerCase();

        // Check if line contains show-related keywords
        const hasShowKeyword = showKeywords.some((keyword) => lowerLine.includes(keyword));
        const hasDay = dayKeywords.some((day) => lowerLine.includes(day));
        const hasTime = timePattern.test(line);

        if (hasShowKeyword && (hasDay || hasTime || line.length < 200)) {
          const show = {
            originalText: line,
            context: {
              before: lines[index - 1] || '',
              after: lines[index + 1] || '',
            },
            analysis: {
              hasDay: hasDay,
              hasTime: hasTime,
              keywords: showKeywords.filter((keyword) => lowerLine.includes(keyword)),
            },
          };

          // Try to extract venue
          venuePatterns.forEach((pattern) => {
            const match = line.match(pattern);
            if (match) {
              show.venue = match[1].trim();
            }
          });

          // Extract time if present
          const timeMatch = line.match(timePattern);
          if (timeMatch) {
            show.time = timeMatch[0];
          }

          // Extract day if present
          const dayMatch = dayKeywords.find((day) => lowerLine.includes(day));
          if (dayMatch) {
            show.day = dayMatch;
          }

          extractedShows.push(show);
        }
      });

      // Also look for structured content (posts, events)
      const postElements = document.querySelectorAll('div, span, p');

      postElements.forEach((element) => {
        const text = element.textContent.trim();
        if (text.length > 20 && text.length < 500) {
          const lowerText = text.toLowerCase();

          // Look for complete event posts
          const hasMultipleKeywords =
            showKeywords.filter((keyword) => lowerText.includes(keyword)).length >= 2;
          const mentionsVenue = venuePatterns.some((pattern) => pattern.test(text));

          if (hasMultipleKeywords || mentionsVenue) {
            const show = {
              type: 'structured_post',
              fullText: text,
              element: element.tagName,
              analysis: {
                keywords: showKeywords.filter((keyword) => lowerText.includes(keyword)),
                hasVenue: mentionsVenue,
              },
            };

            // Try to extract structured info
            venuePatterns.forEach((pattern) => {
              const match = text.match(pattern);
              if (match) {
                show.venue = match[1].trim();
              }
            });

            const timeMatch = text.match(timePattern);
            if (timeMatch) {
              show.time = timeMatch[0];
            }

            const dayMatch = dayKeywords.find((day) => lowerText.includes(day));
            if (dayMatch) {
              show.day = dayMatch;
            }

            extractedShows.push(show);
          }
        }
      });

      // Remove duplicates and sort by relevance
      const uniqueShows = [];
      const seenTexts = new Set();

      extractedShows.forEach((show) => {
        const key = show.originalText || show.fullText;
        if (!seenTexts.has(key)) {
          seenTexts.add(key);
          uniqueShows.push(show);
        }
      });

      // Sort by number of keywords (most relevant first)
      uniqueShows.sort((a, b) => {
        const aKeywords = a.analysis?.keywords?.length || 0;
        const bKeywords = b.analysis?.keywords?.length || 0;
        return bKeywords - aKeywords;
      });

      return uniqueShows.slice(0, 20); // Return top 20 most relevant
    });

    return shows;
  }

  async displayShows(shows) {
    console.log(`\n✅ Found ${shows.length} potential shows/events:\n`);

    shows.forEach((show, index) => {
      console.log(`${'='.repeat(60)}`);
      console.log(`🎤 SHOW ${index + 1}`);
      console.log(`${'='.repeat(60)}`);

      if (show.type === 'structured_post') {
        console.log(`📄 FULL POST:`);
        console.log(`   "${show.fullText}"`);
      } else {
        console.log(`📝 TEXT: "${show.originalText}"`);
        if (show.context?.before) {
          console.log(`📄 CONTEXT BEFORE: "${show.context.before}"`);
        }
        if (show.context?.after) {
          console.log(`📄 CONTEXT AFTER: "${show.context.after}"`);
        }
      }

      if (show.venue) {
        console.log(`🏢 VENUE: ${show.venue}`);
      }

      if (show.day) {
        console.log(`📅 DAY: ${show.day}`);
      }

      if (show.time) {
        console.log(`⏰ TIME: ${show.time}`);
      }

      if (show.analysis?.keywords?.length > 0) {
        console.log(`🔍 KEYWORDS: ${show.analysis.keywords.join(', ')}`);
      }

      console.log(`📊 RELEVANCE: ${show.analysis?.keywords?.length || 0} keywords`);
      console.log('');
    });
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      console.log('✅ Browser closed');
    }
  }
}

async function main() {
  const extractor = new MaxDenneyShowExtractor();

  try {
    await extractor.initialize();

    console.log('🎯 Extracting ALL Shows from Max Denney Profile');
    console.log('📍 Profile:', extractor.profileUrl);

    await extractor.navigateAndWait();

    const profileInfo = await extractor.extractProfileInfo();

    await extractor.scrollAndLoadPosts();

    const shows = await extractor.extractAllShows();

    await extractor.displayShows(shows);

    console.log('\n' + '='.repeat(80));
    console.log('📊 MAX DENNEY SHOWS SUMMARY');
    console.log('='.repeat(80));
    console.log(`Profile Name: ${profileInfo.name || 'Max Denney'}`);
    console.log(`Has DJ Bio: ${profileInfo.hasDJBio ? 'Yes' : 'No'}`);
    console.log(`Location: ${profileInfo.location || 'Not specified'}`);
    console.log(`Total Shows Found: ${shows.length}`);

    const showsWithVenues = shows.filter((s) => s.venue);
    const showsWithTimes = shows.filter((s) => s.time);
    const showsWithDays = shows.filter((s) => s.day);

    console.log(`Shows with Venues: ${showsWithVenues.length}`);
    console.log(`Shows with Times: ${showsWithTimes.length}`);
    console.log(`Shows with Days: ${showsWithDays.length}`);

    if (shows.length > 0) {
      console.log('\n✅ SUCCESS: Found Max Denney show data!');
      console.log('💡 This proves we can extract DJ/host information from profiles');

      // Display unique venues
      const venues = [...new Set(shows.filter((s) => s.venue).map((s) => s.venue))];
      if (venues.length > 0) {
        console.log('\n🏢 VENUES IDENTIFIED:');
        venues.forEach((venue) => console.log(`   - ${venue}`));
      }
    } else {
      console.log('\n⚠️ No shows found - may need different extraction approach');
    }
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await extractor.close();
  }
}

main().catch(console.error);
