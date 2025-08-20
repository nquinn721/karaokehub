/**
 * Test script to verify the modal-based Facebook authentication flow
 */

const axios = require('axios');

const BACKEND_URL = 'http://localhost:8000';
const TEST_FACEBOOK_URL = 'https://www.facebook.com/groups/centralokkj';

async function testModalFlow() {
  console.log('🧪 Testing modal-based Facebook authentication flow...\n');

  try {
    console.log('1️⃣ Testing parse-and-save-website endpoint with Facebook URL...');
    console.log(`📱 URL: ${TEST_FACEBOOK_URL}\n`);

    const response = await axios.post(
      `${BACKEND_URL}/parser/parse-and-save-website`,
      {
        url: TEST_FACEBOOK_URL,
        isCustomUrl: false,
      },
      {
        timeout: 30000, // 30 second timeout
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );

    console.log('✅ API Response Status:', response.status);
    console.log('📊 Response Data:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    if (error.response) {
      console.log('❌ API Error Response:');
      console.log('Status:', error.response.status);
      console.log('Data:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.log('❌ Network Error - No response received');
      console.log('Request timeout or connection refused');
    } else {
      console.log('❌ Error:', error.message);
    }
  }
}

async function testInstagramFlow() {
  console.log('\n🧪 Testing Instagram URL routing...\n');

  try {
    console.log('2️⃣ Testing parse-and-save-website endpoint with Instagram URL...');
    const instagramUrl = 'https://www.instagram.com/djmax614/';
    console.log(`📱 URL: ${instagramUrl}\n`);

    const response = await axios.post(
      `${BACKEND_URL}/parser/parse-and-save-website`,
      {
        url: instagramUrl,
        isCustomUrl: false,
      },
      {
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );

    console.log('✅ API Response Status:', response.status);
    console.log('📊 Response Data:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    if (error.response) {
      console.log('❌ API Error Response:');
      console.log('Status:', error.response.status);
      console.log('Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.log('❌ Error:', error.message);
    }
  }
}

async function testWebsiteFlow() {
  console.log('\n🧪 Testing regular website URL routing...\n');

  try {
    console.log('3️⃣ Testing parse-and-save-website endpoint with regular website...');
    const websiteUrl = 'https://maxdenney.com';
    console.log(`📱 URL: ${websiteUrl}\n`);

    const response = await axios.post(
      `${BACKEND_URL}/parser/parse-and-save-website`,
      {
        url: websiteUrl,
        isCustomUrl: false,
        parseMethod: 'screenshot',
      },
      {
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );

    console.log('✅ API Response Status:', response.status);
    console.log('📊 Response Data:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    if (error.response) {
      console.log('❌ API Error Response:');
      console.log('Status:', error.response.status);
      console.log('Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.log('❌ Error:', error.message);
    }
  }
}

// Run the tests
async function runAllTests() {
  console.log('🎯 Testing Complete Modal-Based Authentication Flow\n');
  console.log('Expected behavior:');
  console.log('- Facebook URL should trigger modal authentication request');
  console.log('- Instagram URL should use visual parsing');
  console.log('- Regular websites should use standard parsing');
  console.log('- All should run in worker threads\n');
  console.log('=' * 60);

  // Test Facebook flow (should trigger modal)
  await testModalFlow();

  // Test Instagram flow
  await testInstagramFlow();

  // Test regular website flow
  await testWebsiteFlow();

  console.log('\n🏁 All tests completed!');
  console.log('\nTo see the modal in action:');
  console.log('1. Start the server: npm run start:dev');
  console.log('2. Open the admin parser page: http://localhost:5173/admin/parser');
  console.log('3. Submit a Facebook URL for parsing');
  console.log('4. The modal should appear automatically when login is required');
}

if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = { testModalFlow, testInstagramFlow, testWebsiteFlow };
