#!/usr/bin/env node

/**
 * Test Facebook parser with improved prompt to see if it finds karaoke data now
 */

// Load environment variables first
require('dotenv').config();

const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('./dist/app.module');
const { FacebookParserService } = require('./dist/parser/facebook-parser.service');

async function testImprovedFacebookParser() {
  console.log('🧪 Testing Facebook Parser with Improved Flexible Prompt...');

  // Check if Gemini API key is loaded
  if (!process.env.GEMINI_API_KEY) {
    console.error('❌ GEMINI_API_KEY environment variable is not set!');
    console.log('💡 Make sure your .env file contains: GEMINI_API_KEY=your-actual-api-key');
    process.exit(1);
  }
  console.log('✅ Gemini API key loaded successfully');

  try {
    const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error'] });
    const facebookParser = app.get(FacebookParserService);

    const testUrl = 'https://www.facebook.com/groups/194826524192177';
    console.log(`🎯 Testing URL: ${testUrl}`);
    console.log('📝 Using new flexible prompt that looks for casual karaoke mentions...');

    console.log('\n🚀 Starting Facebook parsing...');
    const result = await facebookParser.parseAndSaveFacebookPageNew(testUrl);

    console.log('\n📊 RESULTS WITH IMPROVED PROMPT:');
    console.log(`   Parsed Schedule ID: ${result.parsedScheduleId}`);
    console.log(`   Images Processed: ${result.stats.imageCount || 'Unknown'}`);
    console.log(`   Processing Time: ${result.stats.processingTime || 'Unknown'}s`);

    // Check the actual data structure
    console.log('\n🔍 Data Structure Analysis:');
    console.log(
      `   Shows Array: ${Array.isArray(result.data.shows) ? result.data.shows.length : 'Not Array'}`,
    );
    console.log(
      `   DJs Array: ${Array.isArray(result.data.djs) ? result.data.djs.length : 'Not Array'}`,
    );
    console.log(
      `   Vendors Array: ${Array.isArray(result.data.vendors) ? result.data.vendors.length : 'Not Array'}`,
    );

    if (result.data.shows && result.data.shows.length > 0) {
      console.log('\n🎵 SHOWS FOUND:');
      result.data.shows.slice(0, 3).forEach((show, index) => {
        console.log(`   ${index + 1}. ${show.venue || show}`);
        if (typeof show === 'object') {
          console.log(`      Address: ${show.address || 'Not specified'}`);
          console.log(`      Time: ${show.time || 'Not specified'}`);
          console.log(`      DJ: ${show.djName || 'Not specified'}`);
        }
      });
    }

    if (result.data.djs && result.data.djs.length > 0) {
      console.log('\n🎤 DJS FOUND:');
      result.data.djs.slice(0, 5).forEach((dj, index) => {
        console.log(`   ${index + 1}. ${dj.name || dj}`);
      });
    }

    console.log('\n✅ Test completed successfully!');
    console.log(`📋 Check the database for schedule ID: ${result.parsedScheduleId}`);

    await app.close();
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    if (error.stack) {
      console.error('Stack:', error.stack);
    }
    process.exit(1);
  }
}

// Run the test
testImprovedFacebookParser();
