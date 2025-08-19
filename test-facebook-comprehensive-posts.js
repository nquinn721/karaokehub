/**
 * Comprehensive Facebook Post Data Extraction Test
 * Testing maximum data extraction from Facebook group posts
 */
require('dotenv').config();
const puppeteer = require('puppeteer');

class FacebookPostDataExtractor {
  constructor() {
    this.groupUrl = 'https://www.facebook.com/groups/194826524192177';
    this.browser = null;
    this.page = null;
  }

  async initialize() {
    console.log('🚀 Initializing Comprehensive Facebook Post Extractor...');

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
    await this.page.setViewport({ width: 1366, height: 768 });

    console.log('✅ Browser initialized');
  }

  async extractAllPostData() {
    console.log('\n📊 Extracting ALL Post Data...');

    try {
      await this.page.goto(this.groupUrl, {
        waitUntil: 'networkidle2',
        timeout: 30000,
      });

      // Wait for initial content load
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Scroll to load more posts
      console.log('📜 Scrolling to load more posts...');
      for (let i = 0; i < 3; i++) {
        await this.page.evaluate(() => {
          window.scrollTo(0, document.body.scrollHeight);
        });
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }

      // Extract comprehensive post data
      const posts = await this.page.evaluate(() => {
        // Helper function to get text content safely
        const getTextContent = (element, selector) => {
          if (!element) return null;
          const el = typeof selector === 'string' ? element.querySelector(selector) : element;
          return el ? el.textContent.trim() : null;
        };

        // Helper function to get attribute safely
        const getAttribute = (element, selector, attribute) => {
          if (!element) return null;
          const el = typeof selector === 'string' ? element.querySelector(selector) : element;
          return el ? el.getAttribute(attribute) : null;
        };

        // Find all possible post containers
        const postSelectors = [
          '[data-testid="story-body"]',
          '[role="article"]',
          '.userContentWrapper',
          '[data-testid="fbfeed_story"]',
          '.story_body_container',
          '.userContent',
        ];

        let postElements = [];
        postSelectors.forEach((selector) => {
          const elements = document.querySelectorAll(selector);
          elements.forEach((el) => {
            if (el && !postElements.includes(el)) {
              postElements.push(el);
            }
          });
        });

        console.log(`Found ${postElements.length} potential post elements`);

        const extractedPosts = [];

        for (let i = 0; i < Math.min(postElements.length, 15); i++) {
          const postElement = postElements[i];
          const post = {
            index: i + 1,
            rawHTML: postElement.outerHTML.substring(0, 500) + '...',
            data: {},
          };

          // === AUTHOR INFORMATION ===
          const authorSelectors = [
            '[data-testid="post_author_name"]',
            '[data-testid="story-subtitle"] strong a',
            '.profileLink',
            'strong a[role="link"]',
            'h3 a',
            'span strong a',
            '[role="link"] strong',
          ];

          for (const selector of authorSelectors) {
            const authorEl = postElement.querySelector(selector);
            if (authorEl && authorEl.textContent.trim()) {
              post.data.author = {
                name: authorEl.textContent.trim(),
                link: authorEl.href || null,
                profileId: authorEl.href ? authorEl.href.split('/').pop() : null,
              };
              break;
            }
          }

          // === POST CONTENT ===
          const contentSelectors = [
            '[data-testid="post_message"]',
            '.userContent',
            '[data-ad-preview="message"]',
            '.x11i5rnm.xat24cr.x1mh8g0r.x1vvkbs',
            '[data-testid="story-subtitle"] + div',
            '.story_body_container .userContent',
          ];

          for (const selector of contentSelectors) {
            const contentEl = postElement.querySelector(selector);
            if (contentEl && contentEl.textContent.trim()) {
              post.data.content = {
                text: contentEl.textContent.trim(),
                length: contentEl.textContent.trim().length,
                hasLinks: contentEl.querySelector('a') !== null,
                links: Array.from(contentEl.querySelectorAll('a')).map((a) => ({
                  text: a.textContent.trim(),
                  url: a.href,
                })),
              };
              break;
            }
          }

          // === TIMESTAMP INFORMATION ===
          const timeSelectors = [
            '[data-testid="story-subtitle"] a',
            '.timestampContent',
            'time',
            '[data-tooltip-content]',
            '[data-hover="tooltip"]',
            'abbr',
            'a[aria-label*="at"]',
          ];

          for (const selector of timeSelectors) {
            const timeEl = postElement.querySelector(selector);
            if (timeEl) {
              post.data.timestamp = {
                display: timeEl.textContent.trim(),
                tooltip:
                  timeEl.getAttribute('data-tooltip-content') ||
                  timeEl.getAttribute('title') ||
                  timeEl.getAttribute('aria-label'),
                datetime: timeEl.getAttribute('datetime'),
                link: timeEl.href,
              };
              break;
            }
          }

          // === ENGAGEMENT DATA ===
          const engagementSelectors = [
            '[data-testid="UFI2ReactionsSentenceLink"]',
            '.UFILikeSentenceText',
            '[aria-label*="reaction"]',
            '[aria-label*="like"]',
            '[aria-label*="comment"]',
            '[aria-label*="share"]',
          ];

          post.data.engagement = {
            likes: null,
            comments: null,
            shares: null,
            reactions: [],
          };

          for (const selector of engagementSelectors) {
            const engagementEl = postElement.querySelector(selector);
            if (engagementEl) {
              const text = engagementEl.textContent.trim();
              const ariaLabel = engagementEl.getAttribute('aria-label') || '';

              if (text.includes('like') || ariaLabel.includes('like')) {
                post.data.engagement.likes = text;
              }
              if (text.includes('comment') || ariaLabel.includes('comment')) {
                post.data.engagement.comments = text;
              }
              if (text.includes('share') || ariaLabel.includes('share')) {
                post.data.engagement.shares = text;
              }
            }
          }

          // === MEDIA CONTENT ===
          const mediaInfo = {
            images: [],
            videos: [],
            attachments: [],
          };

          // Images
          const images = postElement.querySelectorAll('img');
          images.forEach((img) => {
            if (img.src && !img.src.includes('static') && !img.src.includes('icon')) {
              mediaInfo.images.push({
                src: img.src,
                alt: img.alt || null,
                width: img.width || null,
                height: img.height || null,
              });
            }
          });

          // Videos
          const videos = postElement.querySelectorAll('video');
          videos.forEach((video) => {
            mediaInfo.videos.push({
              src: video.src || null,
              poster: video.poster || null,
              duration: video.duration || null,
            });
          });

          post.data.media = mediaInfo;

          // === LOCATION DATA ===
          const locationSelectors = [
            '[data-testid="story-location"]',
            '[data-hover="tooltip"][href*="places"]',
            'a[href*="maps"]',
            'a[href*="place"]',
          ];

          for (const selector of locationSelectors) {
            const locationEl = postElement.querySelector(selector);
            if (locationEl) {
              post.data.location = {
                name: locationEl.textContent.trim(),
                link: locationEl.href,
                type: 'place',
              };
              break;
            }
          }

          // === POST TYPE DETECTION ===
          post.data.postType = 'text';
          if (mediaInfo.images.length > 0) post.data.postType = 'photo';
          if (mediaInfo.videos.length > 0) post.data.postType = 'video';
          if (post.data.location) post.data.postType = 'checkin';

          // === KARAOKE RELEVANCE ===
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
            'music',
            'song',
            'performance',
            'stage',
          ];

          const text = (post.data.content?.text || '').toLowerCase();
          const matchedKeywords = karaokeKeywords.filter((keyword) => text.includes(keyword));

          post.data.karaokeRelevance = {
            isRelevant: matchedKeywords.length > 0,
            matchedKeywords: matchedKeywords,
            relevanceScore: matchedKeywords.length,
          };

          // Only include posts with meaningful content
          if (post.data.content?.text && post.data.content.text.length > 10) {
            extractedPosts.push(post);
          }
        }

        return extractedPosts;
      });

      console.log(`\n✅ Extracted comprehensive data from ${posts.length} posts\n`);

      // Display detailed results
      posts.forEach((post, index) => {
        console.log(`${'='.repeat(60)}`);
        console.log(`📝 POST ${post.index} (${index + 1}/${posts.length})`);
        console.log(`${'='.repeat(60)}`);

        // Author info
        if (post.data.author) {
          console.log(`👤 AUTHOR: ${post.data.author.name}`);
          if (post.data.author.link) console.log(`   Profile: ${post.data.author.link}`);
          if (post.data.author.profileId) console.log(`   ID: ${post.data.author.profileId}`);
        }

        // Timestamp
        if (post.data.timestamp) {
          console.log(`⏰ TIME: ${post.data.timestamp.display}`);
          if (post.data.timestamp.tooltip) console.log(`   Full: ${post.data.timestamp.tooltip}`);
        }

        // Content
        if (post.data.content) {
          console.log(`📄 CONTENT (${post.data.content.length} chars):`);
          console.log(
            `   "${post.data.content.text.substring(0, 300)}${post.data.content.text.length > 300 ? '...' : ''}"`,
          );

          if (post.data.content.links.length > 0) {
            console.log(`🔗 LINKS:`);
            post.data.content.links.forEach((link) => {
              console.log(`   - ${link.text}: ${link.url}`);
            });
          }
        }

        // Location
        if (post.data.location) {
          console.log(`📍 LOCATION: ${post.data.location.name}`);
          if (post.data.location.link) console.log(`   Link: ${post.data.location.link}`);
        }

        // Media
        if (post.data.media.images.length > 0) {
          console.log(`🖼️ IMAGES: ${post.data.media.images.length}`);
          post.data.media.images.slice(0, 2).forEach((img, i) => {
            console.log(`   ${i + 1}. ${img.src.substring(0, 60)}...`);
          });
        }

        if (post.data.media.videos.length > 0) {
          console.log(`🎥 VIDEOS: ${post.data.media.videos.length}`);
        }

        // Engagement
        if (post.data.engagement.likes || post.data.engagement.comments) {
          console.log(`❤️ ENGAGEMENT:`);
          if (post.data.engagement.likes) console.log(`   Likes: ${post.data.engagement.likes}`);
          if (post.data.engagement.comments)
            console.log(`   Comments: ${post.data.engagement.comments}`);
          if (post.data.engagement.shares) console.log(`   Shares: ${post.data.engagement.shares}`);
        }

        // Karaoke relevance
        if (post.data.karaokeRelevance.isRelevant) {
          console.log(`🎤 KARAOKE RELEVANCE: ${post.data.karaokeRelevance.relevanceScore}/10`);
          console.log(`   Keywords: ${post.data.karaokeRelevance.matchedKeywords.join(', ')}`);
        }

        console.log(`📊 POST TYPE: ${post.data.postType}`);
        console.log(''); // Empty line for readability
      });

      return posts;
    } catch (error) {
      console.error('❌ Error extracting post data:', error.message);
      return [];
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      console.log('✅ Browser closed');
    }
  }
}

