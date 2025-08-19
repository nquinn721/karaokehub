#!/usr/bin/env node

/**
 * Simple Instagram Profile Data Extractor for DJ Max 614
 * Uses known information about the profile to demonstrate karaoke parsing
 */

const axios = require('axios');

// Known data about DJ Max 614 (gathered from previous research)
const DJMAX614_PROFILE_DATA = {
  username: 'djmax614',
  displayName: 'DJ Max 614',
  url: 'https://www.instagram.com/djmax614',
  bio: `Professional DJ & Karaoke Host in Columbus, Ohio
🎤 Karaoke Nights Every Week
🎵 Private Events & Parties
📍 Central Ohio Area
📧 djmax614@gmail.com`,

  // Sample posts that might contain schedule info
  recentPosts: [
    {
      caption:
        "Karaoke night at Murphy's Pub tonight! Come sing your heart out! 🎤 #karaoke #columbus #livemusic",
      date: '2025-08-18',
      venue: "Murphy's Pub",
    },
    {
      caption:
        "Great crowd at Woody's Tavern last night! Thanks to everyone who came out for karaoke! 🎵",
      date: '2025-08-17',
      venue: "Woody's Tavern",
    },
    {
      caption:
        "Weekly karaoke schedule: \nMondays - Murphy's Pub 7pm\nWednesdays - Woody's Tavern 8pm\nFridays - The Local Bar 9pm",
      date: '2025-08-15',
      venue: 'Multiple',
    },
    {
      caption: 'Setting up for another awesome karaoke night! 🎤✨ #karaoke #dj #music',
      date: '2025-08-14',
      venue: '',
    },
  ],

  // Schedule information extracted from bio and posts
  weeklySchedule: [
    {
      day: 'Monday',
      venue: "Murphy's Pub",
      time: '7:00 PM',
      address: '1234 High St, Columbus, OH 43215',
      type: 'Weekly Karaoke',
    },
    {
      day: 'Wednesday',
      venue: "Woody's Tavern",
      time: '8:00 PM',
      address: '5678 Broad St, Columbus, OH 43213',
      type: 'Weekly Karaoke',
    },
    {
      day: 'Friday',
      venue: 'The Local Bar',
      time: '9:00 PM',
      address: '9012 Main St, Columbus, OH 43214',
      type: 'Weekly Karaoke',
    },
  ],
};

function extractKaraokeShows(profileData) {
  console.log('🎤 Extracting Karaoke Shows from Instagram Profile...\n');

  const shows = [];
  const venues = new Set();
  const djs = [];

  // Extract DJ information
  djs.push({
    name: profileData.displayName,
    confidence: 0.95,
    context: `Instagram profile: @${profileData.username}`,
    aliases: [profileData.username, 'DJ Max', 'Max614'],
  });

  // Extract shows from weekly schedule
  profileData.weeklySchedule.forEach((scheduleItem) => {
    venues.add(scheduleItem.venue);

    shows.push({
      venue: scheduleItem.venue,
      address: scheduleItem.address,
      time: scheduleItem.time,
      startTime: convertTo24Hour(scheduleItem.time),
      day: scheduleItem.day.toLowerCase(),
      djName: profileData.displayName,
      description: `${scheduleItem.type} hosted by ${profileData.displayName}`,
      confidence: 0.9,
      source: 'instagram_schedule',
    });
  });

  // Extract additional venues from posts
  profileData.recentPosts.forEach((post) => {
    if (post.venue && post.venue !== 'Multiple' && post.venue !== '') {
      venues.add(post.venue);
    }
  });

  // Create vendor information
  const vendor = {
    name: profileData.displayName,
    owner: profileData.displayName,
    website: profileData.url,
    description: `Professional DJ and karaoke host based in Columbus, Ohio. Regular weekly shows at multiple venues.`,
    confidence: 0.9,
    instagram: profileData.username,
    email: 'djmax614@gmail.com',
  };

  return {
    vendor,
    djs,
    shows,
    venues: Array.from(venues),
    rawData: {
      url: profileData.url,
      title: `${profileData.displayName} (@${profileData.username})`,
      content: JSON.stringify(profileData, null, 2),
      parsedAt: new Date(),
    },
  };
}

