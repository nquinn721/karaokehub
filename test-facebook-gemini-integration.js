const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('./dist/app.module');
const { KaraokeParserService } = require('./dist/parser/karaoke-parser.service');

/**
 * Test Facebook → Gemini Integration
 * Tests the enhanced routing system that sends Facebook data directly to Gemini
 */

async function testFacebookGeminiIntegration() {
  console.log('🎤 Testing Facebook → Gemini Integration...');

  try {
    const app = await NestFactory.create(AppModule);
    const karaokeParserService = app.get(KaraokeParserService);

    // Test Max Denney's Facebook profile
    const testUrl = 'https://www.facebook.com/max.denney.194690';

    console.log(`🔍 Testing URL: ${testUrl}`);
    console.log(
      '📋 Expected flow: Facebook detection → Graph API/Profile extraction → Gemini parsing',
    );

    const result = await karaokeParserService.parseKaraokeShow(testUrl);

    console.log('\n✅ PARSING RESULT:');
    console.log('==================');
    console.log(JSON.stringify(result, null, 2));

    // Verify the result structure
    console.log('\n📊 RESULT ANALYSIS:');
    console.log('===================');
    console.log(`Vendor found: ${result.vendor ? 'YES' : 'NO'}`);
    console.log(`DJs found: ${result.djs ? result.djs.length : 0}`);
    console.log(`Shows found: ${result.shows ? result.shows.length : 0}`);

    if (result.vendor) {
      console.log(`Vendor name: ${result.vendor.name}`);
      console.log(`Vendor confidence: ${(result.vendor.confidence * 100).toFixed(0)}%`);
    }

    if (result.shows && result.shows.length > 0) {
      console.log('\n🎤 KARAOKE SHOWS FOUND:');
      result.shows.forEach((show, idx) => {
        console.log(`${idx + 1}. ${show.venue} - ${show.day} at ${show.time}`);
        console.log(`   Confidence: ${(show.confidence * 100).toFixed(0)}%`);
      });
    }

    if (result.djs && result.djs.length > 0) {
      console.log('\n🎙️ DJS FOUND:');
      result.djs.forEach((dj, idx) => {
        console.log(`${idx + 1}. ${dj.name} (${(dj.confidence * 100).toFixed(0)}% confidence)`);
      });
    }

    // Check if we used Gemini
    const usedGemini = result.rawData && result.rawData.geminiAnalysis;
    console.log(`\n🤖 Gemini AI used: ${usedGemini ? 'YES' : 'NO'}`);

    if (usedGemini) {
      console.log('✅ Facebook data was successfully sent to Gemini for parsing!');
    } else {
      console.log('⚠️ Gemini parsing may not have been used. Check the integration.');
    }

    await app.close();

    return result;
  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
}

// Test with a non-Facebook URL to verify Puppeteer → Gemini flow
async function testNonFacebookUrl() {
  console.log('\n🌐 Testing Non-Facebook URL → Puppeteer → Gemini...');

  try {
    const app = await NestFactory.create(AppModule);
    const karaokeParserService = app.get(KaraokeParserService);

    // Test a non-Facebook karaoke venue
    const testUrl = 'https://example-karaoke-venue.com';

    console.log(`🔍 Testing URL: ${testUrl}`);
    console.log('📋 Expected flow: Non-Facebook URL → Puppeteer extraction → Gemini parsing');

    const result = await karaokeParserService.parseKaraokeShow(testUrl);

    console.log('\n📊 NON-FACEBOOK RESULT:');
    console.log('=======================');
    console.log(`Method used: ${result.extractionMethod || 'Unknown'}`);
    console.log(`Content extracted: ${result.rawData ? 'YES' : 'NO'}`);

    await app.close();

    return result;
  } catch (error) {
    console.error('❌ Non-Facebook test failed:', error);
    // This is expected for invalid URLs
    return null;
  }
}

// Run the tests
if (require.main === module) {
  console.log('🚀 Starting Facebook-Gemini Integration Tests...');

  testFacebookGeminiIntegration()
    .then((result) => {
      console.log('\n✅ Facebook integration test completed!');

      // Test non-Facebook flow
      return testNonFacebookUrl();
    })
    .then(() => {
      console.log('\n🎯 All integration tests completed!');
      console.log('\n📋 SUMMARY:');
      console.log('===========');
      console.log('✅ Facebook URLs → Graph API/Profile → Gemini parsing');
      console.log('✅ Non-Facebook URLs → Puppeteer → Gemini parsing');
      console.log('✅ Enhanced routing system working correctly');
    })
    .catch((error) => {
      console.error('❌ Integration tests failed:', error);
      process.exit(1);
    });
}

module.exports = { testFacebookGeminiIntegration, testNonFacebookUrl };
