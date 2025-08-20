/**
 * Test the interactive Facebook authentication flow
 * Puppeteer will check login status and request credentials via WebSocket
 */

require('dotenv').config();
const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('./dist/app.module');

async function testInteractiveAuth() {
  console.log('🚀 Testing Interactive Facebook Authentication...\n');

  try {
    const app = await NestFactory.createApplicationContext(AppModule);
    const facebookParser = app.get('FacebookParserService');

    console.log('📋 Starting test - system will check for Facebook login');
    console.log('💡 If not logged in, a modal should appear in the admin UI');
    console.log('🌐 Make sure the admin UI is open at http://localhost:8000/admin\n');

    // Initialize browser
    await facebookParser.initializeBrowser();

    console.log('🔍 Checking Facebook login status...');

    try {
      // This will either use saved session or request credentials via WebSocket
      await facebookParser.loginToFacebook();

      console.log('✅ Facebook authentication successful!');

      // Test a simple navigation to verify login
      console.log('🧪 Testing navigation to verify login...');
      const testGroupUrl = 'https://www.facebook.com/groups/194826524192177';

      const pageData = await facebookParser.extractGroupMediaData(testGroupUrl);
      console.log(`📊 Test successful! Found ${pageData.imageUrls?.length || 0} images`);
    } catch (error) {
      console.error('❌ Authentication failed:', error.message);
    }

    await facebookParser.cleanup();
    await app.close();
  } catch (error) {
    console.error('💥 Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
testInteractiveAuth();
