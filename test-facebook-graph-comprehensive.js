/**
 * Comprehensive test of Facebook Graph API capabilities
 * Testing what data we can extract with the new parser app permissions
 */
require('dotenv').config();
const axios = require('axios');

const GRAPH_API_URL = 'https://graph.facebook.com/v18.0';
const GROUP_ID = '194826524192177'; // Central Ohio Karaoke Places to Sing!
const PARSER_APP_ID = process.env.FACEBOOK_PARSER_APP_ID || '1160707802576346';
const PARSER_APP_SECRET =
  process.env.FACEBOOK_PARSER_APP_SECRET || '47f729de53981816dcce9b8776449b4b';

async function getAppAccessToken() {
  try {
    const response = await axios.get(
      `${GRAPH_API_URL}/oauth/access_token?client_id=${PARSER_APP_ID}&client_secret=${PARSER_APP_SECRET}&grant_type=client_credentials`,
    );
    return response.data.access_token;
  } catch (error) {
    console.error('❌ Failed to get access token:', error.response?.data || error.message);
    return null;
  }
}

async function testPublicGroupData(accessToken) {
  console.log('\n📊 Testing Public Group Data Access...\n');

  const endpoints = [
    {
      name: 'Basic Group Info',
      url: `${GROUP_ID}`,
      fields: 'id,name,description,privacy,member_count,created_time,updated_time',
    },
    {
      name: 'Group Cover Photo',
      url: `${GROUP_ID}`,
      fields: 'cover',
    },
    {
      name: 'Group Picture',
      url: `${GROUP_ID}/picture`,
      fields: 'url',
    },
    {
      name: 'Group Settings',
      url: `${GROUP_ID}`,
      fields: 'privacy,join_setting,post_permissions',
    },
  ];

  for (const endpoint of endpoints) {
    try {
      const params = { access_token: accessToken };
      if (endpoint.fields) {
        params.fields = endpoint.fields;
      }

      const response = await axios.get(`${GRAPH_API_URL}/${endpoint.url}`, { params });
      console.log(`✅ ${endpoint.name}:`, JSON.stringify(response.data, null, 2));
    } catch (error) {
      console.log(`❌ ${endpoint.name}:`, error.response?.data?.error || error.message);
    }
  }
}

async function testGroupContent(accessToken) {
  console.log('\n📝 Testing Group Content Access...\n');

  const contentEndpoints = [
    {
      name: 'Group Feed/Posts',
      url: `${GROUP_ID}/feed`,
      fields: 'id,message,story,created_time,updated_time,type,status_type,from',
    },
    {
      name: 'Group Events',
      url: `${GROUP_ID}/events`,
      fields: 'id,name,description,start_time,end_time,place,attending_count,interested_count',
    },
    {
      name: 'Group Photos',
      url: `${GROUP_ID}/photos`,
      fields: 'id,name,created_time,picture,source',
    },
    {
      name: 'Group Albums',
      url: `${GROUP_ID}/albums`,
      fields: 'id,name,description,created_time,photo_count',
    },
    {
      name: 'Group Members (public)',
      url: `${GROUP_ID}/members`,
      fields: 'id,name,administrator',
    },
  ];

  for (const endpoint of contentEndpoints) {
    try {
      const params = {
        access_token: accessToken,
        limit: 5, // Limit results for testing
      };
      if (endpoint.fields) {
        params.fields = endpoint.fields;
      }

      const response = await axios.get(`${GRAPH_API_URL}/${endpoint.url}`, { params });
      console.log(`✅ ${endpoint.name}:`, JSON.stringify(response.data, null, 2));
    } catch (error) {
      console.log(`❌ ${endpoint.name}:`, error.response?.data?.error || error.message);
    }
  }
}

async function testPageContent(accessToken) {
  console.log('\n🏢 Testing Public Page Content (if any)...\n');

  // Try to see if this group has any associated pages
  try {
    const response = await axios.get(`${GRAPH_API_URL}/${GROUP_ID}/admins`, {
      params: {
        access_token: accessToken,
        fields: 'id,name,category',
      },
    });
    console.log('✅ Group Admins/Pages:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.log('❌ Group Admins/Pages:', error.response?.data?.error || error.message);
  }
}

async function testPublicPostsSearch(accessToken) {
  console.log('\n🔍 Testing Public Posts Search...\n');

  const searchQueries = ['karaoke', 'Central Ohio', 'singing', 'music'];

  for (const query of searchQueries) {
    try {
      const response = await axios.get(`${GRAPH_API_URL}/search`, {
        params: {
          access_token: accessToken,
          q: query,
          type: 'post',
          limit: 3,
        },
      });
      console.log(`✅ Search "${query}":`, JSON.stringify(response.data, null, 2));
    } catch (error) {
      console.log(`❌ Search "${query}":`, error.response?.data?.error || error.message);
    }
  }
}

async function testAppCapabilities(accessToken) {
  console.log('\n🔧 Testing App Capabilities...\n');

  try {
    // Test what permissions our app has
    const appResponse = await axios.get(`${GRAPH_API_URL}/${PARSER_APP_ID}`, {
      params: {
        access_token: accessToken,
        fields: 'id,name,namespace,category,company,description',
      },
    });
    console.log('✅ Parser App Info:', JSON.stringify(appResponse.data, null, 2));
  } catch (error) {
    console.log('❌ Parser App Info:', error.response?.data?.error || error.message);
  }

  try {
    // Test app permissions
    const permResponse = await axios.get(`${GRAPH_API_URL}/${PARSER_APP_ID}/permissions`, {
      params: { access_token: accessToken },
    });
    console.log('✅ App Permissions:', JSON.stringify(permResponse.data, null, 2));
  } catch (error) {
    console.log('❌ App Permissions:', error.response?.data?.error || error.message);
  }
}

async function main() {
  console.log('🔍 Testing Facebook Graph API Comprehensive Data Access...\n');
  console.log(`📱 Using Parser App: ${PARSER_APP_ID}`);
  console.log(`🎯 Target Group: ${GROUP_ID} (Central Ohio Karaoke Places to Sing!)\n`);

  const accessToken = await getAppAccessToken();
  if (!accessToken) {
    console.log('❌ Cannot proceed without access token');
    return;
  }

  console.log(`✅ Access Token: ${accessToken.substring(0, 20)}...`);

  // Test different aspects of the API
  await testAppCapabilities(accessToken);
  await testPublicGroupData(accessToken);
  await testGroupContent(accessToken);
  await testPageContent(accessToken);
  await testPublicPostsSearch(accessToken);

  console.log('\n=== Summary ===');
  console.log('📊 This test shows what data is available via Graph API');
  console.log('🔒 Private group content still requires user-level permissions');
  console.log('🌐 For private groups, web scraping might be the only option');
  console.log('📱 If we can get user authentication, Graph API is much better than scraping');
}

main().catch(console.error);