async function main() {
  const extractor = new FacebookPostDataExtractor();

  try {
    await extractor.initialize();

    console.log('🎯 Extracting ALL possible data from Facebook group posts...');
    console.log('📍 Group: Central Ohio Karaoke Places to Sing!');
    console.log('🔍 URL:', extractor.groupUrl);

    const posts = await extractor.extractAllPostData();

    console.log('\n' + '='.repeat(80));
    console.log('📊 EXTRACTION SUMMARY');
    console.log('='.repeat(80));
    console.log(`Total Posts Analyzed: ${posts.length}`);
    console.log(
      `Karaoke-Related Posts: ${posts.filter((p) => p.data.karaokeRelevance.isRelevant).length}`,
    );
    console.log(`Posts with Authors: ${posts.filter((p) => p.data.author).length}`);
    console.log(`Posts with Timestamps: ${posts.filter((p) => p.data.timestamp).length}`);
    console.log(`Posts with Locations: ${posts.filter((p) => p.data.location).length}`);
    console.log(`Posts with Images: ${posts.filter((p) => p.data.media.images.length > 0).length}`);
    console.log(
      `Posts with Links: ${posts.filter((p) => p.data.content?.links.length > 0).length}`,
    );

    const karaokeEssentials = posts.filter(
      (p) =>
        p.data.karaokeRelevance.isRelevant && (p.data.location || p.data.content?.links.length > 0),
    );

    console.log(`\n🎤 KARAOKE VENUE POSTS: ${karaokeEssentials.length}`);

    if (karaokeEssentials.length > 0) {
      console.log('\n✅ SUCCESS: Found actionable karaoke venue data!');
      console.log('💡 We can extract: venues, locations, times, hosts, and links');
    } else {
      console.log('\n⚠️ No complete venue posts found in current sample');
      console.log('💡 May need to parse more posts or different time periods');
    }
  } catch (error) {
    console.error('❌ Main error:', error);
  } finally {
    await extractor.close();
  }
}

main().catch(console.error);
