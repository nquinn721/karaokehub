/**
 * Manual Website Accessibility Test
 * Test if the problematic website is accessible and working
 */

const axios = require('axios');

async function testWebsiteAccessibility() {
  const testUrl = 'https://karaokeviewpoint.com/karaoke-in-ohio/';

  console.log('🔍 Testing Website Accessibility');
  console.log(`📍 URL: ${testUrl}`);
  console.log('='.repeat(60));

  // Test 1: Basic HTTP Request
  console.log('\n1️⃣ Basic HTTP Request Test:');
  try {
    const response = await axios.get(testUrl, {
      timeout: 10000,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
    });

    console.log(`✅ Status: ${response.status}`);
    console.log(`📏 Content Length: ${response.data.length} characters`);
    console.log(`🏷️ Content Type: ${response.headers['content-type']}`);

    if (response.data.length < 100) {
      console.log('⚠️ Warning: Very short response content');
      console.log(`Content preview: ${response.data.substring(0, 200)}`);
    } else {
      console.log(`📄 Content preview: ${response.data.substring(0, 200)}...`);
    }
  } catch (error) {
    console.log(`❌ HTTP Request Failed: ${error.message}`);
    if (error.response) {
      console.log(`📊 Response Status: ${error.response.status}`);
      console.log(`📋 Response Headers: ${JSON.stringify(error.response.headers, null, 2)}`);
    }
  }

  // Test 2: Try with different user agents
  console.log('\n2️⃣ Alternative User Agent Test:');
  const userAgents = [
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:91.0) Gecko/20100101 Firefox/91.0',
  ];

  for (const ua of userAgents) {
    try {
      const response = await axios.get(testUrl, {
        timeout: 8000,
        headers: { 'User-Agent': ua },
      });
      console.log(
        `✅ ${ua.substring(0, 30)}... - Status: ${response.status}, Length: ${response.data.length}`,
      );
      break; // Stop on first success
    } catch (error) {
      console.log(`❌ ${ua.substring(0, 30)}... - Failed: ${error.message}`);
    }
  }

  // Test 3: Try the main domain
  console.log('\n3️⃣ Main Domain Test:');
  try {
    const mainUrl = 'https://karaokeviewpoint.com/';
    const response = await axios.get(mainUrl, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    console.log(
      `✅ Main domain accessible - Status: ${response.status}, Length: ${response.data.length}`,
    );

    // Check if the specific path exists in the content
    if (response.data.includes('/karaoke-in-ohio/')) {
      console.log('✅ Target path found in main page content');
    } else {
      console.log('⚠️ Target path not found in main page content');
    }
  } catch (error) {
    console.log(`❌ Main domain failed: ${error.message}`);
  }

  // Test 4: DNS Resolution
  console.log('\n4️⃣ DNS Resolution Test:');
  try {
    const dns = require('dns').promises;
    const hostname = new URL(testUrl).hostname;
    const addresses = await dns.resolve4(hostname);
    console.log(`✅ DNS resolved to: ${addresses.join(', ')}`);
  } catch (error) {
    console.log(`❌ DNS resolution failed: ${error.message}`);
  }

  console.log('\n🏁 Test Complete');
}

if (require.main === module) {
  testWebsiteAccessibility();
}

module.exports = { testWebsiteAccessibility };
