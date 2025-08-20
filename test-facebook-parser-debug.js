#!/usr/bin/env node

/**
 * Test Facebook parser with specific URL to debug the parsed_schedule issue
 */

const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('./dist/app.module');

async function testFacebookParser() {
  console.log('🧪 Testing Facebook Parser with debug logging...');

  try {
    const app = await NestFactory.createApplicationContext(AppModule);
    const { FacebookParserService } = require('./dist/parser/facebook-parser.service');
    const facebookParser = app.get(FacebookParserService);

    const testUrl = 'https://www.facebook.com/groups/194826524192177';
    console.log(`🎯 Testing URL: ${testUrl}`);

    console.log('\n🚀 Starting Facebook parsing...');

    const result = await facebookParser.parseFacebookPage(testUrl);

    console.log('\n✅ Facebook parsing completed successfully!');
    console.log(`📋 Parsed Schedule ID: ${result.parsedScheduleId}`);
    console.log(`📊 Stats:`, result.stats);
    console.log(`🎯 Shows found: ${result.data.shows?.length || 0}`);
    console.log(`🎤 DJs found: ${result.data.djs?.length || 0}`);

    // Verify the parsed_schedule was actually saved
    const parsedScheduleRepo = app.get('ParsedScheduleRepository');
    const savedSchedule = await parsedScheduleRepo.findOne({
      where: { id: result.parsedScheduleId },
    });

    if (savedSchedule) {
      console.log(`\n✅ Verified: parsed_schedule ${result.parsedScheduleId} exists in database`);
      console.log(`   Status: ${savedSchedule.status}`);
      console.log(`   Created: ${savedSchedule.createdAt}`);
    } else {
      console.log(`\n❌ ERROR: parsed_schedule ${result.parsedScheduleId} NOT found in database!`);
    }

    await app.close();
  } catch (error) {
    console.error('\n💥 Facebook parsing failed:');
    console.error(`   Error: ${error.message}`);
    console.error(`   Stack: ${error.stack}`);
    process.exit(1);
  }
}

// Only run if called directly
if (require.main === module) {
  testFacebookParser()
    .then(() => {
      console.log('\n🎉 Test completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Test failed:', error.message);
      process.exit(1);
    });
}

module.exports = { testFacebookParser };
