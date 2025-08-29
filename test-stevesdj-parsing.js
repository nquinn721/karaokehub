const axios = require('axios');

async function testStevesDJSite() {
  console.log('🔍 Testing stevesdj.com karaoke schedule parsing...\n');

  const testUrl = 'https://stevesdj.com/karaoke-schedule';
  const apiKey = process.env.DEEPSEEK_API_KEY;

  if (!apiKey) {
    console.log('❌ DEEPSEEK_API_KEY environment variable not set');
    return;
  }

  try {
    console.log(`📡 Testing URL: ${testUrl}`);

    const startTime = Date.now();

    const response = await axios.post(
      'http://localhost:8000/api/parser/parse-website',
      {
        url: testUrl,
        deepSeekApiKey: apiKey,
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 180000,
      },
    );

    const duration = Date.now() - startTime;
    console.log(`\n✅ Response received in ${duration}ms`);
    console.log(`🎯 Site Name: ${response.data.siteName || 'Not extracted'}`);
    console.log(`🔗 URLs Found: ${response.data.urls?.length || 0}`);

    if (response.data.urls && response.data.urls.length > 0) {
      console.log('\n📋 URLs discovered:');
      response.data.urls.forEach((url, index) => {
        console.log(`  ${index + 1}. ${url}`);
      });
    }

    if (response.data.data) {
      console.log(`\n📊 Processing Results:`);
      console.log(`  Total URLs processed: ${response.data.data.processedUrls || 0}`);
      console.log(`  Shows found: ${response.data.data.totalShows || 0}`);

      if (response.data.data.shows && response.data.data.shows.length > 0) {
        console.log('\n🎤 Shows Found:');
        response.data.data.shows.forEach((show, index) => {
          console.log(`  ${index + 1}. ${show.venueName} - ${show.day} at ${show.time}`);
          if (show.address) console.log(`     Address: ${show.address}`);
          if (show.description) console.log(`     Description: ${show.description}`);
        });
      } else {
        console.log('\n❌ No shows found in the parsed data');
        console.log(
          'This indicates the DeepSeek parsing may need improvement for this site structure',
        );
      }
    }
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('❌ Server not running. Please start the server first with: npm run start:dev');
    } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
      console.log('⏰ Request timed out');
      console.log('Error details:', error.message);
    } else {
      console.error('❌ Error:', error.response?.data || error.message);
    }
  }
}

testStevesDJSite();
