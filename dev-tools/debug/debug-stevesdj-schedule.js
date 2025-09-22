const puppeteer = require('puppeteer');
const fs = require('fs');

async function debugStevesdjSchedule() {
  console.log('🔍 Starting Stevesdj Karaoke Schedule Debug...');

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1920, height: 1080 },
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();

    // Set a realistic user agent
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    );

    console.log('📍 Navigating to: https://stevesdj.com/karaoke-schedule');

    // Navigate with extended timeout
    await page.goto('https://stevesdj.com/karaoke-schedule', {
      waitUntil: 'networkidle2',
      timeout: 60000,
    });

    console.log('⏱️ Waiting for content to load...');
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Check what's on the page
    const pageTitle = await page.title();
    console.log('📄 Page title:', pageTitle);

    // Get all text content
    const textContent = await page.evaluate(() => document.body.innerText);
    console.log('📝 Page text content (first 1000 chars):');
    console.log(textContent.substring(0, 1000));
    console.log('...');

    // Look for karaoke-related keywords
    const karaokeKeywords = [
      'karaoke',
      'schedule',
      'weekly',
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
      'sunday',
      'venue',
      'location',
      'bar',
      'restaurant',
    ];
    const foundKeywords = karaokeKeywords.filter((keyword) =>
      textContent.toLowerCase().includes(keyword.toLowerCase()),
    );
    console.log('🎯 Found karaoke keywords:', foundKeywords);

    // Check for table structures
    const tables = await page.evaluate(() => {
      const tables = Array.from(document.querySelectorAll('table'));
      return tables.map((table) => ({
        rowCount: table.rows.length,
        text: table.innerText.substring(0, 200),
      }));
    });
    console.log('📊 Tables found:', tables.length);
    tables.forEach((table, i) => {
      console.log(`Table ${i + 1}: ${table.rowCount} rows`);
      console.log(`Content: ${table.text}...`);
    });

    // Check for divs that might contain schedule info
    const scheduleContainers = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('div, section, article'));
      return elements
        .filter((el) => {
          const text = el.innerText?.toLowerCase() || '';
          return text.includes('schedule') || text.includes('karaoke') || text.includes('weekly');
        })
        .map((el) => ({
          tagName: el.tagName,
          className: el.className,
          text: el.innerText.substring(0, 300),
        }));
    });
    console.log('📋 Schedule containers:', scheduleContainers.length);
    scheduleContainers.forEach((container, i) => {
      console.log(`Container ${i + 1}: ${container.tagName}.${container.className}`);
      console.log(`Text: ${container.text}...`);
    });

    // Take a screenshot to see what we're working with
    await page.screenshot({ path: 'stevesdj-schedule-debug.png', fullPage: true });
    console.log('📸 Screenshot saved as stevesdj-schedule-debug.png');

    // Check if content is loaded dynamically
    console.log('⏱️ Waiting additional time for dynamic content...');
    await new Promise((resolve) => setTimeout(resolve, 10000));

    const updatedTextContent = await page.evaluate(() => document.body.innerText);
    if (updatedTextContent.length !== textContent.length) {
      console.log('🔄 Content changed after waiting - dynamic loading detected!');
      console.log('📝 Updated content (first 1000 chars):');
      console.log(updatedTextContent.substring(0, 1000));
    } else {
      console.log('📌 No additional content loaded dynamically');
    }

    // Look for specific schedule patterns
    const schedulePattern =
      /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b.*?(\d{1,2}:\d{2}|\d{1,2}\s*(pm|am))/gi;
    const scheduleMatches = updatedTextContent.match(schedulePattern);
    console.log('🗓️ Schedule patterns found:', scheduleMatches?.length || 0);
    if (scheduleMatches) {
      scheduleMatches.forEach((match, i) => {
        console.log(`  ${i + 1}: ${match}`);
      });
    }
  } catch (error) {
    console.error('❌ Error during debug:', error.message);
  } finally {
    await browser.close();
  }
}

debugStevesdjSchedule();
