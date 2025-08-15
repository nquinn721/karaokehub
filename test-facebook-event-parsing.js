const { createTestServer } = require('../test-server-utils.js');

// Test the Facebook event parsing functionality
async function testFacebookEventParsing() {
  try {
    console.log('🧪 Testing Facebook Event Parsing Functionality...\n');

    // Test Facebook event URL (from the attachment)
    const testEventUrl = 'https://facebook.com/events/123456789'; // Example URL structure
    const crescentLoungeEventUrl = 'https://facebook.com/thecrescentlounge/posts/123456789'; // Based on attachment

    // Test 1: Parse Facebook event directly (preview only)
    console.log('📅 Test 1: Parse Facebook Event (Preview)');
    try {
      const response = await fetch('http://localhost:8000/api/parser/parse-facebook-event', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: testEventUrl,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Facebook event parsing successful!');
        console.log('📊 Results:', JSON.stringify(result, null, 2));
      } else {
        console.log('❌ Facebook event parsing failed:', response.status, response.statusText);
      }
    } catch (error) {
      console.log('❌ Facebook event parsing error:', error.message);
    }

    console.log('\n' + '='.repeat(60) + '\n');

    // Test 2: Smart social media parsing (should detect Facebook event)
    console.log('🤖 Test 2: Smart Social Media Parsing');
    try {
      const response = await fetch('http://localhost:8000/api/parser/parse-smart-social-media', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: testEventUrl,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Smart social media parsing successful!');
        console.log('📊 Results:', JSON.stringify(result, null, 2));
      } else {
        console.log('❌ Smart social media parsing failed:', response.status, response.statusText);
      }
    } catch (error) {
      console.log('❌ Smart social media parsing error:', error.message);
    }

    console.log('\n' + '='.repeat(60) + '\n');

    // Test 3: Parse and save Facebook event for admin review
    console.log('💾 Test 3: Parse and Save Facebook Event for Admin Review');
    try {
      const response = await fetch(
        'http://localhost:8000/api/parser/parse-and-save-facebook-event',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: testEventUrl,
          }),
        },
      );

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Facebook event saved for review!');
        console.log('📋 Parsed Schedule ID:', result.parsedScheduleId);
        console.log('📊 Extracted Data:', JSON.stringify(result.data, null, 2));

        // Check DJ nicknames detected
        if (result.data.djs && result.data.djs.length > 0) {
          console.log('\n🎤 DJ Analysis:');
          result.data.djs.forEach((dj, index) => {
            console.log(`  DJ ${index + 1}: ${dj.name}`);
            if (dj.aliases && dj.aliases.length > 0) {
              console.log(`    Aliases: ${dj.aliases.join(', ')}`);
            }
            console.log(`    Confidence: ${dj.confidence}%`);
          });
        }
      } else {
        console.log('❌ Parse and save failed:', response.status, response.statusText);
      }
    } catch (error) {
      console.log('❌ Parse and save error:', error.message);
    }

    console.log('\n' + '='.repeat(60) + '\n');

    // Test 4: Test DJ nickname matching
    console.log('👤 Test 4: DJ Nickname Matching');
    try {
      const testNicknames = ['Max', 'djmax614', '@djmax614', 'Max Denney'];

      for (const nickname of testNicknames) {
        console.log(`\n🔍 Testing nickname: "${nickname}"`);
        const response = await fetch(
          `http://localhost:8000/api/dj-nicknames/search/${encodeURIComponent(nickname)}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
          },
        );

        if (response.ok) {
          const result = await response.json();
          if (result.dj) {
            console.log(`  ✅ Found DJ: ${result.dj.name}`);
            console.log(`  📊 Confidence: ${result.confidence}%`);
            console.log(`  🔗 Match Type: ${result.matchType}`);
          } else {
            console.log(`  ❌ No DJ found for "${nickname}"`);
          }
        } else {
          console.log(`  ❌ Search failed: ${response.status}`);
        }
      }
    } catch (error) {
      console.log('❌ DJ nickname matching error:', error.message);
    }

    console.log('\n📋 Test Summary:');
    console.log('- Facebook event parsing with enhanced DJ nickname intelligence');
    console.log('- Smart social media URL detection');
    console.log('- Admin review workflow with DJ alias display');
    console.log('- DJ nickname matching system');
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testFacebookEventParsing();
