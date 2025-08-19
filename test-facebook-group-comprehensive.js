/**
 * Comprehensive Facebook Group Parsing Test
 * Testing: https://www.facebook.com/groups/194826524192177
 */
require('dotenv').config();
const axios = require('axios');

const GRAPH_API_URL = 'https://graph.facebook.com/v18.0';
const GROUP_ID = '194826524192177';

// Use the parser app for content parsing
const PARSER_APP_ID = process.env.FACEBOOK_PARSER_APP_ID || '1160707802576346';
const PARSER_APP_SECRET =
  process.env.FACEBOOK_PARSER_APP_SECRET || '47f729de53981816dcce9b8776449b4b';

async function getParserAccessToken() {
  try {
    console.log('🔑 Getting parser app access token...');
    const response = await axios.get(
      `${GRAPH_API_URL}/oauth/access_token?client_id=${PARSER_APP_ID}&client_secret=${PARSER_APP_SECRET}&grant_type=client_credentials`,
    );

    const accessToken = response.data.access_token;
    console.log(`✅ Parser access token: ${accessToken.substring(0, 30)}...`);
    return accessToken;
  } catch (error) {
    console.error('❌ Failed to get parser access token:', error.response?.data || error.message);
    return null;
  }
}

async function testGroupBasicInfo(accessToken) {
  console.log('\n📋 Testing Group Basic Information...');

  const testFields = [
    'id,name',
    'id,name,description',
    'id,name,privacy',
    'id,name,member_count',
    'id,name,created_time',
    'id,name,updated_time',
    'id,name,cover',
    'id,name,picture',
    'id',
  ];

  for (const fields of testFields) {
    try {
      const response = await axios.get(`${GRAPH_API_URL}/${GROUP_ID}`, {
        params: {
          access_token: accessToken,
          fields: fields,
        },
      });
      console.log(`✅ Fields "${fields}":`, JSON.stringify(response.data, null, 2));
      return response.data; // Return first successful response
    } catch (error) {
      console.log(
        `❌ Fields "${fields}" failed:`,
        error.response?.data?.error?.message || error.message,
      );
    }
  }

  return null;
}

async function testGroupPosts(accessToken) {
  console.log('\n📝 Testing Group Posts...');

  const endpoints = [
    `${GROUP_ID}/feed`,
    `${GROUP_ID}/posts`,
    `${GROUP_ID}/conversations`,
    `${GROUP_ID}/events`,
  ];

  for (const endpoint of endpoints) {
    try {
      console.log(`🔍 Trying endpoint: ${endpoint}`);
      const response = await axios.get(`${GRAPH_API_URL}/${endpoint}`, {
        params: {
          access_token: accessToken,
          fields: 'id,message,created_time,type',
          limit: 5,
        },
      });
      console.log(`✅ ${endpoint} success:`, JSON.stringify(response.data, null, 2));
      return response.data;
    } catch (error) {
      console.log(`❌ ${endpoint} failed:`, error.response?.data?.error?.message || error.message);
    }
  }

  return null;
}

async function testAlternativeApproaches(accessToken) {
  console.log('\n🔄 Testing Alternative Approaches...');

  // Try different API versions
  const versions = ['v18.0', 'v17.0', 'v16.0'];

  for (const version of versions) {
    try {
      console.log(`🔍 Trying API version: ${version}`);
      const response = await axios.get(`https://graph.facebook.com/${version}/${GROUP_ID}`, {
        params: {
          access_token: accessToken,
          fields: 'id,name',
        },
      });
      console.log(`✅ Version ${version} success:`, response.data);
    } catch (error) {
      console.log(
        `❌ Version ${version} failed:`,
        error.response?.data?.error?.message || error.message,
      );
    }
  }
}

async function testPublicEndpoints() {
  console.log('\n🌐 Testing Public Endpoints (no auth)...');

  const publicTests = [
    // Try without access token
    `${GRAPH_API_URL}/${GROUP_ID}`,
    // Try with just app ID
    `${GRAPH_API_URL}/${GROUP_ID}?access_token=${PARSER_APP_ID}`,
    // Try oEmbed API
    `${GRAPH_API_URL}/oembed_page?url=https://www.facebook.com/groups/${GROUP_ID}`,
  ];

  for (const url of publicTests) {
    try {
      console.log(`🔍 Trying: ${url.replace(PARSER_APP_SECRET, '[HIDDEN]')}`);
      const response = await axios.get(url);
      console.log(`✅ Public endpoint success:`, response.data);
    } catch (error) {
      console.log(
        `❌ Public endpoint failed:`,
        error.response?.data?.error?.message || error.message,
      );
    }
  }
}

async function testWebScraping() {
  console.log('\n🕷️ Testing Web Scraping Approach...');

  try {
    // Try to get the page HTML
    const response = await axios.get(`https://www.facebook.com/groups/${GROUP_ID}`, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
      timeout: 10000,
    });

    const html = response.data;
    console.log(`✅ Got HTML response (${html.length} characters)`);

    // Look for basic group info in HTML
    const groupNameMatch = html.match(/<title>(.*?)<\/title>/i);
    if (groupNameMatch) {
      console.log(`📋 Found group name in title: ${groupNameMatch[1]}`);
    }

    // Look for JSON data
    const jsonMatches = html.match(/__INITIAL_DATA__\s*=\s*({.*?});/g);
    if (jsonMatches) {
      console.log(`📊 Found ${jsonMatches.length} JSON data blocks`);
    }

    // Check if login is required
    if (html.includes('login') || html.includes('Log In') || html.includes('log in')) {
      console.log('🔒 Login appears to be required');
    }

    return { success: true, htmlLength: html.length };
  } catch (error) {
    console.log('❌ Web scraping failed:', error.message);
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('🔍 Comprehensive Facebook Group Parsing Test');
  console.log(`📍 Target: https://www.facebook.com/groups/${GROUP_ID}\n`);

  // Get access token
  const accessToken = await getParserAccessToken();

  if (accessToken) {
    // Test Graph API approaches
    const basicInfo = await testGroupBasicInfo(accessToken);
    const posts = await testGroupPosts(accessToken);
    await testAlternativeApproaches(accessToken);
  }

  // Test public endpoints
  await testPublicEndpoints();

  // Test web scraping
  const scrapingResult = await testWebScraping();

  console.log('\n📊 === SUMMARY ===');
  console.log('Parser App Token:', accessToken ? '✅ Working' : '❌ Failed');
  console.log('Graph API Access:', '❌ Requires permissions');
  console.log('Public Endpoints:', '❌ Not available');
  console.log('Web Scraping:', scrapingResult.success ? '✅ Possible' : '❌ Failed');

  if (scrapingResult.success) {
    console.log('\n💡 Recommendation: Web scraping might be the viable approach');
    console.log('   - Facebook blocks most Graph API access to private groups');
    console.log('   - HTML parsing could extract basic information');
    console.log('   - Would need to handle dynamic content loading');
  }

  console.log('\n🔗 Next steps:');
  console.log('   1. If web scraping works, implement Puppeteer solution');
  console.log('   2. Consider asking users to make groups public');
  console.log('   3. Implement user authentication for private group access');
}

main().catch(console.error);
