#!/usr/bin/env node

/**
 * Test Facebook Group Access via Graph API
 * Tests the specific group: https://www.facebook.com/groups/194826524192177
 */

const axios = require('axios');

// Facebook credentials from your service
const FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID || '646464114624794';
const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET || '3ce6645105081d6f3a5442a30bd6b1ae';
const GRAPH_API_URL = 'https://graph.facebook.com/v18.0';

// Test group ID from the URL
const GROUP_ID = '194826524192177';

async function getAppAccessToken() {
  try {
    console.log('🔑 Getting app access token...');
    const response = await axios.get(
      `${GRAPH_API_URL}/oauth/access_token?client_id=${FACEBOOK_APP_ID}&client_secret=${FACEBOOK_APP_SECRET}&grant_type=client_credentials`,
    );
    console.log('✅ App access token obtained');
    return response.data.access_token;
  } catch (error) {
    console.error('❌ Failed to get app access token:', error.response?.data || error.message);
    throw error;
  }
}

async function testGroupAccess() {
  console.log('🎤 Testing Facebook Group API Access\n');
  console.log(`Group URL: https://www.facebook.com/groups/${GROUP_ID}\n`);

  try {
    const accessToken = await getAppAccessToken();

    // Test 1: Basic group info
    console.log('📋 Test 1: Basic Group Information');
    try {
      const basicFields = 'id,name,description,privacy,member_count';
      const groupResponse = await axios.get(
        `${GRAPH_API_URL}/${GROUP_ID}?fields=${basicFields}&access_token=${accessToken}`,
      );

      console.log('✅ Group basic info accessible!');
      console.log('Group data:', JSON.stringify(groupResponse.data, null, 2));
    } catch (error) {
      console.log('❌ Group basic info failed:', error.response?.data || error.message);

      if (error.response?.status === 403) {
        console.log('🔒 This likely means the group is private or requires special permissions');
      }
    }

    console.log('\n📝 Test 2: Group Posts/Feed');
    try {
      // Try to get posts from the group
      const postsResponse = await axios.get(
        `${GRAPH_API_URL}/${GROUP_ID}/feed?access_token=${accessToken}`,
      );

      console.log('✅ Group posts accessible!');
      console.log(`Found ${postsResponse.data.data?.length || 0} posts`);

      if (postsResponse.data.data?.length > 0) {
        console.log('Sample post:', postsResponse.data.data[0]);
      }
    } catch (error) {
      console.log('❌ Group posts failed:', error.response?.data || error.message);

      if (error.response?.data?.error?.code === 10) {
        console.log('🔒 Group feed requires user access token or special permissions');
      }
    }

    console.log('\n🎭 Test 3: Group Events');
    try {
      const eventsResponse = await axios.get(
        `${GRAPH_API_URL}/${GROUP_ID}/events?access_token=${accessToken}`,
      );

      console.log('✅ Group events accessible!');
      console.log(`Found ${eventsResponse.data.data?.length || 0} events`);

      if (eventsResponse.data.data?.length > 0) {
        console.log('Sample event:', eventsResponse.data.data[0]);
      }
    } catch (error) {
      console.log('❌ Group events failed:', error.response?.data || error.message);
    }

    console.log('\n🔍 Test 4: Alternative Data Access');
    try {
      // Try different approaches
      const publicFields = 'id,name,cover,privacy';
      const limitedResponse = await axios.get(
        `${GRAPH_API_URL}/${GROUP_ID}?fields=${publicFields}&access_token=${accessToken}`,
      );

      console.log('✅ Limited group info accessible:');
      console.log(JSON.stringify(limitedResponse.data, null, 2));
    } catch (error) {
      console.log('❌ Even limited access failed:', error.response?.data || error.message);
    }
  } catch (error) {
    console.error('💥 Test failed completely:', error.message);
  }
}

async function testWithoutToken() {
  console.log('\n🆓 Test 5: Public Access (No Token)');
  try {
    const response = await axios.get(`${GRAPH_API_URL}/${GROUP_ID}`);
    console.log('✅ Public access works!');
    console.log(JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.log('❌ Public access failed:', error.response?.data || error.message);
  }
}

async function analyzePermissions() {
  console.log('\n📊 Facebook Group API Analysis\n');

  console.log('🔐 Permission Requirements for Groups:');
  console.log('• Basic group info (name, id): Usually accessible with app token');
  console.log('• Group posts/feed: Requires user token + groups_access_member_info permission');
  console.log('• Group events: May require user token or special permissions');
  console.log('• Private groups: Require membership + appropriate permissions');

  console.log('\n🎯 What We Can Potentially Extract:');
  console.log('• Group name and basic metadata');
  console.log('• Public group information');
  console.log('• Cover photo and description (if public)');
  console.log('• Member count (if accessible)');

  console.log('\n⚠️  Limitations:');
  console.log('• Posts require user authentication');
  console.log('• Private groups block most API access');
  console.log('• Rate limits apply to all requests');
  console.log('• Some data requires app review from Facebook');

  console.log('\n🔄 Alternative Approaches:');
  console.log('• Web scraping (limited by anti-bot measures)');
  console.log('• User authentication flow for member access');
  console.log('• Public page parsing if group has associated page');
}

// Run all tests
async function main() {
  await testGroupAccess();
  await testWithoutToken();
  await analyzePermissions();

  console.log('\n✨ Test Complete!');
  console.log('\nTo see more detailed error messages, check the Facebook Graph API Explorer:');
  console.log(
    `https://developers.facebook.com/tools/explorer/?method=GET&path=${GROUP_ID}&version=v18.0`,
  );
}

main().catch(console.error);
