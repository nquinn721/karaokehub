/**
 * Test script to verify Facebook Graph API integration
 * This tests the new Graph API approach vs the old Puppeteer approach
 */

const axios = require('axios');

// Test Facebook event URL parsing
async function testFacebookIntegration() {
  try {
    console.log('Testing Facebook Graph API Integration...\n');

    // Test with a Facebook event URL
    const eventUrl = 'https://www.facebook.com/events/123456789';

    // Test the new parser endpoint
    console.log('1. Testing Facebook event parsing via Graph API...');

    const response = await axios.post(
      'http://localhost:3000/api/parser/parse',
      {
        url: eventUrl,
        useGraphApi: true, // Flag to use Graph API instead of Puppeteer
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );

    console.log('Response status:', response.status);
    console.log('Parsed data:', JSON.stringify(response.data, null, 2));

    // Check if we got shows and DJs (should be > 0 with Graph API)
    const showCount = response.data.shows?.length || 0;
    const djCount = response.data.djs?.length || 0;

    console.log(`\nResults: ${showCount} shows, ${djCount} DJs`);

    if (showCount > 0 || djCount > 0) {
      console.log('✅ SUCCESS: Facebook Graph API integration is working!');
      console.log('   No more 0 shows/0 DJs from authentication failures');
    } else {
      console.log('⚠️  WARNING: Still getting 0 shows/0 DJs');
      console.log('   Check Facebook app credentials and permissions');
    }
  } catch (error) {
    console.error('❌ ERROR testing Facebook integration:', error.message);

    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }

    // Check if server is running
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 TIP: Make sure the server is running with: npm run start:dev');
    }
  }
}

// Test Facebook page URL parsing
async function testFacebookPageParsing() {
  try {
    console.log('\n2. Testing Facebook page parsing via Graph API...');

    // Test with a Facebook business page
    const pageUrl = 'https://www.facebook.com/somekaraokevenue';

    const response = await axios.post(
      'http://localhost:3000/api/parser/parse',
      {
        url: pageUrl,
        useGraphApi: true,
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );

    console.log('Page parsing status:', response.status);
    const showCount = response.data.shows?.length || 0;
    const djCount = response.data.djs?.length || 0;

    console.log(`Page results: ${showCount} shows, ${djCount} DJs`);

    if (showCount > 0) {
      console.log('✅ SUCCESS: Page event parsing working!');
    } else {
      console.log('ℹ️  INFO: No events found on this page (normal for pages without events)');
    }
  } catch (error) {
    console.error('❌ ERROR testing page parsing:', error.message);
  }
}

// Main test execution
async function runTests() {
  console.log('🔍 Facebook Graph API Integration Test');
  console.log('====================================\n');

  await testFacebookIntegration();
  await testFacebookPageParsing();

  console.log('\n✨ Test complete!');
  console.log('\nNext steps:');
  console.log('1. Test with real Facebook event URLs');
  console.log('2. Verify Facebook app permissions');
  console.log('3. Check logs for detailed Graph API responses');
}

// Check if server is running first
async function checkServer() {
  try {
    await axios.get('http://localhost:3000/health');
    console.log('✅ Server is running\n');
    return true;
  } catch (error) {
    console.log('❌ Server is not running');
    console.log('💡 Start server with: npm run start:dev\n');
    return false;
  }
}

// Run the test
checkServer().then((isRunning) => {
  if (isRunning) {
    runTests();
  }
});
