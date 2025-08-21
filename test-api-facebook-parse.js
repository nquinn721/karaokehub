/**
 * Test Facebook parsing with multiple vendors via API
 */

const fetch = require('node-fetch');

const testUrl = 'https://www.facebook.com/groups/614986085253293';
const apiUrl = 'http://localhost:8000/api/parser/parse-and-save-facebook-share';

async function testFacebookParsing() {
  console.log('🧪 TESTING FACEBOOK MULTIPLE VENDORS VIA API');
  console.log('============================================');
  console.log(`URL: ${testUrl}`);
  console.log('');

  try {
    console.log('📡 Sending request to parser API...');

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: testUrl,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();

    console.log('✅ Parse request submitted successfully!');
    console.log('');
    console.log('📊 Results:');
    console.log(JSON.stringify(result, null, 2));

    console.log('');
    console.log('🔍 Check the server logs for detailed parsing progress...');
    console.log('💡 Monitor the admin review interface for the parsed data!');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testFacebookParsing();
