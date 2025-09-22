#!/usr/bin/env node

/**
 * Comprehensive Stripe Price Validation Tool
 *
 * This script validates that the price IDs exist in the actual Stripe account
 * and checks if they match the configured environment variables.
 */

const https = require('https');

// Current configured price IDs from Cloud Run
const CONFIGURED_PRICES = {
  AD_FREE: 'price_1S08ls2lgQyeTycPCNCNAdxD',
  PREMIUM: 'price_1S08lu2lgQyeTycPfKtS3gAp',
};

// Error price ID from user's screenshot
const ERROR_PRICE_ID = 'price_1S08lu2lgQyeTycPCNCNAdxD';

console.log('🔍 Comprehensive Stripe Price Validation\n');

console.log('📋 Configuration Summary:');
console.log(`  Configured Ad-Free Price:  ${CONFIGURED_PRICES.AD_FREE}`);
console.log(`  Configured Premium Price:   ${CONFIGURED_PRICES.PREMIUM}`);
console.log(`  Error Price ID from screenshot: ${ERROR_PRICE_ID}`);
console.log('');

// Check if error price matches any configured price
if (ERROR_PRICE_ID === CONFIGURED_PRICES.AD_FREE) {
  console.log('✅ Error price matches configured AD_FREE price');
} else if (ERROR_PRICE_ID === CONFIGURED_PRICES.PREMIUM) {
  console.log('✅ Error price matches configured PREMIUM price');
} else {
  console.log('❌ Error price does NOT match any configured price');
}

console.log('\n🧪 Testing Production API Endpoints...\n');

const testEndpoint = (path, description) => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'karaoke-hub.com',
      port: 443,
      path: path,
      method: 'GET',
      headers: {
        'User-Agent': 'Stripe-Price-Validator/1.0',
        Accept: 'application/json',
      },
    };

    console.log(`📡 ${description}...`);

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const jsonData = JSON.parse(data);
            console.log(`   ✅ Status: ${res.statusCode}`);
            resolve({ status: res.statusCode, data: jsonData });
          } catch (error) {
            console.log(`   ✅ Status: ${res.statusCode} (HTML response)`);
            resolve({ status: res.statusCode, data: 'HTML' });
          }
        } else {
          console.log(`   ❌ Status: ${res.statusCode}`);
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
  try {
    // Test pricing endpoint
    const pricingResult = await testEndpoint('/api/subscription/pricing', 'Testing Pricing API');

    if (pricingResult.data && typeof pricingResult.data === 'object') {
      console.log('\n💰 Pricing API Response:');
      console.log(JSON.stringify(pricingResult.data, null, 2));

      // Check if price IDs are included
      if (pricingResult.data.plans) {
        console.log('\n📊 Price ID Analysis:');
        pricingResult.data.plans.forEach((plan) => {
          if (plan.priceId) {
            console.log(`   ${plan.name}: ${plan.priceId}`);
          } else {
            console.log(`   ${plan.name}: No price ID included`);
          }
        });
      }

      // Check environment info if available
      if (pricingResult.data.environment) {
        console.log('\n🔧 Environment Configuration:');
        console.log(`   Node Environment: ${pricingResult.data.environment.nodeEnv}`);
        console.log(`   Ad-Free Price ID: ${pricingResult.data.environment.stripeAdFreePriceId}`);
        console.log(`   Premium Price ID: ${pricingResult.data.environment.stripePremiumPriceId}`);
        console.log(`   Timestamp: ${pricingResult.data.environment.timestamp}`);

        // Validate environment variables
        console.log('\n✅ Environment Validation:');
        const envAdFree = pricingResult.data.environment.stripeAdFreePriceId;
        const envPremium = pricingResult.data.environment.stripePremiumPriceId;

        if (envAdFree === CONFIGURED_PRICES.AD_FREE) {
          console.log(`   ✅ Ad-Free price ID matches: ${envAdFree}`);
        } else {
          console.log(
            `   ❌ Ad-Free price ID mismatch: expected ${CONFIGURED_PRICES.AD_FREE}, got ${envAdFree}`,
          );
        }

        if (envPremium === CONFIGURED_PRICES.PREMIUM) {
          console.log(`   ✅ Premium price ID matches: ${envPremium}`);
        } else {
          console.log(
            `   ❌ Premium price ID mismatch: expected ${CONFIGURED_PRICES.PREMIUM}, got ${envPremium}`,
          );
        }
      } else {
        console.log('\n⚠️  No environment info in pricing response - may be old deployment');
      }
    }

    console.log('\n🔍 Issue Analysis:');
    console.log(`   Error Price ID: ${ERROR_PRICE_ID}`);
    console.log(
      `   This matches: ${ERROR_PRICE_ID === CONFIGURED_PRICES.AD_FREE ? 'AD_FREE' : ERROR_PRICE_ID === CONFIGURED_PRICES.PREMIUM ? 'PREMIUM' : 'UNKNOWN'} configured price`,
    );

    console.log('\n🎯 Possible Causes:');
    console.log('   1. Price ID exists but is inactive in Stripe dashboard');
    console.log('   2. Stripe keys (secret/publishable) are from different account/mode');
    console.log('   3. Price ID was deleted or archived in Stripe');
    console.log('   4. Wrong Stripe account is being used');

    console.log('\n🔧 Next Steps:');
    console.log('   1. Check Stripe Dashboard > Products > Prices');
    console.log('   2. Verify the price ID exists and is active');
    console.log('   3. Confirm Stripe keys match the account with the price');
    console.log('   4. Check if keys are test vs live mode');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

runTests();
