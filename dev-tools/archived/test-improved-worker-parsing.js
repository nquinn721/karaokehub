/**
 * Test the improved worker-based parsing with user agent rotation
 * Specifically for the problematic karaokeviewpoint.com website
 */

async function testImprovedWorkerParsing() {
  const testUrl = 'https://karaokeviewpoint.com/karaoke-in-ohio/';

  console.log('🧪 Testing Improved Worker-Based Parsing');
  console.log(`📍 URL: ${testUrl}`);
  console.log('='.repeat(60));

  try {
    const response = await fetch('http://localhost:8000/api/parser/parse-website', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: testUrl,
        includeSubdomains: false,
        usePuppeteer: true,
        aiAnalysis: true,
      }),
    });

    const result = await response.json();

    console.log('\n📊 RESULTS:');
    console.log('Success:', result.success);

    if (result.success) {
      console.log('✅ Improved worker-based parsing succeeded!');

      if (result.data) {
        console.log(`📈 Statistics:`);
        console.log(`   - Site Name: ${result.data.siteName}`);
        console.log(`   - Total URLs: ${result.data.totalUrls}`);
        console.log(`   - Processed URLs: ${result.data.processedUrls}`);
        console.log(`   - Shows Found: ${result.data.totalShows}`);
        console.log(`   - DJs Found: ${result.data.totalDJs}`);
        console.log(`   - Vendors Found: ${result.data.totalVendors}`);
      }

      if (result.stats) {
        console.log(`⏱️ Performance:`);
        console.log(`   - Discovery Time: ${result.stats.discoveryTime}ms`);
        console.log(`   - Processing Time: ${result.stats.processingTime}ms`);
        console.log(`   - Total Time: ${result.stats.totalTime}ms`);
      }

      if (result.parsedScheduleId) {
        console.log(`💾 Saved to database with ID: ${result.parsedScheduleId}`);
      }

      console.log('\n🎉 The user agent rotation fix worked!');
      console.log('Website blocking issue has been resolved.');
    } else {
      console.log('❌ Parsing failed:', result.error);

      if (result.error && result.error.includes('Empty Response')) {
        console.log('\n🔍 Diagnosis: Still getting empty response');
        console.log('This could mean:');
        console.log('- The website is temporarily down');
        console.log('- Additional blocking mechanisms are in place');
        console.log('- The user agent rotation needs refinement');
      }
    }
  } catch (error) {
    console.error('❌ Test failed:', error.message);

    if (error.message.includes('ECONNREFUSED')) {
      console.error('🔧 Please start the KaraokeHub server first:');
      console.error('   npm run start:dev');
    }
  }
}

// Run the test
if (require.main === module) {
  testImprovedWorkerParsing();
}

module.exports = { testImprovedWorkerParsing };
