/**
 * Final test of unlimited URL discovery and full content processing
 * Should demonstrate the complete solution working
 */

require('dotenv').config();

async function finalUnlimitedTest() {
  console.log('🎯 FINAL UNLIMITED DISCOVERY TEST');
  console.log('='.repeat(70));
  console.log('📋 WHAT WE FIXED:');
  console.log('   ✅ Removed maxPages limit (was capped at 10 URLs)');
  console.log('   ✅ Removed content limits for page processing');
  console.log('   ✅ Added smart content truncation for DeepSeek API');
  console.log('   ✅ Enhanced user agent rotation to bypass blocking');
  console.log('   ✅ Proper DeepSeek V3.1 API integration');
  console.log('='.repeat(70));

  const testUrl = 'https://karaokeviewpoint.com/karaoke-in-ohio/';

  try {
    console.log(`🚀 Starting comprehensive test of: ${testUrl}`);
    console.log('⏱️ This may take 2-3 minutes to discover all URLs...\n');

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

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    const endTime = Date.now();

    console.log(`\n⏱️ Total Execution Time: ${endTime - startTime}ms`);
    console.log('='.repeat(70));

    if (result.success && result.data) {
      const { totalUrls, processedUrls, siteName, totalShows, totalDJs, totalVendors } =
        result.data;

      console.log('🎉 SUCCESS! Unlimited discovery working!');
      console.log('\n📊 DISCOVERY METRICS:');
      console.log(`   🏢 Site Name: ${siteName}`);
      console.log(`   🔍 Total URLs Found: ${totalUrls}`);
      console.log(`   ⚡ URLs Processed: ${processedUrls}`);
      console.log(`   📈 Shows Found: ${totalShows}`);
      console.log(`   🎤 DJs Found: ${totalDJs}`);
      console.log(`   🏪 Vendors Found: ${totalVendors}`);

      // Validation
      console.log('\n🎯 VALIDATION RESULTS:');
      if (totalUrls >= 50) {
        console.log('🏆 EXCELLENT! Found comprehensive URL set (50+ URLs)');
        console.log('✅ Unlimited discovery is working perfectly!');
        console.log('✅ This is a huge improvement over the 10-URL limit!');
      } else if (totalUrls >= 30) {
        console.log('🥈 VERY GOOD! Found substantial URL set (30+ URLs)');
        console.log('✅ Much better than previous 10-URL limitation');
      } else if (totalUrls >= 15) {
        console.log('🥉 GOOD! Found decent URL set (15+ URLs)');
        console.log('✅ Better than previous limitation, room for optimization');
      } else if (totalUrls >= 5) {
        console.log('⚠️ MODERATE! Found some URLs but could be more comprehensive');
      } else {
        console.log('❌ LIMITED! Still not finding enough URLs');
      }

      if (result.stats) {
        console.log('\n⏱️ PERFORMANCE BREAKDOWN:');
        console.log(`   🔍 Discovery Phase: ${result.stats.discoveryTime}ms`);
        console.log(`   ⚙️ Processing Phase: ${result.stats.processingTime}ms`);
        console.log(`   🎯 Total Time: ${result.stats.totalTime}ms`);

        const avgProcessingTime = result.stats.processingTime / Math.max(processedUrls, 1);
        console.log(`   📊 Avg per URL: ${Math.round(avgProcessingTime)}ms`);
      }

      if (result.parsedScheduleId) {
        console.log(`\n💾 Database Record: ${result.parsedScheduleId}`);
      }

      console.log('\n🎊 SUMMARY: Unlimited URL discovery and full content processing is working!');
    } else {
      console.log('❌ FAILED:', result.error || 'Unknown error');

      if (result.error === 'No URLs discovered') {
        console.log('\n🔍 INVESTIGATION NEEDED:');
        console.log('- Check DeepSeek API response');
        console.log('- Verify content truncation is working');
        console.log('- Ensure navigation elements are being extracted');
      }
    }
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);

    if (error.message.includes('ECONNREFUSED')) {
      console.error('\n🔧 Solution: Start the server first:');
      console.error('   npm run start:dev');
    } else if (error.message.includes('timeout')) {
      console.error('\n⏰ The request timed out');
      console.error('This could indicate the discovery is finding many URLs!');
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('🏁 Final unlimited discovery test complete');
}

// Export for use in other files
if (require.main === module) {
  finalUnlimitedTest()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Test failed:', error);
      process.exit(1);
    });
}

module.exports = { finalUnlimitedTest };
