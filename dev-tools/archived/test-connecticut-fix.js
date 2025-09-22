const axios = require('axios');

async function testConnecticutPageFix() {
  console.log('🧪 Testing Connecticut page fix...\n');

  const testUrl = 'https://karaokeviewpoint.com/karaoke-in-connecticut/';
  const apiKey = process.env.DEEPSEEK_API_KEY;

  if (!apiKey) {
    console.log('❌ DEEPSEEK_API_KEY environment variable not set');
    return;
  }

  try {
    console.log(`📡 Testing improved worker with: ${testUrl}`);
    console.log('Expected improvements:');
    console.log('  ✅ Multiple loading strategies (domcontentloaded first)');
    console.log('  ✅ Better content extraction for minimal pages');
    console.log('  ✅ Error detection for blocked/403 pages');
    console.log('  ✅ Fallback to HTML parsing if needed');
    console.log('  ✅ Improved timeout handling\n');

    const startTime = Date.now();

    console.log('📡 Sending request to server...');

    const response = await axios.post(
      'http://localhost:8000/api/parser/parse-website',
      {
        url: testUrl,
        deepSeekApiKey: apiKey,
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 180000, // 3 minutes to allow for all strategies
        onUploadProgress: () => console.log('📤 Request sent...'),
        onDownloadProgress: () => console.log('📥 Receiving response...'),
      },
    );

    const duration = Date.now() - startTime;
    console.log(`\n✅ Response received in ${duration}ms`);
    console.log(`🎯 Site Name: ${response.data.siteName || 'Not extracted'}`);
    console.log(`🔗 URLs Found: ${response.data.urls?.length || 0}`);

    if (response.data.urls && response.data.urls.length > 0) {
      console.log('\n📋 Sample URLs discovered:');
      response.data.urls.slice(0, 5).forEach((url, index) => {
        console.log(`  ${index + 1}. ${url}`);
      });
      if (response.data.urls.length > 5) {
        console.log(`  ... and ${response.data.urls.length - 5} more URLs`);
      }
    }

    console.log('\n🔍 Processing details:');
    if (response.data.stats) {
      console.log(`  Discovery time: ${response.data.stats.discoveryTime}ms`);
      console.log(`  Processing time: ${response.data.stats.processingTime}ms`);
      console.log(`  Total time: ${response.data.stats.totalTime}ms`);
    }

    if (response.data.data) {
      console.log(`  Total URLs processed: ${response.data.data.processedUrls || 0}`);
      console.log(`  Shows found: ${response.data.data.totalShows || 0}`);
    }

    console.log('\n🎉 Test completed successfully!');
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('❌ Server not running. Please start the server first with: npm run start:dev');
    } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
      console.log('⏰ Request timed out - this indicates the improvements may still need work');
      console.log('Error details:', error.message);
    } else {
      console.error('❌ Error:', error.response?.data || error.message);
    }
  }
}

console.log('🚀 Connecticut Page Fix Verification');
console.log('=====================================\n');

testConnecticutPageFix();
