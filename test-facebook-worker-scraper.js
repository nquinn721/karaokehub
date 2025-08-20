/**
 * Test Facebook media scraper with worker thread processing
 */

require('dotenv').config();
const { FacebookParserService } = require('./dist/parser/facebook-parser.service');
const { ConfigService } = require('@nestjs/config');

class MockConfigService {
  constructor() {
    this.config = {
      FACEBOOK_EMAIL: process.env.FACEBOOK_EMAIL,
      FACEBOOK_PASSWORD: process.env.FACEBOOK_PASSWORD,
      GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    };
  }

  get(key) {
    return this.config[key];
  }
}

async function testFacebookMediaScraperWithWorker() {
  console.log('🧪 Testing Facebook Media Scraper with Worker Threads\n');

  const configService = new MockConfigService();
  const facebookParser = new FacebookParserService(configService);

  try {
    // Test group URL (replace with actual group URL)
    const groupUrl = 'https://www.facebook.com/groups/194826524192177'; // Original group with shows

    console.log(`📱 Testing group: ${groupUrl}\n`);

    // Test the enhanced worker-based extraction
    console.log('🧵 Testing worker thread media extraction...');
    const workerResults = await facebookParser.extractGroupMediaDataWithWorker(groupUrl);

    console.log('\n✅ Worker Results Summary:');
    console.log(`- Shows found: ${workerResults.shows.length}`);
    console.log(`- DJs found: ${workerResults.djs.length}`);
    console.log(`- Processing completed at: ${workerResults.rawData.parsedAt}`);

    if (workerResults.shows.length > 0) {
      console.log('\n📅 Sample Shows:');
      workerResults.shows.slice(0, 3).forEach((show, index) => {
        console.log(`  ${index + 1}. ${show.venue} - ${show.time}`);
        if (show.djName) console.log(`     DJ: ${show.djName}`);
        if (show.address) console.log(`     Address: ${show.address}`);
      });
    }

    if (workerResults.djs.length > 0) {
      console.log('\n🎧 Sample DJs:');
      workerResults.djs.slice(0, 5).forEach((dj, index) => {
        console.log(`  ${index + 1}. ${dj.name} (confidence: ${dj.confidence})`);
      });
    }

    console.log('\n🏆 Worker thread processing test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
  } finally {
    // Cleanup
    await facebookParser.cleanup();
    console.log('\n🧹 Cleanup completed');
  }
}

// Run the test
if (require.main === module) {
  testFacebookMediaScraperWithWorker()
    .then(() => {
      console.log('\n✨ All tests completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Test suite failed:', error);
      process.exit(1);
    });
}

module.exports = { testFacebookMediaScraperWithWorker };
