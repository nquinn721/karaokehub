/**
 * Advanced Web Scraping Test for Facebook Group
 * Using better headers and error handling
 */
require('dotenv').config();
const axios = require('axios');

const GROUP_ID = '194826524192177';
const GROUP_URL = `https://www.facebook.com/groups/${GROUP_ID}`;

async function testAdvancedWebScraping() {
  console.log('🕷️ Advanced Web Scraping Test');
  console.log(`📍 Target: ${GROUP_URL}\n`);

  const configurations = [
    {
      name: 'Standard Browser Headers',
      config: {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          Connection: 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
        },
        timeout: 15000,
        maxRedirects: 5,
      },
    },
    {
      name: 'Mobile Browser Headers',
      config: {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        timeout: 15000,
        maxRedirects: 5,
      },
    },
    {
      name: 'Facebook App Headers',
      config: {
        headers: {
          'User-Agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
          Accept: '*/*',
        },
        timeout: 15000,
        maxRedirects: 5,
      },
    },
  ];

  for (const { name, config } of configurations) {
    try {
      console.log(`🔍 Testing: ${name}`);

      const response = await axios.get(GROUP_URL, config);
      const html = response.data;

      console.log(`✅ Success! Status: ${response.status}`);
      console.log(`📊 Response size: ${html.length} characters`);
      console.log(`🔧 Content-Type: ${response.headers['content-type']}`);

      // Analyze the content
      await analyzeHTML(html, name);
      return { success: true, html, config: name };
    } catch (error) {
      console.log(`❌ ${name} failed:`);
      console.log(`   Status: ${error.response?.status || 'No response'}`);
      console.log(`   Message: ${error.message}`);

      if (error.response?.status === 302 || error.response?.status === 301) {
        console.log(`   Redirect to: ${error.response.headers.location}`);
      }

      if (error.response?.data) {
        const snippet = error.response.data.toString().substring(0, 200);
        console.log(`   Response snippet: ${snippet}...`);
      }
    }
    console.log('');
  }

  return { success: false };
}

async function analyzeHTML(html, configName) {
  console.log(`📋 Analyzing HTML from ${configName}:`);

  // Check for login requirements
  const loginIndicators = [
    'login',
    'log in',
    'sign in',
    'signin',
    'Login',
    'Log In',
    'password',
    'email',
    'username',
    'authenticate',
  ];

  let loginRequired = false;
  for (const indicator of loginIndicators) {
    if (html.toLowerCase().includes(indicator.toLowerCase())) {
      loginRequired = true;
      break;
    }
  }

  console.log(`   🔒 Login required: ${loginRequired ? 'Yes' : 'No'}`);

  // Look for group information
  const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
  if (titleMatch) {
    console.log(`   📋 Page title: "${titleMatch[1]}"`);
  }

  // Look for meta tags
  const descriptionMatch = html.match(
    /<meta[^>]*name=["']description["'][^>]*content=["'](.*?)["']/i,
  );
  if (descriptionMatch) {
    console.log(`   📝 Description: "${descriptionMatch[1]}"`);
  }

  // Look for Open Graph tags
  const ogTitleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["'](.*?)["']/i);
  if (ogTitleMatch) {
    console.log(`   🏷️ OG Title: "${ogTitleMatch[1]}"`);
  }

  const ogDescMatch = html.match(
    /<meta[^>]*property=["']og:description["'][^>]*content=["'](.*?)["']/i,
  );
  if (ogDescMatch) {
    console.log(`   📄 OG Description: "${ogDescMatch[1]}"`);
  }

  // Look for JSON-LD structured data
  const jsonLdMatches = html.match(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>(.*?)<\/script>/gis,
  );
  if (jsonLdMatches) {
    console.log(`   📊 Found ${jsonLdMatches.length} JSON-LD blocks`);
    jsonLdMatches.forEach((match, i) => {
      try {
        const jsonContent = match.replace(/<script[^>]*>/, '').replace(/<\/script>/, '');
        const data = JSON.parse(jsonContent);
        console.log(`   📋 JSON-LD ${i + 1}:`, JSON.stringify(data, null, 4));
      } catch (e) {
        console.log(`   ❌ Could not parse JSON-LD ${i + 1}`);
      }
    });
  }

  // Look for Facebook specific data
  const fbAppIdMatch = html.match(
    /<meta[^>]*property=["']fb:app_id["'][^>]*content=["'](.*?)["']/i,
  );
  if (fbAppIdMatch) {
    console.log(`   🔑 FB App ID: ${fbAppIdMatch[1]}`);
  }

  // Check for blocked content indicators
  const blockedIndicators = [
    "This content isn't available right now",
    'Content not available',
    'blocked',
    'private',
    'members only',
  ];

  for (const indicator of blockedIndicators) {
    if (html.toLowerCase().includes(indicator.toLowerCase())) {
      console.log(`   🚫 Found blocking indicator: "${indicator}"`);
    }
  }

  // Look for any group-related keywords
  const groupKeywords = ['member', 'post', 'karaoke', 'event', 'admin'];
  const foundKeywords = groupKeywords.filter((keyword) =>
    html.toLowerCase().includes(keyword.toLowerCase()),
  );

  if (foundKeywords.length > 0) {
    console.log(`   🎯 Found keywords: ${foundKeywords.join(', ')}`);
  }
}

async function testDirectGroupURL() {
  console.log('🔗 Testing alternative Facebook URLs...\n');

  const alternativeUrls = [
    `https://m.facebook.com/groups/${GROUP_ID}`,
    `https://facebook.com/groups/${GROUP_ID}`,
    `https://www.facebook.com/groups/${GROUP_ID}/about`,
    `https://www.facebook.com/groups/${GROUP_ID}/members`,
    `https://graph.facebook.com/${GROUP_ID}`, // This will fail but let's see the error
  ];

  for (const url of alternativeUrls) {
    try {
      console.log(`🔍 Testing: ${url}`);
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        timeout: 10000,
        maxRedirects: 3,
      });

      console.log(`✅ Success! Status: ${response.status}, Size: ${response.data.length} chars`);

      // Quick analysis
      const title = response.data.match(/<title[^>]*>(.*?)<\/title>/i);
      if (title) {
        console.log(`   📋 Title: "${title[1]}"`);
      }
    } catch (error) {
      console.log(`❌ Failed: ${error.response?.status || 'No response'} - ${error.message}`);
    }
    console.log('');
  }
}

async function main() {
  console.log('🚀 Advanced Facebook Group Parsing Test\n');

  // Test main scraping approaches
  const result = await testAdvancedWebScraping();

  // Test alternative URLs
  await testDirectGroupURL();

  console.log('📊 === FINAL SUMMARY ===');
  if (result.success) {
    console.log(`✅ Web scraping successful with: ${result.config}`);
    console.log('💡 Next step: Implement Puppeteer for dynamic content');
  } else {
    console.log('❌ All web scraping attempts failed');
    console.log('💡 Facebook has strong anti-scraping measures');
    console.log('🔑 User authentication will likely be required');
  }
}

main().catch(console.error);
