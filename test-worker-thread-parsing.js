/**
 * Test the Facebook media scraper with worker thread processing
 */

require('dotenv').config();
const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('./dist/app.module');
const { FacebookParserService } = require('./dist/parser/facebook-parser.service');

async function testWorkerThreadParsing() {
  console.log('🚀 Testing Facebook media scraper with worker thread...\n');

  try {
    const app = await NestFactory.createApplicationContext(AppModule);
    const facebookParser = app.get(FacebookParserService);

    // Test group URL - using the correct karaoke group
    const groupUrl = 'https://www.facebook.com/groups/194826524192177';

    console.log(`📖 Testing worker thread processing for: ${groupUrl}`);
    console.log('⏰ This may take 2-3 minutes...\n');

    // Initialize browser first
    await facebookParser.initializeBrowser();

    const startTime = Date.now();

    // Use the enhanced worker thread method
    const result = await facebookParser.extractGroupMediaDataWithWorker(groupUrl);

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    console.log('\n🎉 Worker Thread Test Results:');
    console.log('================================');
    console.log(`⏱️  Total Duration: ${duration} seconds`);
    console.log(`🏢 Vendor: ${result.vendor.name}`);
    console.log(`📋 Description: ${result.vendor.description}`);
    console.log(`🎪 Shows Found: ${result.shows.length}`);
    console.log(`🎤 DJs Found: ${result.djs.length}`);
    console.log(`📊 Confidence: ${result.vendor.confidence}`);

    if (result.shows.length > 0) {
      console.log('\n📅 Sample Shows:');
      result.shows.slice(0, 3).forEach((show, index) => {
        console.log(`  ${index + 1}. ${show.venue} - ${show.time}`);
        if (show.address) console.log(`     📍 ${show.address}`);
        if (show.djName) console.log(`     🎤 DJ: ${show.djName}`);
        if (show.description) console.log(`     📝 ${show.description}`);
      });
    }

    if (result.djs.length > 0) {
      console.log('\n🎤 Sample DJs:');
      result.djs.slice(0, 5).forEach((dj, index) => {
        console.log(`  ${index + 1}. ${dj.name} (${dj.confidence} confidence)`);
        console.log(`     📄 Context: ${dj.context}`);
      });
    }

    console.log('\n✅ Worker thread test completed successfully!');

    await facebookParser.cleanup();
    await app.close();
  } catch (error) {
    console.error('❌ Worker thread test failed:', error.message);
    if (error.stack) {
      console.error('📚 Stack trace:', error.stack);
    }
    process.exit(1);
  }
}

// Run the test
testWorkerThreadParsing();
