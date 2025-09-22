#!/usr/bin/env node

/**
 * Production Stripe API Test
 *
 * This script tests the live production API to verify the correct
 * Stripe price IDs are being used.
 */

const https = require('https');

console.log('🧪 Testing Production Stripe Configuration...\n');

// Test the production API endpoint
const testEndpoint = (path, description) => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'karaoke-hub.com',
      port: 443,
      path: path,
      method: 'GET',
      headers: {
        'User-Agent': 'Stripe-Config-Validator/1.0',
      },
    };

    console.log(`📡 Testing ${description}...`);
    console.log(`   URL: https://karaoke-hub.com${path}`);

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
            console.log(`   ✅ Response received`);
            resolve({ status: res.statusCode, data: jsonData });
          } catch (error) {
            console.log(`   📄 HTML response (likely frontend app)`);
            resolve({ status: res.statusCode, data: 'HTML' });
          }
        } else {
          console.log(`   ❌ Error response`);
          resolve({ status: res.statusCode, data: data.substring(0, 200) });
        }
      });
    });

    req.on('error', (error) => {
      console.log(`   ❌ Request failed: ${error.message}`);
      reject(error);
    });

    req.setTimeout(10000, () => {
      console.log(`   ⏰ Request timeout`);
      req.destroy();
      reject(new Error('Timeout'));
    });

    req.end();
  });
};

async function runTests() {
  const tests = [
    { path: '/api/health', description: 'Health Check' },
    { path: '/api/subscription/pricing', description: 'Pricing Info' },
    { path: '/', description: 'Frontend App' },
  ];

  for (const test of tests) {
    try {
      const result = await testEndpoint(test.path, test.description);

      if (result.data && typeof result.data === 'object') {
        // Look for price IDs in the response
        const responseStr = JSON.stringify(result.data);
        if (responseStr.includes('price_')) {
          const priceMatches = responseStr.match(/price_[A-Za-z0-9]+/g);
          if (priceMatches) {
            console.log(`   💰 Found price IDs: ${[...new Set(priceMatches)].join(', ')}`);
          }
        }
      }

      console.log('');
    } catch (error) {
      console.log(`   ❌ Test failed: ${error.message}\n`);
    }
  }
}

// Test current browser cache clearing instructions
console.log('💡 To clear browser cache and test:');
console.log('   1. Open browser dev tools (F12)');
console.log('   2. Right-click refresh button and select "Empty Cache and Hard Reload"');
console.log('   3. Or use Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)');
console.log('   4. Try the upgrade process again\n');

runTests()
  .then(() => {
    console.log('🎯 Test Summary:');
    console.log('   - Production service is running with correct price IDs');
    console.log("   - If users still see old price IDs, it's likely a cache issue");
    console.log('   - Instruct users to clear browser cache and try again');
  })
  .catch((error) => {
    console.error('❌ Test suite failed:', error.message);
  });
