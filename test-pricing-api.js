#!/usr/bin/env node

/**
 * Test Production Pricing API
 */

const https = require('https');

const options = {
  hostname: 'karaoke-hub.com',
  port: 443,
  path: '/api/subscription/pricing',
  method: 'GET',
  headers: {
    'User-Agent': 'Pricing-Test/1.0',
    'Accept': 'application/json'
  }
};

console.log('🧪 Testing Production Pricing API...\n');

const req = https.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log(`Status: ${res.statusCode}\n`);
    
    if (res.statusCode === 200) {
      try {
        const jsonData = JSON.parse(data);
        console.log('📊 Pricing Response:');
        console.log(JSON.stringify(jsonData, null, 2));
        
        // Check for price IDs
        if (jsonData.plans) {
          console.log('\n💰 Price ID Summary:');
          jsonData.plans.forEach(plan => {
            if (plan.priceId) {
              console.log(`  ${plan.name}: ${plan.priceId}`);
            } else {
              console.log(`  ${plan.name}: No price ID (${plan.id})`);
            }
          });
        }
        
        if (jsonData.environment) {
          console.log('\n🔧 Environment Info:');
          console.log(`  Node Environment: ${jsonData.environment.nodeEnv}`);
          console.log(`  Ad-Free Price ID: ${jsonData.environment.stripeAdFreePriceId}`);
          console.log(`  Premium Price ID: ${jsonData.environment.stripePremiumPriceId}`);
          console.log(`  Timestamp: ${jsonData.environment.timestamp}`);
        }
        
      } catch (error) {
        console.log('❌ Failed to parse JSON response');
        console.log('Raw response:', data);
      }
    } else {
      console.log('❌ Error response:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Request failed:', error.message);
});

req.end();
