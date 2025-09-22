const axios = require('axios');

async function debugStevesDJScreenshotParsing() {
  console.log('🔍 Debug Stevesdj Screenshot Parsing');
  console.log('='.repeat(50));

  const testUrl = 'https://stevesdj.com/karaoke-schedule';

  try {
    console.log(`📡 Testing screenshot parsing: ${testUrl}`);
    console.log('⏱️  Starting parse request...\n');

    const startTime = Date.now();

    // Test the screenshot parsing method specifically
    const response = await axios.post(
      'http://localhost:8000/api/parser/parse-url',
      {
        url: testUrl,
        parseMethod: 'screenshot',
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 300000, // 5 minutes timeout
      },
    );

    const duration = Date.now() - startTime;
    console.log(`✅ Response received in ${duration}ms\n`);

    // Analyze the response
    console.log('📊 PARSING RESULTS:');
    console.log('='.repeat(30));

    if (response.data.success) {
      console.log('✅ Parse successful!');
      console.log(`📝 Parsed Schedule ID: ${response.data.parsedScheduleId || 'N/A'}`);

      if (response.data.data) {
        const data = response.data.data;
        console.log(`\n📈 Statistics:`);
        console.log(`  Shows found: ${data.shows?.length || 0}`);
        console.log(`  DJs found: ${data.djs?.length || 0}`);
        console.log(`  Vendors found: ${data.vendors?.length || 0}`);
        console.log(`  Vendor name: ${data.vendor?.name || 'Unknown'}`);
      }

      if (response.data.stats) {
        console.log(`\n⏱️  Performance:`);
        console.log(`  Shows found: ${response.data.stats.showsFound}`);
        console.log(`  DJs found: ${response.data.stats.djsFound}`);
        console.log(`  Processing time: ${response.data.stats.processingTime}ms`);
        console.log(`  HTML length: ${response.data.stats.htmlLength} chars`);
      }

      // Check if shows were found
      if (!response.data.data?.shows || response.data.data.shows.length === 0) {
        console.log('\n❌ NO SHOWS FOUND - Debugging suggestions:');
        console.log('  1. Check if the website content loads properly');
        console.log('  2. Verify Gemini Vision API is working');
        console.log('  3. Check if the screenshot captures the content');
        console.log('  4. Review the AI prompt for karaoke detection');

        // Let's also check the parsed schedule in the database
        console.log('\n🔍 Checking parsed schedule in database...');

        if (response.data.parsedScheduleId) {
          try {
            const scheduleResponse = await axios.get(
              `http://localhost:8000/api/parser/pending-reviews`,
            );
            const schedule = scheduleResponse.data.find(
              (s) => s.id === response.data.parsedScheduleId,
            );

            if (schedule) {
              console.log(`  ✅ Found schedule in database`);
              console.log(`  📊 Raw data keys: ${Object.keys(schedule.rawData || {}).join(', ')}`);
              console.log(
                `  🤖 AI analysis keys: ${Object.keys(schedule.aiAnalysis || {}).join(', ')}`,
              );

              if (schedule.aiAnalysis) {
                console.log(`  🎤 Shows in AI analysis: ${schedule.aiAnalysis.shows?.length || 0}`);
                console.log(`  🎧 DJs in AI analysis: ${schedule.aiAnalysis.djs?.length || 0}`);

                // Show first few characters of raw content
                const content = schedule.rawData?.content || '';
                if (content) {
                  console.log(`  📄 Content preview: ${content.substring(0, 200)}...`);
                }
              }
            } else {
              console.log(`  ❌ Schedule not found in database`);
            }
          } catch (dbError) {
            console.log(`  ❌ Error checking database: ${dbError.message}`);
          }
        }
      } else {
        console.log(`\n🎉 SUCCESS! Found ${response.data.data.shows.length} shows`);

        // Show details of first few shows
        response.data.data.shows.slice(0, 3).forEach((show, index) => {
          console.log(`\n${index + 1}. ${show.venue || 'Unknown Venue'}`);
          if (show.time) console.log(`   ⏰ Time: ${show.time}`);
          if (show.djName) console.log(`   🎧 DJ: ${show.djName}`);
          if (show.address) console.log(`   📍 Address: ${show.address}`);
        });
      }
    } else {
      console.log('❌ Parse failed');
      console.log(`Error: ${response.data.error || 'Unknown error'}`);
    }
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('❌ Server not running. Start with: npm run start:dev');
    } else if (error.code === 'ETIMEDOUT') {
      console.log('⏰ Request timed out - parsing may take longer than expected');
    } else {
      console.error('❌ Error:', error.response?.data || error.message);

      if (error.response?.data) {
        console.log('\nServer response details:');
        console.log(JSON.stringify(error.response.data, null, 2));
      }
    }
  }
}

debugStevesDJScreenshotParsing();
