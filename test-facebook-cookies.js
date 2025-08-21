/**
 * Test script for Facebook cookie management
 */

const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('./dist/app.module');

async function testCookieManagement() {
  console.log('🧪 Testing Facebook cookie management...');

  const app = await NestFactory.create(AppModule, { logger: false });
  const facebookParser = app.get('FacebookParserService');

  try {
    // Test 1: Check if saved session exists
    console.log('\n1️⃣ Checking for saved session...');
    const hasSavedSession = facebookParser.hasSavedSession();
    console.log(`   Has saved session: ${hasSavedSession}`);

    // Test 2: Check login status
    console.log('\n2️⃣ Checking login status...');
    const isLoggedIn = facebookParser.getLoginStatus();
    console.log(`   Is logged in: ${isLoggedIn}`);

    // Test 3: Initialize browser
    console.log('\n3️⃣ Initializing browser...');
    await facebookParser.initializeBrowser();
    console.log('   Browser initialized successfully');

    // Test 4: Attempt to parse a Facebook page (this will test cookie loading)
    console.log('\n4️⃣ Testing Facebook page access...');
    const testUrl = 'https://www.facebook.com/pg/stevesdj/posts/';

    try {
      const result = await facebookParser.parseAndSaveFacebookPageClean(testUrl);
      console.log('   ✅ Facebook parsing completed successfully');
      console.log(`   📊 Results: ${result.stats.shows} shows, ${result.stats.djs} DJs`);
    } catch (error) {
      console.log(`   ⚠️ Facebook parsing failed: ${error.message}`);

      if (error.message.includes('login')) {
        console.log('   💡 This indicates we need to implement proper login flow');
      }
    }

    // Test 5: Clear session
    console.log('\n5️⃣ Clearing session...');
    await facebookParser.clearSession();
    console.log('   Session cleared successfully');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await app.close();
  }
}

// Run the test
testCookieManagement().catch(console.error);
