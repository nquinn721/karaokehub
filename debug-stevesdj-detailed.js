// Debug script to understand what's on Stevesdj website with extended timeout
const { chromium } = require('playwright');

async function analyzeStevesdjContent() {
  console.log('🔍 Analyzing Stevesdj website content with extended timeout...');
  
  const browser = await chromium.launch({ 
    headless: false,
    timeout: 60000 
  });
  const page = await browser.newPage();
  
  try {
    console.log('🌐 Loading stevesdj.com...');
    await page.goto('https://stevesdj.com', { 
      waitUntil: 'domcontentloaded',
      timeout: 60000 
    });
    
    // Wait for basic content to load
    await page.waitForTimeout(10000);
    console.log('✅ Page loaded, analyzing content...');
    
    // Get page title
    const title = await page.title();
    console.log(`📄 Page title: ${title}`);
    
    // Get visible text content
    const textContent = await page.evaluate(() => {
      return document.body.innerText;
    });
    console.log(`📝 Page text content length: ${textContent.length} characters`);
    console.log(`📝 First 500 chars:\n${textContent.substring(0, 500)}\n`);
    
    // Look for karaoke-related keywords
    const karaokeKeywords = ['karaoke', 'dj', 'music', 'show', 'event', 'entertainment', 'steve'];
    console.log('🎤 Keyword analysis:');
    
    karaokeKeywords.forEach(keyword => {
      const regex = new RegExp(keyword, 'gi');
      const matches = textContent.match(regex);
      if (matches) {
        console.log(`  - "${keyword}": ${matches.length} occurrences`);
      } else {
        console.log(`  - "${keyword}": 0 occurrences`);
      }
    });
    
    // Check if this is a GoDaddy site
    const htmlContent = await page.content();
    const isGoDaddy = htmlContent.includes('godaddy') || htmlContent.includes('GoDaddy');
    console.log(`🏗️ GoDaddy Website Builder detected: ${isGoDaddy}`);
    
    // Take a screenshot for manual inspection
    await page.screenshot({ path: 'stevesdj-detailed.png', fullPage: true });
    console.log('📸 Full page screenshot saved as stevesdj-detailed.png');
    
    // Check what HTML elements are present
    const elementCounts = await page.evaluate(() => {
      return {
        divs: document.querySelectorAll('div').length,
        paragraphs: document.querySelectorAll('p').length,
        headings: document.querySelectorAll('h1, h2, h3, h4, h5, h6').length,
        links: document.querySelectorAll('a').length,
        images: document.querySelectorAll('img').length,
        lists: document.querySelectorAll('ul, ol').length,
        listItems: document.querySelectorAll('li').length
      };
    });
    
    console.log('\n📊 HTML element counts:');
    Object.entries(elementCounts).forEach(([element, count]) => {
      console.log(`  ${element}: ${count}`);
    });
    
    // Check for any text that might indicate a schedule or services
    const scheduleIndicators = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday', 'weekly', 'schedule', 'available', 'book', 'hire'];
    console.log('\n📅 Schedule-related content:');
    
    scheduleIndicators.forEach(indicator => {
      const regex = new RegExp(indicator, 'gi');
      const matches = textContent.match(regex);
      if (matches) {
        console.log(`  - "${indicator}": ${matches.length} occurrences`);
      }
    });
    
  } catch (error) {
    console.error(`❌ Error analyzing Stevesdj: ${error.message}`);
  } finally {
    await browser.close();
  }
}

analyzeStevesdjContent();
