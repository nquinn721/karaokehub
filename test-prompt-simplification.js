/**
 * Test script to compare complex vs simplified Gemini prompts
 * This will help us see if the simplified instructions work better
 */

const fs = require('fs');
const path = require('path');

// Mock Facebook data (from our analysis)
const mockFacebookData = {
  profileInfo: {
    name: 'Max Denney',
    followers: '2K',
    location: 'Columbus, Ohio',
    instagram: 'DJMAX614',
    bio: 'Digital creator',
  },
  schedule: [
    { day: 'WED', venue: "Kelley's Pub", time: '8pm-12am', dayOfWeek: 'Wednesday' },
    { day: 'TH', venue: 'Crescent Lounge', time: '8pm-12am', dayOfWeek: 'Thursday' },
    { day: 'SAT', venue: 'Crescent Lounge', time: '8pm-12am', dayOfWeek: 'Saturday' },
    { day: 'FRI', venue: "O'Nelly's", time: '9pm-2am', dayOfWeek: 'Friday' },
    { day: 'SUN', venue: 'North High Dublin', time: '6pm-9pm', dayOfWeek: 'Sunday' },
  ],
  recentPosts: [
    {
      timeAgo: '22h',
      content: 'Fridays! @onellyssportspub #Karaoke 9pm-2am!',
      venue: 'onellyssportspub',
      time: '9pm-2am',
      date: 'friday',
    },
  ],
  venues: ["Kelley's Pub", 'Crescent Lounge', "O'Nelly's", 'North High Dublin'],
  additionalShows: [],
};

function comparePrompts() {
  console.log('📝 GEMINI PROMPT COMPARISON');
  console.log('===========================');

  // OLD COMPLEX PROMPT (simplified version for readability)
  const oldComplexPrompt = `You are analyzing Facebook profile data for karaoke show extraction...

IMPORTANT: This is STRUCTURED FACEBOOK DATA, not raw website text. Parse intelligently to extract karaoke shows and events.

FACEBOOK DATA ANALYSIS INSTRUCTIONS:

1. PROFILE ANALYSIS:
   - Extract DJ/performer name from profile information
   - Use bio/description for business context
   - Look for Instagram handles as DJ aliases
   - Identify location/service area

2. SCHEDULE PARSING:
   - Parse the "schedule" array for regular weekly shows
   - Each schedule item has: day, venue, time, dayOfWeek
   - Convert day names to lowercase (monday, tuesday, etc.)
   - Parse time ranges (e.g., "8pm-12am" → startTime: "20:00", endTime: "00:00")

3. RECENT POSTS ANALYSIS:
   - Analyze "recentPosts" for current show announcements
   - Look for venue mentions, times, dates in post content
   - Extract hashtags and venue tags (@venue)
   - Identify any schedule changes or special events

4. VENUE IDENTIFICATION:
   - Match venue names from schedule and posts
   - Look for consistent venue naming (e.g., "O'Nelly's" vs "onellyssportspub")
   - Extract location information from venue mentions

5. TIME PARSING:
   - Convert time formats consistently
   - Handle overnight shows (e.g., 9pm-2am means 21:00-02:00)
   - Use 24-hour format for startTime/endTime

6. CONFIDENCE SCORING:
   - High confidence (0.9+) for structured schedule data
   - Medium confidence (0.7-0.8) for post-derived information
   - Lower confidence for inferred information

[... extensive JSON format examples ...]

Facebook Profile Data:
${JSON.stringify(mockFacebookData, null, 2)}`;

  // NEW SIMPLIFIED PROMPT
  const newSimplifiedPrompt = `Extract karaoke shows from this structured Facebook profile data.

The data contains:
- Profile info (name, bio, location)  
- Schedule array (regular weekly shows)
- Recent posts (current announcements)

Convert each scheduled show to this format:
- Parse day names to lowercase (monday, tuesday, etc.)
- Convert times to 24-hour format (9pm = 21:00, 2am = 02:00)  
- Use venue names as provided
- Set confidence 0.9 for schedule data, 0.7 for posts

Return JSON only (no markdown):
{
  "vendor": {"name": "DJ Name", "confidence": 0.95},
  "djs": [{"name": "DJ name", "confidence": 0.9}],
  "shows": [
    {
      "venue": "Venue Name",
      "day": "monday|tuesday|etc",
      "time": "original time",
      "startTime": "HH:MM", 
      "endTime": "HH:MM",
      "confidence": 0.9
    }
  ]
}

Data: ${JSON.stringify(mockFacebookData, null, 2)}`;

  console.log('\n📊 PROMPT ANALYSIS:');
  console.log('===================');
  console.log(`Old Complex Prompt Length: ${oldComplexPrompt.length} characters`);
  console.log(`New Simplified Prompt Length: ${newSimplifiedPrompt.length} characters`);
  console.log(
    `Reduction: ${Math.round((1 - newSimplifiedPrompt.length / oldComplexPrompt.length) * 100)}%`,
  );

  console.log('\n🎯 KEY DIFFERENCES:');
  console.log('==================');
  console.log('❌ OLD COMPLEX APPROACH:');
  console.log('- 6 detailed analysis sections');
  console.log('- Extensive JSON format examples');
  console.log('- Complex confidence scoring rules');
  console.log('- Multiple venue matching strategies');
  console.log('- Detailed time parsing instructions');
  console.log('- Over-engineering the prompt');

  console.log('\n✅ NEW SIMPLIFIED APPROACH:');
  console.log('- Direct task description');
  console.log('- Clear, simple requirements');
  console.log('- Minimal but sufficient JSON format');
  console.log('- Basic confidence rules (0.9 vs 0.7)');
  console.log('- Trust the AI to understand context');
  console.log('- Focus on essential transformations');

  console.log('\n💡 EXPECTED BENEFITS:');
  console.log('=====================');
  console.log('1. FASTER PROCESSING: Less token usage');
  console.log('2. CLEARER FOCUS: Less ambiguity in instructions');
  console.log('3. BETTER RESULTS: AI can focus on core task');
  console.log('4. REDUCED ERRORS: Less chance of instruction conflicts');
  console.log('5. EASIER MAINTENANCE: Simpler to modify and debug');

  console.log('\n🔬 WHAT TO TEST:');
  console.log('================');
  console.log('- Does simplified prompt still extract all shows?');
  console.log('- Are time conversions handled correctly?');
  console.log('- Is venue naming consistent?');
  console.log('- Are confidence scores appropriate?');
  console.log('- Is JSON format correct?');

  return {
    oldLength: oldComplexPrompt.length,
    newLength: newSimplifiedPrompt.length,
    reduction: Math.round((1 - newSimplifiedPrompt.length / oldComplexPrompt.length) * 100),
    testData: mockFacebookData,
  };
}

// Run the comparison
if (require.main === module) {
  const results = comparePrompts();

  console.log('\n✅ PROMPT COMPARISON COMPLETED!');
  console.log(`\n📈 SUMMARY: Reduced prompt complexity by ${results.reduction}%`);
  console.log(
    'Next step: Test the simplified prompt with real Facebook data to verify it works correctly.',
  );
}

module.exports = { comparePrompts };
