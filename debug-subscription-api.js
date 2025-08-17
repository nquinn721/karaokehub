/**
 * Debug script to test API subscription endpoint
 * This helps debug frontend subscription checking issues
 */

const https = require('https');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function makeRequest(token) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'karaoke-hub.com',
      port: 443,
      path: '/api/subscription/status',
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          resolve(response);
        } catch (error) {
          resolve({ error: 'Invalid JSON response', raw: data });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}

async function debugSubscriptionAPI() {
  console.log('🔍 KaraokeHub Subscription API Debug Tool');
  console.log('==========================================');
  console.log('');
  console.log('This tool helps debug subscription status issues.');
  console.log("You'll need your JWT token from the browser.");
  console.log('');
  console.log('To get your token:');
  console.log('1. Open karaoke-hub.com in your browser');
  console.log('2. Open Developer Tools (F12)');
  console.log('3. Go to Application/Storage > Local Storage');
  console.log('4. Look for "karaoke_hub_token" and copy the value');
  console.log('');

  rl.question('Enter your JWT token: ', async (token) => {
    if (!token) {
      console.log('❌ No token provided');
      rl.close();
      return;
    }

    try {
      console.log('📡 Making API request...');
      const response = await makeRequest(token.trim());

      console.log('✅ API Response:');
      console.log(JSON.stringify(response, null, 2));

      if (response.features) {
        console.log('');
        console.log('🔍 Analysis:');
        console.log('  - Ad-Free Access:', response.features.adFree ? '✅ YES' : '❌ NO');
        console.log('  - Premium Access:', response.features.premium ? '✅ YES' : '❌ NO');

        if (response.subscription) {
          console.log('  - Subscription Plan:', response.subscription.plan);
          console.log('  - Subscription Status:', response.subscription.status);
          console.log('  - Price per Month:', response.subscription.pricePerMonth);

          if (
            !response.features.adFree &&
            (response.subscription.plan === 'ad_free' || response.subscription.plan === 'premium')
          ) {
            console.log('');
            console.log('⚠️  ISSUE DETECTED:');
            console.log('   You have an ad-free plan but ads are still showing!');
            console.log('   This indicates a server-side logic issue.');
            console.log('   Check your subscription status in Stripe dashboard.');
          }
        } else {
          console.log('  - No active subscription found');
        }
      }
    } catch (error) {
      console.log('❌ Error making request:', error.message);
    }

    rl.close();
  });
}

debugSubscriptionAPI();
