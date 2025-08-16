/**
 * Analyze Max Denney's Recent Facebook Posts
 * Extracts recent post information from known Facebook profile data
 */

// Sample data from our previous Facebook analysis
const maxProfileData = {
  vendor: {
    name: 'Max Denney',
    owner: 'Max Denney',
    website: 'https://www.facebook.com/max.denney.194690',
    description: 'Digital creator, Lives in Columbus, Ohio',
    confidence: 0.95,
  },
  djs: [
    {
      name: 'Max Denney',
      confidence: 1,
      context: 'Profile information',
    },
    {
      name: 'DJMAX614',
      confidence: 0.8,
      context: 'Instagram handle linked on profile',
    },
  ],
  shows: [
    {
      venue: "Kelley's Pub",
      address: 'Columbus, Ohio',
      date: 'wednesday',
      time: '8pm-12am',
      startTime: '20:00',
      endTime: '00:00',
      day: 'wednesday',
      djName: 'Max Denney',
      confidence: 0.9,
    },
    {
      venue: 'Crescent Lounge',
      address: 'Columbus, Ohio',
      date: 'thursday',
      time: '8pm-12am',
      startTime: '20:00',
      endTime: '00:00',
      day: 'thursday',
      djName: 'Max Denney',
      confidence: 0.9,
    },
    {
      venue: 'Crescent Lounge',
      address: 'Columbus, Ohio',
      date: 'saturday',
      time: '8pm-12am',
      startTime: '20:00',
      endTime: '00:00',
      day: 'saturday',
      djName: 'Max Denney',
      confidence: 0.9,
    },
    {
      venue: "O'Nelly's",
      address: 'Columbus, Ohio',
      date: 'friday',
      time: '9pm-2am',
      startTime: '21:00',
      endTime: '02:00',
      day: 'friday',
      djName: 'Max Denney',
      confidence: 0.95,
    },
    {
      venue: 'North High Dublin',
      address: 'Columbus, Ohio',
      date: 'sunday',
      time: '6pm-9pm',
      startTime: '18:00',
      endTime: '21:00',
      day: 'sunday',
      djName: 'Max Denney',
      confidence: 0.9,
    },
  ],
  rawData: {
    content: 'Max Denney 22h · Shared with Public Fridays! @onellyssportspub #Karaoke 9pm-2am!',
  },
};

function analyzeMaxRecentPosts() {
  console.log("🎤 Analyzing Max Denney's Recent Facebook Activity");
  console.log('=================================================');

  // Extract the recent post from the profile data
  const recentPostContent = maxProfileData.rawData.content;

  console.log('\n🎯 RECENT POST DETECTED (22 hours ago):');
  console.log('=======================================');

  // Parse the recent post
  if (recentPostContent.includes('22h')) {
    const postText = recentPostContent.match(/22h[\s\S]*$/)[0];
    console.log(`📅 Posted: 22 hours ago`);
    console.log(`📝 Content: "${postText}"`);

    // Analyze the post content
    const analysis = analyzePost(postText);
    console.log(`🎤 Karaoke Score: ${analysis.score}/10`);
    console.log(`🏢 Venue: ${analysis.venue}`);
    console.log(`⏰ Time: ${analysis.time}`);
    console.log(`📱 Social Tags: ${analysis.socialTags.join(', ')}`);
    console.log(`🏷️ Hashtags: ${analysis.hashtags.join(', ')}`);

    console.log('\n📊 POST ANALYSIS:');
    console.log(`• Venue Confidence: ${analysis.venueConfidence}%`);
    console.log(`• Time Confidence: ${analysis.timeConfidence}%`);
    console.log(
      `• Karaoke Relevance: ${analysis.score >= 8 ? 'HIGH' : analysis.score >= 5 ? 'MEDIUM' : 'LOW'}`,
    );
    console.log(`• Call to Action: ${analysis.hasCallToAction ? 'YES' : 'NO'}`);
  }

  // Current weekly schedule
  console.log('\n📅 CURRENT WEEKLY KARAOKE SCHEDULE:');
  console.log('===================================');

  const today = new Date();
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const currentDay = days[today.getDay()];

  maxProfileData.shows.forEach((show, idx) => {
    const isToday = show.day.toLowerCase() === currentDay;
    const dayIndicator = isToday ? '👉 TODAY' : '';

    console.log(`${idx + 1}. ${show.day.toUpperCase()} ${dayIndicator}`);
    console.log(`   🏢 Venue: ${show.venue}`);
    console.log(`   ⏰ Time: ${show.time}`);
    console.log(`   📍 Location: ${show.address}`);
    console.log(`   🎤 DJ: ${show.djName}`);
    console.log(`   🎯 Confidence: ${(show.confidence * 100).toFixed(0)}%`);
    console.log('─'.repeat(40));
  });

  // Upcoming shows this week
  console.log('\n📆 UPCOMING SHOWS THIS WEEK:');
  console.log('============================');

  const dayNumbers = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
  };

  const todayNumber = today.getDay();
  const upcomingShows = maxProfileData.shows
    .filter((show) => {
      const showDay = dayNumbers[show.day.toLowerCase()];
      return showDay >= todayNumber;
    })
    .sort((a, b) => dayNumbers[a.day.toLowerCase()] - dayNumbers[b.day.toLowerCase()]);

  if (upcomingShows.length > 0) {
    upcomingShows.forEach((show, idx) => {
      const daysUntil = dayNumbers[show.day.toLowerCase()] - todayNumber;
      const timeUntil =
        daysUntil === 0 ? 'TODAY' : daysUntil === 1 ? 'TOMORROW' : `in ${daysUntil} days`;

      console.log(`${idx + 1}. ${show.venue} - ${timeUntil}`);
      console.log(`   📅 ${show.day.charAt(0).toUpperCase() + show.day.slice(1)} at ${show.time}`);
    });
  } else {
    console.log("No more shows this week. Check next week's schedule!");
  }

  // Social media recommendations
  console.log('\n📱 FOLLOW FOR REAL-TIME UPDATES:');
  console.log('=================================');
  console.log('🎤 Instagram: @DJMAX614');
  console.log('📘 Facebook: Max Denney');
  console.log('💡 Pro Tip: Follow @onellyssportspub for venue updates');

  // Generate recommendations
  console.log('\n💡 RECOMMENDATIONS:');
  console.log('===================');
  console.log('1. 📱 Check @DJMAX614 Instagram for daily show confirmations');
  console.log('2. 📞 Call venues before attending to confirm shows');
  console.log('3. 🔔 Enable Facebook notifications for Max Denney');
  console.log('4. 📧 Check venue websites for special events or cancellations');

  // Venue contact suggestions
  console.log('\n📞 VENUE CONTACT INFO TO VERIFY SHOWS:');
  console.log('======================================');
  console.log("• O'Nellys Sports Pub (Friday shows)");
  console.log('• Crescent Lounge (Thursday & Saturday shows)');
  console.log("• Kelley's Pub (Wednesday shows)");
  console.log('• North High Dublin (Sunday shows)');

  return {
    recentPost: {
      content: recentPostContent,
      timeAgo: '22 hours',
      venue: "O'Nellys Sports Pub",
      day: 'Friday',
      time: '9pm-2am',
    },
    weeklySchedule: maxProfileData.shows,
    socialMedia: {
      instagram: '@DJMAX614',
      facebook: 'Max Denney',
    },
    upcomingShows: upcomingShows,
    lastAnalyzed: new Date().toISOString(),
  };
}

