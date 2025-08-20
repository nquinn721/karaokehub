/**
 * Test script for Facebook Group MEDIA scraping with Gemini Vision
 * This script focuses on the "Recent Media" section to extract karaoke event images
 */

const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('./dist/app.module');
const { FacebookParserService } = require('./dist/parser/facebook-parser.service');

async function testFacebookMediaScraping() {
  console.log('🎵 Facebook Group MEDIA Scraper Test');
  console.log('======================================');
  console.log('🚀 Starting Facebook Group Media Scraping Test...');

  // Test URL - replace with your actual group URL
  const testUrl = 'https://www.facebook.com/groups/194826524192177';

  try {
    // Create NestJS app
    const app = await NestFactory.createApplicationContext(AppModule);
    const facebookParser = app.get(FacebookParserService);

    console.log('✅ NestJS app initialized');
    console.log(`🎯 Testing MEDIA extraction for: ${testUrl}`);
    console.log('📸 Will navigate to Recent Media section');
    console.log('⏱️ Starting timer...');

    const startTime = Date.now();

    // Test the media parsing
    const result = await facebookParser.parseFacebookPage(testUrl);

    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;

    console.log(`\n🎉 SUCCESS! Media parsing completed in ${duration.toFixed(2)} seconds`);
    console.log('\n📊 MEDIA PARSING RESULTS:');
    console.log(`- Vendor: ${result.vendor.name}`);
    console.log(`- Shows Found: ${result.shows.length}`);
    console.log(`- DJs Found: ${result.djs.length}`);
    console.log(`- Source: ${result.rawData.title}`);
    console.log(`- Confidence: ${result.vendor.confidence}`);

    if (result.shows.length > 0) {
      console.log('\n🎵 SHOWS FOUND FROM IMAGES:');
      result.shows.forEach((show, index) => {
        console.log(`\n${index + 1}. ${show.venue}`);
        console.log(`   📍 Address: ${show.address || 'Not specified'}`);
        console.log(`   📅 Time: ${show.time}`);
        console.log(`   🎤 DJ: ${show.djName || 'Not specified'}`);
        console.log(`   📝 Description: ${show.description || 'None'}`);
        console.log(`   🎯 Confidence: ${show.confidence}`);
      });
    }

    if (result.djs.length > 0) {
      console.log('\n🎤 DJS FOUND IN IMAGES:');
      result.djs.forEach((dj, index) => {
        console.log(`${index + 1}. ${dj.name} (Confidence: ${dj.confidence}) - ${dj.context}`);
      });
    }

    console.log('\n📊 PERFORMANCE METRICS:');
    console.log(`- Total Time: ${duration.toFixed(2)}s`);
    console.log(`- Shows/Minute: ${(result.shows.length / (duration / 60)).toFixed(2)}`);
    console.log(`- Processing Method: Image URL + Gemini Vision`);

    if (result.shows.length === 0) {
      console.log('\n⚠️ No shows found. This could mean:');
      console.log('- Group has no recent media');
      console.log("- Images don't contain karaoke event info");
      console.log('- Need to adjust image parsing logic');
    }

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

    if (error.message.includes('GEMINI_API_KEY')) {
      console.log('\n🔧 FIX: Set your Gemini API key in .env:');
      console.log('GEMINI_API_KEY=your-gemini-api-key');
    }

    if (error.message.includes('timeout') || error.message.includes('navigation')) {
      console.log('\n🔧 FIX: Check your internet connection and Facebook URL');
    }

    process.exit(1);
  }
}

console.log('🔧 Facebook Group Media Scraper Test');
console.log('Focuses on Recent Media section for karaoke event images');
console.log('Uses Gemini Vision to parse image URLs directly');
console.log('=====================================');
testFacebookMediaScraping();
