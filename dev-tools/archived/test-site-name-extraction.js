const axios = require('axios');

// Test the site name extraction functionality
async function testSiteNameExtraction() {
  console.log('🧪 Testing site name extraction functionality...\n');

  const testUrl = 'https://karaokeviewpoint.com';
  const apiKey = process.env.DEEPSEEK_API_KEY;

  if (!apiKey) {
    console.log('❌ DEEPSEEK_API_KEY environment variable not set');
    return;
  }

  try {
    console.log(`📡 Testing unlimited discovery with site name extraction for: ${testUrl}`);

    const response = await axios.post(
      'http://localhost:8000/api/parser/parse-website',
      {
        url: testUrl,
        deepSeekApiKey: apiKey,
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000,
      },
    );

    console.log('\n✅ Response received:');
    console.log(`🎯 Site Name: ${response.data.siteName || 'Not extracted'}`);
    console.log(`🔗 URLs Found: ${response.data.urls?.length || 0}`);

    if (response.data.urls && response.data.urls.length > 0) {
      console.log('\n📋 Discovered URLs:');
      response.data.urls.slice(0, 10).forEach((url, index) => {
        console.log(`  ${index + 1}. ${url}`);
      });
      if (response.data.urls.length > 10) {
        console.log(`  ... and ${response.data.urls.length - 10} more URLs`);
      }
    }

    console.log('\n🔍 Full response:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('❌ Server not running. Please start the server first with: npm run start:dev');
    } else {
      console.error('❌ Error:', error.response?.data || error.message);
    }
  }
}

testSiteNameExtraction();
