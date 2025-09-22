#!/usr/bin/env node

/**
 * Update Facebook Cookies for Cloud Run
 * 
 * Strategy: Complete human verification locally, then sync to production
 * 
 * This script reads local cookies and updates Google Secret Manager.
 * Use this after running Facebook parser locally to complete human verification.
 * 
 * Usage: node update-facebook-cookies.js
 */

const fs = require('fs');
const { execSync } = require('child_process');

console.log('🍪 Facebook Cookies Production Sync Tool');
console.log('========================================');
console.log('');
console.log('💡 Strategy: Complete human verification locally, then sync to production');
console.log('');

// Check if facebook-cookies.json exists
if (!fs.existsSync('data/facebook-cookies.json')) {
  console.error('❌ Error: data/facebook-cookies.json not found');
  console.log('');
  console.log('📋 To generate fresh cookies with human verification:');
  console.log('1. Run Facebook parser locally (npm run start:dev)');
  console.log('2. Use admin parser to parse any Facebook group URL');
  console.log('3. Browser window will appear - complete any CAPTCHA/verification');
  console.log('4. Let the parser complete successfully');
  console.log('5. Run this script again to sync cookies to production');
  console.log('');
  process.exit(1);
}

try {
  // Read and parse cookies
  console.log('📦 Reading local Facebook cookies...');
  const cookiesData = fs.readFileSync('data/facebook-cookies.json', 'utf8');
  const cookies = JSON.parse(cookiesData);

  // Validate cookies
  console.log(`📊 Found ${cookies.length} cookies`);

  // Check for expired cookies
  const now = Date.now() / 1000;
  let expiredCount = 0;
  let validCount = 0;

  for (const cookie of cookies) {
    if (cookie.expires && cookie.expires < now) {
      expiredCount++;
      console.warn(`⚠️ Cookie ${cookie.name} is expired`);
    } else {
      validCount++;
    }
  }

  console.log(`✅ ${validCount} valid cookies, ${expiredCount} expired cookies`);

  if (validCount === 0) {
    console.error('❌ No valid cookies found - please refresh your Facebook session');
    process.exit(1);
  }

  // Convert to single-line JSON
  const cookiesJson = JSON.stringify(cookies);

  // Create temporary file for gcloud
  const tempFile = 'temp-cookies.json';
  fs.writeFileSync(tempFile, cookiesJson);

  try {
    // Update Google Secret Manager
    console.log('🔐 Updating Facebook cookies in Google Secret Manager...');

    try {
      // Try to create the secret first
      execSync(
        `gcloud secrets create fb-session-cookies --data-file=${tempFile} --replication-policy=automatic`,
        {
          stdio: 'pipe',
        },
      );
      console.log('✅ Created new secret: fb-session-cookies');
    } catch (createError) {
      // Secret already exists, add new version
      execSync(`gcloud secrets versions add fb-session-cookies --data-file=${tempFile}`, {
        stdio: 'pipe',
      });
      console.log('✅ Updated existing secret: fb-session-cookies');
    }

    console.log('🚀 Facebook cookies successfully updated in production!');
    console.log('');
    console.log('📋 Next steps:');
    console.log('1. Redeploy your Cloud Run service to pick up the new cookies');
    console.log('2. Test the Facebook parser to ensure authentication works');
  } catch (gcloudError) {
    console.error('❌ Failed to update Google Secret Manager:');
    console.error(gcloudError.message);
    process.exit(1);
  } finally {
    // Clean up temp file
    if (fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
    }
  }
} catch (error) {
  console.error('❌ Error processing cookies:', error.message);
  process.exit(1);
}
