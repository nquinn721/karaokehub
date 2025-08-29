const axios = require('axios');

async function quickAnalysis() {
  console.log('🔍 Quick analysis of Connecticut page...\n');

  try {
    // First, let's just fetch the HTML directly
    console.log('📡 Fetching page HTML...');
    const response = await axios.get('https://karaokeviewpoint.com/karaoke-in-connecticut/', {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
      timeout: 10000,
    });

    const html = response.data;
    console.log(`✅ Page loaded: ${html.length} characters`);

    // Basic content analysis
    const karaokeCount = (html.match(/karaoke/gi) || []).length;
    const venueCount = (html.match(/venue/gi) || []).length;
    const timeCount = (html.match(/\d{1,2}:\d{2}|pm|am/gi) || []).length;
    const dayCount = (
      html.match(/monday|tuesday|wednesday|thursday|friday|saturday|sunday/gi) || []
    ).length;

    console.log('\n📊 Content Analysis:');
    console.log(`"Karaoke" mentions: ${karaokeCount}`);
    console.log(`"Venue" mentions: ${venueCount}`);
    console.log(`Time references: ${timeCount}`);
    console.log(`Day references: ${dayCount}`);

    // Look for structured patterns
    const addressPatterns =
      html.match(
        /\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln)/gi,
      ) || [];
    const phonePatterns =
      html.match(/\(\d{3}\)\s*\d{3}-\d{4}|\d{3}-\d{3}-\d{4}|\d{3}\.\d{3}\.\d{4}/g) || [];

    console.log(`Address patterns: ${addressPatterns.length}`);
    console.log(`Phone patterns: ${phonePatterns.length}`);

    // Check if this is a listing page or content page
    const listItems = (html.match(/<li[^>]*>/gi) || []).length;
    const divItems = (
      html.match(/<div[^>]*class="[^"]*(?:item|card|listing|venue|event)[^"]*"/gi) || []
    ).length;

    console.log(`List items: ${listItems}`);
    console.log(`Potential venue/event divs: ${divItems}`);

    // Sample of content
    const cleanText = html
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    console.log('\n📝 First 500 characters of clean text:');
    console.log('=' + '='.repeat(50));
    console.log(cleanText.substring(0, 500));
    console.log('=' + '='.repeat(50));

    // Check for JavaScript that might load content dynamically
    const scriptTags = (html.match(/<script[^>]*>/gi) || []).length;
    const hasReact = html.includes('react') || html.includes('React');
    const hasAjax = html.includes('ajax') || html.includes('fetch') || html.includes('xhr');

    console.log('\n🔧 Dynamic Content Indicators:');
    console.log(`Script tags: ${scriptTags}`);
    console.log(`React detected: ${hasReact}`);
    console.log(`AJAX patterns: ${hasAjax}`);

    // Test what would be sent to DeepSeek (truncated version)
    const truncated = cleanText.substring(0, 8000);
    console.log(`\n🤖 DeepSeek would receive: ${truncated.length} characters`);

    // Look for obvious karaoke venue patterns
    const venueRegex =
      /(.*?)(karaoke|live music|entertainment).*?(\d+.*?(?:street|st|avenue|ave|road|rd|boulevard|blvd|drive|dr).*?(?:\d{5}|\w+,\s*\w{2}))/gi;
    const venueMatches = cleanText.match(venueRegex) || [];

    console.log(`\n🎯 Potential venue matches: ${venueMatches.length}`);
    if (venueMatches.length > 0) {
      console.log('Sample venue match:');
      console.log(venueMatches[0].substring(0, 200));
    }
  } catch (error) {
    console.error('❌ Analysis failed:', error.message);
  }
}

quickAnalysis();
