require('dotenv').config();
const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('./dist/app.module');
const { FacebookParserService } = require('./dist/parser/facebook-parser.service');

async function testSmallBatch() {
  console.log('🔍 [DEBUG] Testing small batch with debug logging...');

  // Check API key
  if (!process.env.GEMINI_API_KEY) {
    console.error('❌ GEMINI_API_KEY not found in environment');
    return;
  }
  console.log('✅ GEMINI_API_KEY found:', process.env.GEMINI_API_KEY.substring(0, 10) + '...');

  const app = await NestFactory.createApplicationContext(AppModule);
  const facebookParserService = app.get(FacebookParserService);

  // Parse Facebook group but only process first 5 images for debugging
  console.log('📖 [DEBUG] Starting Facebook parsing with debug logging (5 images only)...');

  // Temporarily modify the service to limit images
  const originalParseMethod = facebookParserService.parseAndSaveFacebookPageNew;
  facebookParserService.parseAndSaveFacebookPageNew = async function (url) {
    console.log('🔧 [DEBUG] Intercepting parse method to limit to 5 images...');

    // Call original method but we'll modify the image processing
    const originalProcessImages = this.processImagesInBatches;
    this.processImagesInBatches = async function (images, geminiApiKey) {
      console.log(`🔧 [DEBUG] Original image count: ${images.length}, limiting to 5...`);
      const limitedImages = images.slice(0, 5);
      console.log(`🔧 [DEBUG] Processing ${limitedImages.length} images with debug logging`);
      return originalProcessImages.call(this, limitedImages, geminiApiKey);
    };

    return originalParseMethod.call(this, url);
  };

  const result = await facebookParserService.parseAndSaveFacebookPageNew(
    'https://www.facebook.com/groups/194826524192177',
  );

  console.log('\n🎯 [DEBUG] Results from small batch test:');
  console.log(`   Schedule ID: ${result.scheduleId}`);
  console.log(`   Images Processed: ${result.stats?.imagesProcessed || 'unknown'}`);
  console.log(`   Processing Time: ${result.stats?.processingTime || 'unknown'}`);

  await app.close();
}

testSmallBatch().catch(console.error);
