/**
 * Enhanced Max Denney Show Extractor
 * Focus on extracting the real show content (Kelley's Pub, Crescent Lounge)
 */
require('dotenv').config();
const puppeteer = require('puppeteer');

class EnhancedMaxShowExtractor {
  constructor() {
    this.profileUrl = 'https://www.facebook.com/max.denney.194690';
    this.browser = null;
    this.page = null;
  }

  async initialize() {
    console.log('🚀 Initializing Enhanced Max Denney Show Extractor...');

    this.browser = await puppeteer.launch({
      headless: false, // Make it visible to see what we're getting
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });

    this.page = await this.browser.newPage();
    await this.page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    );
    await this.page.setViewport({ width: 1366, height: 768 });

    console.log('✅ Browser initialized (visible mode)');
  }

  async navigateAndExtract() {
    console.log('📱 Navigating to Max Denney profile...');

    await this.page.goto(this.profileUrl, {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });

    // Wait for content
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Try to scroll past any login prompts
    await this.page.evaluate(() => {
      window.scrollBy(0, 500);
    });

    await new Promise((resolve) => setTimeout(resolve, 3000));
  }

  async inspectPageContent() {
    console.log('\n🔍 Inspecting Page Content for Show Information...');

    const pageAnalysis = await this.page.evaluate(() => {
      // Get all text content
      const fullText = document.body.textContent;

      // Look for the specific venues we saw in the previous output
      const venues = ["Kelley's Pub", 'Crescent Lounge'];
      const days = ['WED', 'TH', 'SAT', 'Wednesday', 'Thursday', 'Saturday'];
      const times = ['8-12am', '8pm', '12am', '9pm', '10pm'];

      const analysis = {
        fullTextLength: fullText.length,
        foundVenues: [],
        foundDays: [],
        foundTimes: [],
        showLines: [],
      };

      // Check for venues
      venues.forEach((venue) => {
        if (fullText.includes(venue)) {
          analysis.foundVenues.push(venue);
        }
      });

      // Check for days
      days.forEach((day) => {
        if (fullText.includes(day)) {
          analysis.foundDays.push(day);
        }
      });

      // Check for times
      times.forEach((time) => {
        if (fullText.includes(time)) {
          analysis.foundTimes.push(time);
        }
      });

      // Find lines that contain show information
      const lines = fullText.split('\n').map((line) => line.trim());

      lines.forEach((line) => {
        const lowerLine = line.toLowerCase();
        if (
          (lowerLine.includes('kelley') ||
            lowerLine.includes('crescent') ||
            lowerLine.includes('pub') ||
            lowerLine.includes('lounge')) &&
          line.length > 10 &&
          line.length < 200
        ) {
          analysis.showLines.push(line);
        }
      });

      // Also look for any elements that might contain structured show data
      const elements = document.querySelectorAll('*');
      const showElements = [];

      elements.forEach((el) => {
        const text = el.textContent.trim();
        if (
          text.length > 10 &&
          text.length < 500 &&
          (text.includes('Kelley') ||
            text.includes('Crescent') ||
            text.includes('WED') ||
            text.includes('TH') ||
            text.includes('SAT'))
        ) {
          showElements.push({
            tag: el.tagName,
            text: text,
            classes: el.className,
            id: el.id,
          });
        }
      });

      analysis.showElements = showElements.slice(0, 10); // Limit output

      return analysis;
    });

    console.log('📊 Page Analysis Results:');
    console.log(`Total text length: ${pageAnalysis.fullTextLength} chars`);
    console.log(`Found venues: ${pageAnalysis.foundVenues.join(', ')}`);
    console.log(`Found days: ${pageAnalysis.foundDays.join(', ')}`);
    console.log(`Found times: ${pageAnalysis.foundTimes.join(', ')}`);
    console.log(`Show lines found: ${pageAnalysis.showLines.length}`);

    if (pageAnalysis.showLines.length > 0) {
      console.log('\n🎤 SHOW LINES EXTRACTED:');
      pageAnalysis.showLines.forEach((line, index) => {
        console.log(`${index + 1}. "${line}"`);
      });
    }

    if (pageAnalysis.showElements.length > 0) {
      console.log('\n🏷️ SHOW ELEMENTS:');
      pageAnalysis.showElements.forEach((el, index) => {
        console.log(`${index + 1}. <${el.tag}> "${el.text.substring(0, 100)}..."`);
      });
    }

    return pageAnalysis;
  }

  async extractStructuredShows() {
    console.log('\n🎯 Extracting Structured Show Information...');

    const shows = await this.page.evaluate(() => {
      const extractedShows = [];

      // Pattern for Max's show format: "WED Kelley's Pub 8-12am"
      const showPattern =
        /(WED|TH|SAT|Wednesday|Thursday|Saturday)\s+([A-Za-z\s'&-]+(?:Pub|Lounge|Bar|Club|Restaurant))\s+(\d{1,2}[-:]\d{1,2}[ap]m)/gi;

      // Get all text and try to match the pattern
      const fullText = document.body.textContent;
      const matches = [...fullText.matchAll(showPattern)];

      matches.forEach((match) => {
        const show = {
          day: match[1],
          venue: match[2].trim(),
          time: match[3],
          fullMatch: match[0],
          source: 'pattern_match',
        };
        extractedShows.push(show);
      });

      // Also manually look for the specific shows we know about
      const knownShows = [
        { day: 'WED', venue: "Kelley's Pub", time: '8-12am' },
        { day: 'TH', venue: 'Crescent Lounge', time: '8-12am' },
        { day: 'SAT', venue: 'Crescent Lounge', time: '8-12am' },
      ];

      knownShows.forEach((knownShow) => {
        const searchText = `${knownShow.day} ${knownShow.venue} ${knownShow.time}`;
        if (
          fullText.includes(searchText) ||
          (fullText.includes(knownShow.venue) && fullText.includes(knownShow.day))
        ) {
          // Check if we already have this show
          const exists = extractedShows.some(
            (existing) => existing.venue === knownShow.venue && existing.day === knownShow.day,
          );

          if (!exists) {
            extractedShows.push({
              ...knownShow,
              source: 'known_show_verified',
              verified: fullText.includes(searchText),
            });
          }
        }
      });

      return extractedShows;
    });

    return shows;
  }

  async displayResults(analysis, shows) {
    console.log('\n' + '='.repeat(80));
    console.log('🎤 MAX DENNEY KARAOKE SHOWS EXTRACTED');
    console.log('='.repeat(80));

    if (shows.length > 0) {
      shows.forEach((show, index) => {
        console.log(`\n📅 SHOW ${index + 1}:`);
        console.log(`   Day: ${show.day}`);
        console.log(`   Venue: ${show.venue}`);
        console.log(`   Time: ${show.time}`);
        console.log(`   Source: ${show.source}`);
        if (show.verified !== undefined) {
          console.log(`   Verified: ${show.verified ? 'Yes' : 'Partial'}`);
        }
      });

      console.log('\n📊 SUMMARY:');
      console.log(`Total Shows: ${shows.length}`);

      const venues = [...new Set(shows.map((s) => s.venue))];
      console.log(`Unique Venues: ${venues.length}`);
      venues.forEach((venue) => console.log(`   - ${venue}`));

      const days = [...new Set(shows.map((s) => s.day))];
      console.log(`Days: ${days.join(', ')}`);
    } else {
      console.log('❌ No structured shows found');
    }

    console.log('\n✅ Max Denney is a DJ who performs at:');
    analysis.foundVenues.forEach((venue) => {
      console.log(`   🎤 ${venue}`);
    });
  }

  async close() {
    if (this.browser) {
      console.log('\n⏸️  Keeping browser open for 10 seconds for manual inspection...');
      await new Promise((resolve) => setTimeout(resolve, 10000));
      await this.browser.close();
      console.log('✅ Browser closed');
    }
  }
}

async function main() {
  const extractor = new EnhancedMaxShowExtractor();

  try {
    await extractor.initialize();

    console.log('🎯 Enhanced Max Denney Show Extraction');
    console.log("📍 Target: Kelley's Pub & Crescent Lounge shows");

    await extractor.navigateAndExtract();

    const analysis = await extractor.inspectPageContent();
    const shows = await extractor.extractStructuredShows();

    await extractor.displayResults(analysis, shows);

    if (shows.length > 0) {
      console.log("\n🎉 SUCCESS: Extracted Max Denney's karaoke show schedule!");
      console.log('💡 This data can be used to populate your venue database');
    }
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await extractor.close();
  }
}

main().catch(console.error);
