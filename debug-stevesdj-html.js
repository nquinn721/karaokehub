const axios = require('axios');

async function testStevesDJHTMLParsing() {
  console.log('🔍 Testing Stevesdj HTML Parsing vs Screenshot');
  console.log('='.repeat(60));

  const testUrl = 'https://stevesdj.com/karaoke-schedule';

  try {
    console.log(`📡 Testing HTML parsing: ${testUrl}`);
    console.log('⏱️  Starting HTML parse request...\n');

    const startTime = Date.now();

    // Test HTML parsing method
    const response = await axios.post(
      'http://localhost:8000/api/parser/parse-url',
      {
        url: testUrl,
        parseMethod: 'html',
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 300000, // 5 minutes timeout
      },
    );

    const duration = Date.now() - startTime;
    console.log(`✅ HTML Parse Response received in ${duration}ms\n`);

    // Analyze the HTML parsing response
    console.log('📊 HTML PARSING RESULTS:');
    console.log('='.repeat(40));

    if (response.data.success) {
      console.log('✅ HTML Parse successful!');
      console.log(`📝 Parsed Schedule ID: ${response.data.parsedScheduleId || 'N/A'}`);

      if (response.data.data) {
        const data = response.data.data;
        console.log(`\n📈 HTML Statistics:`);
        console.log(`  Shows found: ${data.shows?.length || 0}`);
        console.log(`  DJs found: ${data.djs?.length || 0}`);
        console.log(`  Vendors found: ${data.vendors?.length || 0}`);
        console.log(`  Vendor name: ${data.vendor?.name || 'Unknown'}`);
      }

      if (response.data.stats) {
        console.log(`\n⏱️  HTML Performance:`);
        console.log(`  Shows found: ${response.data.stats.showsFound}`);
        console.log(`  DJs found: ${response.data.stats.djsFound}`);
        console.log(`  Processing time: ${response.data.stats.processingTime}ms`);
        console.log(`  HTML length: ${response.data.stats.htmlLength} chars`);
      }

      // Check if shows were found
      if (!response.data.data?.shows || response.data.data.shows.length === 0) {
        console.log('\n❌ NO SHOWS FOUND WITH HTML PARSING');
        console.log('   This suggests the content is loaded dynamically with JavaScript');
        console.log('   The page likely uses AJAX/React/Vue to load the schedule');

        // Let's check what HTML content we actually got
        if (response.data.parsedScheduleId) {
          try {
            const scheduleResponse = await axios.get(
              `http://localhost:8000/api/parser/pending-reviews`,
            );
            const schedule = scheduleResponse.data.find(
              (s) => s.id === response.data.parsedScheduleId,
            );

            if (schedule) {
              const content = schedule.rawData?.content || '';
              console.log(`\n📄 HTML Content Sample (first 500 chars):`);
              console.log(content.substring(0, 500));

              // Check for specific indicators of dynamic content
              const indicators = [
                'React',
                'Vue',
                'angular',
                'script',
                'ajax',
                'fetch',
                'XMLHttpRequest',
                'application/json',
                'data-react',
                'ng-app',
                'v-app',
              ];

              const foundIndicators = indicators.filter((indicator) =>
                content.toLowerCase().includes(indicator.toLowerCase()),
              );

              if (foundIndicators.length > 0) {
                console.log(`\n🔍 Dynamic Content Indicators Found: ${foundIndicators.join(', ')}`);
                console.log('   This confirms the page uses JavaScript to load content');
              }
            }
          } catch (dbError) {
            console.log(`  ❌ Error checking database: ${dbError.message}`);
          }
        }
      } else {
        console.log(`\n🎉 HTML PARSING SUCCESS! Found ${response.data.data.shows.length} shows`);
      }
    } else {
      console.log('❌ HTML Parse failed');
      console.log(`Error: ${response.data.error || 'Unknown error'}`);
    }

    // Now compare with screenshot parsing
    console.log('\n' + '='.repeat(60));
    console.log('🔍 COMPARISON: Why Screenshot vs HTML might give different results');
    console.log('='.repeat(60));

    console.log('\n📸 Screenshot Parsing:');
    console.log('  ✅ Captures visual content after JavaScript runs');
    console.log('  ✅ Can see dynamically loaded content');
    console.log('  ❌ Relies on AI vision to interpret visual layout');
    console.log("  ❌ May miss text that's not visually clear");

    console.log('\n📄 HTML Parsing:');
    console.log('  ✅ Gets raw HTML structure and text');
    console.log('  ✅ Faster and more reliable for static content');
    console.log('  ❌ Misses content loaded by JavaScript after page load');
    console.log('  ❌ May get placeholder content instead of real data');

    console.log('\n💡 RECOMMENDATION:');
    console.log('  For stevesdj.com specifically:');
    console.log('  - Use screenshot parsing (current method)');
    console.log('  - The AI prompt may need refinement to better detect the schedule');
    console.log('  - Consider adding delays to let JavaScript load fully');
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('❌ Server not running. Start with: npm run start:dev');
    } else if (error.code === 'ETIMEDOUT') {
      console.log('⏰ Request timed out');
    } else {
      console.error('❌ Error:', error.response?.data || error.message);
    }
  }
}

testStevesDJHTMLParsing();
