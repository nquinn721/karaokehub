const puppeteer = require('puppeteer');
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testUpdatedStevesdjParsing() {
  console.log('🔍 Testing updated Stevesdj parsing with new prompt structure...');

  const apiKey = 'AIzaSyBOEmtaXuPs55-mD0pnlKdC1r3lpClzf0o';
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

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

    console.log('📸 Screenshot captured, testing with production prompt structure...');

    // Use the exact prompt structure from the updated parser
    const prompt = `FIRST: Analyze the page type - is this a VENUE DIRECTORY or a DJ SCHEDULE PAGE?

PAGE TYPE DETECTION:
1. VENUE DIRECTORY: Shows many different venues with their individual schedules
2. DJ SCHEDULE PAGE: Shows where/when a specific DJ or DJ company performs at various venues

IF DJ SCHEDULE PAGE (like "Steve's DJ", "DJ Schedule", single company performing at multiple venues):
Extract each performance/event where this DJ/company performs:
- Each day/venue combination is a separate show
- Extract the DJ name from context (e.g., "with DJ Steve", "DJ Chas")
- Extract venue names where they perform
- Extract complete address information for each venue
- Extract show times and days

EXAMPLE DJ SCHEDULE EXTRACTION:
If you see: "SUNDAYS KARAOKE 7:00PM - 11:00PM with DJ Steve - ALIBI BEACH LOUNGE - 8010 Surf Drive Panama City Beach, FL 32408"
Extract as:
- venues: [{"name": "Alibi Beach Lounge", "address": "8010 Surf Drive", "city": "Panama City Beach", "state": "FL", "zip": "32408"}]
- djs: [{"name": "DJ Steve", "confidence": 0.9}]
- shows: [{"venueName": "Alibi Beach Lounge", "day": "Sunday", "time": "7:00PM - 11:00PM", "startTime": "19:00", "endTime": "23:00", "djName": "DJ Steve"}]

Return ONLY valid JSON with no extra text:

{
  "vendor": {
    "name": "Company Name",
    "website": "https://stevesdj.com/karaoke-schedule",
    "description": "Brief description",
    "confidence": 0.9
  },
  "venues": [
    {
      "name": "Venue Name",
      "address": "ONLY street address (no city/state/zip)",
      "city": "ONLY city name",
      "state": "ONLY 2-letter state code",
      "zip": "ONLY zip code",
      "lat": 39.961176,
      "lng": -82.998794,
      "phone": "Phone number",
      "website": "Venue website if available",
      "confidence": 0.9
    }
  ],
  "djs": [
    {
      "name": "DJ Name (like DJ Steve, DJ Chas, DJ Nikki, etc.)",
      "confidence": 0.8,
      "context": "Where they perform",
      "aliases": []
    }
  ],
  "shows": [
    {
      "venueName": "Venue Name (must match a venue from venues array)",
      "date": "day_of_week",
      "time": "time like '7:00PM - 11:00PM'",
      "startTime": "24-hour format like '19:00'",
      "endTime": "24-hour format like '23:00'",
      "day": "day_of_week",
      "djName": "DJ/host name (REQUIRED - extract from 'with DJ Steve', 'hosted by DJ Chas', etc.)",
      "vendor": "Vendor/company providing service",
      "confidence": 0.9
    }
  ]
}`;

    const result = await model.generateContent([
      prompt,
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
        console.log('Venues found:', parsedResult.venues?.length || 0);
        console.log('DJs found:', parsedResult.djs?.length || 0);
        console.log('Shows found:', parsedResult.shows?.length || 0);

        if (parsedResult.shows && parsedResult.shows.length > 0) {
          console.log('\n🎤 Shows detected:');
          parsedResult.shows.forEach((show, index) => {
            console.log(
              `${index + 1}. ${show.day}: ${show.venueName} (${show.time}) with ${show.djName}`,
            );
          });
        }

        if (parsedResult.venues && parsedResult.venues.length > 0) {
          console.log('\n🏢 Venues detected:');
          parsedResult.venues.forEach((venue, index) => {
            console.log(
              `${index + 1}. ${venue.name} - ${venue.address}, ${venue.city}, ${venue.state} ${venue.zip}`,
            );
          });
        }

        if (parsedResult.djs && parsedResult.djs.length > 0) {
          console.log('\n🎧 DJs detected:');
          parsedResult.djs.forEach((dj, index) => {
            console.log(`${index + 1}. ${dj.name}`);
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

testUpdatedStevesdjParsing();
