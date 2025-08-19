/**
 * Facebook Profile Parser using App Access Token
 * Testing Max Denney's profile with proper Facebook app permissions
 */
require('dotenv').config();
const axios = require('axios');
const puppeteer = require('puppeteer');

const PROFILE_URL = 'https://www.facebook.com/max.denney.194690';
const GRAPH_API_URL = 'https://graph.facebook.com/v18.0';

// Use our Facebook Parser App for better permissions
const PARSER_APP_ID = process.env.FACEBOOK_PARSER_APP_ID || '1160707802576346';
const PARSER_APP_SECRET =
  process.env.FACEBOOK_PARSER_APP_SECRET || '47f729de53981816dcce9b8776449b4b';

class FacebookProfileParser {
  constructor() {
    this.accessToken = null;
    this.profileId = 'max.denney.194690';
  }

  async getAppAccessToken() {
    console.log('🔑 Getting Facebook App Access Token...');

    try {
      const response = await axios.get(
        `${GRAPH_API_URL}/oauth/access_token?client_id=${PARSER_APP_ID}&client_secret=${PARSER_APP_SECRET}&grant_type=client_credentials`,
      );

      this.accessToken = response.data.access_token;
      console.log(`✅ Access Token obtained: ${this.accessToken.substring(0, 20)}...`);
      return this.accessToken;
    } catch (error) {
      console.error('❌ Failed to get access token:', error.response?.data || error.message);
      return null;
    }
  }

  async testGraphAPIAccess() {
    console.log('\n📊 Testing Graph API Access to Max Denney Profile...');

    if (!this.accessToken) {
      console.log('❌ No access token available');
      return null;
    }

    const endpoints = [
      {
        name: 'Basic Profile',
        url: `${this.profileId}`,
        fields: 'id,name,first_name,last_name,about,birthday,location,work,education',
      },
      {
        name: 'Profile Picture',
        url: `${this.profileId}/picture`,
        params: { redirect: false, type: 'large' },
      },
      {
        name: 'Public Posts',
        url: `${this.profileId}/posts`,
        fields: 'id,message,story,created_time,updated_time,place,from,type',
      },
      {
        name: 'Events',
        url: `${this.profileId}/events`,
        fields: 'id,name,description,start_time,end_time,place,attending_count',
      },
      {
        name: 'Photos',
        url: `${this.profileId}/photos`,
        fields: 'id,name,picture,created_time,place',
      },
      {
        name: 'Tagged Places',
        url: `${this.profileId}/tagged_places`,
        fields: 'id,place,created_time',
      },
    ];

    const results = {};

    for (const endpoint of endpoints) {
      try {
        const params = {
          access_token: this.accessToken,
          limit: 10,
        };

        if (endpoint.fields) {
          params.fields = endpoint.fields;
        }

        if (endpoint.params) {
          Object.assign(params, endpoint.params);
        }

        const response = await axios.get(`${GRAPH_API_URL}/${endpoint.url}`, { params });
        results[endpoint.name] = response.data;
        console.log(`✅ ${endpoint.name}:`, JSON.stringify(response.data, null, 2));
      } catch (error) {
        const errorInfo = error.response?.data?.error || error.message;
        results[endpoint.name] = { error: errorInfo };
        console.log(`❌ ${endpoint.name}:`, errorInfo);
      }
    }

    return results;
  }

