const puppeteer = require('puppeteer');
const axios = require('axios');

async function analyzeConnecticutPage() {
  console.log('🔍 Analyzing Connecticut karaoke page...\n');

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
        '--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      ],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    console.log('📡 Loading page...');
    await page.goto('https://karaokeviewpoint.com/karaoke-in-connecticut/', {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });

    console.log('📄 Extracting page content...');

    // Get the page title
    const title = await page.title();
    console.log(`Title: ${title}`);

    // Get basic page stats
    const content = await page.content();
    console.log(`Page size: ${content.length} characters`);

    // Look for karaoke-related content
    const karaokeMatches = content.match(/karaoke/gi) || [];
    console.log(`"Karaoke" mentions: ${karaokeMatches.length}`);

    // Look for venue/event patterns
    const venuePatterns = [
      /venue/gi,
      /bar/gi,
      /restaurant/gi,
      /night/gi,
      /show/gi,
      /event/gi,
      /pm|am/gi,
      /monday|tuesday|wednesday|thursday|friday|saturday|sunday/gi,
    ];

    console.log('\n📊 Content Analysis:');
    venuePatterns.forEach((pattern, index) => {
      const matches = content.match(pattern) || [];
      const labels = ['venue', 'bar', 'restaurant', 'night', 'show', 'event', 'time', 'days'];
      console.log(`${labels[index]}: ${matches.length} matches`);
    });

    // Extract visible text content
    const textContent = await page.evaluate(() => {
      return document.body.innerText || document.body.textContent || '';
    });

    console.log(`\nVisible text length: ${textContent.length} characters`);

    // Look for structured data or specific selectors
    const structuredData = await page.evaluate(() => {
      const results = {
        jsonLd: [],
        microdata: [],
        eventElements: [],
        listElements: [],
      };

      // Check for JSON-LD
      const jsonLdElements = document.querySelectorAll('script[type="application/ld+json"]');
      results.jsonLd = Array.from(jsonLdElements).map((el) => el.textContent);

      // Check for microdata
      const microdataElements = document.querySelectorAll('[itemtype]');
      results.microdata = Array.from(microdataElements).map((el) => ({
        itemtype: el.getAttribute('itemtype'),
        text: el.textContent?.substring(0, 200),
      }));

      // Check for event-like elements
      const eventSelectors = [
        '.event',
        '.show',
        '.venue',
        '[class*="karaoke"]',
        '[class*="event"]',
        '[class*="show"]',
      ];

      eventSelectors.forEach((selector) => {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          results.eventElements.push({
            selector,
            count: elements.length,
            sample: elements[0]?.textContent?.substring(0, 100),
          });
        }
      });

      // Check for list elements that might contain venues
      const lists = document.querySelectorAll('ul, ol, div[class*="list"]');
      results.listElements = Array.from(lists)
        .slice(0, 5)
        .map((el) => ({
          tagName: el.tagName,
          className: el.className,
          itemCount: el.children.length,
          sample: el.textContent?.substring(0, 200),
        }));

      return results;
    });

    console.log('\n🏗️ Structured Data:');
    console.log(`JSON-LD scripts: ${structuredData.jsonLd.length}`);
    console.log(`Microdata elements: ${structuredData.microdata.length}`);
    console.log(`Event-like elements: ${structuredData.eventElements.length}`);
    console.log(`List elements: ${structuredData.listElements.length}`);

    if (structuredData.eventElements.length > 0) {
      console.log('\n📅 Event Elements Found:');
      structuredData.eventElements.forEach((el) => {
        console.log(`  ${el.selector}: ${el.count} elements`);
        if (el.sample) console.log(`    Sample: ${el.sample}`);
      });
    }

    if (structuredData.listElements.length > 0) {
      console.log('\n📋 List Elements:');
      structuredData.listElements.forEach((el, index) => {
        console.log(`  ${index + 1}. ${el.tagName}.${el.className} (${el.itemCount} items)`);
        if (el.sample) console.log(`     Sample: ${el.sample.replace(/\n/g, ' ')}`);
      });
    }

    // Get a sample of the visible content for analysis
    const contentSample = textContent.substring(0, 2000);
    console.log('\n📝 Content Sample (first 2000 chars):');
    console.log('=' + '='.repeat(50));
    console.log(contentSample);
    console.log('=' + '='.repeat(50));

    // Test what DeepSeek would receive
    const smartContent = await page.evaluate(() => {
      // Simulate the smart content extraction logic
      const navSections = [];
      const menuPattern =
        /<(?:nav|header|menu|ul|ol|div)[^>]*(?:class|id)="[^"]*(?:nav|menu|header|dropdown|breadcrumb|pagination)[^"]*"[^>]*>.*?<\/(?:nav|header|menu|ul|ol|div)>/gis;
      const html = document.documentElement.outerHTML;
      const navMatches = html.match(menuPattern) || [];

      return {
        fullHtmlLength: html.length,
        navSections: navMatches.length,
        navSample: navMatches[0]?.substring(0, 500) || 'No nav found',
      };
    });

    console.log('\n🤖 DeepSeek Input Analysis:');
    console.log(`Full HTML length: ${smartContent.fullHtmlLength}`);
    console.log(`Navigation sections found: ${smartContent.navSections}`);
    console.log(`Nav sample: ${smartContent.navSample}`);
  } catch (error) {
    console.error('❌ Analysis failed:', error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

analyzeConnecticutPage();
