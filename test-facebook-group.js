const axios = require('axios');

// Your Facebook app credentials
const FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID || '646464114624794';
const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET || '3ce6645105081d6f3a5442a30bd6b1ae';
const GRAPH_API_URL = 'https://graph.facebook.com/v18.0';

// Extract group ID from URL
function extractGroupId(url) {
  const patterns = [
    /facebook\.com\/groups\/(\d+)/,
    /facebook\.com\/groups\/([^\/\?&]+)/,
    /fb\.com\/groups\/(\d+)/,
    /m\.facebook\.com\/groups\/(\d+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }
  return null;
}

async function getAppAccessToken() {
  try {
    const response = await axios.get(
      `${GRAPH_API_URL}/oauth/access_token?client_id=${FACEBOOK_APP_ID}&client_secret=${FACEBOOK_APP_SECRET}&grant_type=client_credentials`
    );
    return response.data.access_token;
  } catch (error) {
    console.error('Failed to get app access token:', error.response?.data || error.message);
    throw error;
  }
}

async function testGroupAccess() {
  const groupUrl = 'https://www.facebook.com/groups/194826524192177';
  const groupId = extractGroupId(groupUrl);
  
  console.log('Testing Facebook Group Access...');
  console.log('Group URL:', groupUrl);
  console.log('Extracted Group ID:', groupId);
  
  try {
    const accessToken = await getAppAccessToken();
    console.log('✓ Successfully got app access token');
    
    // Test 1: Basic group info
    console.log('\n--- Test 1: Basic Group Info ---');
    try {
      const groupResponse = await axios.get(
        `${GRAPH_API_URL}/${groupId}?access_token=${accessToken}&fields=id,name,description,privacy,member_count`
      );
      console.log('✓ Group basic info:', groupResponse.data);
    } catch (error) {
      console.log('✗ Group basic info failed:', error.response?.data || error.message);
    }
    
    // Test 2: Group posts/feed
    console.log('\n--- Test 2: Group Posts ---');
    try {
      const postsResponse = await axios.get(
        `${GRAPH_API_URL}/${groupId}/posts?access_token=${accessToken}&fields=id,message,created_time,from`
      );
      console.log('✓ Group posts:', postsResponse.data);
    } catch (error) {
      console.log('✗ Group posts failed:', error.response?.data || error.message);
    }
    
    // Test 3: Group events
    console.log('\n--- Test 3: Group Events ---');
    try {
      const eventsResponse = await axios.get(
        `${GRAPH_API_URL}/${groupId}/events?access_token=${accessToken}&fields=id,name,start_time,end_time,place`
      );
      console.log('✓ Group events:', eventsResponse.data);
    } catch (error) {
      console.log('✗ Group events failed:', error.response?.data || error.message);
    }
    
    // Test 4: Public posts (alternative approach)
    console.log('\n--- Test 4: Alternative Public Access ---');
    try {
      const publicResponse = await axios.get(
        `${GRAPH_API_URL}/${groupId}?access_token=${accessToken}&fields=id,name,privacy,member_request_count`
      );
      console.log('✓ Alternative access:', publicResponse.data);
    } catch (error) {
      console.log('✗ Alternative access failed:', error.response?.data || error.message);
    }
    
  } catch (error) {
    console.error('Failed to test group access:', error.message);
  }
}

testGroupAccess();
