/**
 * Direct test of Gemini Vision parsing of a Facebook image URL
 * Tests if we can extract karaoke show info from the CDN image
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

async function testSingleImageParsing() {
  console.log('🖼️ Direct Image URL Parsing Test');
  console.log('=================================');

  const imageUrl =
    'https://scontent-lga3-3.xx.fbcdn.net/v/t39.30808-6/531728618_25196274846628830_3797538359077498425_n.jpg?stp=dst-jpg_s851x315_tt6&_nc_cat=106&ccb=1-7&_nc_sid=aa7b47&_nc_ohc=7LiteQgqJ_4Q7kNvwFlqMPx&_nc_oc=AdmrYSgJF5aXyd3c-SW67HLbaQE4fCGs5mlu31C2YiAQMKCMbinMbgK1zp_JAFnlaDM&_nc_zt=23&_nc_ht=scontent-lga3-3.xx&_nc_gid=L37vvQfUeWxdDRIh1QZqzQ&oh=00_AfWUQNQXT2yX_DfaMJuqt7HYX4bf3A6cYuig-NARc4NATw&oe=68ABCA9D';

  try {
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      throw new Error('GEMINI_API_KEY not found in .env file');
    }

    console.log('🧠 Initializing Gemini Vision...');
    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
      generationConfig: {
        temperature: 0.1,
        topP: 0.8,
        topK: 40,
        maxOutputTokens: 2048,
      },
    });

    console.log('📸 Fetching image from Facebook CDN...');
    console.log(`Image URL: ${imageUrl}`);

    // Fetch the image
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
    }

    const imageBuffer = await response.arrayBuffer();
    console.log(`✅ Image fetched successfully (${imageBuffer.byteLength} bytes)`);

    // Prepare the prompt
    const prompt = `Please analyze this karaoke event flyer/image and extract the following information:

1. VENUE NAME and full address (street, city, state, zip if visible)
2. DATE and TIME of karaoke shows 
3. DJ NAME(S)
4. Any special events, themes, or additional details
5. Contact information (phone, website, etc.)

Format your response as JSON:
{
  "venue": "venue name",
  "address": "full address if available", 
  "city": "city",
  "state": "state",
  "zip": "zip code if visible",
  "date": "date info",
  "time": "time info", 
  "djName": "dj name(s)",
  "description": "any additional details",
  "contact": "phone/website if visible"
}

If any information is not clearly visible, use "Not specified" for that field.`;

    console.log('🔍 Analyzing image with Gemini Vision...');

    const imagePart = {
      inlineData: {
        data: Buffer.from(imageBuffer).toString('base64'),
        mimeType: 'image/jpeg',
      },
    };

    const result = await model.generateContent([prompt, imagePart]);
    const responseText = await result.response.text();

    console.log('\n📝 RAW GEMINI RESPONSE:');
    console.log('========================');
    console.log(responseText);

    // Try to parse JSON response
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*?\}/);
      if (jsonMatch) {
        const extractedData = JSON.parse(jsonMatch[0]);

        console.log('\n✨ EXTRACTED KARAOKE INFO:');
        console.log('===========================');
        console.log(`🏢 Venue: ${extractedData.venue || 'Not found'}`);
        console.log(`📍 Address: ${extractedData.address || 'Not found'}`);
        console.log(`🏙️ City: ${extractedData.city || 'Not found'}`);
        console.log(`🗺️ State: ${extractedData.state || 'Not found'}`);
        console.log(`📅 Date: ${extractedData.date || 'Not found'}`);
        console.log(`⏰ Time: ${extractedData.time || 'Not found'}`);
        console.log(`🎤 DJ: ${extractedData.djName || 'Not found'}`);
        console.log(`📝 Description: ${extractedData.description || 'None'}`);
        console.log(`📞 Contact: ${extractedData.contact || 'Not found'}`);

        console.log('\n🎯 SUCCESS! Image parsing worked!');

        if (extractedData.venue && extractedData.venue !== 'Not specified') {
          console.log(
            '✅ This approach can successfully extract karaoke show info from Facebook images!',
          );
        } else {
          console.log('⚠️ Limited info extracted - may need to adjust prompts or image quality');
        }
      } else {
        console.log('⚠️ Could not find JSON in response');
      }
    } catch (parseError) {
      console.log('⚠️ Could not parse JSON response, but got text analysis');
    }
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);

    if (error.message.includes('GEMINI_API_KEY')) {
      console.log('\n🔧 FIX: Set your Gemini API key in .env:');
      console.log('GEMINI_API_KEY=your-gemini-api-key');
    }

    if (error.message.includes('fetch')) {
      console.log('\n🔧 FIX: Check internet connection or image URL accessibility');
    }

    process.exit(1);
  }
}

testSingleImageParsing();
