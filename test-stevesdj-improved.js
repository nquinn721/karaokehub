feconst axios = require('axios');

async function testStevesDJParsingDetailed() {
  console.log('🔍 Detailed test of stevesdj.com parsing with improved DeepSeek...\n');
  
  const testUrl = 'https://stevesdj.com/karaoke-schedule';
  const apiKey = process.env.DEEPSEEK_API_KEY;
  
  if (!apiKey) {
    console.log('❌ DEEPSEEK_API_KEY environment variable not set');
    return;
  }
  
  try {
    console.log(`📡 Testing direct URL parsing: ${testUrl}`);
    console.log('🤖 Using improved DeepSeek prompt for karaoke extraction\n');
    
    const startTime = Date.now();
    
    // Test the new worker-based parser
    const response = await axios.post('http://localhost:8000/api/parser/parse-website', {
      url: testUrl,
      deepSeekApiKey: apiKey
    }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 180000
    });

    const duration = Date.now() - startTime;
    console.log(`✅ Response received in ${duration}ms\n`);
    
    // Detailed analysis of response
    console.log('📊 PARSING RESULTS ANALYSIS:');
    console.log('═══════════════════════════════════════');
    
    console.log(`🎯 Site Name: ${response.data.siteName || 'Not extracted'}`);
    console.log(`🔗 URLs Found: ${response.data.urls?.length || 0}`);
    
    if (response.data.urls && response.data.urls.length > 0) {
      console.log('\n📋 URLs discovered:');
      response.data.urls.forEach((url, index) => {
        console.log(`  ${index + 1}. ${url}`);
      });
    }
    
    if (response.data.data) {
      const data = response.data.data;
      console.log(`\n📈 Summary Statistics:`);
      console.log(`  Total URLs processed: ${data.processedUrls || 0}`);
      console.log(`  Shows found: ${data.totalShows || 0}`);
      console.log(`  DJs found: ${data.totalDJs || 0}`);
      console.log(`  Vendors found: ${data.totalVendors || 0}`);
      
      if (data.shows && data.shows.length > 0) {
        console.log(`\n🎤 SHOWS EXTRACTED (${data.shows.length} total):`);
        console.log('═══════════════════════════════════════════════════');
        data.shows.forEach((show, index) => {
          console.log(`\n${index + 1}. ${show.venue || 'Unknown Venue'}`);
          if (show.address) console.log(`   📍 Address: ${show.address}`);
          if (show.city && show.state) console.log(`   🏙️  Location: ${show.city}, ${show.state}`);
          if (show.day) console.log(`   📅 Day: ${show.day}`);
          if (show.time) console.log(`   ⏰ Time: ${show.time}`);
          if (show.djName) console.log(`   🎧 DJ: ${show.djName}`);
          if (show.description) console.log(`   📝 Description: ${show.description}`);
          if (show.source) console.log(`   🔗 Source: ${show.source}`);
          if (show.confidence) console.log(`   📊 Confidence: ${show.confidence}`);
        });
      } else {
        console.log('\n❌ NO SHOWS FOUND');
        console.log('Possible reasons:');
        console.log('  - Content is loaded dynamically (JavaScript)');
        console.log('  - DeepSeek parser needs prompt refinement');
        console.log('  - Site structure not recognized');
        console.log('  - Content behind authentication/paywall');
      }
      
      if (data.djs && data.djs.length > 0) {
        console.log(`\n🎧 DJs FOUND (${data.djs.length} total):`);
        data.djs.forEach((dj, index) => {
          console.log(`  ${index + 1}. ${dj.name} (confidence: ${dj.confidence || 'N/A'})`);
        });
      }
      
      if (data.vendors && data.vendors.length > 0) {
        console.log(`\n🏢 VENDORS FOUND (${data.vendors.length} total):`);
        data.vendors.forEach((vendor, index) => {
          console.log(`  ${index + 1}. ${vendor.name} (confidence: ${vendor.confidence || 'N/A'})`);
        });
      }
    }
    
    console.log('\n⏱️  Performance:');
    if (response.data.stats) {
      console.log(`  Discovery time: ${response.data.stats.discoveryTime}ms`);
      console.log(`  Processing time: ${response.data.stats.processingTime}ms`);
      console.log(`  Total time: ${response.data.stats.totalTime}ms`);
    }
    
    console.log('\n✅ Test completed successfully!');
    
    if (response.data.data && response.data.data.totalShows > 0) {
      console.log('🎉 SUCCESS: Shows were extracted from stevesdj.com!');
    } else {
      console.log('⚠️  ATTENTION: No shows extracted - may need further investigation');
    }
    
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('❌ Server not running. Please start the server first with: npm run start:dev');
    } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
      console.log('⏰ Request timed out');
      console.log('Error details:', error.message);
    } else {
      console.error('❌ Error:', error.response?.data || error.message);
      if (error.response?.data) {
        console.log('\nServer response:', JSON.stringify(error.response.data, null, 2));
      }
    }
  }
}

testStevesDJParsingDetailed();
