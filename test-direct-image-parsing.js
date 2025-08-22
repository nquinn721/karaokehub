#!/usr/bin/env node

/**
 * Direct test of the image parsing function to debug the issue
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const https = require('https');

async function testDirectImageParsing() {
  console.log('🔍 Direct Image Parsing Test...');

  const testImageUrl =
    'https://scontent-lga3-3.xx.fbcdn.net/v/t39.30808-6/531728618_25196274846628830_3797538359077498425_n.jpg?stp=dst-jpg_s851x315_tt6&_nc_cat=106&ccb=1-7&_nc_sid=aa7b47&_nc_ohc=7LiteQgqJ_4Q7kNvwFlqMPx&_nc_oc=AdmrYSgJF5aXyd3c-SW67HLbaQE4fCGs5mlu31C2YiAQMKCMbinMbgK1zp_JAFnlaDM&_nc_zt=23&_nc_ht=scontent-lga3-3.xx&_nc_gid=L37vvQfUeWxdDRIh1QZqzQ&oh=00_AfWUQNQXT2yX_DfaMJuqt7HYX4bf3A6cYuig-NARc4NATw&oe=68ABCA9D';

  try {
    console.log('📥 Fetching image...');
    const base64Image = await loadImageAsBase64(testImageUrl);
    console.log('✅ Image loaded:', base64Image.length, 'characters');

    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not found in environment');
    }

    console.log('🤖 Initializing Gemini...');
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

    const prompt = `Analyze this social media image and extract ANY karaoke-related information, even if not from a formal event flyer. Look for:

BROAD KARAOKE CONTENT DETECTION:
1. Venue mentions (bars, restaurants, clubs where karaoke happens)
2. Any text mentioning "karaoke", "singing", "mic night", "open mic"
3. DJ/host names in social contexts
4. Location information (addresses, venue names, business names)
5. Casual photos FROM karaoke venues/events
6. Social media posts ABOUT karaoke events
7. Screenshots of conversations mentioning karaoke venues

BE FLEXIBLE AND INCLUSIVE:
- Extract venue names even from casual mentions or photos
- Look for DJ names in comments, captions, or casual references  
- Extract location info from any context (not just formal flyers)
- Include venues that "host karaoke" even if not explicitly stated
- Consider bars/clubs/restaurants as potential karaoke venues
- Extract information from low-quality or blurry images when possible

Return JSON format:
{
  "vendor": "company, venue, or business name related to karaoke",
  "dj": "DJ, host, or performer name (even casual mentions)",
  "show": {
    "venue": "any venue name mentioned (bar, club, restaurant, etc.)",
    "address": "any address or location information",
    "time": "any time mentioned",
    "startTime": "start time if available",
    "endTime": "end time if available", 
    "state": "state if mentioned",
    "zip": "zip code if visible",
    "city": "city if mentioned",
    "day": "day of week or date if mentioned",
    "venuePhone": "phone number if visible",
    "venueWebsite": "website if visible"
  }
}

EXAMPLES of what to extract:
- Venue photo with visible business name → extract as venue
- Social post "had fun at Mike's Bar last night" → venue: "Mike's Bar"
- Comment "DJ Steve was great" → dj: "DJ Steve" 
- Caption "karaoke at downtown lounge" → venue: "downtown lounge"
- Blurry sign with partial business name → extract what you can see
- Group discussion about where to go for karaoke → extract venue names

If NO karaoke-related content is found AT ALL, return empty fields.
Return ONLY the JSON object, no other text.`;

    console.log('🔄 Calling Gemini API...');
    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: base64Image,
          mimeType: 'image/jpeg',
        },
      },
    ]);

    const response = result.response.text().trim();
    console.log('\n📝 Raw Gemini Response:');
    console.log('='.repeat(50));
    console.log(response);
    console.log('='.repeat(50));

    // Try to parse JSON
    try {
      const jsonMatch = response.match(/\{[\s\S]*?\}/);
      if (jsonMatch) {
        const parsedData = JSON.parse(jsonMatch[0]);
        console.log('\n✅ Parsed JSON Data:');
        console.log('  Vendor:', parsedData.vendor || 'None');
        console.log('  DJ:', parsedData.dj || 'None');
        console.log('  Show Venue:', parsedData.show?.venue || 'None');
        console.log('  Address:', parsedData.show?.address || 'None');
        console.log('  Time:', parsedData.show?.time || 'None');

        if (parsedData.vendor || parsedData.dj || parsedData.show?.venue) {
          console.log('\n🎉 SUCCESS: Found karaoke data!');
        } else {
          console.log('\n⚠️ All fields are empty - no karaoke data detected');
        }
      } else {
        console.log('❌ No JSON found in response');
      }
    } catch (parseError) {
      console.log('❌ Failed to parse JSON:', parseError.message);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.message.includes('GEMINI_API_KEY')) {
      console.log('💡 Make sure GEMINI_API_KEY is set in your environment');
    }
  }
}

function loadImageAsBase64(imageUrl) {
  return new Promise((resolve, reject) => {
    https
      .get(imageUrl, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
          return;
        }

        const chunks = [];
        response.on('data', (chunk) => {
          chunks.push(chunk);
        });

        response.on('end', () => {
          const buffer = Buffer.concat(chunks);
          const base64 = buffer.toString('base64');
          resolve(base64);
        });
      })
      .on('error', reject);
  });
}

testDirectImageParsing();
