const { spawn } = require('child_process');

console.log('🧪 Testing complete Facebook parser with group name and address fixes...');

async function testFullFacebookParser() {
  try {
    console.log('🎯 Testing full Facebook parser workflow...');

    // Import the required modules
    const { NestFactory } = require('@nestjs/core');
    const { AppModule } = require('./dist/app.module');

    // Create the application
    const app = await NestFactory.createApplicationContext(AppModule);
    const facebookParser = app.get('FacebookParserService');

    const testUrl = 'https://www.facebook.com/groups/194826524192177';

    console.log(`🔍 Testing full parsing workflow for: ${testUrl}`);
    console.log('   Expected group name: "Central Ohio Karaoke Places to Sing!"');
    console.log('   Expected to find shows with proper address components');

    // Test the complete parsing workflow
    const result = await facebookParser.parseAndSaveFacebookPage(testUrl);

    console.log('\n📊 Parsing Results:');
    console.log(`   Parsed Schedule ID: ${result.parsedScheduleId}`);
    console.log(`   Vendor Name: "${result.data.vendor.name}"`);
    console.log(`   Shows Found: ${result.stats.showsFound}`);
    console.log(`   DJs Found: ${result.stats.djsFound}`);
    console.log(`   Processing Method: ${result.stats.processingMethod}`);

    // Check if group name was extracted correctly
    if (
      result.data.vendor.name.includes('Central Ohio') ||
      result.data.vendor.name.includes('Karaoke')
    ) {
      console.log('✅ SUCCESS: Group name extracted correctly!');
    } else {
      console.log(`⚠️ WARNING: Group name may not be correct: "${result.data.vendor.name}"`);
    }

    // Check address parsing quality
    if (result.data.shows && result.data.shows.length > 0) {
      console.log('\n🏠 Address Analysis:');
      let properAddressCount = 0;

      result.data.shows.forEach((show, index) => {
        const hasFullAddress = show.address && show.city && show.state;
        const hasProperSeparation =
          hasFullAddress &&
          !show.address.includes(',') &&
          !show.address.includes(show.city) &&
          !show.address.includes(show.state);

        console.log(`   Show ${index + 1}: ${show.venue}`);
        console.log(`     Address: ${show.address || 'Missing'}`);
        console.log(`     City: ${show.city || 'Missing'}`);
        console.log(`     State: ${show.state || 'Missing'}`);
        console.log(`     ZIP: ${show.zip || 'Missing'}`);
        console.log(`     Proper separation: ${hasProperSeparation ? '✅' : '❌'}`);

        if (hasProperSeparation) properAddressCount++;
      });

      const addressQuality = (properAddressCount / result.data.shows.length) * 100;
      console.log(
        `\n📈 Address Quality: ${addressQuality.toFixed(1)}% (${properAddressCount}/${result.data.shows.length} shows with proper address separation)`,
      );

      if (addressQuality >= 50) {
        console.log('✅ SUCCESS: Good address parsing quality!');
      } else {
        console.log('⚠️ WARNING: Address parsing needs improvement');
      }
    }

    await app.close();
    console.log('\n🎉 Test completed successfully!');
  } catch (error) {
    console.error('💥 Test failed:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
  }
}

testFullFacebookParser().catch(console.error);
