/**
 * Test CDN URL extraction from Facebook /media page
 */

const FacebookParserService =
  require('./dist/parser/facebook-parser.service').FacebookParserService;

async function testCDNExtraction() {
  console.log('🔍 Testing CDN URL Extraction...\n');

  const parser = new FacebookParserService();

  try {
    // Test with a Facebook group URL
    const testUrl = 'https://www.facebook.com/groups/KaraokeUkiah/media';

    console.log(`📊 Testing URL: ${testUrl}`);
    console.log('⏳ Extracting images...\n');

    // Call the extraction method
    const result = await parser.parseAndSaveFacebookPageClean(testUrl);

    console.log('\n📋 EXTRACTION RESULTS:');
    console.log('='.repeat(50));
    console.log(`🎤 Shows found: ${result.shows?.length || 0}`);
    console.log(`🎵 DJs found: ${result.djs?.length || 0}`);
    console.log(`🏢 Venues found: ${result.venues?.length || 0}`);
    console.log(`🏪 Vendors found: ${result.vendors?.length || 0}`);

    // Check source URLs
    if (result.shows && result.shows.length > 0) {
      console.log('\n🔗 SOURCE URL ANALYSIS:');
      console.log('-'.repeat(30));

      result.shows.forEach((show, index) => {
        console.log(`Show ${index + 1}:`);
        console.log(`  📍 Venue: ${show.venue || 'N/A'}`);
        console.log(`  📅 Date: ${show.date || 'N/A'}`);
        console.log(`  🔗 Source: ${show.source || 'N/A'}`);
        console.log(
          `  📊 CDN URL: ${show.source?.includes('scontent') || show.source?.includes('fbcdn') ? '✅ Yes' : '❌ No'}`,
        );
        console.log('');
      });
    }

    console.log('\n✅ Test completed successfully!');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the test
testCDNExtraction().catch(console.error);
