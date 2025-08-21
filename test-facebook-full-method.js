/**
 * Test the full parseFacebookPage method to see where it fails
 */

const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('./dist/app.module');

async function testFullParseFacebookPage() {
  console.log('🧪 Testing FULL parseFacebookPage method...\n');

  try {
    // Create NestJS application context
    const app = await NestFactory.createApplicationContext(AppModule);

    const { FacebookParserService } = require('./dist/parser/facebook-parser.service');
    const facebookParserService = app.get(FacebookParserService);

    const testUrl = 'https://www.facebook.com/groups/194826524192177';
    console.log(`📱 Testing full parseFacebookPage for: ${testUrl}\n`);

    // Call the FULL parseFacebookPage method (not the worker method directly)
    console.log('🔥 Calling parseFacebookPage (full method)...');
    const result = await facebookParserService.parseFacebookPage(testUrl);

    console.log('\n✅ Full parseFacebookPage SUCCESS!');
    console.log(`- Parsed Schedule ID: ${result.parsedScheduleId}`);
    console.log(`- Shows found: ${result.stats.showsFound}`);
    console.log(`- DJs found: ${result.stats.djsFound}`);
    console.log(`- Processing method: ${result.stats.processingMethod}`);
    console.log(`- Processing time: ${result.stats.processingTime}ms`);

    // Cleanup
    await facebookParserService.cleanup();
    await app.close();

    console.log('\n🎉 FULL METHOD TEST SUCCESSFUL!');
  } catch (error) {
    console.error('\n❌ Full method test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

testFullParseFacebookPage();
