#!/usr/bin/env node

/**
 * Test real venue validation
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

async function testRealVenue() {
  console.log('🧪 Testing Real Venue Validation');
  console.log('=================================\n');

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('❌ GEMINI_API_KEY not found');
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

    // Test with a well-known venue
    const testVenue = "The Abbey Bar, West Hollywood, CA";
    console.log(`🔍 Testing real venue: ${testVenue}`);

    const prompt = `You are a venue data validation expert. Look up accurate information for this venue and compare it with the current database data.

Venue to lookup: "${testVenue}"

Current database data:
- Name: The Abbey Bar
- Address: Not provided
- City: West Hollywood
- State: CA
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
}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    console.log('📝 Gemini Response:');
    console.log(text);

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsedData = JSON.parse(jsonMatch[0]);
        console.log('\n✅ Successfully parsed JSON response:');
        console.log(JSON.stringify(parsedData, null, 2));
        
        if (parsedData.venueFound && parsedData.confidence > 0.7) {
          console.log(`\n🎯 High confidence venue found: ${parsedData.confidence}`);
          console.log('📍 Suggested data:');
          console.log(`  Name: ${parsedData.suggestedData.name}`);
          console.log(`  Address: ${parsedData.suggestedData.address}`);
          console.log(`  Phone: ${parsedData.suggestedData.phone || 'N/A'}`);
          console.log(`  Website: ${parsedData.suggestedData.website || 'N/A'}`);
        }
      } catch (parseError) {
        console.error('❌ Failed to parse JSON:', parseError.message);
      }
    }

    console.log('\n✅ Real venue test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testRealVenue();