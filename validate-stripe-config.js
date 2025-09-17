#!/usr/bin/env node

/**
 * Stripe Configuration Validator
 *
 * This script validates that the correct Stripe price IDs are being used
 * in production vs development environments.
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Validating Stripe Configuration...\n');

// Expected production price IDs from cloudbuild.yaml
const EXPECTED_PROD_PRICES = {
  AD_FREE: 'price_1S08ls2lgQyeTycPCNCNAdxD',
  PREMIUM: 'price_1S08lu2lgQyeTycPfKtS3gAp',
};

// Check cloudbuild.yaml
console.log('📋 Checking cloudbuild.yaml...');
try {
  const cloudbuildPath = path.join(__dirname, 'cloudbuild.yaml');
  const cloudbuildContent = fs.readFileSync(cloudbuildPath, 'utf8');

  const adFreeMatch = cloudbuildContent.match(/STRIPE_AD_FREE_PRICE_ID=([^,\s]+)/);
  const premiumMatch = cloudbuildContent.match(/STRIPE_PREMIUM_PRICE_ID=([^,\s]+)/);

  if (adFreeMatch && premiumMatch) {
    const adFreeId = adFreeMatch[1];
    const premiumId = premiumMatch[1];

    console.log(`  ✅ Ad-Free Price ID: ${adFreeId}`);
    console.log(`  ✅ Premium Price ID: ${premiumId}`);

    if (adFreeId === EXPECTED_PROD_PRICES.AD_FREE && premiumId === EXPECTED_PROD_PRICES.PREMIUM) {
      console.log('  ✅ Production price IDs are correctly configured in cloudbuild.yaml\n');
    } else {
      console.log('  ❌ Price IDs do not match expected production values\n');
    }
  } else {
    console.log('  ❌ Could not find price IDs in cloudbuild.yaml\n');
  }
} catch (error) {
  console.log(`  ❌ Error reading cloudbuild.yaml: ${error.message}\n`);
}

// Check cloudrun-service.yaml
console.log('📋 Checking cloudrun-service.yaml...');
try {
  const cloudrunPath = path.join(__dirname, 'cloudrun-service.yaml');
  const cloudrunContent = fs.readFileSync(cloudrunPath, 'utf8');

  const adFreeMatch = cloudrunContent.match(/STRIPE_AD_FREE_PRICE_ID:\s*'([^']+)'/);
  const premiumMatch = cloudrunContent.match(/STRIPE_PREMIUM_PRICE_ID:\s*'([^']+)'/);

  if (adFreeMatch && premiumMatch) {
    const adFreeId = adFreeMatch[1];
    const premiumId = premiumMatch[1];

    console.log(`  ✅ Ad-Free Price ID: ${adFreeId}`);
    console.log(`  ✅ Premium Price ID: ${premiumId}`);

    if (adFreeId === EXPECTED_PROD_PRICES.AD_FREE && premiumId === EXPECTED_PROD_PRICES.PREMIUM) {
      console.log('  ✅ Production price IDs are correctly configured in cloudrun-service.yaml\n');
    } else {
      console.log('  ❌ Price IDs do not match expected production values\n');
    }
  } else {
    console.log('  ❌ Could not find price IDs in cloudrun-service.yaml\n');
  }
} catch (error) {
  console.log(`  ❌ Error reading cloudrun-service.yaml: ${error.message}\n`);
}

// Check for any hardcoded price IDs in the codebase
console.log('🔍 Scanning for hardcoded price IDs...');

const scanDirectory = (dir, results = []) => {
  const items = fs.readdirSync(dir);

  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (
      stat.isDirectory() &&
      !item.startsWith('.') &&
      item !== 'node_modules' &&
      item !== 'dist' &&
      item !== 'build'
    ) {
      scanDirectory(fullPath, results);
    } else if (
      stat.isFile() &&
      (item.endsWith('.ts') ||
        item.endsWith('.tsx') ||
        item.endsWith('.js') ||
        item.endsWith('.jsx'))
    ) {
      try {
        const content = fs.readFileSync(fullPath, 'utf8');

        // Look for price IDs that match the pattern price_1...
        const priceMatches = content.match(/price_1[A-Za-z0-9]+/g);
        if (priceMatches) {
          for (const match of priceMatches) {
            if (match !== EXPECTED_PROD_PRICES.AD_FREE && match !== EXPECTED_PROD_PRICES.PREMIUM) {
              results.push({
                file: fullPath.replace(__dirname, '.'),
                priceId: match,
                isUnexpected: true,
              });
            } else {
              results.push({
                file: fullPath.replace(__dirname, '.'),
                priceId: match,
                isUnexpected: false,
              });
            }
          }
        }
      } catch (error) {
        // Skip files that can't be read
      }
    }
  }

  return results;
};

const hardcodedPrices = scanDirectory(__dirname);

if (hardcodedPrices.length > 0) {
  console.log('  Found price IDs in codebase:');
  for (const result of hardcodedPrices) {
    const status = result.isUnexpected ? '❌' : '✅';
    console.log(`    ${status} ${result.file}: ${result.priceId}`);
  }
} else {
  console.log('  ✅ No hardcoded price IDs found in codebase');
}

console.log('\n🎯 Summary:');
console.log(`Expected Ad-Free Price ID: ${EXPECTED_PROD_PRICES.AD_FREE}`);
console.log(`Expected Premium Price ID: ${EXPECTED_PROD_PRICES.PREMIUM}`);
console.log(
  '\n💡 If you see unexpected price IDs, the deployed environment may need to be updated.',
);
console.log(
  '   Run: bash deploy.sh to update the Cloud Run service with the latest environment variables.',
);
