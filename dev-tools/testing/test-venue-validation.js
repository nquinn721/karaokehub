#!/usr/bin/env node

/**
 * Test script for venue validation endpoint
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

async function testVenueValidation() {
  console.log('🧪 Testing Venue Validation with Gemini AI');
  console.log('==========================================\n');

  // Test if Gemini API key is available
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('❌ GEMINI_API_KEY not found in environment variables');
    return;
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      generationConfig: {
        temperature: 0.1,
        topP: 0.8,
        topK: 40,
        maxOutputTokens: 2048,
      },
    });

    // Test venue lookup
    const testVenue = "Mulligan's Sports Bar, 123 Main St, Anytown, NY";
    console.log(`🔍 Testing venue lookup for: ${testVenue}`);

    const prompt = `You are a venue data validation expert. Look up accurate information for this venue and compare it with the current database data.

Venue to lookup: "${testVenue}"

Current database data:
- Name: Mulligan's Sports Bar
- Address: 123 Main St
- City: Anytown
- State: NY
- ZIP: Not provided
- Phone: Not provided
- Website: Not provided
- Coordinates: Not provided

Please find the most accurate, up-to-date information for this venue and return a JSON response with this structure:

{
  "venueFound": true/false,
  "confidence": 0.0-1.0,
  "suggestedData": {
    "name": "Exact venue name",
    "address": "Full street address",
    "city": "City name",
    "state": "State abbreviation (2 letters)",
    "zip": "ZIP code",
    "phone": "Phone number",
    "website": "Website URL",
    "lat": number,
    "lng": number
  },
  "conflicts": [
    "List of specific conflicts found between current and suggested data"
  ],
  "message": "Summary of findings"
}

If the venue cannot be found or you're not confident in the information, set venueFound to false and confidence to 0.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    console.log('📝 Gemini Response:');
    console.log(text);

    // Try to parse JSON
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsedData = JSON.parse(jsonMatch[0]);
        console.log('\n✅ Successfully parsed JSON response:');
        console.log(JSON.stringify(parsedData, null, 2));

        if (parsedData.venueFound) {
          console.log(`\n🎯 Venue found with confidence: ${parsedData.confidence}`);
          if (parsedData.conflicts && parsedData.conflicts.length > 0) {
            console.log('⚠️ Conflicts detected:');
            parsedData.conflicts.forEach((conflict) => console.log(`  - ${conflict}`));
          }
        } else {
          console.log('\n❌ Venue not found or low confidence');
        }
      } catch (parseError) {
        console.error('❌ Failed to parse JSON:', parseError.message);
      }
    } else {
      console.error('❌ No valid JSON found in response');
    }

    console.log('\n✅ Venue validation test completed successfully!');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testVenueValidation();