function analyzePost(postText) {
  const lowerText = postText.toLowerCase();
  let score = 0;

  // Karaoke indicators
  if (lowerText.includes('karaoke')) score += 10;
  if (lowerText.includes('#karaoke')) score += 12;
  if (lowerText.includes('dj')) score += 8;
  if (lowerText.includes('music')) score += 6;
  if (lowerText.includes('show')) score += 6;
  if (lowerText.includes('singing')) score += 8;

  // Venue indicators
  let venue = 'Unknown';
  let venueConfidence = 0;
  if (lowerText.includes('onellys') || lowerText.includes('@onellyssportspub')) {
    venue = "O'Nellys Sports Pub";
    venueConfidence = 95;
    score += 10;
  }

  // Time extraction
  let time = 'Unknown';
  let timeConfidence = 0;
  const timeMatch = lowerText.match(
    /(\d{1,2}pm-\d{1,2}am|\d{1,2}:\d{2}pm-\d{1,2}:\d{2}am|\d{1,2}pm|\d{1,2}am)/,
  );
  if (timeMatch) {
    time = timeMatch[1];
    timeConfidence = 90;
    score += 8;
  }

  // Day indicators
  const dayMatch = lowerText.match(
    /(monday|tuesday|wednesday|thursday|friday|saturday|sunday|tonight|today)/,
  );
  if (dayMatch) score += 6;

  // Social media tags
  const socialTags = [];
  const atMatches = postText.match(/@\w+/g) || [];
  socialTags.push(...atMatches);

  // Hashtags
  const hashtags = [];
  const hashMatches = postText.match(/#\w+/g) || [];
  hashtags.push(...hashMatches);

  // Call to action indicators
  const hasCallToAction =
    lowerText.includes('!') ||
    lowerText.includes('come') ||
    lowerText.includes('join') ||
    hashtags.length > 0;

  return {
    score: Math.min(score, 10),
    venue: venue,
    venueConfidence: venueConfidence,
    time: time,
    timeConfidence: timeConfidence,
    socialTags: socialTags,
    hashtags: hashtags,
    hasCallToAction: hasCallToAction,
    dayFound: dayMatch ? dayMatch[1] : null,
  };
}

// Run the analysis
if (require.main === module) {
  try {
    const results = analyzeMaxRecentPosts();
    console.log('\n✅ Analysis complete!');
    console.log(`🎯 Recent activity: ${results.recentPost ? 'Found 1 post' : 'No recent posts'}`);
    console.log(`📅 Weekly shows: ${results.weeklySchedule.length} regular venues`);
    console.log(`⏰ Upcoming shows: ${results.upcomingShows.length} this week`);
  } catch (error) {
    console.error('❌ Analysis failed:', error);
  }
}

module.exports = { analyzeMaxRecentPosts };
