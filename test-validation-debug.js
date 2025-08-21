/**
 * Simple test to debug the validation worker data passing issue
 */

const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('./dist/app.module');

async function testValidationWorker() {
  console.log('🔍 Testing validation worker data passing...');

  try {
    // Create NestJS application
    const app = await NestFactory.create(AppModule, { logger: ['error', 'warn', 'log'] });

    // Get the Facebook parser service
    const karaokeParser = app.get('KaraokeParserService');

    // Test with a minimal URL to see the data flow
    const testUrl = 'https://www.facebook.com/groups/test';

    console.log(`🧪 Testing with: ${testUrl}`);
    console.log(
      'This should show us exactly what data is being passed to the validation worker...',
    );
    console.log('');

    // Parse the URL using unified parser which should call Facebook parser
    const result = await karaokeParser.parseUnified(testUrl);

    console.log('✅ Success!', result);

    await app.close();
  } catch (error) {
    console.error('❌ Error details:');
    console.error('Message:', error.message);
    console.error('Stack:', error.stack);

    // Try to close app if it exists
    try {
      const app = await NestFactory.create(AppModule, { logger: false });
      await app.close();
    } catch (e) {
      // Ignore cleanup errors
    }
  }
}

testValidationWorker();
