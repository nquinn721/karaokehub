/**
 * Utility script to generate Facebook cookies environment variable
 * Run this to convert your local facebook-cookies.json to environment variable format
 */

const fs = require('fs');
const path = require('path');

function generateFacebookCookiesEnvVar() {
  const cookiesPath = path.join(__dirname, 'data', 'facebook-cookies.json');

  try {
    if (!fs.existsSync(cookiesPath)) {
      console.error('❌ Facebook cookies file not found at:', cookiesPath);
      console.log('Please ensure you have saved Facebook session cookies first');
      return;
    }

    const cookiesData = fs.readFileSync(cookiesPath, 'utf8');
    const cookies = JSON.parse(cookiesData);

    // Validate cookies
    if (!Array.isArray(cookies) || cookies.length === 0) {
      console.error('❌ Invalid cookies format or empty cookies array');
      return;
    }

    // Generate compact JSON string (no spaces/newlines)
    const envVarValue = JSON.stringify(cookies);

    console.log('🍪 Facebook Cookies Environment Variable:');
    console.log('=====================================');
    console.log('');
    console.log('Set this as your FB_SESSION_COOKIES environment variable:');
    console.log('');
    console.log(envVarValue);
    console.log('');
    console.log(`✅ Generated environment variable with ${cookies.length} cookies`);
    console.log('');
    console.log('📋 Usage:');
    console.log('1. Copy the JSON string above');
    console.log('2. Set as FB_SESSION_COOKIES environment variable in your deployment');
    console.log('3. For Google Cloud Run, store in Secret Manager and reference it');

    // Optionally save to a .env file for local testing
    const envContent = `FB_SESSION_COOKIES=${envVarValue}`;
    fs.writeFileSync('.env.facebook-cookies', envContent);
    console.log('');
    console.log('💾 Also saved to .env.facebook-cookies for local testing');
    console.log('   (Add this file to .gitignore - never commit cookies!)');
  } catch (error) {
    console.error('❌ Error generating environment variable:', error.message);
  }
}

// Run the function
generateFacebookCookiesEnvVar();
