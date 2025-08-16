/**
 * Test script to see what data we extract vs what Gemini gets
 * This will help us identify where information is being lost
 */

const { analyzeMaxRecentPosts } = require('./max-recent-activity.js');

async function compareDataExtractionMethods() {
  console.log('🔍 COMPARING DATA EXTRACTION METHODS');
  console.log('====================================');

  // Method 1: Our manual analysis (what we have available)
  console.log('\n📊 METHOD 1: Manual Analysis (max-recent-activity.js)');
  console.log('======================================================');

  const manualResults = analyzeMaxRecentPosts();

  console.log('\n🎯 RICH DATA AVAILABLE:');
  console.log('- Vendor Information:', JSON.stringify(manualResults.recentPost, null, 2));
  console.log('- Weekly Schedule:', manualResults.weeklySchedule.length, 'shows');
  console.log('- Recent Posts:', manualResults.recentPost ? 'YES' : 'NO');
  console.log('- Social Media:', JSON.stringify(manualResults.socialMedia, null, 2));
  console.log('- Upcoming Shows:', manualResults.upcomingShows.length);

  // Show the detailed data structure we have
  console.log('\n📋 DETAILED SHOW DATA AVAILABLE:');
  manualResults.weeklySchedule.forEach((show, idx) => {
    console.log(`${idx + 1}. ${show.venue}:`);
    console.log(`   Day: ${show.day}`);
    console.log(`   Time: ${show.time}`);
    console.log(`   Start Time: ${show.startTime}`);
    console.log(`   End Time: ${show.endTime}`);
    console.log(`   Address: ${show.address}`);
    console.log(`   DJ: ${show.djName}`);
    console.log(`   Confidence: ${show.confidence}`);
    console.log('');
  });

  // Method 2: What would be extracted by Facebook service
  console.log('\n📱 METHOD 2: Facebook Service Data Structure');
  console.log('=============================================');

  // Simulate what the Facebook service would extract
  const facebookServiceData = {
    profileInfo: {
      name: 'Max Denney',
      followers: '2K',
      location: 'Columbus, Ohio',
      instagram: 'DJMAX614',
      bio: 'Digital creator',
    },
    schedule: [
      { day: 'WED', venue: "Kelley's Pub", time: '8pm-12am', dayOfWeek: 'Wednesday' },
      { day: 'TH', venue: 'Crescent Lounge', time: '8pm-12am', dayOfWeek: 'Thursday' },
      { day: 'SAT', venue: 'Crescent Lounge', time: '8pm-12am', dayOfWeek: 'Saturday' },
      { day: 'FRI', venue: "O'Nelly's", time: '9pm-2am', dayOfWeek: 'Friday' },
      { day: 'SUN', venue: 'North High Dublin', time: '6pm-9pm', dayOfWeek: 'Sunday' },
    ],
    recentPosts: [
      {
        timeAgo: '22h',
        content: 'Fridays! @onellyssportspub #Karaoke 9pm-2am!',
        venue: 'onellyssportspub',
        time: '9pm-2am',
        date: 'friday',
      },
    ],
    venues: ["Kelley's Pub", 'Crescent Lounge', "O'Nelly's", 'North High Dublin'],
    additionalShows: [],
  };

  console.log('Facebook Service Data Structure:');
  console.log(JSON.stringify(facebookServiceData, null, 2));

  // Method 3: What Gemini actually sees
  console.log('\n🤖 METHOD 3: What Gets Sent to Gemini');
  console.log('=====================================');

  const geminiPromptData = `
You are analyzing Facebook profile data for karaoke show extraction. The data includes profile information, recent posts, and schedule details extracted from Facebook.

IMPORTANT: This is STRUCTURED FACEBOOK DATA, not raw website text. Parse intelligently to extract karaoke shows and events.

Facebook Profile Data:
${JSON.stringify(facebookServiceData, null, 2)}

Original URL: https://www.facebook.com/max.denney.194690
`;

  console.log('Gemini Prompt Length:', geminiPromptData.length, 'characters');
  console.log('Data Structure:', 'Structured JSON object with profile, schedule, posts');

  // Analysis of differences
  console.log('\n🔍 DATA COMPARISON ANALYSIS:');
  console.log('============================');

  console.log('\n✅ INFORMATION AVAILABLE IN MANUAL ANALYSIS:');
  console.log('- Exact addresses for all venues');
  console.log('- Standardized time formats (24-hour)');
  console.log('- Confidence scores for each show');
  console.log('- Current day detection and upcoming shows');
  console.log('- Social media cross-references');
  console.log('- Venue contact suggestions');
  console.log('- Real-time post analysis with scoring');
  console.log('- Call-to-action detection');
  console.log('- Hashtag and social tag extraction');

  console.log('\n❓ INFORMATION SENT TO GEMINI:');
  console.log('- Profile basic info (name, location, bio)');
  console.log('- Schedule array (day, venue, time)');
  console.log('- Recent posts array (content, venue tags)');
  console.log('- Venue list');
  console.log('- Additional shows array');

  console.log('\n🚨 POTENTIAL INFORMATION LOSS:');
  console.log('==============================');
  console.log(
    '1. VENUE ADDRESSES: Manual analysis has exact addresses, Gemini gets venue names only',
  );
  console.log('2. TIME STANDARDIZATION: Manual has 24-hour format, Gemini gets raw time strings');
  console.log(
    '3. CONFIDENCE SCORING: Manual has detailed confidence per show, Gemini generates its own',
  );
  console.log(
    '4. CONTEXT ANALYSIS: Manual has real-time analysis, Gemini relies on structured data',
  );
  console.log(
    '5. SOCIAL MEDIA INTEGRATION: Manual has cross-platform verification, Gemini has limited access',
  );

  return {
    manualResults,
    facebookServiceData,
    geminiPromptData,
  };
}

// Run the comparison
if (require.main === module) {
  compareDataExtractionMethods()
    .then(() => {
      console.log('\n✅ Data comparison completed!');
      console.log('\n💡 RECOMMENDATIONS:');
      console.log('===================');
      console.log('1. Enhance Facebook service to include venue addresses');
      console.log('2. Pre-process time formats before sending to Gemini');
      console.log('3. Include confidence scoring guidelines in Gemini prompt');
      console.log('4. Add venue address lookup integration');
      console.log('5. Include social media verification data in the prompt');
    })
    .catch((error) => {
      console.error('❌ Comparison failed:', error);
    });
}

module.exports = { compareDataExtractionMethods };
