const axios = require('axios');
const puppeteer = require('puppeteer');

async function testWorkerBehavior() {
  console.log('🔍 Testing worker behavior on Connecticut page...\n');

  let browser;
  try {
    // Simulate the exact same process as the worker
    console.log('1. Starting Puppeteer...');
    browser = await puppeteer.launch({
      headless: true,
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

    // Set user agent like the worker does
    await page.setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    );
    await page.setViewport({ width: 1920, height: 1080 });

    console.log('2. Loading page with timeout...');
    const startTime = Date.now();

    try {
      await page.goto('https://karaokeviewpoint.com/karaoke-in-connecticut/', {
        waitUntil: 'networkidle2',
        timeout: 30000,
      });
      console.log(`✅ Page loaded in ${Date.now() - startTime}ms`);
    } catch (error) {
      console.log(`❌ Page load failed after ${Date.now() - startTime}ms: ${error.message}`);
      return;
    }

    console.log('3. Extracting content...');
    const extractStart = Date.now();

    const content = await page.evaluate(() => {
      return document.body.innerText || document.body.textContent || '';
    });

    console.log(`✅ Content extracted in ${Date.now() - extractStart}ms: ${content.length} chars`);

    if (content.length === 0) {
      console.log('❌ No content extracted - this explains the timeout!');
      return;
    }

    // Test what would be sent to DeepSeek
    console.log('4. Preparing DeepSeek prompt...');
    const prompt = `Extract karaoke venue and show information from this web page content:

${content.substring(0, 3000)}

Focus on extracting:
- Venue names and addresses
- Show times and days
- DJ names
- Contact information

Return JSON format with this exact structure:
{
  "success": true/false,
  "vendor": "business/venue name hosting karaoke",
  "dj": "DJ or performer name",
  "show": {
    "venue": "venue name",
    "address": "full street address",
    "city": "city name",
    "state": "state name or abbreviation",
    "zip": "zip code",
    "time": "event time/schedule",
    "dayOfWeek": "day(s) of week",
    "djName": "DJ name if different from main dj field",
    "description": "event description"
  }
}`;

    console.log(`Prompt length: ${prompt.length} characters`);

    // Test the DeepSeek API call
    console.log('5. Testing DeepSeek API call...');
    const apiStart = Date.now();

    try {
      const response = await axios.post(
        'https://api.deepseek.com/v1/chat/completions',
        {
          model: 'deepseek-chat',
          messages: [
            {
              role: 'system',
              content:
                'You are a professional data extraction AI. Extract karaoke venue, event, and DJ information from web content. Return valid JSON only.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          max_tokens: 2000,
          temperature: 0.1,
          response_format: { type: 'json_object' },
        },
        {
          headers: {
            Authorization: `Bearer sk-8bdd86d4a91646b095a54b6e807da37a`,
            'Content-Type': 'application/json',
          },
          timeout: 25000,
          maxRedirects: 0,
          validateStatus: (status) => status < 500,
        },
      );

      console.log(`✅ DeepSeek API responded in ${Date.now() - apiStart}ms`);
      console.log(`Status: ${response.status}`);

      if (response.status >= 400) {
        console.log(`❌ API Error: ${response.status} ${response.statusText}`);
        console.log('Response data:', response.data);
      } else {
        const aiResponse = response.data.choices[0]?.message?.content;
        if (aiResponse) {
          console.log('✅ DeepSeek response received');
          try {
            const parsed = JSON.parse(aiResponse);
            console.log('✅ JSON parsing successful');
            console.log('Result:', JSON.stringify(parsed, null, 2));
          } catch (parseError) {
            console.log('❌ JSON parsing failed:', parseError.message);
            console.log('Raw response:', aiResponse.substring(0, 500));
          }
        } else {
          console.log('❌ No content in DeepSeek response');
        }
      }
    } catch (apiError) {
      console.log(`❌ DeepSeek API failed after ${Date.now() - apiStart}ms`);
      console.log('Error:', apiError.message);
      if (apiError.response) {
        console.log('Status:', apiError.response.status);
        console.log('Data:', apiError.response.data);
      }
    }
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

testWorkerBehavior();
