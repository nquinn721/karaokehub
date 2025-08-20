/**
 * Test script for improved Facebook Group scraping with Puppeteer
 * This script tests the streamlined navigation and extraction process
 */

const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('./dist/app.module');
const { FacebookParserService } = require('./dist/parser/facebook-parser.service');

async function testFacebookGroupScraping() {
  console.log('🚀 Starting Facebook Group Scraping Test...');

  // Test URL - replace with your actual group URL
  const testUrl = 'https://www.facebook.com/groups/194826524192177';

  try {
    // Create NestJS app
    const app = await NestFactory.createApplicationContext(AppModule);
    const facebookParser = app.get(FacebookParserService);

    console.log('✅ NestJS app initialized');
    console.log(`🎯 Testing URL: ${testUrl}`);
    console.log('⏱️ Starting timer...');

    const startTime = Date.now();

    // Test the parsing
    const result = await facebookParser.parseFacebookPage(testUrl);

    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;

    console.log(`\n🎉 SUCCESS! Parsing completed in ${duration.toFixed(2)} seconds`);
    console.log('\n📊 RESULTS:');
    console.log(`- Page Type: ${result.rawData.title}`);
    console.log(`- Posts Found: ${result.shows.length}`);
    console.log(`- DJs Found: ${result.djs.length}`);
    console.log(`- Venue Info: ${result.vendor.name}`);
    console.log(`- Confidence: ${result.vendor.confidence}`);

    if (result.shows.length > 0) {
      console.log('\n🎵 FIRST SHOW FOUND:');
      const firstShow = result.shows[0];
      console.log(`- Venue: ${firstShow.venue}`);
      console.log(`- Time: ${firstShow.time}`);
      console.log(`- DJ: ${firstShow.djName || 'Not specified'}`);
      console.log(`- Confidence: ${firstShow.confidence}`);
    }

    if (result.djs.length > 0) {
      console.log('\n🎤 DJS FOUND:');
      result.djs.forEach((dj, index) => {
        console.log(`${index + 1}. ${dj.name} (Confidence: ${dj.confidence})`);
      });
    }

    console.log('\n📊 PERFORMANCE METRICS:');
    console.log(`- Total Time: ${duration.toFixed(2)}s`);
    console.log(`- Posts/Second: ${(result.shows.length / duration).toFixed(2)}`);

    await app.close();
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error('Stack:', error.stack);

    // Specific error handling
    if (error.message.includes('credentials')) {
      console.log('\n🔧 FIX: Update your .env file with real Facebook credentials:');
      console.log('FACEBOOK_EMAIL=your-real-email@gmail.com');
      console.log('FACEBOOK_PASSWORD=YourRealPassword');
    }

    if (error.message.includes('timeout') || error.message.includes('navigation')) {
      console.log('\n🔧 FIX: Check your internet connection and Facebook URL');
    }

    process.exit(1);
  }
}

// Run the test
console.log('🔧 Improved Facebook Group Scraper Test');
console.log('=====================================');
testFacebookGroupScraping();
