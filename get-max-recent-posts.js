const puppeteer = require('puppeteer');

/**
 * Enhanced Facebook Post Analysis for Max Denney's Recent Posts
 * Extracts and analyzes the last 50 posts for karaoke show information
 */

async function getMaxRecentPosts() {
  console.log('🎤 Starting Facebook post analysis for Max Denney...');

  const browser = await puppeteer.launch({
    headless: false, // Show browser for debugging
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

  const page = await browser.newPage();

  try {
    // Set user agent to appear more like a real browser
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    );

    console.log('📱 Navigating to Max Denney Facebook page...');
    await page.goto('https://www.facebook.com/max.denney.1', {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });

    // Wait for posts to load
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Scroll down multiple times to load more posts
    console.log('📜 Scrolling to load recent posts...');
    for (let i = 0; i < 10; i++) {
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } // Extract posts with enhanced karaoke detection
    console.log('🔍 Extracting and analyzing posts...');
    const posts = await page.evaluate(() => {
      const postElements = document.querySelectorAll(
        '[data-pagelet*="FeedUnit"], [role="article"], div[data-testid*="post"]',
      );
      const posts = [];

      // Karaoke-related keywords for intelligent detection
      const karaokeKeywords = [
        'karaoke',
        'singing',
        'mic night',
        'open mic',
        'live music',
        'DJ',
        'music',
        'songs',
        'sing',
        'stage',
        'performing',
        'venue',
        'bar',
        'pub',
        'restaurant',
        'show',
        'event',
        'tonight',
        'this week',
        'monday',
        'tuesday',
        'wednesday',
        'thursday',
        'friday',
        'saturday',
        'sunday',
      ];

      // Location/venue keywords
      const venueKeywords = [
        'onellys',
        "o'nellys",
        'sports pub',
        'bar',
        'grill',
        'restaurant',
        'venue',
        'location',
        'place',
      ];

      // Time/schedule keywords
      const timeKeywords = [
        'pm',
        'am',
        'oclock',
        'time',
        'start',
        'begin',
        'tonight',
        'today',
        'tomorrow',
        'week',
        'schedule',
      ];

      for (let i = 0; i < Math.min(postElements.length, 50); i++) {
        const element = postElements[i];

        // Extract post text content
        const textElement =
          element.querySelector('[data-testid="post_message"], [data-ad-preview="message"]') ||
          element.querySelector('div[dir="auto"]') ||
          element.querySelector('span[lang]');

        const text = textElement ? textElement.innerText : '';

        // Extract timestamp
        const timeElement =
          element.querySelector('a[role="link"][tabindex="0"]') ||
          element.querySelector('time') ||
          element.querySelector('[data-testid="story-subtitle"] a');

        const timestamp = timeElement
          ? timeElement.getAttribute('aria-label') || timeElement.innerText
          : 'Unknown';

        // Enhanced karaoke relevance scoring
        let karaokeScore = 0;
        let matchedKeywords = [];
        let venues = [];
        let times = [];

        if (text) {
          const lowerText = text.toLowerCase();

          // Check for karaoke keywords
          karaokeKeywords.forEach((keyword) => {
            if (lowerText.includes(keyword)) {
              karaokeScore += keyword === 'karaoke' ? 10 : 5;
              matchedKeywords.push(keyword);
            }
          });

          // Check for venue keywords
          venueKeywords.forEach((keyword) => {
            if (lowerText.includes(keyword)) {
              karaokeScore += 8;
              venues.push(keyword);
            }
          });

          // Check for time keywords
          timeKeywords.forEach((keyword) => {
            if (lowerText.includes(keyword)) {
              karaokeScore += 3;
              times.push(keyword);
            }
          });

          // Look for specific patterns
          if (lowerText.match(/\d{1,2}:?\d{0,2}\s*(pm|am)/)) {
            karaokeScore += 7;
            times.push('specific_time_found');
          }

          if (lowerText.match(/(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/)) {
            karaokeScore += 5;
            times.push('day_of_week_found');
          }
        }

        // Only include posts with some karaoke relevance or recent activity
        if (karaokeScore > 0 || text.length > 10) {
          posts.push({
            text: text || 'No text content',
            timestamp: timestamp,
            karaokeScore: karaokeScore,
            matchedKeywords: matchedKeywords,
            venues: venues,
            times: times,
            isLikelyKaraoke: karaokeScore >= 15,
            isPossibleKaraoke: karaokeScore >= 8,
            postIndex: i + 1,
          });
        }
      }

      return posts;
    });

    // Process and display results
    console.log(`\n📊 Found ${posts.length} posts for analysis\n`);

    // Sort by karaoke relevance score
    const sortedPosts = posts.sort((a, b) => b.karaokeScore - a.karaokeScore);

    // High confidence karaoke posts
    const highConfidence = sortedPosts.filter((p) => p.isLikelyKaraoke);
    const mediumConfidence = sortedPosts.filter((p) => p.isPossibleKaraoke && !p.isLikelyKaraoke);
    const otherPosts = sortedPosts.filter((p) => !p.isPossibleKaraoke);

    if (highConfidence.length > 0) {
      console.log('🎯 HIGH CONFIDENCE KARAOKE POSTS:');
      console.log('=====================================');
      highConfidence.forEach((post, idx) => {
        console.log(`\n${idx + 1}. KARAOKE SHOW DETECTED (Score: ${post.karaokeScore})`);
        console.log(`📅 Timestamp: ${post.timestamp}`);
        console.log(`🎤 Keywords: ${post.matchedKeywords.join(', ')}`);
        if (post.venues.length > 0) console.log(`🏢 Venues: ${post.venues.join(', ')}`);
        if (post.times.length > 0) console.log(`⏰ Time indicators: ${post.times.join(', ')}`);
        console.log(
          `📝 Content: ${post.text.substring(0, 300)}${post.text.length > 300 ? '...' : ''}`,
        );
        console.log('─'.repeat(50));
      });
    }

    if (mediumConfidence.length > 0) {
      console.log('\n🔍 POSSIBLE KARAOKE POSTS:');
      console.log('============================');
      mediumConfidence.slice(0, 10).forEach((post, idx) => {
        console.log(`\n${idx + 1}. Possible Show (Score: ${post.karaokeScore})`);
        console.log(`📅 ${post.timestamp}`);
        console.log(`🎤 ${post.matchedKeywords.join(', ')}`);
        console.log(`📝 ${post.text.substring(0, 200)}${post.text.length > 200 ? '...' : ''}`);
        console.log('─'.repeat(30));
      });
    }

    // Summary statistics
    console.log('\n📈 ANALYSIS SUMMARY:');
    console.log('====================');
    console.log(`Total posts analyzed: ${posts.length}`);
    console.log(`High confidence karaoke: ${highConfidence.length}`);
    console.log(`Possible karaoke: ${mediumConfidence.length}`);
    console.log(`Other posts: ${otherPosts.length}`);

    // Most common keywords found
    const allKeywords = posts.flatMap((p) => p.matchedKeywords);
    const keywordCounts = {};
    allKeywords.forEach((k) => (keywordCounts[k] = (keywordCounts[k] || 0) + 1));
    const topKeywords = Object.entries(keywordCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10);

    if (topKeywords.length > 0) {
      console.log('\n🏷️ Most frequent keywords:');
      topKeywords.forEach(([keyword, count]) => {
        console.log(`  ${keyword}: ${count} times`);
      });
    }

    // Recent activity patterns
    const recentPosts = posts.filter(
      (p) =>
        p.timestamp.includes('hr') ||
        p.timestamp.includes('min') ||
        p.timestamp.includes('day') ||
        p.timestamp.includes('yesterday') ||
        p.timestamp.includes('today'),
    );

    if (recentPosts.length > 0) {
      console.log(`\n⏰ Recent activity: ${recentPosts.length} posts in last few days`);
    }

    return {
      totalPosts: posts.length,
      highConfidenceKaraoke: highConfidence,
      possibleKaraoke: mediumConfidence,
      allPosts: sortedPosts,
      summary: {
        total: posts.length,
        highConfidence: highConfidence.length,
        possibleKaraoke: mediumConfidence.length,
        topKeywords: topKeywords,
        recentActivity: recentPosts.length,
      },
    };
  } catch (error) {
    console.error('❌ Error during Facebook analysis:', error);
    throw error;
  } finally {
    await browser.close();
    console.log('\n🎤 Facebook post analysis complete!');
  }
}

// Run the analysis
if (require.main === module) {
  getMaxRecentPosts()
    .then((results) => {
      console.log('\n✅ Analysis complete! Check the output above for karaoke show details.');
      if (results.highConfidenceKaraoke.length > 0) {
        console.log(`🎯 Found ${results.highConfidenceKaraoke.length} likely karaoke shows!`);
      }
    })
    .catch((error) => {
      console.error('❌ Failed to analyze Facebook posts:', error);
      process.exit(1);
    });
}

module.exports = { getMaxRecentPosts };
