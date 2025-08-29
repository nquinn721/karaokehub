/**
 * Test unlimited URL discovery and full content processing
 * This should now find ALL URLs on karaokeviewpoint.com (around 60+ URLs)
 */

async function testUnlimitedDiscovery() {
  const testUrl = 'https://karaokeviewpoint.com/karaoke-in-ohio/';

  console.log('🔓 TESTING UNLIMITED URL DISCOVERY & FULL CONTENT');
  console.log(`📍 URL: ${testUrl}`);
  console.log('='.repeat(70));
  console.log('❌ Previous Limitation: maxPages = 10 (only found 10 URLs)');
  console.log('✅ Current Expected: NO LIMITS (should find 60+ URLs)');
  console.log('✅ Content Limits: REMOVED (full page content to DeepSeek)');
  console.log('='.repeat(70));

  try {
    const startTime = Date.now();

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
    const endTime = Date.now();

    console.log(`⏱️ Total Time: ${endTime - startTime}ms`);
    console.log(`✅ Success: ${result.success}`);

    if (result.success && result.data) {
      const { totalUrls, processedUrls, siteName } = result.data;

      console.log('\n📊 DISCOVERY RESULTS:');
      console.log(`   🏢 Site Name: ${siteName}`);
      console.log(`   🔍 URLs Found: ${totalUrls}`);
      console.log(`   ⚡ URLs Processed: ${processedUrls}`);

      // Validation
      if (totalUrls >= 50) {
        console.log('\n🎉 SUCCESS! Found comprehensive URL list');
        console.log('✅ Unlimited discovery is working!');
        console.log(`✅ Found ${totalUrls} URLs (much better than previous 10-limit)`);
      } else if (totalUrls >= 20) {
        console.log('\n⚠️ PARTIAL SUCCESS - Found decent amount of URLs');
        console.log(`   Found ${totalUrls} URLs (better than 10, but might be more available)`);
      } else {
        console.log('\n❌ STILL LIMITED - Only found small number of URLs');
        console.log(`   Found only ${totalUrls} URLs - there might be an issue`);
      }

      if (result.stats) {
        console.log('\n⏱️ Performance Breakdown:');
        console.log(`   Discovery Phase: ${result.stats.discoveryTime}ms`);
        console.log(`   Processing Phase: ${result.stats.processingTime}ms`);
        console.log(`   Total Time: ${result.stats.totalTime}ms`);
      }

      if (result.data.totalShows > 0 || result.data.totalDJs > 0 || result.data.totalVendors > 0) {
        console.log('\n📈 Content Analysis Results:');
        console.log(`   Shows Found: ${result.data.totalShows}`);
        console.log(`   DJs Found: ${result.data.totalDJs}`);
        console.log(`   Vendors Found: ${result.data.totalVendors}`);
      }

      if (result.parsedScheduleId) {
        console.log(`\n💾 Saved to Database: ${result.parsedScheduleId}`);
      }
    } else {
      console.log(`\n❌ Failed: ${result.error || 'Unknown error'}`);
    }
  } catch (error) {
    console.error(`\n❌ Request failed: ${error.message}`);

    if (error.message.includes('ECONNREFUSED')) {
      console.error('\n🔧 Please start the KaraokeHub server first:');
      console.error('   npm run start:dev');
    }
  }
}

// Also test direct discovery to see what we're getting
async function testDirectDiscovery() {
  console.log('\n🔬 TESTING DIRECT DISCOVERY (Debug Mode)');
  console.log('This will show us exactly what URLs are being discovered...');

  // You could add direct worker testing here if needed
  console.log('(Run the main test above to see discovery results)');
}

// Run the tests
if (require.main === module) {
  console.log('Starting unlimited discovery tests...\n');

  testUnlimitedDiscovery()
    .then(() => testDirectDiscovery())
    .catch(console.error);
}

module.exports = { testUnlimitedDiscovery, testDirectDiscovery };
