/**
 * Facebook Group Parser using Puppeteer
 * Specifically designed for Central Ohio Karaoke Places to Sing group
 */
require('dotenv').config();
const puppeteer = require('puppeteer');

class FacebookKaraokeParser {
  constructor() {
    this.groupUrl = 'https://www.facebook.com/groups/194826524192177';
    this.browser = null;
    this.page = null;
  }

  async initialize() {
    console.log('🚀 Initializing Facebook Karaoke Parser...');

    this.browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
      ],
    });

    this.page = await this.browser.newPage();

    // Set realistic user agent
    await this.page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    );

    // Set viewport
    await this.page.setViewport({ width: 1366, height: 768 });

    console.log('✅ Browser initialized');
  }

  async parseGroupInfo() {
    console.log('\n📊 Extracting Group Information...');

    try {
      await this.page.goto(this.groupUrl, {
        waitUntil: 'networkidle2',
        timeout: 30000,
      });

      // Wait for content to load
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Extract group info
      const groupInfo = await this.page.evaluate(() => {
        const info = {};

        // Try to get group name
        const nameSelectors = [
          'h1[data-testid="group-name"]',
          'h1',
          '[data-testid="group-name"]',
          '.x1heor9g.x1qlqyl8.x1pd3egz.x1a2a7pz h1',
        ];

        for (const selector of nameSelectors) {
          const element = document.querySelector(selector);
          if (element && element.textContent.trim()) {
            info.name = element.textContent.trim();
            break;
          }
        }

        // Try to get group description
        const descSelectors = [
          '[data-testid="group-description"]',
          '.x11i5rnm.xat24cr.x1mh8g0r.x1vvkbs span',
          '.x193iq5w.xeuugli.x13faqbe.x1vvkbs.x1xmvt09.x1lliihq.x1s928wv.xhkezso.x1gmr53x.x1cpjm7i.x1fgarty.x1943h6x.x4zkp8e.x676frb.x1nxh6w3.x1sibtaa.xo1l8bm.xi81zsa',
        ];

        for (const selector of descSelectors) {
          const element = document.querySelector(selector);
          if (element && element.textContent.trim()) {
            info.description = element.textContent.trim();
            break;
          }
        }

        // Try to get member count
        const memberSelectors = [
          '[data-testid="group-member-count"]',
          'span:contains("member")',
          'span:contains("Member")',
        ];

        for (const selector of memberSelectors) {
          const elements = document.querySelectorAll('span');
          for (const element of elements) {
            if (element.textContent.includes('member') || element.textContent.includes('Member')) {
              info.memberCount = element.textContent.trim();
              break;
            }
          }
          if (info.memberCount) break;
        }

        return info;
      });

      console.log('✅ Group Info Extracted:', groupInfo);
      return groupInfo;
    } catch (error) {
      console.error('❌ Error extracting group info:', error.message);
      return null;
    }
  }

  async parseRecentPosts() {
    console.log('\n📝 Extracting Recent Posts...');

    try {
      // Scroll to load more posts
      await this.page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight / 2);
      });

      await new Promise((resolve) => setTimeout(resolve, 2000));

      const posts = await this.page.evaluate(() => {
        const postElements = document.querySelectorAll(
          '[data-testid="story-body"], [role="article"], .userContentWrapper',
        );
        const extractedPosts = [];

        for (let i = 0; i < Math.min(postElements.length, 10); i++) {
          const postElement = postElements[i];
          const post = {};

          // Try to get post text
          const textSelectors = [
            '[data-testid="post_message"]',
            '.userContent',
            '[data-ad-preview="message"]',
            '.x11i5rnm.xat24cr.x1mh8g0r.x1vvkbs',
          ];

          for (const selector of textSelectors) {
            const textEl = postElement.querySelector(selector);
            if (textEl && textEl.textContent.trim()) {
              post.text = textEl.textContent.trim();
              break;
            }
          }

          // Try to get author name
          const authorSelectors = [
            '[data-testid="post_author_name"]',
            '.profileLink',
            'strong a',
            '[role="link"] strong',
          ];

          for (const selector of authorSelectors) {
            const authorEl = postElement.querySelector(selector);
            if (authorEl && authorEl.textContent.trim()) {
              post.author = authorEl.textContent.trim();
              break;
            }
          }

          // Try to get timestamp
          const timeSelectors = [
            '[data-testid="story-subtitle"] a',
            '.timestampContent',
            'time',
            '[data-tooltip-content]',
          ];

          for (const selector of timeSelectors) {
            const timeEl = postElement.querySelector(selector);
            if (timeEl) {
              post.timestamp =
                timeEl.getAttribute('data-tooltip-content') ||
                timeEl.getAttribute('title') ||
                timeEl.textContent.trim();
              break;
            }
          }

          // Only add posts with content
          if (post.text && post.text.length > 10) {
            extractedPosts.push(post);
          }
        }

        return extractedPosts;
      });

      console.log(`✅ Extracted ${posts.length} posts:`);
      posts.forEach((post, index) => {
        console.log(`\n--- Post ${index + 1} ---`);
        console.log('Author:', post.author || 'Unknown');
        console.log('Time:', post.timestamp || 'Unknown');
        console.log('Text:', post.text ? post.text.substring(0, 200) + '...' : 'No text');
      });

      return posts;
    } catch (error) {
      console.error('❌ Error extracting posts:', error.message);
      return [];
    }
  }

  async findKaraokeEvents() {
    console.log('\n🎤 Searching for Karaoke Events...');

    const posts = await this.parseRecentPosts();
    const karaokeKeywords = [
      'karaoke',
      'sing',
      'singing',
      'mic',
      'microphone',
      'night',
      'show',
      'venue',
      'bar',
      'club',
      'restaurant',
      'host',
      'hosting',
      'dj',
      'tonight',
      'tomorrow',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
      'sunday',
    ];

    const karaokeEvents = posts.filter((post) => {
      const text = post.text?.toLowerCase() || '';
      return karaokeKeywords.some((keyword) => text.includes(keyword));
    });

    console.log(`\n🎯 Found ${karaokeEvents.length} potential karaoke events:`);
    karaokeEvents.forEach((event, index) => {
      console.log(`\n🎤 Event ${index + 1}:`);
      console.log('Author:', event.author);
      console.log('Time:', event.timestamp);
      console.log('Content:', event.text?.substring(0, 300) + '...');
    });

    return karaokeEvents;
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      console.log('\n✅ Browser closed');
    }
  }
}

async function main() {
  const parser = new FacebookKaraokeParser();

  try {
    await parser.initialize();

    console.log('🎯 Parsing Central Ohio Karaoke Places to Sing group...');
    console.log('📍 URL:', parser.groupUrl);

    // Extract group information
    const groupInfo = await parser.parseGroupInfo();

    // Find karaoke events
    const events = await parser.findKaraokeEvents();

    console.log('\n=== SUMMARY ===');
    console.log('Group:', groupInfo?.name || 'Unknown');
    console.log('Description:', groupInfo?.description || 'Unknown');
    console.log('Members:', groupInfo?.memberCount || 'Unknown');
    console.log('Karaoke Events Found:', events.length);

    if (events.length > 0) {
      console.log('\n✅ SUCCESS: Found karaoke event data!');
      console.log('💡 This proves Puppeteer can extract the data we need');
    } else {
      console.log('\n⚠️  No events found - might need to adjust selectors');
    }
  } catch (error) {
    console.error('❌ Parser error:', error);
  } finally {
    await parser.close();
  }
}

main().catch(console.error);
