#!/usr/bin/env node

/**
 * Test Customer Validation Fix
 * 
 * This script tests the new customer validation functionality
 */

const https = require('https');

console.log('🧪 Testing Customer Validation Fix\n');

// Test the problematic customer ID
const testCustomer = async (customerId) => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'karaoke-hub.com',
      port: 443,
      path: `/api/subscription/validate-customer/${customerId}`,
      method: 'GET',
      headers: {
        'User-Agent': 'Customer-Validation-Test/1.0',
        'Accept': 'application/json'
      }
    };

    console.log(`🔍 Testing customer: ${customerId}`);

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        console.log(`   Status: ${res.statusCode}`);
        
        try {
          const jsonData = JSON.parse(data);
          console.log(`   Valid: ${jsonData.valid}`);
          
          if (jsonData.valid) {
            console.log(`   ✅ Customer exists in Stripe`);
            console.log(`   Email: ${jsonData.customer.email}`);
            console.log(`   Created: ${new Date(jsonData.customer.created * 1000).toISOString()}`);
          } else {
            console.log(`   ❌ Customer not found: ${jsonData.error}`);
          }
          
          resolve(jsonData);
        } catch (error) {
          console.log(`   ❌ Invalid response: ${data}`);
          resolve({ valid: false, error: 'Invalid JSON response' });
        }
      });
    });

    req.on('error', (error) => {
      console.log(`   ❌ Request failed: ${error.message}`);
      reject(error);
    });

    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Timeout'));
    });

    req.end();
  });
};

async function runTests() {
  console.log('🎯 Customer Validation Tests:');
  console.log('');
  
  // Test the problematic customer ID from the error
  const problematicCustomerId = 'cus_SWpXGEBMRswyfc';
  
  console.log('1️⃣ Testing Problematic Customer ID:');
  try {
    await testCustomer(problematicCustomerId);
  } catch (error) {
    console.log('   ❌ Test failed:', error.message);
  }
  
  console.log('');
  console.log('2️⃣ Testing Invalid Customer ID:');
  try {
    await testCustomer('cus_invalid_test_id');
  } catch (error) {
    console.log('   ❌ Test failed:', error.message);
  }
  
  console.log('');
  console.log('📋 Expected Behavior After Fix:');
  console.log('   ✅ System should detect invalid customer IDs during checkout');
  console.log('   ✅ Automatically create new customer for invalid IDs');
  console.log('   ✅ Update user record with new valid customer ID');
  console.log('   ✅ Complete checkout process without errors');
  console.log('');
  
  console.log('🔄 Next Steps:');
  console.log('   1. Wait for deployment to complete (~10-15 minutes)');
  console.log('   2. Test upgrade process with affected user');
  console.log('   3. System should automatically fix the customer ID issue');
  console.log('   4. User should be able to complete subscription upgrade');
}

runTests().catch(error => {
  console.error('❌ Test suite failed:', error.message);
});
