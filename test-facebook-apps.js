/**
 * Test script to verify both Facebook apps work correctly
 */
require('dotenv').config();
const axios = require('axios');

const GRAPH_API_URL = 'https://graph.facebook.com/v18.0';

// Main Facebook App (for user authentication)
const AUTH_APP_ID = process.env.FACEBOOK_APP_ID || '646464114624794';
const AUTH_APP_SECRET = process.env.FACEBOOK_APP_SECRET || '3ce6645105081d6f3a5442a30bd6b1ae';

// Facebook Parser App (for content parsing)
const PARSER_APP_ID = process.env.FACEBOOK_PARSER_APP_ID || '1160707802576346';
const PARSER_APP_SECRET = process.env.FACEBOOK_PARSER_APP_SECRET || '47f729de53981816dcce9b8776449b4b';

async function getAppAccessToken(appId, appSecret, appName) {
  try {
    console.log(`\n=== Testing ${appName} ===`);
    console.log(`App ID: ${appId}`);
    
    const response = await axios.get(
      `${GRAPH_API_URL}/oauth/access_token?client_id=${appId}&client_secret=${appSecret}&grant_type=client_credentials`
    );
    
    const accessToken = response.data.access_token;
    console.log(`✅ Access token obtained: ${accessToken.substring(0, 20)}...`);
    
    return accessToken;
  } catch (error) {
    console.error(`❌ Failed to get access token for ${appName}:`, error.response?.data || error.message);
    return null;
  }
}

async function testAppPermissions(accessToken, appName) {
  try {
    // Test basic app info
    const appResponse = await axios.get(`${GRAPH_API_URL}/me`, {
      params: { access_token: accessToken }
    });
    console.log(`✅ ${appName} app info:`, appResponse.data);
    
    // Test permissions
    const permissionsResponse = await axios.get(`${GRAPH_API_URL}/me/permissions`, {
      params: { access_token: accessToken }
    });
    console.log(`✅ ${appName} permissions:`, permissionsResponse.data);
    
  } catch (error) {
    console.error(`❌ ${appName} permissions test failed:`, error.response?.data || error.message);
  }
}

async function testGroupAccess(accessToken, appName) {
  const groupId = '194826524192177'; // The karaoke group
  
  try {
    console.log(`\n--- Testing Group Access for ${appName} ---`);
    
    // Test group basic info
    const groupResponse = await axios.get(`${GRAPH_API_URL}/${groupId}`, {
      params: { 
        access_token: accessToken,
        fields: 'id,name,description,privacy,member_count'
      }
    });
    console.log(`✅ ${appName} group info:`, groupResponse.data);
    
  } catch (error) {
    console.log(`❌ ${appName} group access failed:`, error.response?.data || error.message);
  }
  
  try {
    // Test group posts
    const postsResponse = await axios.get(`${GRAPH_API_URL}/${groupId}/feed`, {
      params: { 
        access_token: accessToken,
        fields: 'id,message,created_time'
      }
    });
    console.log(`✅ ${appName} group posts:`, postsResponse.data);
    
  } catch (error) {
    console.log(`❌ ${appName} group posts failed:`, error.response?.data || error.message);
  }
}

async function main() {
  console.log('🔍 Testing Facebook Apps Configuration...\n');
  
  // Test Auth App
  const authToken = await getAppAccessToken(AUTH_APP_ID, AUTH_APP_SECRET, 'Auth App');
  if (authToken) {
    await testAppPermissions(authToken, 'Auth App');
    await testGroupAccess(authToken, 'Auth App');
  }
  
  // Test Parser App
  const parserToken = await getAppAccessToken(PARSER_APP_ID, PARSER_APP_SECRET, 'Parser App');
  if (parserToken) {
    await testAppPermissions(parserToken, 'Parser App');
    await testGroupAccess(parserToken, 'Parser App');
  }
  
  console.log('\n=== Summary ===');
  console.log('Auth App (for user login):', authToken ? '✅ Working' : '❌ Failed');
  console.log('Parser App (for content parsing):', parserToken ? '✅ Working' : '❌ Failed');
  
  if (!authToken && !parserToken) {
    console.log('\n💡 Make sure to set your Facebook app credentials in .env file:');
    console.log('FACEBOOK_APP_ID=your-auth-app-id');
    console.log('FACEBOOK_APP_SECRET=your-auth-app-secret');
    console.log('FACEBOOK_PARSER_APP_ID=your-parser-app-id');
    console.log('FACEBOOK_PARSER_APP_SECRET=your-parser-app-secret');
  }
}

main().catch(console.error);
