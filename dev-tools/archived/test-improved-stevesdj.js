const puppeteer = require('puppeteer');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');

async function testImprovedStevesdjParsing() {
  console.log('🔍 Testing improved Stevesdj parsing with specialized prompt...');

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.log('❌ GEMINI_API_KEY not set. Set it with: export GEMINI_API_KEY=your_api_key');
    return;
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: { width: 1920, height: 1080 },
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    );

    console.log('📍 Navigating to: https://stevesdj.com/karaoke-schedule');
    await page.goto('https://stevesdj.com/karaoke-schedule', {
      waitUntil: 'networkidle2',
      timeout: 60000,
    });

    await new Promise((resolve) => setTimeout(resolve, 5000));

    const screenshot = await page.screenshot({
      fullPage: true,
      encoding: 'base64',
    });

    console.log('📸 Screenshot captured, analyzing with specialized DJ schedule prompt...');

    // Specialized prompt for DJ schedule pages
    const djSchedulePrompt = `You are analyzing a screenshot of a DJ's karaoke schedule website. This shows where and when a DJ performs karaoke shows at different venues.

IMPORTANT: This is a DJ SCHEDULE page, not a venue directory. Extract each karaoke event/show that this DJ performs.

Look for:
1. Day of the week (Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday)
2. Time information (like "7:00PM - 11:00PM", "8:00PM - 12:00AM")
3. Venue/Location names (bars, restaurants, lounges, etc.)
4. DJ names (the person performing)
5. Addresses and contact information
6. Any special notes (like "Last Saturday of Month" or "Temporarily Canceled")

For each karaoke show/event found, extract:
- venue: The name of the establishment
- time: The time range or specific time
- djName: The DJ performing (extract from text like "with DJ Steve", "with DJ Chas")
- description: Any additional details about the event
- address: Full address if available
- city: City name
- state: State abbreviation or full name
- zip: ZIP code if available
- venuePhone: Phone number if available
- dayOfWeek: Which day this occurs (convert to standard format like "Sunday", "Monday", etc.)

Return a JSON object with:
{
  "vendor": {
    "name": "Business/DJ name",
    "website": "Website URL",
    "description": "Brief description",
    "confidence": 0.95
  },
  "djs": [
    {
      "name": "DJ Name",
      "confidence": 0.9
    }
  ],
  "shows": [
    {
      "venue": "Venue Name",
      "time": "7:00PM - 11:00PM",
      "djName": "DJ Name",
      "description": "Karaoke show details",
      "address": "Full address",
      "city": "City",
      "state": "State",
      "zip": "ZIP",
      "venuePhone": "Phone",
      "dayOfWeek": "Sunday",
      "confidence": 0.9
    }
  ]
}

Analyze the screenshot and extract ALL karaoke shows/events you can find:`;

    const result = await model.generateContent([
      djSchedulePrompt,
      {
        inlineData: {
          data: screenshot,
          mimeType: 'image/png',
        },
      },
    ]);

    const responseText = result.response.text();
    console.log('🤖 AI Response:');
    console.log(responseText);

    // Try to parse JSON response
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsedResult = JSON.parse(jsonMatch[0]);
        console.log('\n📊 Parsed Results:');
        console.log('Vendor:', parsedResult.vendor?.name || 'Not found');
        console.log('DJs found:', parsedResult.djs?.length || 0);
        console.log('Shows found:', parsedResult.shows?.length || 0);

        if (parsedResult.shows && parsedResult.shows.length > 0) {
          console.log('\n🎤 Shows detected:');
          parsedResult.shows.forEach((show, index) => {
            console.log(
              `${index + 1}. ${show.dayOfWeek}: ${show.venue} (${show.time}) with ${show.djName}`,
            );
            console.log(`   Address: ${show.address}, ${show.city}, ${show.state} ${show.zip}`);
            console.log(`   Phone: ${show.venuePhone || 'N/A'}`);
            console.log(`   Confidence: ${show.confidence}`);
            console.log('');
          });
        }
      }
    } catch (parseError) {
      console.log('❌ Failed to parse JSON response:', parseError.message);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
}

testImprovedStevesdjParsing();
