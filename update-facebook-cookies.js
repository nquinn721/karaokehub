#!/usr/bin/env node

/**
 * Update Facebook Cookies for Cloud Run
 * Reads local cookies and updates Google Secret Manager
 * Usage: node update-facebook-cookies.js
 */

const fs = require('fs');
const { execSync } = require('child_process');

console.log('🍪 Updating Facebook session cookies for Cloud Run deployment...');

// Check if facebook-cookies.json exists
if (!fs.existsSync('data/facebook-cookies.json')) {
  console.error('❌ Error: data/facebook-cookies.json not found');
  console.error('Please ensure you have Facebook session cookies saved locally first');
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
