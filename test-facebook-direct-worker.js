/**
 * Test Facebook parser worker method directly to test parsed_schedule creation
 */

const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('./dist/app.module');

async function testFacebookWorkerDirect() {
  console.log('🧪 Testing Facebook Worker Direct with parsed_schedule creation...\n');

  try {
    // Create NestJS application context for proper dependency injection
    const app = await NestFactory.createApplicationContext(AppModule);

    // Get services using proper injection tokens
    const { FacebookParserService } = require('./dist/parser/facebook-parser.service');
    const { ParsedSchedule, ParseStatus } = require('./dist/parser/parsed-schedule.entity');
    const { getRepositoryToken } = require('@nestjs/typeorm');

    const facebookParserService = app.get(FacebookParserService);
    const parsedScheduleRepository = app.get(getRepositoryToken(ParsedSchedule));

    const testUrl = 'https://www.facebook.com/groups/194826524192177';
    console.log(`📱 Testing group: ${testUrl}\n`);

    // Test the worker-based method directly (bypasses login requirement)
    console.log('🧵 Testing worker thread method directly...');

    // First initialize browser
    await facebookParserService.initializeBrowser();

    // Call the worker method directly
    const workerResults = await facebookParserService.extractGroupMediaDataWithWorker(testUrl);

    console.log('\n✅ Worker Results Summary:');
    console.log(`- Shows found: ${workerResults.shows.length}`);
    console.log(`- DJs found: ${workerResults.djs.length}`);
    console.log(`- Vendor: ${workerResults.vendor.name}`);
    console.log(`- Processing completed at: ${workerResults.rawData.parsedAt}`);

    if (workerResults.shows.length > 0) {
      console.log('\n📅 Sample Shows:');
      workerResults.shows.slice(0, 3).forEach((show, index) => {
        console.log(`  ${index + 1}. ${show.venue} - ${show.time}`);
        if (show.djName) console.log(`     DJ: ${show.djName}`);
        if (show.address) console.log(`     Address: ${show.address}`);
      });
    }

    if (workerResults.djs.length > 0) {
      console.log('\n🎧 Sample DJs:');
      workerResults.djs.slice(0, 5).forEach((dj, index) => {
        console.log(`  ${index + 1}. ${dj.name} (confidence: ${dj.confidence})`);
      });
    }

    console.log('\n🧪 Worker method test completed successfully!');

    // Now test creating parsed_schedule manually
    console.log('\n💾 Testing manual parsed_schedule creation...');

    const parsedSchedule = parsedScheduleRepository.create({
      url: testUrl,
      rawData: {
        url: testUrl,
        title: `Facebook group: ${testUrl}`,
        content: `Parsed via Worker-based processing - Found ${workerResults.shows.length} shows and ${workerResults.djs.length} DJs`,
        parsedAt: new Date(),
        pageType: 'group',
        showsFound: workerResults.shows.length,
        djsFound: workerResults.djs.length,
      },
      aiAnalysis: workerResults,
      status: ParseStatus.PENDING_REVIEW,
      parsingLogs: ['Test log entry 1', 'Test log entry 2'],
    });

    const savedSchedule = await parsedScheduleRepository.save(parsedSchedule);

    console.log(`✅ Successfully created parsed_schedule record! ID: ${savedSchedule.id}`);
    console.log(`   - URL: ${savedSchedule.url}`);
    console.log(`   - Status: ${savedSchedule.status}`);
    console.log(`   - Shows found: ${savedSchedule.rawData.showsFound}`);
    console.log(`   - DJs found: ${savedSchedule.rawData.djsFound}`);

    // Cleanup
    await facebookParserService.cleanup();
    await app.close();
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

testFacebookWorkerDirect();
