/**
 * Extract Recent Posts from Max Denney's Facebook Profile Data
 * Analyzes the raw Facebook data we can access for recent karaoke show information
 */

const { FacebookService } = require('./src/facebook/facebook.service');

async function extractMaxRecentPosts() {
  console.log("🎤 Analyzing Max Denney's recent Facebook posts...");

  try {
    const facebookService = new FacebookService();

    // Use our enhanced Facebook service to get profile data with recent posts
    console.log('📱 Fetching profile data with recent activity...');
    const profileData = await facebookService.extractProfileKaraokeData(
      'https://www.facebook.com/max.denney.194690',
    );

    if (!profileData || !profileData.rawData) {
      console.log('❌ No profile data available');
      return;
    }

    console.log('📊 Profile data retrieved successfully!');
    console.log(`📅 Data parsed at: ${profileData.rawData.parsedAt}`);

    // Extract recent post information from the raw content
    const content = profileData.rawData.content;
    console.log('\n🔍 Analyzing content for recent posts...');

    // Look for recent post indicators
    const recentPostPatterns = [
      /(\d+h|\d+m|\d+ min|\d+ hr|yesterday|today|just now).*?(karaoke|show|music|dj|venue|bar|pub)/gi,
      /(monday|tuesday|wednesday|thursday|friday|saturday|sunday).*?(karaoke|show|music|dj)/gi,
      /(tonight|today|tomorrow).*?(karaoke|show|music|dj)/gi,
      /@\w+.*?(karaoke|show|music)/gi,
      /#\w+.*?(karaoke|show|music)/gi,
    ];

    const recentPosts = [];

    // Extract the recent post we can see in the content
    if (content.includes('22h')) {
      const postMatch = content.match(/22h[\s\S]*?(?=See more from Max Denney|Email or phone|$)/);
      if (postMatch) {
        const postText = postMatch[0];
        console.log('\n🎯 RECENT POST FOUND (22 hours ago):');
        console.log('=====================================');
        console.log(postText);

        // Parse the specific post details
        const postAnalysis = analyzePost(postText, '22 hours ago');
        recentPosts.push(postAnalysis);
      }
    }

    // Look for other time indicators in the content
    const timePatterns = [
      /(\d+h|\d+m|\d+ min|\d+ hr)\s*·[^·]*?(karaoke|show|music|dj|venue)/gi,
      /(yesterday|today|just now)[^\.]*?(karaoke|show|music|dj)/gi,
    ];

    timePatterns.forEach((pattern) => {
      const matches = content.matchAll(pattern);
      for (const match of matches) {
        const postText = match[0];
        const timeIndicator = match[1];
        console.log(`\n📅 Found timed content (${timeIndicator}):`);
        console.log(postText);

        const analysis = analyzePost(postText, timeIndicator);
        recentPosts.push(analysis);
      }
    });

    // Extract current weekly schedule
    console.log('\n📅 CURRENT WEEKLY SCHEDULE:');
    console.log('===========================');
    if (profileData.shows && profileData.shows.length > 0) {
      profileData.shows.forEach((show, idx) => {
        console.log(`${idx + 1}. ${show.day.toUpperCase()}: ${show.venue}`);
        console.log(`   ⏰ Time: ${show.time}`);
        console.log(`   📍 Location: ${show.address}`);
        console.log(`   🎤 DJ: ${show.djName}`);
        console.log(`   🎯 Confidence: ${(show.confidence * 100).toFixed(0)}%`);
        console.log('─'.repeat(40));
      });
    }

    // Extract social media links for more recent content
    console.log('\n📱 SOCIAL MEDIA CONNECTIONS:');
    console.log('============================');
    if (profileData.rawData.content.includes('DJMAX614')) {
      console.log('🎤 Instagram: @DJMAX614');
      console.log('   🔗 https://www.instagram.com/DJMAX614');
      console.log('   📝 Suggested: Check Instagram for daily show updates');
    }

    // Look for hashtags that might indicate recent activity
    const hashtags = content.match(/#\w+/g) || [];
    if (hashtags.length > 0) {
      console.log('\n🏷️ HASHTAGS FOUND:');
      hashtags.forEach((tag) => console.log(`   ${tag}`));
    }

    // Summary of findings
    console.log('\n📈 RECENT ACTIVITY SUMMARY:');
    console.log('===========================');
    console.log(`Recent posts found: ${recentPosts.length}`);
    console.log(`Regular weekly shows: ${profileData.shows?.length || 0}`);
    console.log(
      `Social media accounts: ${profileData.rawData.content.includes('DJMAX614') ? 1 : 0}`,
    );

    if (recentPosts.length > 0) {
      console.log('\n🎯 RECENT KARAOKE ACTIVITY:');
      recentPosts.forEach((post, idx) => {
        console.log(`${idx + 1}. ${post.time}: ${post.venue || 'Unknown venue'}`);
        console.log(`   📝 ${post.description}`);
        console.log(`   🎤 Karaoke Score: ${post.karaokeScore}/10`);
      });
    }

    // Recommendations for getting more recent posts
    console.log('\n💡 RECOMMENDATIONS FOR MORE RECENT POSTS:');
    console.log('=========================================');
    console.log('1. 📱 Check Instagram @DJMAX614 for daily updates');
    console.log('2. 🏢 Visit venue websites directly:');
    console.log("   - O'Nellys Sports Pub (Friday shows)");
    console.log('   - Crescent Lounge (Thursday & Saturday)');
    console.log("   - Kelley's Pub (Wednesday)");
    console.log('   - North High Dublin (Sunday)');
    console.log('3. 📞 Call venues directly for show confirmations');
    console.log("4. 🔔 Set up Facebook notifications for Max Denney's posts");

    return {
      recentPosts: recentPosts,
      weeklySchedule: profileData.shows,
      socialMedia: {
        instagram: '@DJMAX614',
      },
      venues:
        profileData.shows?.map((show) => ({
          name: show.venue,
          day: show.day,
          time: show.time,
        })) || [],
      lastAnalyzed: new Date().toISOString(),
    };
  } catch (error) {
    console.error('❌ Error analyzing recent posts:', error);

    // Fallback to known information
    console.log('\n📋 FALLBACK: Known Max Denney Information');
    console.log('=========================================');
    console.log('🎤 DJ Name: Max Denney / DJMAX614');
    console.log('📱 Instagram: @DJMAX614');
    console.log('📅 Known Schedule:');
    console.log("   - Wednesday: Kelley's Pub (8pm-12am)");
    console.log('   - Thursday: Crescent Lounge (8pm-12am)');
    console.log("   - Friday: O'Nellys Sports Pub (9pm-2am)");
    console.log('   - Saturday: Crescent Lounge (8pm-12am)');
    console.log('   - Sunday: North High Dublin (6pm-9pm)');

    return {
      error: error.message,
      fallbackSchedule: [
        { day: 'wednesday', venue: "Kelley's Pub", time: '8pm-12am' },
        { day: 'thursday', venue: 'Crescent Lounge', time: '8pm-12am' },
        { day: 'friday', venue: "O'Nellys Sports Pub", time: '9pm-2am' },
        { day: 'saturday', venue: 'Crescent Lounge', time: '8pm-12am' },
        { day: 'sunday', venue: 'North High Dublin', time: '6pm-9pm' },
      ],
    };
  }
}

function analyzePost(postText, timeIndicator) {
  const lowerText = postText.toLowerCase();

  // Calculate karaoke relevance score
  let karaokeScore = 0;
  const keywords = [];

  // High-value karaoke keywords
  if (lowerText.includes('karaoke')) {
    karaokeScore += 10;
    keywords.push('karaoke');
  }
  if (lowerText.includes('dj')) {
    karaokeScore += 8;
    keywords.push('dj');
  }
  if (lowerText.includes('music')) {
    karaokeScore += 6;
    keywords.push('music');
  }
  if (lowerText.includes('show')) {
    karaokeScore += 6;
    keywords.push('show');
  }
  if (lowerText.includes('singing')) {
    karaokeScore += 8;
    keywords.push('singing');
  }

  // Venue indicators
  if (lowerText.includes('onellys') || lowerText.includes("o'nellys")) {
    karaokeScore += 9;
    keywords.push('onellys');
  }
  if (lowerText.includes('pub') || lowerText.includes('bar')) {
    karaokeScore += 5;
    keywords.push('venue');
  }

  // Time indicators
  if (lowerText.match(/\d{1,2}pm|\d{1,2}am/)) {
    karaokeScore += 7;
    keywords.push('time_specified');
  }

  // Extract venue name
  let venue = 'Unknown';
  if (lowerText.includes('onellys')) venue = "O'Nellys Sports Pub";
  if (lowerText.includes('crescent')) venue = 'Crescent Lounge';
  if (lowerText.includes('kelley')) venue = "Kelley's Pub";
  if (lowerText.includes('north high')) venue = 'North High Dublin';

  return {
    time: timeIndicator,
    venue: venue,
    description: postText.trim(),
    karaokeScore: Math.min(karaokeScore, 10),
    keywords: keywords,
    isKaraokeRelated: karaokeScore >= 8,
  };
}

// Run the analysis
if (require.main === module) {
  extractMaxRecentPosts()
    .then((results) => {
      console.log('\n✅ Recent post analysis complete!');
      if (results && results.recentPosts) {
        console.log(`🎯 Found ${results.recentPosts.length} recent posts`);
        console.log(`📅 ${results.weeklySchedule?.length || 0} regular weekly shows`);
      }
    })
    .catch((error) => {
      console.error('❌ Analysis failed:', error);
    });
}

module.exports = { extractMaxRecentPosts };
