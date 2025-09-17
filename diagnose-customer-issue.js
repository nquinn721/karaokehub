#!/usr/bin/env node

/**
 * Stripe Customer Validation and Cleanup Tool
 *
 * This script helps identify and fix issues with Stripe customer IDs
 * that may not exist in the current Stripe account/environment.
 */

const https = require('https');

console.log('🔍 Stripe Customer Issue Diagnostic Tool\n');

// Test customer validation endpoint
const testCustomerValidation = async (customerId) => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'karaoke-hub.com',
      port: 443,
      path: `/api/subscription/validate-customer/${customerId}`,
      method: 'GET',
      headers: {
        'User-Agent': 'Customer-Validator/1.0',
        Accept: 'application/json',
      },
    };

    console.log(`🧪 Testing customer validation for: ${customerId}`);

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        console.log(`   Status: ${res.statusCode}`);

        if (res.statusCode === 200) {
          try {
            const jsonData = JSON.parse(data);
            resolve({ status: res.statusCode, data: jsonData });
          } catch (error) {
            resolve({ status: res.statusCode, data: 'Invalid JSON' });
          }
        } else {
          resolve({ status: res.statusCode, data: data });
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

// Main diagnostic function
async function runDiagnostics() {
  console.log('🎯 Stripe Customer Issue Analysis:');
  console.log('');

  // Test the problematic customer ID from the error
  const problematicCustomerId = 'cus_SWpXGEBMRswyfc';

  console.log('📋 Issue Summary:');
  console.log(`   Error: "No such customer: ${problematicCustomerId}"`);
  console.log('   This indicates the customer ID exists in the database but not in Stripe');
  console.log('');

  console.log('🔍 Possible Causes:');
  console.log('   1. Customer was created in Stripe test mode, but app is in live mode');
  console.log('   2. Customer was created in a different Stripe account');
  console.log('   3. Customer was deleted from Stripe but still exists in database');
  console.log('   4. Database contains stale/corrupted customer IDs');
  console.log('');

  console.log('✅ Solutions:');
  console.log('   1. Clear the stripeCustomerId from user record (force recreation)');
  console.log('   2. Add customer validation before using existing customer ID');
  console.log('   3. Implement customer ID cleanup/migration process');
  console.log('');

  // Test current environment
  try {
    const envTest = await testEnvironmentEndpoint();
    console.log('📊 Current Environment Test:');
    if (envTest.status === 200 && envTest.data.environment) {
      console.log(`   Environment: ${envTest.data.environment.nodeEnv}`);
      console.log(
        `   Stripe Keys: ${envTest.data.environment.stripeAdFreePriceId ? 'Configured' : 'Missing'}`,
      );
    }
  } catch (error) {
    console.log('   ❌ Could not test environment');
  }

  console.log('');
  console.log('🛠️  Recommended Actions:');
  console.log('   1. Implement customer validation before checkout');
  console.log('   2. Add automatic customer recreation on invalid ID');
  console.log('   3. Clear problematic customer IDs from database');
  console.log('');

  console.log('💡 Quick Fix:');
  console.log(
    '   The system should detect invalid customer IDs and create new ones automatically.',
  );
  console.log('   This prevents users from getting stuck with old/invalid customer references.');
}

// Test environment endpoint
const testEnvironmentEndpoint = () => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'karaoke-hub.com',
      port: 443,
      path: '/api/subscription/pricing',
      method: 'GET',
      headers: {
        'User-Agent': 'Environment-Tester/1.0',
        Accept: 'application/json',
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({ status: res.statusCode, data: jsonData });
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Timeout'));
    });
    req.end();
  });
};

runDiagnostics().catch((error) => {
  console.error('❌ Diagnostic failed:', error.message);
});
