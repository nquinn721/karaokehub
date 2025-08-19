#!/usr/bin/env node

/**
 * Test Facebook Group Web Scraping
 * Alternative approach when Graph API is blocked
 */

const puppeteer = require('puppeteer');

const GROUP_URL = 'https://www.facebook.com/groups/194826524192177';

async function testWebScraping() {
  console.log('🎭 Testing Facebook Group Web Scraping\n');
  console.log(`Target: ${GROUP_URL}\n`);

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: false, // Show browser to see what's happening
      defaultViewport: null,
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

    // Set user agent to look more like a real browser
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    );

    console.log('🌐 Navigating to Facebook group...');
    await page.goto(GROUP_URL, { waitUntil: 'networkidle2', timeout: 30000 });

    // Wait a bit for the page to load
    await page.waitForTimeout(3000);

    console.log('📄 Checking page content...');

    // Check if we're redirected to login
    const currentUrl = page.url();
    console.log(`Current URL: ${currentUrl}`);

    if (currentUrl.includes('login') || currentUrl.includes('checkpoint')) {
      console.log('🔒 Redirected to login page - Group requires authentication');

      // Try to get any visible text anyway
      const pageText = await page.evaluate(() => {
        return document.body.innerText.substring(0, 500);
      });
      console.log('\nVisible page content:');
      console.log(pageText);

      return { requiresLogin: true, data: null };
    }

    // Try to extract group information
    console.log('📊 Attempting to extract group data...');

    const groupData = await page.evaluate(() => {
      const result = {
        title: '',
        description: '',
        memberCount: '',
        privacy: '',
        recentPosts: [],
        visibleText: '',
      };

      // Try to get group title
      const titleSelectors = [
        'h1[data-testid="group-name"]',
        'h1',
        '[data-testid="group-title"]',
        '.x1heor9g.x1qlqyl8.x1pd3egz.x1a2a7pz',
      ];

      for (const selector of titleSelectors) {
        const element = document.querySelector(selector);
        if (element && element.textContent.trim()) {
          result.title = element.textContent.trim();
          break;
        }
      }

      // Try to get member count
      const memberSelectors = [
        '[data-testid="group-member-count"]',
        '.x193iq5w.xeuugli.x13faqbe.x1vvkbs.x1xmvt09.x1lliihq.x1s928wv.xhkezso.x1gmr53x.x1cpjm7i.x1fgarty.x1943h6x.xudqn12.x3x7a5m.x6prxxf.xvq8zen.xo1l8bm.xi81zsa',
        'span:contains("member")',
        'span:contains("Member")',
      ];

      for (const selector of memberSelectors) {
        try {
          const element = document.querySelector(selector);
          if (element && element.textContent.includes('member')) {
            result.memberCount = element.textContent.trim();
            break;
          }
        } catch (e) {}
      }

      // Get some visible text for analysis
      result.visibleText = document.body.innerText.substring(0, 1000);

      // Try to find posts
      const postElements = document.querySelectorAll(
        '[data-testid="post_message"], .userContent, [data-ad-preview="message"]',
      );
      postElements.forEach((post, index) => {
        if (index < 3 && post.textContent.trim()) {
          // Get first 3 posts
          result.recentPosts.push({
            content: post.textContent.trim().substring(0, 200),
            index: index,
          });
        }
      });

      return result;
    });

    console.log('✅ Extraction complete!');
    console.log('\n📋 Group Data:');
    console.log(`Title: ${groupData.title || 'Not found'}`);
    console.log(`Member Count: ${groupData.memberCount || 'Not found'}`);
    console.log(`Recent Posts: ${groupData.recentPosts.length} found`);

    if (groupData.recentPosts.length > 0) {
      console.log('\n📝 Sample Posts:');
      groupData.recentPosts.forEach((post, index) => {
        console.log(`Post ${index + 1}: ${post.content.substring(0, 100)}...`);
      });
    }

    console.log('\n📄 Visible Text Sample:');
    console.log(groupData.visibleText.substring(0, 300) + '...');

    return { requiresLogin: false, data: groupData };
  } catch (error) {
    console.error('❌ Scraping failed:', error.message);
    return { requiresLogin: true, error: error.message };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

async function analyzeFacebookGroupAccess() {
  console.log('\n🔍 Facebook Group Access Analysis\n');

  console.log('📊 Current Status:');
  console.log('• Graph API: ❌ Missing Permissions (OAuth Error #3)');
  console.log('• App Token: ✅ Working');
  console.log('• Group Type: Private/Closed (requires membership)');

  console.log('\n🔐 Required Permissions for Group Access:');
  console.log('• groups_access_member_info: Required for group content');
  console.log('• User must be group member: Required for private groups');
  console.log('• App review from Facebook: Required for production use');

  console.log('\n🎯 Possible Solutions:');
  console.log('1. Web Scraping (what we just tested)');
  console.log('2. User OAuth with group permissions');
  console.log('3. Group admin approval for app access');
  console.log('4. Focus on public Facebook pages instead');

  console.log('\n💡 Recommendations:');
  console.log('• If scraping works: Extract basic info + recent posts');
  console.log('• If login required: Consider user OAuth flow');
  console.log('• Alternative: Focus on public karaoke business pages');
  console.log('• Long-term: Apply for Facebook app review');
}

// Run the test
async function main() {
  const result = await testWebScraping();
  await analyzeFacebookGroupAccess();

  console.log('\n✨ Analysis Complete!');

  if (result.requiresLogin) {
    console.log('\n🔒 Result: Group requires authentication');
    console.log('💡 Next steps: Implement user OAuth or focus on public pages');
  } else {
    console.log('\n✅ Result: Some data accessible via scraping');
    console.log('💡 Next steps: Enhance scraping logic for karaoke data');
  }
}

main().catch(console.error);