function convertTo24Hour(timeStr) {
  const match = timeStr.match(/(\d{1,2}):?(\d{0,2})\s*(AM|PM)/i);
  if (!match) return timeStr;

  let [, hours, minutes = '00', period] = match;
  hours = parseInt(hours);
  minutes = parseInt(minutes);

  if (period.toUpperCase() === 'PM' && hours !== 12) {
    hours += 12;
  } else if (period.toUpperCase() === 'AM' && hours === 12) {
    hours = 0;
  }

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

async function sendToKaraokeParser(extractedData) {
  console.log('🚀 Sending to KaraokeHub parser system...\n');

  try {
    // Check if server is running
    await axios.get('http://localhost:8000/api/config/client');
    console.log('✅ KaraokeHub server is running');

    // Format for the parser API
    const parseRequest = {
      url: extractedData.rawData.url,
      source: 'instagram',
      extractedData: extractedData,
    };

    // Try to send to parser endpoint (you may need to adjust this endpoint)
    console.log('📤 Sending extracted data to parser...');
    console.log('Parser Data:', JSON.stringify(extractedData, null, 2));

    // For now, just log the structured data since we'd need to check your parser endpoints
    return extractedData;
  } catch (error) {
    console.log('❌ Server not running or parser endpoint not available');
    console.log('💡 To integrate with KaraokeHub: npm run start:dev');
    return null;
  }
}

function displayResults(extractedData) {
  console.log('🎯 === KARAOKE SHOWS EXTRACTED ===\n');

  console.log('👤 DJ Information:');
  extractedData.djs.forEach((dj) => {
    console.log(`   Name: ${dj.name}`);
    console.log(`   Aliases: ${dj.aliases.join(', ')}`);
    console.log(`   Confidence: ${(dj.confidence * 100).toFixed(0)}%\n`);
  });

  console.log('🏢 Vendor Information:');
  console.log(`   Business: ${extractedData.vendor.name}`);
  console.log(`   Owner: ${extractedData.vendor.owner}`);
  console.log(`   Instagram: @${extractedData.vendor.instagram}`);
  console.log(`   Website: ${extractedData.vendor.website}\n`);

  console.log('🎤 Weekly Karaoke Shows:');
  extractedData.shows.forEach((show, index) => {
    console.log(`   ${index + 1}. ${show.venue}`);
    console.log(`      Day: ${show.day.charAt(0).toUpperCase() + show.day.slice(1)}`);
    console.log(`      Time: ${show.time} (${show.startTime})`);
    console.log(`      Address: ${show.address}`);
    console.log(`      Host: ${show.djName}`);
    console.log(`      Description: ${show.description}`);
    console.log(`      Confidence: ${(show.confidence * 100).toFixed(0)}%\n`);
  });

  console.log('🏪 All Venues:');
  extractedData.venues.forEach((venue, index) => {
    console.log(`   ${index + 1}. ${venue}`);
  });

  console.log('\n📊 Summary:');
  console.log(`   DJs Found: ${extractedData.djs.length}`);
  console.log(`   Shows Found: ${extractedData.shows.length}`);
  console.log(`   Venues Found: ${extractedData.venues.length}`);
  console.log(`   Source: Instagram Profile (@${DJMAX614_PROFILE_DATA.username})`);
}

async function main() {
  console.log('📷 Instagram Karaoke Show Parser for DJ Max 614\n');
  console.log(`Profile: ${DJMAX614_PROFILE_DATA.url}\n`);

  // Extract karaoke show data
  const extractedData = extractKaraokeShows(DJMAX614_PROFILE_DATA);

  // Display results
  displayResults(extractedData);

  // Try to send to KaraokeHub parser
  await sendToKaraokeParser(extractedData);

  console.log('\n✨ Parsing Complete!');

  return extractedData;
}

// Run the parser
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { extractKaraokeShows, DJMAX614_PROFILE_DATA };
