#!/usr/bin/env node

/**
 * Instagram Profile Parser for Karaoke Shows
 * Specialized parser for DJ/Karaoke Instagram profiles like @djmax614
 */

const puppeteer = require('puppeteer');
const axios = require('axios');

const PROFILE_URL = 'https://www.instagram.com/djmax614';

async function parseInstagramProfile() {
  console.log('📷 Parsing Instagram Profile for Karaoke Shows');
  console.log(`Target: ${PROFILE_URL}\n`);

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: false, // Show browser for debugging
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

    // Set user agent to look like a real browser
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    );

    console.log('🌐 Navigating to Instagram profile...');
    await page.goto(PROFILE_URL, { waitUntil: 'networkidle2', timeout: 30000 });

    // Wait for page to load
    await new Promise((resolve) => setTimeout(resolve, 5000));

    console.log('📊 Extracting profile and post data...');

    const profileData = await page.evaluate(() => {
      const result = {
        profile: {
          username: '',
          displayName: '',
          bio: '',
          followerCount: '',
          postCount: '',
          website: '',
        },
        posts: [],
        stories: [],
        highlights: [],
      };

      // Try to get profile information
      try {
        // Username
        const usernameEl =
          document.querySelector('h2') || document.querySelector('[data-testid="user-name"]');
        if (usernameEl) result.profile.username = usernameEl.textContent.trim();

        // Display name
        const nameEl =
          document.querySelector('h1') || document.querySelector('[data-testid="profile-name"]');
        if (nameEl) result.profile.displayName = nameEl.textContent.trim();

        // Bio
        const bioEl =
          document.querySelector('[data-testid="user-biography"]') ||
          document.querySelector('div[dir="auto"] span') ||
          document.querySelector('section span');
        if (bioEl && bioEl.textContent.length > 10) {
          result.profile.bio = bioEl.textContent.trim();
        }

        // Follower count
        const followersEl =
          document.querySelector('a[href*="followers"]') ||
          document.querySelector('span:contains("followers")');
        if (followersEl) result.profile.followerCount = followersEl.textContent.trim();

        // Post count
        const postsEl =
          document.querySelector('span[title]') ||
          document.querySelector('div[data-testid="user-posts-count"]');
        if (postsEl) result.profile.postCount = postsEl.textContent.trim();
      } catch (error) {
        console.log('Error extracting profile info:', error.message);
      }

      // Try to get recent posts
      try {
        const postElements = document.querySelectorAll('article img[alt], [role="img"]');
        postElements.forEach((img, index) => {
          if (index < 12) {
            // Get first 12 posts
            const alt = img.getAttribute('alt') || '';
            const src = img.getAttribute('src') || '';

            // Look for parent link to get post URL
            let postUrl = '';
            let parent = img.parentElement;
            while (parent && !postUrl) {
              if (parent.tagName === 'A' && parent.href.includes('/p/')) {
                postUrl = parent.href;
                break;
              }
              parent = parent.parentElement;
            }

            if (alt || src) {
              result.posts.push({
                alt: alt,
                imageUrl: src,
                postUrl: postUrl,
                index: index,
              });
            }
          }
        });
      } catch (error) {
        console.log('Error extracting posts:', error.message);
      }

      // Try to extract any visible text that might contain schedule info
      const allText = document.body.innerText;
      result.visibleText = allText.substring(0, 2000);

      return result;
    });

    console.log('✅ Profile data extracted!');
    console.log('\n📋 Profile Information:');
    console.log(`Username: ${profileData.profile.username || 'Not found'}`);
    console.log(`Display Name: ${profileData.profile.displayName || 'Not found'}`);
    console.log(`Bio: ${profileData.profile.bio || 'Not found'}`);
    console.log(`Posts Found: ${profileData.posts.length}`);

    // Analyze bio and posts for karaoke information
    const karaokeData = analyzeForKaraokeShows(profileData);

    console.log('\n🎤 Karaoke Shows Analysis:');
    if (karaokeData.shows.length > 0) {
      console.log(`Found ${karaokeData.shows.length} potential karaoke shows:`);
      karaokeData.shows.forEach((show, index) => {
        console.log(`${index + 1}. ${show.venue} - ${show.day} ${show.time}`);
        if (show.description) console.log(`   Details: ${show.description}`);
      });
    } else {
      console.log('No obvious karaoke schedule found in bio or recent posts');
    }

    if (karaokeData.venues.length > 0) {
      console.log('\n🏢 Venues Mentioned:');
      karaokeData.venues.forEach((venue, index) => {
        console.log(`${index + 1}. ${venue}`);
      });
    }

    // Return structured data
    return {
      profile: profileData.profile,
      posts: profileData.posts,
      karaokeShows: karaokeData.shows,
      venues: karaokeData.venues,
      rawText: profileData.visibleText,
    };
  } catch (error) {
    console.error('❌ Instagram parsing failed:', error.message);
    return null;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

function analyzeForKaraokeShows(profileData) {
  const shows = [];
  const venues = new Set();

  // Combine bio and post data for analysis
  const textToAnalyze = [
    profileData.profile.bio,
    profileData.profile.displayName,
    profileData.visibleText,
    ...profileData.posts.map((p) => p.alt),
  ]
    .join(' ')
    .toLowerCase();

  console.log('\n🔍 Analyzing text for karaoke patterns...');
  console.log('Sample text:', textToAnalyze.substring(0, 200) + '...');

  // Look for day/time patterns
  const dayPatterns = [
    /monday|mon\b/gi,
    /tuesday|tue\b|tues\b/gi,
    /wednesday|wed\b/gi,
    /thursday|thu\b|thur\b|thurs\b/gi,
    /friday|fri\b/gi,
    /saturday|sat\b/gi,
    /sunday|sun\b/gi,
  ];

  const timePatterns = [
    /\d{1,2}:\d{2}\s*(am|pm)/gi,
    /\d{1,2}\s*(am|pm)/gi,
    /\d{1,2}\s*-\s*\d{1,2}\s*(am|pm)/gi,
  ];

  // Look for venue patterns
  const venuePatterns = [
    /(?:at|@)\s*([A-Z][a-zA-Z\s&']+(?:bar|club|restaurant|grill|tavern|pub|lounge))/gi,
    /karaoke\s+(?:at|@)\s*([A-Z][a-zA-Z\s&']+)/gi,
    /([A-Z][a-zA-Z\s&']+(?:bar|club|restaurant|grill|tavern|pub|lounge))/gi,
  ];

  // Extract potential venues
  venuePatterns.forEach((pattern) => {
    const matches = textToAnalyze.matchAll(pattern);
    for (const match of matches) {
      const venue = match[1] ? match[1].trim() : match[0].trim();
      if (venue.length > 3 && venue.length < 50) {
        venues.add(venue);
      }
    }
  });

  // Look for karaoke-specific terms
  const karaokeTerms = [
    'karaoke',
    'sing',
    'singing',
    'dj',
    'music',
    'host',
    'hosting',
    'mic',
    'microphone',
    'songs',
    'performance',
    'live music',
  ];

  const hasKaraokeTerms = karaokeTerms.some((term) => textToAnalyze.includes(term.toLowerCase()));

  if (hasKaraokeTerms) {
    console.log('✅ Karaoke-related content detected');
  } else {
    console.log('⚠️  No obvious karaoke terms found');
  }

  // Try to extract schedule from bio if it contains structured info
  const bioLower = profileData.profile.bio.toLowerCase();
  if (bioLower.includes('karaoke') || bioLower.includes('dj')) {
    // Look for patterns like "Mondays at 7pm" or "Wed 8-11pm"
    const schedulePatterns = [
      /(monday|tuesday|wednesday|thursday|friday|saturday|sunday)s?\s*(?:at\s*|@\s*)?(\d{1,2}(?::\d{2})?\s*(?:am|pm))/gi,
      /(mon|tue|wed|thu|fri|sat|sun)\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm))/gi,
    ];

    schedulePatterns.forEach((pattern) => {
      const matches = bioLower.matchAll(pattern);
      for (const match of matches) {
        shows.push({
          day: match[1],
          time: match[2],
          venue: Array.from(venues)[0] || 'TBD',
          description: `From Instagram bio: ${profileData.profile.bio}`,
          confidence: 0.7,
        });
      }
    });
  }

  return {
    shows: shows,
    venues: Array.from(venues),
    hasKaraokeContent: hasKaraokeTerms,
  };
}

async function sendToKaraokeParser(profileData) {
  console.log('\n🚀 Attempting to send to KaraokeHub parser...');

  try {
    // Check if local server is running
    const serverCheck = await axios.get('http://localhost:8000/api/config/client');
    console.log('✅ KaraokeHub server is running');

    // Format data for the parser
    const parserData = {
      url: PROFILE_URL,
      content: `
        Profile: ${profileData.profile.displayName} (@${profileData.profile.username})
        Bio: ${profileData.profile.bio}
        
        Recent Posts:
        ${profileData.posts.map((p) => `- ${p.alt}`).join('\n')}
        
        Raw Text Content:
        ${profileData.rawText}
      `,
      type: 'instagram_profile',
    };

    // Send to parser (assuming you have a parser endpoint)
    const response = await axios.post('http://localhost:8000/api/parser/parse', parserData);
    console.log('✅ Successfully sent to parser:', response.data);

    return response.data;
  } catch (error) {
    console.log('❌ Could not send to KaraokeHub parser:', error.message);
    console.log('💡 Make sure your server is running: npm run start:dev');
    return null;
  }
}

// Main execution
async function main() {
  console.log('🎭 Instagram Karaoke Parser for @djmax614\n');

  const profileData = await parseInstagramProfile();

  if (profileData) {
    console.log('\n📊 === SUMMARY ===');
    console.log(`Profile: ${profileData.profile.displayName || profileData.profile.username}`);
    console.log(`Bio: ${profileData.profile.bio || 'No bio found'}`);
    console.log(`Posts Analyzed: ${profileData.posts.length}`);
    console.log(`Karaoke Shows Found: ${profileData.karaokeShows.length}`);
    console.log(`Venues Mentioned: ${profileData.venues.length}`);

    // Try to send to your existing parser system
    await sendToKaraokeParser(profileData);

    return profileData;
  } else {
    console.log('❌ Failed to parse Instagram profile');
    return null;
  }
}

// Export for use in other modules
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { parseInstagramProfile, analyzeForKaraokeShows };
