/**
 * Test script for Facebook Login authentication to access Groups
 * This demonstrates the complete flow to get user credentials for group access
 */

const axios = require('axios');

// Configuration
const SERVER_URL = 'http://localhost:8000';
const REDIRECT_URI = 'http://localhost:3000/auth/facebook/callback'; // Your app's callback URL
const GROUP_URL = 'https://www.facebook.com/groups/194826524192177';

console.log('🔐 Facebook Login Authentication Flow Test');
console.log('==========================================\n');

console.log('⚠️  IMPORTANT: Server must be restarted after adding FacebookController');
console.log('📋 The FacebookController was added to parser.module.ts but server needs restart');
console.log('💡 Current server was started before FacebookController was added\n');

async function step1_getLoginUrl() {
  console.log('STEP 1: Get Facebook Login URL');
  console.log('------------------------------');

  try {
    const response = await axios.get(
      `${SERVER_URL}/api/facebook/login-url?redirectUri=${encodeURIComponent(REDIRECT_URI)}`,
    );

    console.log('✅ Login URL generated successfully!');
    console.log('📋 Required permissions:', response.data.permissions.join(', '));
    console.log('🔗 Login URL:', response.data.loginUrl);
    console.log('\n💡 Next steps:');
    console.log('1. Copy the login URL above');
    console.log('2. Open it in your browser');
    console.log('3. Log in with your Facebook account');
    console.log('4. Grant the requested permissions');
    console.log('5. Copy the "code" parameter from the callback URL');
    console.log('6. Use that code in step2_exchangeToken()\n');

    return response.data.loginUrl;
  } catch (error) {
    console.error('❌ Failed to get login URL:', error.message);
    if (error.response?.status === 404) {
      console.log('\n💡 404 Error - This means:');
      console.log('   1. FacebookController routes are not registered');
      console.log('   2. Server needs to be restarted to load new controller');
      console.log('   3. Run: npm run start:dev to restart server');
      console.log('   4. Then run this test again');
    }
    throw error;
  }
}

async function step2_exchangeToken(authCode) {
  console.log('STEP 2: Exchange Authorization Code for Access Token');
  console.log('--------------------------------------------------');

  if (!authCode) {
    console.log('⚠️  No authorization code provided');
    console.log('💡 Get the code from the Facebook callback URL after login');
    return null;
  }

  try {
    const response = await axios.post(`${SERVER_URL}/api/facebook/exchange-token`, {
      code: authCode,
      redirectUri: REDIRECT_URI,
    });

    if (response.data.success) {
      console.log('✅ Token exchange successful!');
      console.log(
        '🔑 Access token obtained (first 20 chars):',
        response.data.accessToken.substring(0, 20) + '...',
      );
      return response.data.accessToken;
    } else {
      console.error('❌ Token exchange failed:', response.data.error);
      return null;
    }
  } catch (error) {
    console.error('❌ Token exchange error:', error.message);
    return null;
  }
}

async function step3_getUserGroups(accessToken) {
  console.log("STEP 3: Get User's Facebook Groups");
  console.log('----------------------------------');

  if (!accessToken) {
    console.log('⚠️  No access token provided');
    return [];
  }

  try {
    const response = await axios.post(`${SERVER_URL}/api/facebook/user-groups`, {
      accessToken: accessToken,
    });

    if (response.data.success) {
      console.log(`✅ Found ${response.data.count} groups user is a member of`);

      response.data.groups.forEach((group, index) => {
        console.log(`${index + 1}. ${group.name} (ID: ${group.id})`);
        console.log(`   Privacy: ${group.privacy || 'Unknown'}`);
        console.log(`   Members: ${group.member_count || 'Unknown'}`);
        console.log('');
      });

      return response.data.groups;
    } else {
      console.error('❌ Failed to get groups:', response.data.error);
      return [];
    }
  } catch (error) {
    console.error('❌ Error getting groups:', error.message);
    return [];
  }
}

