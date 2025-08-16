/**
 * Debug script to see exactly what Facebook data is being sent to Gemini
 * This will help us understand why we're missing shows
 */

async function debugFacebookDataFlow() {
  console.log('🔍 DEBUGGING FACEBOOK DATA FLOW');
  console.log('===============================');

  const testUrl = 'https://www.facebook.com/max.denney.194690';

  try {
    console.log('\n📱 Step 1: Direct Facebook Graph API call');
    console.log('=========================================');

    // Make a direct call to test our Facebook service
    const facebookResponse = await fetch('http://localhost:8000/api/parser/debug-puppeteer', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url: testUrl }),
    });

    if (!facebookResponse.ok) {
      throw new Error(`Facebook API error! status: ${facebookResponse.status}`);
    }

    const facebookData = await facebookResponse.json();
    console.log('\n🔍 RAW FACEBOOK DATA STRUCTURE:');
    console.log('==============================');
    console.log('Keys available:', Object.keys(facebookData));

    if (facebookData.profileInfo) {
      console.log('\n📋 Profile Info:');
      console.log(JSON.stringify(facebookData.profileInfo, null, 2));
    }

    if (facebookData.schedule) {
      console.log('\n📅 Schedule Data:');
      console.log(`Count: ${facebookData.schedule.length}`);
      console.log(JSON.stringify(facebookData.schedule, null, 2));
    } else {
      console.log('\n❌ No schedule data found!');
    }

    if (facebookData.recentPosts) {
      console.log('\n📰 Recent Posts:');
      console.log(`Count: ${facebookData.recentPosts.length}`);
      console.log(JSON.stringify(facebookData.recentPosts, null, 2));
    } else {
      console.log('\n❌ No recent posts found!');
    }

    if (facebookData.venues) {
      console.log('\n🏢 Venues:');
      console.log(JSON.stringify(facebookData.venues, null, 2));
    }

    console.log('\n📊 ANALYSIS:');
    console.log('============');

    const hasSchedule = facebookData.schedule && facebookData.schedule.length > 0;
    const hasPosts = facebookData.recentPosts && facebookData.recentPosts.length > 0;
    const hasProfile = facebookData.profileInfo && Object.keys(facebookData.profileInfo).length > 0;

    console.log(`✅ Profile Info: ${hasProfile ? 'YES' : 'NO'}`);
    console.log(
      `✅ Schedule Data: ${hasSchedule ? facebookData.schedule.length + ' items' : 'NO'}`,
    );
    console.log(`✅ Recent Posts: ${hasPosts ? facebookData.recentPosts.length + ' items' : 'NO'}`);

    if (!hasSchedule) {
      console.log('\n🚨 PROBLEM IDENTIFIED:');
      console.log('======================');
      console.log('The Facebook service is not extracting schedule data!');
      console.log('This is why Gemini only sees recent posts.');
      console.log('\nPossible causes:');
      console.log('1. Facebook profile has login wall');
      console.log('2. Schedule data not properly parsed from HTML');
      console.log('3. Facebook changed their HTML structure');
      console.log('4. API access issues');
    }

    // Now test what Gemini actually receives
    console.log('\n🤖 Step 2: Test Gemini parsing with this data');
    console.log('=============================================');

    const geminiResponse = await fetch('http://localhost:8000/api/parser/parse-website', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url: testUrl }),
    });

    if (geminiResponse.ok) {
      const geminiResult = await geminiResponse.json();
      console.log('\n📊 Gemini Results:');
      console.log(`Shows extracted: ${geminiResult.shows?.length || 0}`);

      if (geminiResult.shows && geminiResult.shows.length > 0) {
        console.log('\nShow details:');
        geminiResult.shows.forEach((show, idx) => {
          console.log(`${idx + 1}. ${show.venue} (${show.day}) - ${show.time}`);
        });
      }
    }

    return {
      facebookData,
      hasSchedule,
      hasPosts,
      hasProfile,
    };
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
    return { error: error.message };
  }
}

// Run the debug
if (require.main === module) {
  debugFacebookDataFlow()
    .then((results) => {
      if (results.error) {
        console.log('\n⚠️ Could not complete debug due to errors');
      } else {
        console.log('\n✅ DEBUG COMPLETED!');
        console.log('\n💡 NEXT STEPS:');
        if (!results.hasSchedule) {
          console.log('1. Fix Facebook schedule extraction');
          console.log('2. Verify HTML parsing logic');
          console.log('3. Check for login walls or access issues');
        } else {
          console.log('1. Data extraction is working');
          console.log('2. Issue is likely in Gemini prompt processing');
        }
      }
    })
    .catch((error) => {
      console.error('Debug execution failed:', error);
    });
}

module.exports = { debugFacebookDataFlow };
