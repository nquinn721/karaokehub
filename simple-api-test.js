/**
 * Simple test of the API endpoint
 */

const axios = require('axios');

async function testAPI() {
  try {
    console.log('🧪 Testing API endpoint...');

    const response = await axios.post(
      'http://localhost:8000/api/parser/parse-website',
      {
        url: 'https://karaokeviewpoint.com/karaoke-in-ohio/',
        includeSubdomains: false,
        usePuppeteer: true,
        aiAnalysis: true,
      },
      {
        timeout: 300000, // 5 minutes
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );

    console.log('✅ Success:', response.data.success);
    if (response.data.success) {
      console.log('📊 URLs found:', response.data.data?.totalUrls || 0);
    } else {
      console.log('❌ Error:', response.data.error);
    }
  } catch (error) {
    console.error('❌ Request failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testAPI();
