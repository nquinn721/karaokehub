require('dotenv').config();
const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('./dist/app.module');
const { FacebookParserService } = require('./dist/parser/facebook-parser.service');

async function testImageExtraction() {
  console.log('🔍 [DEBUG] Testing Facebook image extraction...');

  // Check API key
  if (!process.env.GEMINI_API_KEY) {
    console.error('❌ GEMINI_API_KEY not found in environment');
    return;
  }
  console.log('✅ GEMINI_API_KEY found');

  const app = await NestFactory.createApplicationContext(AppModule);
  const facebookParserService = app.get(FacebookParserService);

  // Test different URLs to see which one works
  const testUrls = [
    'https://www.facebook.com/groups/194826524192177', // From working test
    'https://www.facebook.com/groups/397118734708842', // Central Ohio group
    'https://www.facebook.com/groups/1234567890123456', // Test invalid
  ];

  for (const url of testUrls) {
    console.log(`\n🎯 [DEBUG] Testing URL: ${url}`);
    try {
      const result = await facebookParserService.parseAndSaveFacebookPageNew(url);
      console.log(`✅ Success! Found ${result.stats?.imagesProcessed || 'unknown'} images`);

      // If we found images, stop here since we just want to test image extraction
      if (result.stats?.imagesProcessed > 0) {
        console.log('🎉 Found working URL with images, stopping test');
        break;
      }
    } catch (error) {
      console.log(`❌ Failed: ${error.message}`);
    }
  }

  await app.close();
}

testImageExtraction().catch(console.error);