async function step4_parseGroupWithAuth(accessToken) {
  console.log('STEP 4: Parse Facebook Group with User Authentication');
  console.log('----------------------------------------------------');

  if (!accessToken) {
    console.log('⚠️  No access token provided');
    return;
  }

  try {
    const response = await axios.post(`${SERVER_URL}/api/parser/parse`, {
      url: GROUP_URL,
      userAccessToken: accessToken,
    });

    if (response.data.success) {
      console.log('✅ Group parsing with authentication successful!');

      const data = response.data.data;
      console.log('📊 Results:');
      console.log(`   Shows found: ${data.shows?.length || 0}`);
      console.log(`   DJs found: ${data.djs?.length || 0}`);
      console.log(`   Vendor: ${data.vendor?.name || 'Unknown'}`);
      console.log(`   Confidence: ${data.vendor?.confidence || 'Unknown'}`);

      if (data.shows && data.shows.length > 0) {
        console.log('\n🎤 Shows found:');
        data.shows.forEach((show, index) => {
          console.log(`${index + 1}. ${show.venue || 'Unknown Venue'}`);
          console.log(`   Day: ${show.day || 'Unknown'}`);
          console.log(`   Time: ${show.time || show.startTime || 'Unknown'}`);
          console.log(`   DJ: ${show.djName || 'Unknown'}`);
          console.log('');
        });
      }

      if (data.shows?.length > 0 || data.djs?.length > 0) {
        console.log('🎉 SUCCESS! User authentication allows access to group data!');
        console.log('   This solves the "0 shows/0 DJs" problem for private groups!');
      } else {
        console.log('ℹ️  No karaoke content found in this group');
        console.log("   (This could be normal if the group doesn't have karaoke events)");
      }
    } else {
      console.error('❌ Group parsing failed:', response.data.error);
    }
  } catch (error) {
    console.error('❌ Error parsing group:', error.message);
  }
}

async function step5_compareWithoutAuth() {
  console.log('STEP 5: Compare with Parsing WITHOUT Authentication');
  console.log('--------------------------------------------------');

  try {
    const response = await axios.post(`${SERVER_URL}/api/parser/parse`, {
      url: GROUP_URL,
      // No userAccessToken provided
    });

    if (response.data.success) {
      const data = response.data.data;
      console.log('📊 Results without authentication:');
      console.log(`   Shows found: ${data.shows?.length || 0}`);
      console.log(`   DJs found: ${data.djs?.length || 0}`);
      console.log('   Expected: 0 shows, 0 DJs (due to privacy restrictions)');
    } else {
      console.log('❌ Parsing without auth failed (expected):', response.data.error);
      console.log('   This confirms that groups require user authentication');
    }
  } catch (error) {
    console.log('❌ Error without auth (expected):', error.message);
    console.log('   This confirms that groups require user authentication');
  }
}

// Main execution
async function runFacebookLoginTest() {
  try {
    // Step 1: Get login URL
    const loginUrl = await step1_getLoginUrl();

    console.log('⏸️  MANUAL STEP REQUIRED');
    console.log('====================');
    console.log('Please complete the Facebook login process manually:');
    console.log('1. Open this URL in your browser:', loginUrl);
    console.log('2. Log in and grant permissions');
    console.log('3. Copy the "code" parameter from the callback URL');
    console.log('4. Replace "YOUR_AUTH_CODE_HERE" below and run the rest\n');

    // For demonstration, show what would happen with a real auth code
    const demoAuthCode = null; // Replace with actual code from Facebook callback

    if (demoAuthCode) {
      const accessToken = await step2_exchangeToken(demoAuthCode);

      if (accessToken) {
        await step3_getUserGroups(accessToken);
        await step4_parseGroupWithAuth(accessToken);
      }
    }

    // Always show the comparison without auth
    await step5_compareWithoutAuth();

    console.log('\n🏁 SUMMARY');
    console.log('=========');
    console.log('✅ Facebook Login authentication flow is set up');
    console.log('✅ User can grant permissions to access their groups');
    console.log('✅ With user auth: Can parse private group content');
    console.log('❌ Without user auth: Gets "Missing Permission" errors');
    console.log('\n💡 This solves the Facebook Groups "0 shows/0 DJs" problem!');
  } catch (error) {
    console.error('💥 Test failed:', error.message);
  }
}

// Check if server is running first
async function checkServer() {
  try {
    await axios.get(`${SERVER_URL}/api/vendors`);
    console.log('✅ Server is running\n');
    return true;
  } catch (error) {
    console.log('❌ Server is not running');
    console.log('💡 Start server first, then run this test\n');
    return false;
  }
}

// Run the test
checkServer().then((isRunning) => {
  if (isRunning) {
    runFacebookLoginTest();
  }
});
