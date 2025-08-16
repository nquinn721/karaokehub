// Facebook Profile Data Extraction Analysis
// Testing what data we can extract from Max Denney's Facebook profile

const axios = require('axios');

async function analyzeFacebookProfileData() {
  try {
    console.log('🎤 FACEBOOK PROFILE KARAOKE DATA EXTRACTION ANALYSIS');
    console.log('==================================================');
    console.log("Testing with Max Denney's Facebook profile...\n");

    const testUrl =
      'https://www.facebook.com/max.denney.194690?mibextid=wwXIfr&rdid=kN0Fd3eOEli2RRdO&share_url=https%3A%2F%2Fwww.facebook.com%2Fshare%2F16kWgqjUbW%2F%3Fmibextid%3DwwXIfr#';

    const response = await axios.post(
      'http://localhost:8000/api/parser/parse-website',
      {
        url: testUrl,
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );

    const data = response.data;

    console.log('📊 EXTRACTED DATA BREAKDOWN:');
    console.log('============================\n');

    // 1. DJ Profile Information
    console.log('👤 DJ PROFILE INFORMATION:');
    console.log('   Name:', data.vendor.name);
    console.log('   Description:', data.vendor.description);
    console.log('   Confidence:', data.vendor.confidence * 100 + '%');
    console.log('   Website:', data.vendor.website);

    if (data.djs && data.djs.length > 0) {
      console.log('\n🎭 DJ IDENTITIES FOUND:');
      data.djs.forEach((dj, index) => {
        console.log(`   ${index + 1}. ${dj.name} (${dj.confidence * 100}% confidence)`);
        console.log(`      Context: ${dj.context}`);
        if (dj.aliases && dj.aliases.length > 0) {
          console.log(`      Aliases: ${dj.aliases.join(', ')}`);
        }
      });
    }

    // 2. Weekly Schedule
    if (data.shows && data.shows.length > 0) {
      console.log('\n📅 REGULAR WEEKLY SCHEDULE:');
      data.shows.forEach((show, index) => {
        console.log(`   ${index + 1}. ${show.day.toUpperCase()}: ${show.venue}`);
        console.log(`      Time: ${show.time}`);
        console.log(`      Location: ${show.address}`);
        console.log(`      DJ: ${show.djName}`);
        if (show.description) {
          console.log(`      Description: ${show.description}`);
        }
        console.log(`      Confidence: ${show.confidence * 100}%\n`);
      });
    }

    // 3. Raw Data Analysis
    if (data.rawData && data.rawData.content) {
      console.log('🔍 RAW EXTRACTED CONTENT ANALYSIS:');
      console.log('==================================');

      // The content is already a string, no need to parse as JSON
      const content = data.rawData.content;

      // Find posts mentioning karaoke
      const lines = content.split('\n');
      const karaokeLines = lines.filter((line) => {
        const lower = line.toLowerCase();
        return (
          lower.includes('karaoke') ||
          lower.includes('#karaoke') ||
          (lower.includes('@') && (lower.includes('pub') || lower.includes('lounge'))) ||
          /\d+[ap]m/.test(lower)
        );
      });

      console.log('\n📝 KARAOKE-RELATED CONTENT FOUND:');
      karaokeLines.forEach((line, index) => {
        if (line.trim()) {
          console.log(`   ${index + 1}. ${line.trim()}`);
        }
      });

      // Analyze social media handles
      const instagramMatches = content.match(/DJ[A-Z0-9]+/g) || [];
      if (instagramMatches.length > 0) {
        console.log('\n📱 SOCIAL MEDIA HANDLES:');
        instagramMatches.forEach((handle, index) => {
          console.log(`   ${index + 1}. Instagram: @${handle}`);
        });
      }

      // Analyze follower count
      const followerMatch = content.match(/(\d+[KM]?) followers/);
      if (followerMatch) {
        console.log('\n👥 SOCIAL METRICS:');
        console.log(`   Followers: ${followerMatch[1]}`);
      }

      // Look for venue mentions with hashtags/tags
      const venueTagMatches = content.match(/@[a-z]+(?:pub|lounge|bar|grill)/gi) || [];
      if (venueTagMatches.length > 0) {
        console.log('\n🏢 VENUE TAGS FOUND:');
        venueTagMatches.forEach((tag, index) => {
          console.log(`   ${index + 1}. ${tag}`);
        });
      }
    }

    console.log('\n✨ WHAT THIS MEANS FOR KARAOKE DATA:');
    console.log('===================================');
    console.log('✅ Profile Bio Information: Name, description, location');
    console.log('✅ Weekly Schedule: Recurring karaoke shows with venues and times');
    console.log('✅ Social Media Handles: Instagram (@DJMAX614)');
    console.log('✅ Recent Posts: Live updates about karaoke events');
    console.log('✅ Venue Tags: Social media handles for venues (@onellyssportspub)');
    console.log('✅ Follower Count: Social influence metrics (1K followers)');
    console.log('✅ Time-Based Posts: Recent activity (6h ago posts)');
    console.log('✅ Hashtag Usage: #Karaoke for discoverability');

    console.log('\n🚀 ADDITIONAL DATA WE COULD EXTRACT:');
    console.log('====================================');
    console.log('📸 Photos: Event photos and venue pictures');
    console.log('💬 Comments: Audience engagement and feedback');
    console.log('👍 Reactions: Post engagement metrics');
    console.log('📍 Check-ins: Location data and venue confirmations');
    console.log('🔗 External Links: Venue websites and booking platforms');
    console.log('📅 Event History: Past events and performance history');
    console.log('🎯 Audience Demographics: Follower analysis for market insights');
  } catch (error) {
    console.error('❌ Error analyzing Facebook data:', error.message);
  }
}

analyzeFacebookProfileData();
