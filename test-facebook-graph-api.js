const axios = require('axios');

/**
 * Test Facebook Graph API access using configured app credentials
 */
async function testFacebookGraphAPI() {
  console.log('Testing Facebook Graph API access...\n');

  // Test app credentials from the facebook.service.ts configuration
  const authAppId = '646464114624794';
  const authAppSecret = process.env.FACEBOOK_APP_SECRET;
  const parserAppId = '1160707802576346';
  const parserAppSecret = process.env.FACEBOOK_PARSER_APP_SECRET;

  if (!authAppSecret || !parserAppSecret) {
    console.error('❌ Missing Facebook app secrets in environment variables');
    console.log('Required environment variables:');
    console.log('- FACEBOOK_APP_SECRET');
    console.log('- FACEBOOK_PARSER_APP_SECRET');
    return;
  }

  try {
    // Test getting app access token for auth app
    console.log('1. Testing auth app access token...');
    const authTokenResponse = await axios.get(
      `https://graph.facebook.com/oauth/access_token?client_id=${authAppId}&client_secret=${authAppSecret}&grant_type=client_credentials`,
    );

    const authAccessToken = authTokenResponse.data.access_token;
    console.log('✅ Auth app access token obtained successfully');

    // Test getting app access token for parser app
    console.log('\n2. Testing parser app access token...');
    const parserTokenResponse = await axios.get(
      `https://graph.facebook.com/oauth/access_token?client_id=${parserAppId}&client_secret=${parserAppSecret}&grant_type=client_credentials`,
    );

    const parserAccessToken = parserTokenResponse.data.access_token;
    console.log('✅ Parser app access token obtained successfully');

    // Test a simple Graph API call with parser app (get app info)
    console.log('\n3. Testing Graph API call with parser app...');
    const appInfoResponse = await axios.get(
      `https://graph.facebook.com/${parserAppId}?access_token=${parserAccessToken}`,
    );

    console.log('✅ Graph API call successful');
    console.log('App Info:', {
      id: appInfoResponse.data.id,
      name: appInfoResponse.data.name,
      category: appInfoResponse.data.category,
    });

    // Test permissions for the parser app
    console.log('\n4. Testing app permissions...');
    try {
      const permissionsResponse = await axios.get(
        `https://graph.facebook.com/${parserAppId}/permissions?access_token=${parserAccessToken}`,
      );
      console.log('✅ App permissions retrieved');
      console.log(
        'Permissions:',
        permissionsResponse.data.data?.map((p) => p.permission) || 'None',
      );
    } catch (permError) {
      console.log('⚠️  Could not retrieve app permissions (this is normal for app access tokens)');
    }

    console.log('\n🎉 Facebook Graph API test completed successfully!');
    console.log('\nNext steps:');
    console.log('- The extractProfileKaraokeData method now uses Graph API instead of Puppeteer');
    console.log('- Test with actual Facebook page URLs to extract profile and event data');
    console.log('- Graph API will provide legitimate access to public page information');
  } catch (error) {
    console.error('\n❌ Facebook Graph API test failed:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Error:', error.response.data.error || error.response.data);
    } else {
      console.error('Error:', error.message);
    }

    console.log('\nTroubleshooting:');
    console.log('1. Verify FACEBOOK_APP_SECRET and FACEBOOK_PARSER_APP_SECRET are set correctly');
    console.log('2. Check that Facebook apps are properly configured');
    console.log('3. Ensure apps have necessary permissions for page access');
  }
}

// Run the test
testFacebookGraphAPI();
