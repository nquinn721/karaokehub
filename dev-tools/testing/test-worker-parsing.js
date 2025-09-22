/**
 * Test script for the new worker-based website parser
 * This script tests our Facebook-style parallel processing system
 */

async function testWorkerBasedParsing() {
  const testUrl = 'https://example.com'; // Simple test site

  console.log('🧪 Testing Worker-Based Website Parser');
  console.log(`📍 Test URL: ${testUrl}`);
  console.log('=' * 50);

  try {
    const response = await fetch('http://localhost:8000/api/parser/parse-website-workers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: testUrl,
        maxPages: 3,
        includeSubdomains: false,
        maxWorkers: 2,
      }),
    });

    const result = await response.json();

    console.log('\n📊 RESULTS:');
    console.log('Success:', result.success);

    if (result.success) {
      console.log('✅ Worker-based parsing completed!');

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
    } else {
      console.log('❌ Parsing failed:', result.error);
    }
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
if (require.main === module) {
  testWorkerBasedParsing();
}

module.exports = { testWorkerBasedParsing };
