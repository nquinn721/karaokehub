/**
 * Test the pending reviews API endpoint directly
 */

const http = require('http');

async function testPendingReviewsAPI() {
  console.log('🧪 Testing pending reviews API endpoint...');

  const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/parser/pending-reviews',
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  };

  const req = http.request(options, (res) => {
    console.log(`📡 Status: ${res.statusCode}`);
    console.log(`📋 Headers:`, res.headers);

    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      console.log('📊 Response data:');
      try {
        const jsonData = JSON.parse(data);
        console.log('✅ Parsed JSON response:');
        console.log(JSON.stringify(jsonData, null, 2));

        if (Array.isArray(jsonData)) {
          console.log(`📈 Found ${jsonData.length} pending reviews`);
          if (jsonData.length > 0) {
            console.log('📋 First review:', jsonData[0]);
          }
        }
      } catch (error) {
        console.log('❌ Failed to parse JSON:', error.message);
        console.log('Raw response:', data);
      }
    });
  });

  req.on('error', (error) => {
    console.error('❌ Request error:', error.message);
    console.log('💡 Make sure the server is running on port 3001');
    console.log('💡 Try: npm run start:dev');
  });

  req.end();
}

// Add a delay to ensure any server startup messages are shown first
setTimeout(testPendingReviewsAPI, 1000);

console.log('🚀 Testing pending reviews API...');
console.log('📝 Make sure your server is running with: npm run start:dev');
console.log('⏳ Waiting 1 second then making request...');
