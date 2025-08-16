/**
 * Max Denney Recent Posts Analysis
 * Uses the enhanced Facebook service to get recent posts for karaoke show detection
 */

const puppeteer = require('puppeteer');

async function analyzeMaxRecentPosts() {
  console.log("🎤 Starting analysis of Max Denney's recent Facebook posts...");

  const browser = await puppeteer.launch({
    headless: true, // Run in background
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

  try {
    // Set realistic user agent
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    );

    console.log('📱 Navigating to Facebook...');

    // Try different approaches to access Max's content
    const urls = [
      'https://www.facebook.com/max.denney.1',
      'https://m.facebook.com/max.denney.1', // Mobile version often has different access
      'https://www.facebook.com/public/Max-Denney',
    ];

    let posts = [];
    let successfulUrl = null;

    for (const url of urls) {
      try {
        console.log(`🔍 Trying URL: ${url}`);
        await page.goto(url, {
          waitUntil: 'networkidle0',
          timeout: 20000,
        });

        // Wait a moment for content to load
        await new Promise((resolve) => setTimeout(resolve, 3000));

        // Check if we can access content
        const content = await page.content();
        if (!content.includes('login') && !content.includes('Log in') && content.length > 5000) {
          console.log('✅ Successfully accessed Facebook content');
          successfulUrl = url;
          break;
        }
      } catch (error) {
        console.log(`❌ Failed to access ${url}: ${error.message}`);
        continue;
      }
    }

    if (!successfulUrl) {
      console.log('⚠️  Could not access Facebook directly. Using alternative approach...');

      // Alternative: Check if we can find any public posts or mentions
      await page.goto('https://www.google.com/search?q="max+denney"+karaoke+facebook', {
        waitUntil: 'networkidle0',
      });

      console.log('🔍 Searching for Max Denney karaoke mentions on Google...');

      const searchResults = await page.evaluate(() => {
        const results = [];
        const links = document.querySelectorAll('a[href*="facebook"]');
        links.forEach((link) => {
          const text = link.textContent || '';
          const href = link.href || '';
          if (text.toLowerCase().includes('max') || text.toLowerCase().includes('karaoke')) {
            results.push({
              text: text.substring(0, 200),
              url: href,
              isKaraokeRelated:
                text.toLowerCase().includes('karaoke') ||
                text.toLowerCase().includes('music') ||
                text.toLowerCase().includes('dj'),
            });
          }
        });
        return results;
      });

      console.log(`📊 Found ${searchResults.length} potential Facebook references`);

      if (searchResults.length > 0) {
        console.log('\n🔍 FOUND FACEBOOK REFERENCES:');
        console.log('================================');
        searchResults.forEach((result, idx) => {
          console.log(`${idx + 1}. ${result.isKaraokeRelated ? '🎤' : '📝'} ${result.text}`);
          console.log(`   🔗 ${result.url}`);
          console.log('─'.repeat(50));
        });
      }

      return {
        method: 'google_search',
        results: searchResults,
        totalFound: searchResults.length,
        karaokeRelated: searchResults.filter((r) => r.isKaraokeRelated).length,
      };
    }

    // If we successfully accessed Facebook, try to extract posts
    console.log('📜 Extracting posts...');

    // Scroll to load more content
    for (let i = 0; i < 5; i++) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    // Extract posts with karaoke analysis
    posts = await page.evaluate(() => {
      // Various selectors that might contain post content
      const postSelectors = [
        '[data-testid="post_message"]',
        '[data-ad-preview="message"]',
        'div[dir="auto"]',
        'span[lang]',
        '.userContent',
        '.text_exposed_root',
      ];

      const posts = [];
      const karaokeKeywords = [
        'karaoke',
        'singing',
        'mic night',
        'open mic',
        'live music',
        'dj',
        'music',
        'songs',
        'sing',
        'stage',
        'performing',
        'show',
        'event',
        'tonight',
        'onellys',
        'venue',
        'bar',
      ];

      // Try to find any text content on the page
      postSelectors.forEach((selector) => {
        const elements = document.querySelectorAll(selector);
        elements.forEach((element, idx) => {
          const text = element.innerText || element.textContent || '';
          if (text.length > 20) {
            // Check for karaoke relevance
            const lowerText = text.toLowerCase();
            let score = 0;
            const matchedKeywords = [];

            karaokeKeywords.forEach((keyword) => {
              if (lowerText.includes(keyword)) {
                score += keyword === 'karaoke' ? 10 : 5;
                matchedKeywords.push(keyword);
              }
            });

            // Look for time patterns
            const timePattern = /\d{1,2}:?\d{0,2}\s*(pm|am)/i;
            const dayPattern = /(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i;

            if (timePattern.test(text)) score += 7;
            if (dayPattern.test(text)) score += 5;

            posts.push({
              text: text.substring(0, 500),
              score: score,
              keywords: matchedKeywords,
              hasTime: timePattern.test(text),
              hasDay: dayPattern.test(text),
              selector: selector,
              index: idx,
            });
          }
        });
      });

      return posts.sort((a, b) => b.score - a.score);
    });

    console.log(`📊 Extracted ${posts.length} text segments for analysis`);

    // Analyze and display results
    const karaokeContent = posts.filter((p) => p.score > 0);
    const highConfidence = posts.filter((p) => p.score >= 15);
    const mediumConfidence = posts.filter((p) => p.score >= 8 && p.score < 15);

    console.log('\n📈 ANALYSIS RESULTS:');
    console.log('====================');
    console.log(`Total content segments: ${posts.length}`);
    console.log(`Karaoke-related content: ${karaokeContent.length}`);
    console.log(`High confidence karaoke: ${highConfidence.length}`);
    console.log(`Medium confidence karaoke: ${mediumConfidence.length}`);

    if (highConfidence.length > 0) {
      console.log('\n🎯 HIGH CONFIDENCE KARAOKE CONTENT:');
      console.log('===================================');
      highConfidence.forEach((post, idx) => {
        console.log(`\n${idx + 1}. KARAOKE CONTENT DETECTED (Score: ${post.score})`);
        console.log(`🎤 Keywords: ${post.keywords.join(', ')}`);
        console.log(`⏰ Has time: ${post.hasTime ? 'Yes' : 'No'}`);
        console.log(`📅 Has day: ${post.hasDay ? 'Yes' : 'No'}`);
        console.log(`📝 Content: ${post.text}`);
        console.log('─'.repeat(50));
      });
    }

    if (mediumConfidence.length > 0) {
      console.log('\n🔍 POSSIBLE KARAOKE CONTENT:');
      console.log('============================');
      mediumConfidence.slice(0, 5).forEach((post, idx) => {
        console.log(`\n${idx + 1}. Possible Content (Score: ${post.score})`);
        console.log(`🎤 Keywords: ${post.keywords.join(', ')}`);
        console.log(`📝 Content: ${post.text.substring(0, 200)}...`);
        console.log('─'.repeat(30));
      });
    }

    // Show some recent general content for context
    const recentContent = posts.slice(0, 10);
    if (recentContent.length > 0) {
      console.log('\n📋 RECENT CONTENT SAMPLE:');
      console.log('=========================');
      recentContent.forEach((post, idx) => {
        console.log(`${idx + 1}. ${post.text.substring(0, 150)}...`);
      });
    }

    return {
      method: 'facebook_direct',
      totalPosts: posts.length,
      karaokeContent: karaokeContent.length,
      highConfidence: highConfidence,
      mediumConfidence: mediumConfidence,
      allContent: posts,
    };
  } catch (error) {
    console.error('❌ Error during analysis:', error);

    // Final fallback: just report what we know about Max from our previous analysis
    console.log('\n📋 FALLBACK: Known Max Denney Karaoke Information');
    console.log('==================================================');
    console.log('Based on previous profile analysis:');
    console.log('🎤 DJ Name: DJ Max');
    console.log('📱 Instagram: @DJMAX614');
    console.log("🏢 Primary Venue: O'Nellys Sports Pub");
    console.log('📅 Weekly Shows: 5 regular karaoke shows');
    console.log('📍 Location: Columbus, Ohio area');
    console.log('🎵 Specializes in: Karaoke hosting and DJ services');

    return {
      method: 'fallback_known_info',
      error: error.message,
      knownInfo: {
        djName: 'DJ Max',
        instagram: '@DJMAX614',
        venue: "O'Nellys Sports Pub",
        weeklyShows: 5,
        location: 'Columbus, Ohio',
      },
    };
  } finally {
    await browser.close();
  }
}

// Run the analysis
if (require.main === module) {
  analyzeMaxRecentPosts()
    .then((results) => {
      console.log('\n✅ Analysis complete!');
      if (results.method === 'facebook_direct') {
        console.log(`🎯 Found ${results.highConfidence.length} high-confidence karaoke posts`);
        console.log(`🔍 Found ${results.mediumConfidence.length} possible karaoke posts`);
      } else if (results.method === 'google_search') {
        console.log(`🔍 Found ${results.karaokeRelated} karaoke-related references`);
      } else {
        console.log('📋 Used fallback information from previous analysis');
      }
    })
    .catch((error) => {
      console.error('❌ Analysis failed:', error);
    });
}

module.exports = { analyzeMaxRecentPosts };
