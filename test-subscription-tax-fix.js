const axios = require('axios');

async function testSubscriptionCheckout() {
  try {
    console.log('🧪 Testing subscription checkout with automatic tax fix...');
    
    // First, create a test user and get authentication token
    const authResponse = await axios.post('http://192.168.0.108:8000/api/auth/create-test-user', {
      email: `test-${Date.now()}@example.com`,
      password: 'password123',
      firstName: 'Test',
      lastName: 'User'
    });
    
    console.log('✅ Created test user');
    
    const token = authResponse.data.token;
    
    // Try to create a checkout session for ad_free plan
    const checkoutResponse = await axios.post(
      'http://192.168.0.108:8000/api/subscription/create-checkout-session',
      {
        plan: 'ad_free'
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ Checkout session created successfully!');
    console.log('📄 Response:', {
      sessionId: checkoutResponse.data.sessionId,
      mode: checkoutResponse.data.mode,
      url: checkoutResponse.data.url?.substring(0, 80) + '...'
    });
    
    console.log('🎉 SUCCESS: Automatic tax calculation fix is working!');
    
  } catch (error) {
    console.error('❌ ERROR:', error.response?.data || error.message);
    
    if (error.response?.status === 400) {
      console.error('💡 This indicates the automatic tax fix might not be working properly');
    }
  }
}

testSubscriptionCheckout();
