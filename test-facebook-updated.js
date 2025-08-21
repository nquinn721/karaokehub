/**
 * Test script for the updated Facebook parser with proper workflow:
 * 1. Check login page -> request creds -> login
 * 2. Route to group/media page
 * 3. Take screenshot for validation
 * 4. Scroll down 5 pages
 * 5. Parse all image URLs
 */

const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('./dist/app.module');

async function testFacebookParser() {
  console.log('🚀 Starting updated Facebook parser test...');

  try {
    // Create NestJS application
    const app = await NestFactory.create(AppModule, { logger: false });

    // Get the Facebook parser service
    const facebookParser = app.get('FacebookParserService');

    // Test with a Facebook group URL (this should trigger the proper workflow)
    const testUrl = 'https://www.facebook.com/groups/1234567890'; // Replace with actual group

    console.log(`🔍 Testing Facebook parser with URL: ${testUrl}`);
    console.log('📋 Expected workflow:');
    console.log('   1. Navigate to URL');
    console.log('   2. Check if login page detected');
    console.log('   3. If login required -> request credentials from client');
    console.log('   4. If no login -> route to /media page');
    console.log('   5. Take full page screenshot');
    console.log('   6. Zoom out and scroll down 5 pages');
    console.log('   7. Parse HTML for all image URLs');
    console.log('');

    // Parse the URL (this will trigger our new workflow)
    const result = await facebookParser.parseClean(testUrl);

    console.log('✅ Parse completed successfully!');
    console.log('📊 Results:', {
      totalImages: result.metadata.imageCount,
      processingTime: result.metadata.processingTime,
      shows: result.metadata.shows,
      djs: result.metadata.djs,
      vendors: result.metadata.vendors,
    });

    await app.close();
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Run the test
testFacebookParser();
