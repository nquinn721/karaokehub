/**
 * Direct test of Facebook profile data extraction
 * This will call the actual Facebook service method to see what's happening
 */

async function testFacebookProfileExtraction() {
  console.log('🔍 TESTING FACEBOOK PROFILE EXTRACTION');
  console.log('======================================');

  const testUrl = 'https://www.facebook.com/max.denney.194690';

  try {
    console.log(`\n📱 Testing URL: ${testUrl}`);
    console.log('This should call the Facebook service extractProfileKaraokeData method...');

    // Call the main parse endpoint which should trigger Facebook profile extraction
    const response = await fetch('http://localhost:8000/api/parser/parse-website', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url: testUrl }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    console.log('\n🎯 PARSE WEBSITE RESULTS:');
    console.log('=========================');
    console.log(`Shows Found: ${result.shows?.length || 0}`);
    console.log(`Vendor: ${result.vendor?.name || 'Not found'}`);
    console.log(`DJs: ${result.djs?.length || 0}`);

    // Let's also manually test if we can hit the Facebook service directly
    console.log('\n🔧 MANUAL FACEBOOK SERVICE TEST:');
    console.log('=================================');

    // Try to see what the debug-puppeteer endpoint actually returns
    const debugResponse = await fetch('http://localhost:8000/api/parser/debug-puppeteer', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url: testUrl }),
    });

    if (debugResponse.ok) {
      const debugData = await debugResponse.json();
      console.log('\nDebug Puppeteer Data Keys:', Object.keys(debugData));

      // Check if this has the extraction data we expect
      if (debugData.extraction) {
        console.log('\n✅ Extraction data found!');
        console.log('Extraction keys:', Object.keys(debugData.extraction));

        if (debugData.extraction.profileInfo) {
          console.log('\nProfile Info:', debugData.extraction.profileInfo);
        }
        if (debugData.extraction.schedule) {
          console.log('\nSchedule:', debugData.extraction.schedule);
        }
        if (debugData.extraction.recentPosts) {
          console.log('\nRecent Posts:', debugData.extraction.recentPosts);
        }
      } else {
        console.log('\n❌ No extraction data in debug response');
        console.log('Full debug response:', JSON.stringify(debugData, null, 2));
      }
    } else {
      console.log('Debug endpoint failed:', debugResponse.status);
    }

    // Compare with our manual analysis
    const { analyzeMaxRecentPosts } = require('./max-recent-activity.js');
    const manualResults = analyzeMaxRecentPosts();

    console.log('\n📊 COMPARISON:');
    console.log('==============');
    console.log(`Manual Analysis Shows: ${manualResults.weeklySchedule.length}`);
    console.log(`Facebook Service Shows: ${result.shows?.length || 0}`);
    console.log(
      `Expected: 5 shows (Kelley's Pub, Crescent Lounge x2, O'Nelly's, North High Dublin)`,
    );

    console.log('\n🔍 ANALYSIS:');
    console.log('============');

    if ((result.shows?.length || 0) < 5) {
      console.log('❌ Facebook service is not extracting all the schedule data');
      console.log('Possible issues:');
      console.log('1. Login wall blocking content');
      console.log('2. HTML structure changed');
      console.log('3. Regex patterns not matching current content');
      console.log('4. Puppeteer timing issues');
      console.log('5. Facebook blocking automated access');
    } else {
      console.log('✅ Facebook service is working correctly');
    }

    return {
      success: true,
      showsFound: result.shows?.length || 0,
      expected: 5,
      result,
    };
  } catch (error) {
    console.error('❌ Test failed:', error.message);

    if (error.message.includes('ECONNREFUSED')) {
      console.log('\n💡 NOTE: Server not running. Start server first: npm run start:dev');
    }

    return {
      success: false,
      error: error.message,
    };
  }
}

// Run the test
if (require.main === module) {
  testFacebookProfileExtraction()
    .then((results) => {
      if (results.success) {
        console.log('\n🎉 FACEBOOK PROFILE EXTRACTION TEST COMPLETED!');

        if (results.showsFound < results.expected) {
          console.log('\n🚨 ISSUE CONFIRMED:');
          console.log('The Facebook service is not extracting the full schedule data');
          console.log('Need to investigate and fix the Facebook extraction logic');
        } else {
          console.log('\n✅ Facebook extraction is working correctly');
        }
      } else {
        console.log('\n⚠️  Test could not complete due to errors');
      }
    })
    .catch((error) => {
      console.error('Test execution failed:', error);
    });
}

module.exports = { testFacebookProfileExtraction };
