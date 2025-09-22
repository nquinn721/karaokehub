const axios = require('axios');
const puppeteer = require('puppeteer');

async function testMultipleStrategies() {
  console.log('🔧 Testing multiple strategies for Connecticut page...\n');

  // Strategy 1: Direct HTTP request
  console.log('Strategy 1: Direct HTTP request');
  try {
    const response = await axios.get('https://karaokeviewpoint.com/karaoke-in-connecticut/', {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        Connection: 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
      timeout: 15000,
      maxRedirects: 5,
    });

    console.log(`✅ HTTP request successful: ${response.data.length} characters`);

    // Quick analysis of HTTP response
    const html = response.data;
    const hasContent = html.includes('karaoke') || html.includes('venue');
    console.log(
      `Content analysis: ${hasContent ? 'Has karaoke content' : 'No obvious karaoke content'}`,
    );

    if (hasContent) {
      console.log('✅ Strategy 1 is viable - HTTP request works');
      return 'http-direct';
    }
  } catch (error) {
    console.log(`❌ HTTP request failed: ${error.message}`);
  }

  // Strategy 2: Fast Puppeteer with reduced wait
  console.log('\nStrategy 2: Fast Puppeteer (reduced timeout)');
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--disable-extensions',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
      ],
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

    // Try with domcontentloaded instead of networkidle2
    await page.goto('https://karaokeviewpoint.com/karaoke-in-connecticut/', {
      waitUntil: 'domcontentloaded',
      timeout: 15000,
    });

    const content = await page.evaluate(() => {
      return document.body.innerText || document.body.textContent || '';
    });

    console.log(`✅ Fast Puppeteer successful: ${content.length} characters`);

    if (content.length > 500 && content.includes('karaoke')) {
      console.log('✅ Strategy 2 is viable - Fast Puppeteer works');
      return 'puppeteer-fast';
    }
  } catch (error) {
    console.log(`❌ Fast Puppeteer failed: ${error.message}`);
  } finally {
    if (browser) await browser.close();
  }

  // Strategy 3: Alternative URL patterns
  console.log('\nStrategy 3: Testing alternative URL patterns');
  const alternativeUrls = [
    'https://karaokeviewpoint.com/karaoke-in-connecticut', // without trailing slash
    'https://www.karaokeviewpoint.com/karaoke-in-connecticut/', // with www
    'https://karaokeviewpoint.com/connecticut-karaoke/', // alternative pattern
  ];

  for (const url of alternativeUrls) {
    try {
      console.log(`Trying: ${url}`);
      const response = await axios.get(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        timeout: 10000,
        maxRedirects: 3,
      });

      if (response.status === 200) {
        console.log(`✅ Alternative URL works: ${response.data.length} chars`);
        return 'alternative-url';
      }
    } catch (error) {
      console.log(`❌ ${url} failed: ${error.message}`);
    }
  }

  console.log('\n🔍 Diagnosis:');
  console.log('- The website may be slow or have blocking mechanisms');
  console.log('- Puppeteer with networkidle2 is too aggressive for this site');
  console.log('- Need to implement fallback strategies');

  return 'all-failed';
}

testMultipleStrategies().then((result) => {
  console.log(`\n🎯 Best strategy: ${result}`);
});
