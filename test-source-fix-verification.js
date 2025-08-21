/**
 * Test to verify that the source URL fix preserves individual CDN URLs
 */

const { AppModule } = require('./dist/app.module');
const { NestFactory } = require('@nestjs/core');
const { KaraokeParserService } = require('./dist/parser/karaoke-parser.service');

async function testSourceURLFix() {
  console.log('🧪 Testing Source URL Fix Verification...\n');

  try {
    const app = await NestFactory.create(AppModule, { logger: false });
    const karaokeParserService = app.get(KaraokeParserService);

    // Get pending reviews to check source URLs
    console.log('📋 Getting pending reviews to check source URLs...');
    const pendingReviews = await karaokeParserService.getPendingReviews();

    console.log(`Found ${pendingReviews.length} pending review(s)\n`);

    pendingReviews.forEach((review, index) => {
      console.log(`=== Review ${index + 1} ===`);
      console.log(`Schedule URL: ${review.url}`);
      console.log(`Schedule Source: ${review.source}`);
      console.log(`Shows found: ${review.shows.length}`);

      // Check each show's source
      review.shows.forEach((show, showIndex) => {
        console.log(`  Show ${showIndex + 1}:`);
        console.log(`    Title: ${show.title}`);
        console.log(`    Source: ${show.source}`);
        console.log(
          `    Is CDN URL: ${show.source && show.source.includes('cdn') ? '✅ YES' : '❌ NO'}`,
        );
        console.log(
          `    Same as schedule URL: ${show.source === review.url ? '❌ YES (Problem!)' : '✅ NO (Good!)'}`,
        );
      });
      console.log();
    });

    await app.close();

    console.log('✅ Source URL verification completed!');
    console.log('\n📊 Summary:');
    console.log('- If "Is CDN URL" shows ✅ YES, the fix is working');
    console.log('- If "Same as schedule URL" shows ✅ NO, individual URLs are preserved');
    console.log('- If you see ❌ problems, the source URLs are still being overwritten');
  } catch (error) {
    console.error('❌ Error during source URL verification:', error.message);
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
  }
}

// Run the test
testSourceURLFix();
