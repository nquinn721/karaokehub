/**
 * Test Stripe Subscription Integration
 * Verifies that our plan mapping and price IDs are working correctly
 */

const axios = require('axios');

const API_BASE = 'http://localhost:8000';

console.log('🧪 Testing Stripe Subscription Integration');
console.log('==========================================');
console.log('');

async function testSubscriptionEndpoint() {
  try {
    console.log('📡 Testing AD_FREE plan checkout session...');

    const response = await axios.post(`${API_BASE}/api/subscription/create-checkout-session`, {
      priceId: 'price_1RzrJi2nqFT4wITAlEHi1oOD', // AD_FREE plan
      plan: 'AD_FREE',
    });

    if (response.status === 200) {
      console.log('✅ AD_FREE checkout session created successfully!');
      console.log('📋 Response URL:', response.data.url?.substring(0, 50) + '...');
    }
  } catch (error) {
    console.log('❌ AD_FREE test failed:');
    console.log('   Status:', error.response?.status);
    console.log('   Message:', error.response?.data?.message || error.message);
  }

  try {
    console.log('');
    console.log('📡 Testing PREMIUM plan checkout session...');

    const response = await axios.post(`${API_BASE}/api/subscription/create-checkout-session`, {
      priceId: 'price_1RzrJw2nqFT4wITAe6BFyVMQ', // PREMIUM plan
      plan: 'PREMIUM',
    });

    if (response.status === 200) {
      console.log('✅ PREMIUM checkout session created successfully!');
      console.log('📋 Response URL:', response.data.url?.substring(0, 50) + '...');
    }
  } catch (error) {
    console.log('❌ PREMIUM test failed:');
    console.log('   Status:', error.response?.status);
    console.log('   Message:', error.response?.data?.message || error.message);
  }
}

async function testHealthCheck() {
  try {
    console.log('🏥 Testing server health...');
    const response = await axios.get(`${API_BASE}/api/health`);
    console.log('✅ Server is running!');
  } catch (error) {
    console.log('❌ Server is not running. Please start with: npm run dev');
    console.log('   Error:', error.message);
    return false;
  }
  return true;
}

async function main() {
  const isServerRunning = await testHealthCheck();

  if (isServerRunning) {
    console.log('');
    await testSubscriptionEndpoint();
  }

  console.log('');
  console.log('💡 Next Steps:');
  console.log('1. If tests pass, try the frontend subscription flow');
  console.log('2. Use test card: 4242 4242 4242 4242');
  console.log('3. Check Stripe Dashboard for test transactions');
  console.log('4. Monitor server logs for detailed debugging info');
}

main().catch(console.error);
