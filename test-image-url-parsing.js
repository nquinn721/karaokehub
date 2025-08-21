const { spawn } = require('child_process');
const { Worker } = require('worker_threads');

console.log('🧪 Testing Facebook image URL fetching and Gemini parsing...');

// Test a single scontent URL to see if it's properly fetched and parsed
async function testImageUrlFetching() {
  try {
    console.log('🖼️  Testing direct image URL fetching and parsing...');

    // Test URLs from the Facebook group (scontent URLs)
    const testImageUrls = [
      // This should be a real scontent URL from the group
      'https://scontent-iad3-2.xx.fbcdn.net/v/t39.30808-6/470102633_10162546348528903_1816736352419217_n.jpg?_nc_cat=109&ccb=1-7&_nc_sid=833d8c&_nc_ohc=YZ2u7L4QD_8Q7kNvgHD2mZ8&_nc_zt=23&_nc_ht=scontent-iad3-2.xx&_nc_gid=A1sBr832Lps64BWyRnLEEwX&oh=00_AYDyUfrKZ4Rlj2W9EJQjthHJJhC1xNKpHQAIx2tFTwb5eQ&oe=6766F5F8',
    ];

    // Import the required modules
    const { NestFactory } = require('@nestjs/core');
    const { AppModule } = require('./dist/app.module');

    // Create the application
    const app = await NestFactory.createApplicationContext(AppModule);
    const facebookParser = app.get('FacebookParserService');

    console.log(`🔍 Testing image URL parsing for ${testImageUrls.length} images...`);

    // Test the worker parsing directly
    const workerResults = await facebookParser.parseImageUrlsWithWorker(testImageUrls);

    console.log('📊 Worker Results:');
    console.log(`   Shows found: ${workerResults.shows?.length || 0}`);
    console.log(`   DJs found: ${workerResults.djs?.length || 0}`);

    if (workerResults.shows && workerResults.shows.length > 0) {
      console.log('\n🎭 Shows Details:');
      workerResults.shows.forEach((show, index) => {
        console.log(`   Show ${index + 1}:`);
        console.log(`     Venue: ${show.venue}`);
        console.log(`     Address: ${show.address || 'N/A'}`);
        console.log(`     City: ${show.city || 'N/A'}`);
        console.log(`     State: ${show.state || 'N/A'}`);
        console.log(`     ZIP: ${show.zip || 'N/A'}`);
        console.log(`     Time: ${show.time || 'N/A'}`);
        console.log(`     Day: ${show.day || 'N/A'}`);
        console.log(`     DJ: ${show.djName || 'N/A'}`);
        console.log(`     Confidence: ${show.confidence || 'N/A'}`);
        console.log('');
      });
    }

    if (workerResults.djs && workerResults.djs.length > 0) {
      console.log('🎤 DJs Details:');
      workerResults.djs.forEach((dj, index) => {
        console.log(`   DJ ${index + 1}: ${dj.name} (${dj.context}) - ${dj.confidence}`);
      });
    }

    // Test if the address parsing is working correctly
    const hasProperAddresses = workerResults.shows?.some(
      (show) =>
        show.address &&
        show.city &&
        show.state &&
        !show.address.includes(',') && // Address field shouldn't have commas
        !show.address.includes(show.city) && // Address shouldn't contain city
        !show.address.includes(show.state), // Address shouldn't contain state
    );

    if (hasProperAddresses) {
      console.log('✅ SUCCESS: Found shows with properly separated address components!');
    } else {
      console.log('⚠️ WARNING: Address components may not be properly separated');
    }

    await app.close();
  } catch (error) {
    console.error('💥 Test failed:', error.message);
  }
}

testImageUrlFetching().catch(console.error);
