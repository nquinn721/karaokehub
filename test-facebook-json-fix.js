require('dotenv').config();
const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('./dist/app.module');
const { FacebookParserService } = require('./dist/parser/facebook-parser.service');

async function testFixedJsonParsing() {
  console.log('🎯 Testing Fixed JSON Parsing Logic...');

  if (!process.env.GEMINI_API_KEY) {
    console.error('❌ GEMINI_API_KEY not found in environment');
    return;
  }
  console.log('✅ GEMINI_API_KEY found');

  const app = await NestFactory.createApplicationContext(AppModule);
  const facebookParserService = app.get(FacebookParserService);

  console.log('🚀 Starting test with fixed JSON parsing...');

  // This should now properly parse the JSON responses from Gemini
  const result = await facebookParserService.parseAndSaveFacebookPageNew(
    'https://www.facebook.com/groups/194826524192177',
  );

  console.log('\n🎯 Results after JSON parsing fix:');
  console.log(`   Schedule ID: ${result.scheduleId}`);
  console.log(`   Processing Time: ${result.stats?.processingTime || 'unknown'}`);

  // Show the actual counts from the result
  if (result.shows && result.shows.length > 0) {
    console.log(`✅ SUCCESS! Found ${result.shows.length} shows!`);
    console.log('📋 Sample shows found:');
    result.shows.slice(0, 3).forEach((show, i) => {
      console.log(
        `   ${i + 1}. Venue: "${show.venue || 'N/A'}" - DJ: "${show.dj || 'N/A'}" - Time: "${show.time || 'N/A'}"`,
      );
    });
  } else {
    console.log('❌ Still no shows found...');
  }

  if (result.djs && result.djs.length > 0) {
    console.log(`✅ Found ${result.djs.length} DJs!`);
  }

  if (result.vendors && result.vendors.length > 0) {
    console.log(`✅ Found ${result.vendors.length} vendors!`);
  }

  await app.close();
}

testFixedJsonParsing().catch(console.error);