  async tryWebScrapingWithAppAuth() {
    console.log('\n🌐 Trying Web Scraping with App Authentication...');

    try {
      // Try accessing with our app access token as a parameter
      const urlWithToken = `${PROFILE_URL}?access_token=${this.accessToken}`;

      const response = await axios.get(urlWithToken, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (compatible; FacebookBot/1.0; +https://www.facebook.com/help/)',
        },
        timeout: 10000,
      });

      console.log(`✅ Web scraping with token successful - Content: ${response.data.length} chars`);

      // Look for specific content
      const content = response.data;
      const hasContent = content.length > 5000;
      const hasLoginRequired = content.includes('login') || content.includes('Log in');

      console.log('Has substantial content:', hasContent);
      console.log('Requires login:', hasLoginRequired);

      return { success: true, contentLength: content.length, requiresLogin: hasLoginRequired };
    } catch (error) {
      console.log('❌ Web scraping with token failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  async tryPuppeteerWithoutLogin() {
    console.log('\n🤖 Trying Puppeteer Access (Headless)...');

    let browser = null;
    try {
      browser = await puppeteer.launch({
        headless: 'new', // Use headless mode
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
        ],
      });

      const page = await browser.newPage();

      // Set mobile user agent to potentially get different content
      await page.setUserAgent(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
      );
      await page.setViewport({ width: 375, height: 667 });

      console.log(`📱 Navigating to: ${PROFILE_URL}`);

      await page.goto(PROFILE_URL, {
        waitUntil: 'networkidle2',
        timeout: 30000,
      });

      // Wait for content
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Check if we hit a login wall
      const hasLoginForm = await page.evaluate(() => {
        return (
          document.querySelector('input[type="password"]') !== null ||
          document.body.textContent.includes('Log In') ||
          document.body.textContent.includes('Sign Up')
        );
      });

      if (hasLoginForm) {
        console.log('❌ Hit login wall with Puppeteer');
        return { success: false, reason: 'login_required' };
      }

      // Extract profile data
      const profileData = await page.evaluate(() => {
        const data = {};

        // Get page title
        data.pageTitle = document.title;

        // Try to get profile name
        const nameSelectors = ['h1', 'title', '[data-testid*="name"]'];
        for (const selector of nameSelectors) {
          const element = document.querySelector(selector);
          if (element && element.textContent.includes('Max')) {
            data.name = element.textContent.trim();
            break;
          }
        }

        // Look for any content that mentions shows, events, or karaoke
        const showKeywords = ['show', 'karaoke', 'dj', 'event', 'performance', 'gig'];
        const textContent = document.body.textContent.toLowerCase();

        data.hasShowContent = showKeywords.some((keyword) => textContent.includes(keyword));
        data.contentLength = document.body.textContent.length;

        // Try to find any structured data
        const scriptTags = document.querySelectorAll('script[type="application/ld+json"]');
        data.structuredData = [];

        scriptTags.forEach((script) => {
          try {
            const jsonData = JSON.parse(script.textContent);
            data.structuredData.push(jsonData);
          } catch (e) {
            // Ignore invalid JSON
          }
        });

        return data;
      });

      console.log('✅ Puppeteer Profile Data:', profileData);
      return { success: true, data: profileData };
    } catch (error) {
      console.error('❌ Puppeteer error:', error.message);
      return { success: false, error: error.message };
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  async findMaxShows() {
    console.log('\n🎤 Searching for Max Denney Shows...');

    // Strategy 1: Search public posts mentioning Max
    try {
      const searchResponse = await axios.get(`${GRAPH_API_URL}/search`, {
        params: {
          q: 'Max Denney karaoke',
          type: 'post',
          access_token: this.accessToken,
          limit: 20,
        },
      });

      console.log('✅ Search results for "Max Denney karaoke":', searchResponse.data);
    } catch (error) {
      console.log('❌ Search failed:', error.response?.data?.error || error.message);
    }

    // Strategy 2: Look for Central Ohio Karaoke group posts mentioning Max
    try {
      const groupId = '194826524192177'; // Central Ohio Karaoke group
      const groupFeedResponse = await axios.get(`${GRAPH_API_URL}/${groupId}/feed`, {
        params: {
          q: 'Max',
          access_token: this.accessToken,
          limit: 50,
          fields: 'id,message,created_time,from',
        },
      });

      console.log('✅ Group posts mentioning Max:', groupFeedResponse.data);
    } catch (error) {
      console.log('❌ Group search failed:', error.response?.data?.error || error.message);
    }
  }
}

async function main() {
  console.log('🔍 Testing Facebook App-Based Access to Max Denney Profile...');
  console.log(`📱 Profile: ${PROFILE_URL}`);
  console.log(`🔧 Using Parser App: ${PARSER_APP_ID}\n`);

  const parser = new FacebookProfileParser();

  // Step 1: Get app access token
  const token = await parser.getAppAccessToken();
  if (!token) {
    console.log('❌ Cannot proceed without access token');
    return;
  }

  // Step 2: Test Graph API access
  const graphResults = await parser.testGraphAPIAccess();

  // Step 3: Try web scraping with token
  const webResults = await parser.tryWebScrapingWithAppAuth();

  // Step 4: Try Puppeteer without login
  const puppeteerResults = await parser.tryPuppeteerWithoutLogin();

  // Step 5: Search for Max's shows
  await parser.findMaxShows();

  console.log('\n' + '='.repeat(80));
  console.log('📊 ACCESS METHOD SUMMARY');
  console.log('='.repeat(80));
  console.log('Graph API Access:', graphResults ? '✅ Some endpoints' : '❌ Failed');
  console.log('Web Scraping + Token:', webResults?.success ? '✅ Success' : '❌ Failed');
  console.log('Puppeteer (No Login):', puppeteerResults?.success ? '✅ Success' : '❌ Failed');

  if (puppeteerResults?.success && !puppeteerResults.data?.hasShowContent) {
    console.log('\n💡 Profile accessible but no show content found');
    console.log('   - This might be a personal profile without public show listings');
    console.log('   - Try searching group posts or event pages instead');
  }

  if (puppeteerResults?.success && puppeteerResults.data?.hasShowContent) {
    console.log('\n✅ SUCCESS: Found show-related content on profile!');
    console.log('   - Profile has karaoke/show information');
    console.log('   - Can proceed with detailed extraction');
  }
}

main().catch(console.error);
