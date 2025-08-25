// Test subscription endpoint manually
const axios = require('axios');

async function testSubscription() {
  try {
    // First, let's test without authentication to see the exact error
    console.log('Testing subscription endpoint...');

    const response = await axios.post(
      'http://localhost:8000/api/subscription/create-checkout-session',
      {
        plan: 'premium',
      },
      {
        headers: {
          'Content-Type': 'application/json',
          // No auth token to see if that's the issue
        },
      },
    );

    console.log('Success:', response.data);
  } catch (error) {
    console.log('Error details:');
    console.log('Status:', error.response?.status);
    console.log('Status Text:', error.response?.statusText);
    console.log('Data:', error.response?.data);
    console.log('Headers:', error.response?.headers);

    if (error.response?.status === 401) {
      console.log('\n401 Unauthorized - Authentication required');
    } else if (error.response?.status === 400) {
      console.log('\n400 Bad Request - Validation error or missing data');
      console.log('Request body was:', { plan: 'premium' });
    }
  }
}

testSubscription();
