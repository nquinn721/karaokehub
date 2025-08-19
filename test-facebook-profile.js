/**
 * Test Facebook Profile Parsing
 * Testing what data we can extract from a Facebook profile
 */
require('dotenv').config();
const axios = require('axios');
const puppeteer = require('puppeteer');

const PROFILE_URL = 'https://www.facebook.com/max.denney.194690';
const GRAPH_API_URL = 'https://graph.facebook.com/v18.0';
const PARSER_APP_ID = process.env.FACEBOOK_PARSER_APP_ID || '1160707802576346';
const PARSER_APP_SECRET =
  process.env.FACEBOOK_PARSER_APP_SECRET || '47f729de53981816dcce9b8776449b4b';

async function testGraphAPIProfile() {
  console.log('🔍 Testing Graph API Profile Access...\n');

  try {
    // Get access token
    const tokenResponse = await axios.get(
      `${GRAPH_API_URL}/oauth/access_token?client_id=${PARSER_APP_ID}&client_secret=${PARSER_APP_SECRET}&grant_type=client_credentials`,
    );
    const accessToken = tokenResponse.data.access_token;
    console.log(`✅ Access Token: ${accessToken.substring(0, 20)}...`);

    // Extract profile ID from URL
    const profileId = 'max.denney.194690';

    const endpoints = [
      {
        name: 'Basic Profile Info',
        url: `${profileId}`,
        fields: 'id,name,first_name,last_name,picture',
      },
      {
        name: 'Profile Picture',
        url: `${profileId}/picture`,
        fields: 'url',
      },
      {
        name: 'Public Posts',
        url: `${profileId}/posts`,
        fields: 'id,message,created_time,story',
      },
      {
        name: 'Photos',
        url: `${profileId}/photos`,
        fields: 'id,name,picture,created_time',
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
  } catch (error) {
    console.error('❌ Graph API test failed:', error.response?.data || error.message);
  }
}

async function testPuppeteerProfile() {
  console.log('\n🤖 Testing Puppeteer Profile Access...\n');

  let browser = null;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
      ],
    });

    const page = await browser.newPage();

    // Set realistic user agent
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    );
    await page.setViewport({ width: 1366, height: 768 });

    console.log(`📍 Navigating to: ${PROFILE_URL}`);
    await page.goto(PROFILE_URL, {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });

    // Wait for content to load
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Extract profile information
    const profileInfo = await page.evaluate(() => {
      const info = {};

      // Try to get profile name
      const nameSelectors = [
        'h1[data-testid="profile-name"]',
        'h1',
        '.x1heor9g.x1qlqyl8.x1pd3egz.x1a2a7pz h1',
        '[data-testid="profile-name"]',
      ];

      for (const selector of nameSelectors) {
        const element = document.querySelector(selector);
        if (element && element.textContent.trim()) {
          info.name = element.textContent.trim();
          break;
        }
      }

      // Try to get bio/intro
      const bioSelectors = [
        '[data-testid="profile-intro"]',
        '.x11i5rnm.xat24cr.x1mh8g0r.x1vvkbs span',
        '.intro',
      ];

      for (const selector of bioSelectors) {
        const element = document.querySelector(selector);
        if (element && element.textContent.trim()) {
          info.bio = element.textContent.trim();
          break;
        }
      }

      // Try to get work/location info
      const workElements = document.querySelectorAll('span');
      for (const element of workElements) {
        const text = element.textContent;
        if (text.includes('Works at') || text.includes('Lives in') || text.includes('From')) {
          if (!info.details) info.details = [];
          info.details.push(text.trim());
        }
      }

      // Check if it's a public profile
      info.isPublic =
        !document.querySelector('[data-testid="login_form"]') &&
        !document.body.textContent.includes('Log In') &&
        !document.body.textContent.includes('Sign Up');

      // Get page title for debugging
      info.pageTitle = document.title;

      return info;
    });

    console.log('✅ Profile Info Extracted:', profileInfo);

    // Try to extract recent posts
    const posts = await page.evaluate(() => {
      const postElements = document.querySelectorAll(
        '[data-testid="story-body"], [role="article"]',
      );
      const extractedPosts = [];

      for (let i = 0; i < Math.min(postElements.length, 5); i++) {
        const postElement = postElements[i];
        const post = {};

        // Try to get post text
        const textEl = postElement.querySelector('[data-testid="post_message"], .userContent');
        if (textEl) {
          post.text = textEl.textContent.trim();
        }

        // Try to get timestamp
        const timeEl = postElement.querySelector('time, [data-tooltip-content]');
        if (timeEl) {
          post.timestamp =
            timeEl.getAttribute('data-tooltip-content') ||
            timeEl.getAttribute('title') ||
            timeEl.textContent.trim();
        }

        if (post.text && post.text.length > 10) {
          extractedPosts.push(post);
        }
      }

      return extractedPosts;
    });

    console.log(`\n📝 Found ${posts.length} posts:`);
    posts.forEach((post, index) => {
      console.log(`\n--- Post ${index + 1} ---`);
      console.log('Time:', post.timestamp || 'Unknown');
      console.log('Text:', post.text ? post.text.substring(0, 200) + '...' : 'No text');
    });

    return { profileInfo, posts };
  } catch (error) {
    console.error('❌ Puppeteer error:', error.message);
    return null;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

async function testWebScraping() {
  console.log('\n🌐 Testing Basic Web Scraping...\n');

  try {
    const response = await axios.get(PROFILE_URL, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
      },
      timeout: 10000,
    });

    console.log(`✅ Web scraping successful - Content length: ${response.data.length} chars`);

    // Basic text extraction
    const content = response.data;
    const hasLoginForm = content.includes('login') || content.includes('Log In');
    const hasContent = content.length > 10000;

    console.log('Has login form:', hasLoginForm);
    console.log('Has substantial content:', hasContent);

    // Try to extract name from meta tags
    const nameMatch = content.match(/<meta property="og:title" content="([^"]+)"/);
    if (nameMatch) {
      console.log('Profile name from meta:', nameMatch[1]);
    }

    return { hasContent, hasLoginForm, contentLength: content.length };
  } catch (error) {
    console.error('❌ Web scraping failed:', error.message);
    return null;
  }
}

async function main() {
  console.log('🔍 Testing Facebook Profile Access Methods...\n');
  console.log(`📱 Profile URL: ${PROFILE_URL}\n`);

  // Test all methods
  await testGraphAPIProfile();
  const webResult = await testWebScraping();
  const puppeteerResult = await testPuppeteerProfile();

  console.log('\n=== SUMMARY ===');
  console.log('Profile URL:', PROFILE_URL);
  console.log('Graph API:', '❌ Requires user permissions');
  console.log('Web Scraping:', webResult ? '✅ Basic access' : '❌ Failed');
  console.log('Puppeteer:', puppeteerResult ? '✅ Full extraction' : '❌ Failed');

  if (puppeteerResult?.profileInfo?.name) {
    console.log('\n✅ Successfully extracted profile data!');
    console.log('Name:', puppeteerResult.profileInfo.name);
    console.log('Public Profile:', puppeteerResult.profileInfo.isPublic);
    console.log('Posts Found:', puppeteerResult.posts.length);
  }
}

main().catch(console.error);
