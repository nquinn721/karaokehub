const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function takeDebugScreenshot() {
  let browser;

  try {
    console.log('Launching browser...');
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security',
      ],
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

    // Reduced viewport size for faster screenshot processing
    await page.setViewport({ width: 1024, height: 600 });

    console.log('Navigating to page...');
    await page.goto('https://excessskaraoke.com/shows.php', {
      waitUntil: 'domcontentloaded',
      timeout: 20000,
    });

    // Wait for content to load
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Scroll to bottom to ensure all content is loaded
    console.log('Scrolling to load all content...');
    await page.evaluate(() => {
      return new Promise((resolve) => {
        let totalHeight = 0;
        const distance = 100;
        const timer = setInterval(() => {
          const scrollHeight = document.body.scrollHeight;
          window.scrollBy(0, distance);
          totalHeight += distance;

          if (totalHeight >= scrollHeight) {
            clearInterval(timer);
            resolve(null);
          }
        }, 100);
      });
    });

    // Scroll back to top for consistent screenshot
    await page.evaluate(() => window.scrollTo(0, 0));
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Get page dimensions
    const pageHeight = await page.evaluate(() => document.body.scrollHeight);
    console.log(`Page content height: ${pageHeight}px`);

    console.log('Taking full-page screenshot...');
    const screenshot = await page.screenshot({
      fullPage: true,
      type: 'jpeg',
      quality: 80,
    });

    // Save screenshot
    const screenshotDir = path.join(process.cwd(), 'debug-screenshots');
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const screenshotPath = path.join(screenshotDir, `excessskaraoke_com_shows_${timestamp}.jpg`);

    fs.writeFileSync(screenshotPath, screenshot);
    console.log(`Screenshot saved to: ${screenshotPath}`);
    console.log(`Screenshot size: ${(screenshot.length / 1024 / 1024).toFixed(2)} MB`);
  } catch (error) {
    console.error('Error taking screenshot:', error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

takeDebugScreenshot();
