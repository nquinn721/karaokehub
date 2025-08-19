const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env file
function loadEnvFile() {
  try {
    const envPath = path.join(__dirname, '.env');
    const envFile = fs.readFileSync(envPath, 'utf8');

    envFile.split('\n').forEach((line) => {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const [key, ...valueParts] = trimmedLine.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=');
          process.env[key] = value;
        }
      }
    });
  } catch (error) {
    console.log('⚠️  Could not load .env file:', error.message);
  }
}

/**
 * Diagnose Facebook Graph API issues and provide recommendations
 */
async function diagnoseFacebookProfile() {
  loadEnvFile();

  const profileUrl = 'https://www.facebook.com/max.denney.194690';
  console.log('🔍 Diagnosing Facebook Graph API Access');
  console.log('='.repeat(60));
  console.log('Profile URL:', profileUrl);

  const parserAppId = process.env.FACEBOOK_PARSER_APP_ID || '1160707802576346';
  const parserAppSecret =
    process.env.FACEBOOK_PARSER_APP_SECRET || '47f729de53981816dcce9b8776449b4b';

  try {
    // Step 1: Get access token
    console.log('\n1. ✅ Getting access token...');
    const tokenResponse = await axios.get(
      `https://graph.facebook.com/oauth/access_token?client_id=${parserAppId}&client_secret=${parserAppSecret}&grant_type=client_credentials`,
    );

    const accessToken = tokenResponse.data.access_token;
    console.log('✅ Access token obtained successfully');

    // Step 2: Check app information
    console.log('\n2. 📱 Checking app information...');
    try {
      const appInfoResponse = await axios.get(
        `https://graph.facebook.com/${parserAppId}?access_token=${accessToken}`,
      );
      console.log('✅ App info retrieved:');
      console.log('- App Name:', appInfoResponse.data.name);
      console.log('- App ID:', appInfoResponse.data.id);
      console.log('- Category:', appInfoResponse.data.category);
    } catch (appError) {
      console.log('❌ Could not retrieve app info');
    }

    // Step 3: Profile ID analysis
    console.log('\n3. 🔍 Analyzing profile ID...');
    const profileId = extractProfileId(profileUrl);
    console.log('Extracted Profile ID:', profileId);

    // Check if it looks like a username vs numeric ID
    if (profileId && /^\d+$/.test(profileId)) {
      console.log('✅ Appears to be a numeric user ID');
    } else {
      console.log('⚠️  Appears to be a username/vanity URL');
      console.log('   This suggests it might be a personal profile');
    }

    // Step 4: Test different access methods
    console.log('\n4. 🧪 Testing different access methods...');

    // Try to access as page
    console.log('\nTrying as business page...');
    try {
      const pageResponse = await axios.get(
        `https://graph.facebook.com/${profileId}?access_token=${accessToken}`,
      );
      console.log('✅ Page access successful!');
      console.log(JSON.stringify(pageResponse.data, null, 2));
    } catch (pageError) {
      console.log('❌ Page access failed');
      console.log('Error code:', pageError.response?.data?.error?.code);
      console.log('Error subcode:', pageError.response?.data?.error?.error_subcode);
      console.log('Message:', pageError.response?.data?.error?.message);
    }

    // Try to search for the page
    console.log('\n5. 🔎 Searching for page...');
    try {
      const searchResponse = await axios.get(
        `https://graph.facebook.com/search?q=${encodeURIComponent('max denney')}&type=page&access_token=${accessToken}`,
      );
      console.log('✅ Search completed');
      const results = searchResponse.data.data || [];
      console.log(`Found ${results.length} results:`);
      results.slice(0, 5).forEach((result, index) => {
        console.log(`${index + 1}. ${result.name} (ID: ${result.id})`);
      });
    } catch (searchError) {
      console.log('❌ Search failed');
      console.log('Error:', searchError.response?.data?.error?.message);
    }

    // Step 6: Provide recommendations
    console.log('\n6. 💡 Recommendations');
    console.log('='.repeat(40));

    console.log('\n🔴 ISSUES IDENTIFIED:');
    console.log('1. The URL appears to point to a PERSONAL PROFILE, not a business page');
    console.log('2. Personal profiles have strict privacy restrictions');
    console.log(
      '3. Graph API apps cannot access personal profile data without explicit user consent',
    );

    console.log('\n🟢 SOLUTIONS:');
    console.log('1. Convert profile to a Facebook Business Page');
    console.log('2. Use a different Facebook Business Page URL');
    console.log('3. Ask the profile owner to create a public business page');
    console.log('4. Use Facebook Login flow to get user consent (requires user interaction)');

    console.log('\n📋 WHAT WORKS WITH GRAPH API:');
    console.log('✅ Business Pages (e.g., facebook.com/YourBusinessName)');
    console.log('✅ Public pages with proper permissions');
    console.log('✅ Pages that have granted access to your app');
    console.log('✅ Your own app data and public information');

    console.log("\n❌ WHAT DOESN'T WORK:");
    console.log('❌ Personal profiles (privacy protected)');
    console.log('❌ Private pages');
    console.log('❌ Pages without proper app permissions');

    console.log('\n🔧 NEXT STEPS:');
    console.log('1. Find or create a Facebook Business Page for the DJ');
    console.log('2. Test with a known public business page first');
    console.log('3. Ensure the page has public posts and events');
    console.log('4. Consider implementing Facebook Login for user-consented access');
  } catch (error) {
    console.error('\n❌ Diagnosis failed:');
    console.error('Error:', error.message);
  }
}

/**
 * Extract Facebook profile/page ID from URL
 */
function extractProfileId(url) {
  const patterns = [
    // Profile with custom username: facebook.com/username
    /facebook\.com\/([^\/\?&]+)(?:\?|$)/,
    // Profile with numeric ID: facebook.com/profile.php?id=123456
    /facebook\.com\/profile\.php\?id=(\d+)/,
    // Mobile URLs
    /m\.facebook\.com\/([^\/\?&]+)(?:\?|$)/,
    /m\.facebook\.com\/profile\.php\?id=(\d+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return null;
}

// Run the diagnosis
diagnoseFacebookProfile();
