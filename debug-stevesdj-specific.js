// Debug script to understand what's on Stevesdj website
const { chromium } = require('playwright');

async function analyzeStevesdjContent() {
  console.log('🔍 Analyzing Stevesdj website content...');

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    await page.goto('https://stevesdj.com', { waitUntil: 'networkidle' });
    await page.waitForTimeout(5000); // Wait for JavaScript to load

    // Get page title
    const title = await page.title();
    console.log(`📄 Page title: ${title}`);

    // Get visible text content
    const textContent = await page.evaluate(() => {
      return document.body.innerText;
    });
    console.log(`📝 Page text content (first 1000 chars):\n${textContent.substring(0, 1000)}\n`);

    // Look for karaoke-related keywords
    const karaokeKeywords = [
      'karaoke',
      'dj',
      'music',
      'show',
      'event',
      'schedule',
      'entertainment',
      'party',
    ];
    console.log('🎤 Karaoke-related content found:');

    karaokeKeywords.forEach((keyword) => {
      const regex = new RegExp(keyword, 'gi');
      const matches = textContent.match(regex);
      if (matches) {
        console.log(`  - "${keyword}": ${matches.length} occurrences`);
      }
    });

    // Check for specific elements that might contain schedule info
    const headings = await page.$$eval('h1, h2, h3, h4, h5, h6', (els) =>
      els.map((el) => el.textContent.trim()).filter((text) => text.length > 0),
    );
    console.log('\n📋 Page headings:');
    headings.forEach((heading, i) => {
      console.log(`  ${i + 1}. ${heading}`);
    });

    // Check for any list items or schedule-like content
    const listItems = await page.$$eval('li, .event, .show, .schedule', (els) =>
      els.map((el) => el.textContent.trim()).filter((text) => text.length > 0),
    );
    if (listItems.length > 0) {
      console.log('\n📅 Potential schedule items:');
      listItems.slice(0, 10).forEach((item, i) => {
        console.log(`  ${i + 1}. ${item}`);
      });
    }

    // Check for contact information
    const contactInfo = await page.evaluate(() => {
      const text = document.body.innerText;
      const phoneRegex = /\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
      const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

      const phones = text.match(phoneRegex) || [];
      const emails = text.match(emailRegex) || [];

      return { phones, emails };
    });

    console.log('\n📞 Contact information found:');
    if (contactInfo.phones.length > 0) {
      console.log(`  Phones: ${contactInfo.phones.join(', ')}`);
    }
    if (contactInfo.emails.length > 0) {
      console.log(`  Emails: ${contactInfo.emails.join(', ')}`);
    }

    // Take a screenshot for manual inspection
    await page.screenshot({ path: 'stevesdj-analysis.png', fullPage: true });
    console.log('\n📸 Full page screenshot saved as stevesdj-analysis.png');

    // Check for navigation or menu items
    const navItems = await page.$$eval('nav a, .menu a, header a, .navigation a', (els) =>
      els.map((el) => ({ text: el.textContent.trim(), href: el.href })),
    );
    if (navItems.length > 0) {
      console.log('\n🧭 Navigation items:');
      navItems.forEach((item, i) => {
        if (item.text.length > 0) {
          console.log(`  ${i + 1}. ${item.text} -> ${item.href}`);
        }
      });
    }
  } catch (error) {
    console.error(`❌ Error analyzing Stevesdj: ${error.message}`);
  } finally {
    await browser.close();
  }
}

analyzeStevesdjContent();
