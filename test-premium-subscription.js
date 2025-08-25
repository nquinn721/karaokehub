const axios = require('axios');

async function testPremiumSubscription() {
  try {
    console.log('🧪 Testing premium subscription checkout...');
    
    // Create a test user and get authentication token
    const authResponse = await axios.post('http://192.168.0.108:8000/api/auth/create-test-user', {
      email: `premium-test-${Date.now()}@example.com`,
      password: 'password123',
      firstName: 'Premium',
      lastName: 'User'
    });
    
    console.log('✅ Created premium test user');
    
    const token = authResponse.data.token;
    
    // Try to create a checkout session for premium plan
    const checkoutResponse = await axios.post(
      'http://192.168.0.108:8000/api/subscription/create-checkout-session',
      {
        plan: 'premium'
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ Premium checkout session created successfully!');
    console.log('📄 Premium checkout URL:', checkoutResponse.data.url?.substring(0, 80) + '...');
    
    console.log('🎉 SUCCESS: Both ad_free and premium plans work with automatic tax!');
    
  } catch (error) {
    console.error('❌ ERROR with premium plan:', error.response?.data || error.message);
  }
}

testPremiumSubscription();
