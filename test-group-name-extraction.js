const { spawn } = require('child_process');
const { Worker } = require('worker_threads');

console.log('🧪 Testing Facebook group name extraction from header...');

// Test the header screenshot and group name extraction
async function testGroupNameExtraction() {
  try {
    console.log('📸 Testing Facebook header screenshot and name extraction...');

    // Import the required modules
    const { NestFactory } = require('@nestjs/core');
    const { AppModule } = require('./dist/app.module');

    // Create the application
    const app = await NestFactory.createApplicationContext(AppModule);
    const facebookParser = app.get('FacebookParserService');

    const testUrl = 'https://www.facebook.com/groups/194826524192177';

    console.log(`🔍 Testing group name extraction for: ${testUrl}`);

    // Test just the extraction methods we added
    await facebookParser.initializeBrowser();

    try {
      // Navigate to the page
      await facebookParser.page.goto(testUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 20000,
      });

      console.log('📄 Page loaded, waiting for content...');
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Test header screenshot capture
      console.log('📸 Taking header screenshot...');
      const headerScreenshot = await facebookParser.captureHeaderScreenshot();
      console.log(`✅ Header screenshot captured (${headerScreenshot.length} chars base64)`);

      // Test group name extraction from image
      console.log('🧠 Extracting group name from header image...');
      const groupName = await facebookParser.extractGroupNameFromImage(headerScreenshot);
      console.log(`🏷️ Extracted group name: "${groupName}"`);

      if (groupName && groupName !== 'Facebook Group') {
        console.log('✅ SUCCESS: Group name extracted successfully!');
        console.log(`   Group Name: ${groupName}`);
      } else {
        console.log('⚠️ WARNING: Only got generic group name, might need prompt adjustment');
      }
    } catch (error) {
      console.error('❌ Test failed:', error.message);
    }

    await facebookParser.cleanup();
    await app.close();
  } catch (error) {
    console.error('💥 Test setup failed:', error.message);
  }
}

testGroupNameExtraction().catch(console.error);
