/**
 * Debug Facebook page loading and screenshot verification
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function debugFacebookPageLoading() {
  console.log('🔍 Debug: Facebook Page Loading and Screenshot...\n');

  let browser;
  try {
    // Launch browser with same settings as the service
    browser = await puppeteer.launch({
      headless: false,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--disable-features=VizDisplayCompositor',
        '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
      ],
      defaultViewport: { width: 1280, height: 720 },
      executablePath: undefined,
    });

    const page = await browser.newPage();

    // Try to load Facebook cookies
    const cookiesPath = path.join(__dirname, 'facebook-cookies.json');
    if (fs.existsSync(cookiesPath)) {
      const cookies = JSON.parse(fs.readFileSync(cookiesPath, 'utf8'));
      await page.setCookie(...cookies);
      console.log('✅ Loaded Facebook cookies');
    } else {
      console.log('⚠️ No Facebook cookies found');
    }

    const testUrl = 'https://www.facebook.com/groups/KaraokeUkiah/media';
    console.log(`📊 Testing URL: ${testUrl}`);

    // Navigate to the page
    await page.goto(testUrl, { waitUntil: 'networkidle2', timeout: 30000 });

    // Wait a bit for dynamic content
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Take screenshot
    const screenshotPath = path.join(__dirname, 'debug-facebook-page.png');
    await page.screenshot({
      path: screenshotPath,
      fullPage: true,
    });
    console.log(`📸 Screenshot saved: ${screenshotPath}`);

    // Check the page title and URL
    const title = await page.title();
    const currentUrl = page.url();
    console.log(`📄 Page title: ${title}`);
    console.log(`🔗 Current URL: ${currentUrl}`);

    // Check for login indicators
    const loginRequired = await page.evaluate(() => {
      const bodyText = document.body.textContent.toLowerCase();
      return (
        bodyText.includes('log in') ||
        bodyText.includes('login') ||
        bodyText.includes('sign in') ||
        bodyText.includes('create account') ||
        document.querySelector('#email') ||
        document.querySelector('input[name="email"]')
      );
    });

    console.log(`🔐 Login required: ${loginRequired}`);

    // Check how many images are on the page
    const imageCount = await page.evaluate(() => {
      const allImages = document.querySelectorAll('img');
      const cdnImages = Array.from(allImages).filter((img) => {
        const src = img.src || img.getAttribute('data-src');
        return src && (src.includes('scontent') || src.includes('fbcdn'));
      });

      return {
        total: allImages.length,
        cdnImages: cdnImages.length,
        cdnUrls: cdnImages.slice(0, 5).map((img) => img.src || img.getAttribute('data-src')),
      };
    });

    console.log(`📊 Images found:`);
    console.log(`  Total images: ${imageCount.total}`);
    console.log(`  CDN images: ${imageCount.cdnImages}`);
    console.log(`  Sample CDN URLs:`, imageCount.cdnUrls);
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Run the debug
debugFacebookPageLoading().catch(console.error);
