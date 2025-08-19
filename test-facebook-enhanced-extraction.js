/**
 * Enhanced Facebook Post Data Extraction with Better Selectors
 * Focus on getting author, timestamp, and complete post data
 */
require('dotenv').config();
const puppeteer = require('puppeteer');

class EnhancedFacebookPostExtractor {
  constructor() {
    this.groupUrl = 'https://www.facebook.com/groups/194826524192177';
    this.browser = null;
    this.page = null;
  }

  async initialize() {
    console.log('🚀 Initializing Enhanced Facebook Post Extractor...');

    this.browser = await puppeteer.launch({
      headless: false, // Show browser for debugging
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });

    this.page = await this.browser.newPage();
    await this.page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    );
    await this.page.setViewport({ width: 1366, height: 768 });

    console.log('✅ Browser initialized (visible mode for debugging)');
  }

  async waitAndScroll() {
    // Wait for page to load
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Scroll down to trigger more content loading
    console.log('📜 Scrolling to load content...');
    for (let i = 0; i < 5; i++) {
      await this.page.evaluate(() => {
        window.scrollBy(0, window.innerHeight);
      });
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  async inspectPageStructure() {
    console.log('\n🔍 Inspecting Page Structure...');

    const structure = await this.page.evaluate(() => {
      // Get all elements that might contain posts
      const potentialPostElements = document.querySelectorAll(
        'div[role="article"], div[data-testid], div[class*="userContent"], div[class*="story"]',
      );

      const analysis = {
        totalElements: potentialPostElements.length,
        elementTypes: {},
        dataTestIds: new Set(),
        commonClasses: {},
      };

      potentialPostElements.forEach((el) => {
        // Analyze data-testid attributes
        const testId = el.getAttribute('data-testid');
        if (testId) {
          analysis.dataTestIds.add(testId);
        }

        // Analyze classes
        const classes = el.className.split(' ');
        classes.forEach((cls) => {
          if (cls) {
            analysis.commonClasses[cls] = (analysis.commonClasses[cls] || 0) + 1;
          }
        });
      });

      // Convert Set to Array for JSON serialization
      analysis.dataTestIds = Array.from(analysis.dataTestIds);

      // Find text that looks like post content
      const textElements = document.querySelectorAll('*');
      const karaokeTexts = [];

      textElements.forEach((el) => {
        const text = el.textContent || '';
        if (
          text.toLowerCase().includes('karaoke') ||
          text.toLowerCase().includes('sing') ||
          text.toLowerCase().includes('lola')
        ) {
          karaokeTexts.push({
            tag: el.tagName,
            text: text.substring(0, 200),
            classes: el.className,
            testId: el.getAttribute('data-testid'),
          });
        }
      });

      analysis.karaokeContent = karaokeTexts.slice(0, 10); // Limit to 10 items

      return analysis;
    });

    console.log('📊 Page Structure Analysis:');
    console.log(`Total potential post elements: ${structure.totalElements}`);
    console.log(`Unique data-testid values: ${structure.dataTestIds.length}`);
    console.log('Data Test IDs found:', structure.dataTestIds);

    console.log('\n🎤 Karaoke-related content found:');
    structure.karaokeContent.forEach((item, index) => {
      console.log(`${index + 1}. <${item.tag}> ${item.text.substring(0, 100)}...`);
      if (item.testId) console.log(`   data-testid: ${item.testId}`);
    });

    return structure;
  }

  async extractPostsWithNewSelectors(structure) {
    console.log('\n📝 Extracting Posts with Enhanced Selectors...');

    const posts = await this.page.evaluate((structureData) => {
      const extractedPosts = [];

      // Try multiple approaches to find posts
      const approaches = [
        // Approach 1: Role-based
        () => document.querySelectorAll('div[role="article"]'),

        // Approach 2: Data-testid based
        () =>
          document.querySelectorAll(
            '[data-testid*="story"], [data-testid*="post"], [data-testid*="feed"]',
          ),

        // Approach 3: Class-based common patterns
        () =>
          document.querySelectorAll(
            'div[class*="userContent"], div[class*="story"], div[class*="post"]',
          ),

        // Approach 4: Content-based (find elements containing karaoke keywords)
        () => {
          const allDivs = document.querySelectorAll('div');
          const karaokeContainers = [];
          allDivs.forEach((div) => {
            const text = div.textContent || '';
            if (
              (text.includes('karaoke') || text.includes('sing') || text.includes('Lola')) &&
              text.length > 50 &&
              text.length < 1000
            ) {
              karaokeContainers.push(div);
            }
          });
          return karaokeContainers;
        },
      ];

      let allFoundElements = [];

      approaches.forEach((approach, index) => {
        try {
          const elements = approach();
          console.log(`Approach ${index + 1} found ${elements.length} elements`);

          elements.forEach((el) => {
            if (!allFoundElements.includes(el)) {
              allFoundElements.push(el);
            }
          });
        } catch (e) {
          console.log(`Approach ${index + 1} failed:`, e.message);
        }
      });

      console.log(`Total unique elements found: ${allFoundElements.length}`);

      // Extract data from found elements
      allFoundElements.forEach((element, index) => {
        if (index >= 15) return; // Limit to 15 posts

        const post = {
          index: index + 1,
          approach: 'mixed',
          data: {},
        };

        // Get the raw text content
        const fullText = element.textContent || '';

        // Skip if too short or too long (likely not a post)
        if (fullText.length < 20 || fullText.length > 2000) {
          return;
        }

        post.data.rawText = fullText.substring(0, 500);
        post.data.textLength = fullText.length;

        // Try to find author in various ways
        const authorPatterns = [
          // Look for links that might be profiles
          element.querySelector(
            'a[href*="facebook.com"]:not([href*="photo"]):not([href*="video"])',
          ),
          // Look for strong/bold text that might be names
          element.querySelector('strong'),
          // Look for specific data attributes
          element.querySelector('[data-testid*="author"], [data-testid*="name"]'),
          // Look in parent elements
          element.parentElement?.querySelector('a[href*="facebook.com"]'),
        ];

        for (let authorEl of authorPatterns) {
          if (authorEl && authorEl.textContent.trim() && authorEl.textContent.trim().length < 50) {
            post.data.author = {
              name: authorEl.textContent.trim(),
              link: authorEl.href || null,
              element: authorEl.tagName,
            };
            break;
          }
        }

        // Try to find timestamp
        const timePatterns = [
          element.querySelector('time'),
          element.querySelector('[data-tooltip-content]'),
          element.querySelector('a[href*="/posts/"]'),
          element.querySelector('abbr'),
          // Look for relative time indicators
          ...Array.from(element.querySelectorAll('span')).filter((span) => {
            const text = span.textContent;
            return (
              text.includes('h') ||
              text.includes('m') ||
              text.includes('yesterday') ||
              text.includes('Monday') ||
              text.includes('Tuesday') ||
              text.includes('Wednesday') ||
              text.includes('Thursday') ||
              text.includes('Friday') ||
              text.includes('Saturday') ||
              text.includes('Sunday')
            );
          }),
        ];

        for (let timeEl of timePatterns) {
          if (timeEl && timeEl.textContent.trim()) {
            post.data.timestamp = {
              text: timeEl.textContent.trim(),
              tooltip: timeEl.getAttribute('data-tooltip-content'),
              datetime: timeEl.getAttribute('datetime'),
              title: timeEl.getAttribute('title'),
            };
            break;
          }
        }

        // Extract karaoke-relevant information
        const karaokeKeywords = [
          'karaoke',
          'sing',
          'singing',
          'mic',
          'music',
          'venue',
          'bar',
          'club',
          'tonight',
          'lola',
        ];
        const matchedKeywords = karaokeKeywords.filter((keyword) =>
          fullText.toLowerCase().includes(keyword),
        );

        post.data.karaokeRelevance = {
          isRelevant: matchedKeywords.length > 0,
          keywords: matchedKeywords,
          score: matchedKeywords.length,
        };

        // Look for location indicators
        const locationWords = ['MT VERNON', 'Columbus', 'Ohio', "Lola's", 'restaurant', 'bar'];
        const foundLocations = locationWords.filter((loc) => fullText.includes(loc));

        if (foundLocations.length > 0) {
          post.data.location = foundLocations;
        }

        // Only add posts with meaningful content
        if (post.data.karaokeRelevance.isRelevant || fullText.length > 100) {
          extractedPosts.push(post);
        }
      });

      return extractedPosts;
    }, structure);

    return posts;
  }

  async displayResults(posts) {
    console.log(`\n✅ Found ${posts.length} posts with enhanced extraction\n`);

    posts.forEach((post, index) => {
      console.log(`${'='.repeat(50)}`);
      console.log(`📝 POST ${post.index} (${index + 1}/${posts.length})`);
      console.log(`${'='.repeat(50)}`);

      if (post.data.author) {
        console.log(`👤 AUTHOR: ${post.data.author.name}`);
        if (post.data.author.link) console.log(`   Link: ${post.data.author.link}`);
      } else {
        console.log(`👤 AUTHOR: Not found`);
      }

      if (post.data.timestamp) {
        console.log(`⏰ TIME: ${post.data.timestamp.text}`);
        if (post.data.timestamp.tooltip) console.log(`   Full: ${post.data.timestamp.tooltip}`);
      } else {
        console.log(`⏰ TIME: Not found`);
      }

      console.log(`📄 CONTENT (${post.data.textLength} chars):`);
      console.log(`   "${post.data.rawText}"`);

      if (post.data.location) {
        console.log(`📍 LOCATIONS: ${post.data.location.join(', ')}`);
      }

      if (post.data.karaokeRelevance.isRelevant) {
        console.log(`🎤 KARAOKE SCORE: ${post.data.karaokeRelevance.score}`);
        console.log(`   Keywords: ${post.data.karaokeRelevance.keywords.join(', ')}`);
      }

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
  const extractor = new EnhancedFacebookPostExtractor();

  try {
    await extractor.initialize();

    console.log('🎯 Enhanced Facebook Post Data Extraction');
    console.log('📍 Group: Central Ohio Karaoke Places to Sing!');
    console.log('🔍 URL:', extractor.groupUrl);

    await extractor.page.goto(extractor.groupUrl, {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });

    await extractor.waitAndScroll();

    const structure = await extractor.inspectPageStructure();
    const posts = await extractor.extractPostsWithNewSelectors(structure);

    await extractor.displayResults(posts);

    console.log('\n' + '='.repeat(60));
    console.log('📊 FINAL SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total Posts: ${posts.length}`);
    console.log(`Posts with Authors: ${posts.filter((p) => p.data.author).length}`);
    console.log(`Posts with Timestamps: ${posts.filter((p) => p.data.timestamp).length}`);
    console.log(
      `Karaoke-Related: ${posts.filter((p) => p.data.karaokeRelevance.isRelevant).length}`,
    );
    console.log(`Posts with Locations: ${posts.filter((p) => p.data.location).length}`);

    if (posts.length > 0) {
      console.log('\n✅ SUCCESS: Enhanced extraction found more data!');
    }
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await extractor.close();
  }
}

main().catch(console.error);
