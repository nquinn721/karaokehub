const axios = require('axios');

async function testUrlSubmission() {
  const API_BASE = 'http://localhost:8000/api';
  const timestamp = Date.now();

  console.log('🧪 Testing URL submission with user authentication...\n');

  try {
    // First, let's try submitting without authentication (anonymous)
    console.log('1. Testing anonymous URL submission...');
    const anonymousResponse = await axios.post(`${API_BASE}/parser/urls`, {
      url: `https://example.com/anonymous-test-${timestamp}`,
    });

    console.log('✅ Anonymous submission successful');
    console.log('Response data:', anonymousResponse.data);
    console.log(
      'Submitted by user ID:',
      anonymousResponse.data.submittedBy?.id || 'null (anonymous)',
    );
    console.log('');

    // Next, let's try to authenticate and submit
    // This would normally require a real user login flow
    console.log('2. Testing authenticated URL submission...');
    console.log('(Note: Would need real authentication token for full test)');

    // Let's check what URLs are in the queue
    console.log('3. Checking current URLs in queue...');
    const queueResponse = await axios.get(`${API_BASE}/parser/urls/unapproved`);
    console.log('✅ URLs in approval queue:', queueResponse.data.length);

    // Show the last few submissions
    if (queueResponse.data.length > 0) {
      console.log('\nRecent submissions:');
      queueResponse.data.slice(-3).forEach((url, index) => {
        console.log(`${index + 1}. URL: ${url.url}`);
        console.log(`   Submitted by: ${url.submittedBy?.username || 'Anonymous'}`);
        console.log(`   User ID: ${url.submittedBy?.id || 'null'}`);
        console.log(`   Created: ${url.createdAt}`);
        console.log('');
      });
    }
  } catch (error) {
    console.error('❌ Test failed:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Error:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
}

testUrlSubmission();
