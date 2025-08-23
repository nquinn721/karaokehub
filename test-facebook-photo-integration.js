/**
 * Facebook Photo Parser with Puppeteer Integration
 * Extracts and parses images from Facebook photo URLs using authenticated session
 */

// Load environment variables
require('dotenv').config();

const { GoogleGenerativeAI } = require('@google/generative-ai');
const { Worker } = require('worker_threads');
const path = require('path');
const fs = require('fs');

/**
 * Parse Facebook photo URL using Puppeteer worker (similar to your existing group parser)
 */
async function parseFacebookPhotoWithPuppeteer(photoUrl) {
  return new Promise((resolve, reject) => {
    console.log('🚀 Starting Puppeteer worker for Facebook photo...');

    // Use your existing Facebook group parser as a template
    const workerPath = path.join(
      __dirname,
      'src',
      'parser',
      'facebookParser',
      'facebook-group-parser.js',
    );

    // Check if worker exists
    if (!fs.existsSync(workerPath)) {
      reject(new Error('Facebook parser worker not found. Run npm run build first.'));
      return;
    }

    const worker = new Worker(workerPath);

    worker.on('message', (message) => {
      if (message.type === 'progress') {
        console.log(`📢 ${message.message}`);
      } else if (message.type === 'complete') {
        console.log('✅ Puppeteer extraction complete');
        resolve(message.data);
      } else if (message.type === 'error') {
        reject(new Error(message.error));
      }
    });

    worker.on('error', (error) => {
      reject(error);
    });

    worker.on('exit', (code) => {
      if (code !== 0) {
        reject(new Error(`Worker stopped with exit code ${code}`));
      }
    });

    // Send the photo URL to extract
    worker.postMessage({
      url: photoUrl,
      type: 'single-photo', // New type for single photo extraction
      extractImages: true,
    });
  });
}

/**
 * Enhanced Facebook photo parser specifically for single photos
 * This would be a new worker or modification of your existing worker
 */
async function extractSingleFacebookPhoto(photoUrl) {
  console.log('🔍 Extracting single Facebook photo...');
  console.log(`📷 URL: ${photoUrl}`);

  // For demonstration, let's simulate what the worker would return
  // In practice, you'd modify your facebook-group-parser.ts to handle single photos

  const mockResult = {
    success: true,
    imageUrls: [
      // Simulated high-resolution URL that would be extracted by Puppeteer
      'https://scontent-lga3-3.xx.fbcdn.net/v/t39.30808-6/10239471230057761_high_res.jpg',
    ],
    photoInfo: {
      fbid: '10239471230057761',
      albumId: 'g.194826524192177',
      extractedAt: new Date().toISOString(),
    },
  };

  console.log('⚠️ Note: This is a simulation. Real implementation would:');
  console.log('   1. Load Facebook page with Puppeteer and cookies');
  console.log('   2. Navigate to the photo URL');
  console.log('   3. Wait for image to load');
  console.log('   4. Extract the high-resolution src attribute');
  console.log('   5. Return the actual CDN URL');

  return mockResult;
}

/**
 * Parse image with Gemini (reusing existing logic)
 */
async function parseImageWithGemini(base64Image, imageUrl) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const prompt = `Analyze this karaoke event image and extract all information in JSON format.

IMPORTANT: Look for ALL text and details including:
- Venue name and business information
- Complete address (street, city, state, zip)
- Event schedule (days, times, recurring vs one-time)
- DJ/host names or contact info  
- Phone numbers
- Special offers or pricing
- Event descriptions

Return structured JSON:
{
  "venue": "venue name",
  "address": "street address",
  "city": "city", 
  "state": "state",
  "zip": "zip code",
  "day": "event day(s)",
  "time": "time range",
  "startTime": "start time",
  "endTime": "end time", 
  "dj": "dj/host name",
  "phone": "phone number",
  "eventType": "karaoke",
  "description": "additional details",
  "recurring": true/false,
  "specialOffers": "any deals or offers",
  "success": true
}`;

  try {
    const imagePart = {
      inlineData: {
        data: base64Image,
        mimeType: 'image/jpeg',
      },
    };

    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    const text = response.text().trim();

    // Extract JSON
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      parsed.source = imageUrl;
      return parsed;
    }

    return {
      success: true,
      source: imageUrl,
      rawAnalysis: text,
      note: 'Could not extract structured JSON, returning raw analysis',
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      source: imageUrl,
    };
  }
}

/**
 * Integration with your existing Facebook parser workflow
 */
async function integrateFacebookPhotoIntoWorkflow(photoUrl) {
  console.log('🔗 Integrating Facebook photo into existing parser workflow...');

  try {
    // Step 1: Use your existing Facebook parser infrastructure
    console.log('📊 This would integrate with your existing systems:');
    console.log('   - Facebook session management (facebook-cookies.json)');
    console.log('   - Puppeteer worker threads');
    console.log('   - Image loading and enhancement pipeline');
    console.log('   - Gemini parsing with your configured rules');
    console.log('   - Database storage in parsed_schedule table');

    // Step 2: Extract image using authenticated session
    console.log('\n🔐 Step 1: Extract with authenticated session...');
    const extractionResult = await extractSingleFacebookPhoto(photoUrl);

    if (!extractionResult.success || extractionResult.imageUrls.length === 0) {
      throw new Error('Failed to extract image from Facebook photo');
    }

    console.log(`✅ Found ${extractionResult.imageUrls.length} image(s)`);

    // Step 3: Download and enhance (using your existing pipeline)
    console.log('\n📥 Step 2: Download and enhance image...');
    // This would use your existing loadImagesSimple() function

    // For demo, let's simulate downloading the image we already have
    const testImagePath = path.join(__dirname, 'temp', 'original-pixelated.jpg');
    if (fs.existsSync(testImagePath)) {
      const base64 = fs.readFileSync(testImagePath, 'base64');

      console.log('✅ Using existing test image for demo');

      // Step 4: Parse with Gemini
      console.log('\n🤖 Step 3: Parse with Gemini...');
      const parseResult = await parseImageWithGemini(base64, photoUrl);

      // Step 5: Show results
      console.log('\n📋 PARSING RESULTS:');
      console.log('='.repeat(60));
      console.log(JSON.stringify(parseResult, null, 2));

      // Step 6: Integration points
      console.log('\n🔗 INTEGRATION SUMMARY:');
      console.log('✅ Facebook authentication: Use existing cookie system');
      console.log('✅ Image extraction: Modify facebook-group-parser.ts');
      console.log('✅ Image enhancement: Use existing Sharp pipeline');
      console.log('✅ Gemini parsing: Use existing parseImageWithWorker()');
      console.log('✅ Data storage: Use existing ParsedSchedule entity');

      return parseResult;
    } else {
      console.log('⚠️ No test image available. Run the enhancement test first.');
      return null;
    }
  } catch (error) {
    console.error('❌ Integration test failed:', error.message);
    return null;
  }
}

/**
 * Main test
 */
async function testFacebookPhotoIntegration() {
  const photoUrl = 'https://www.facebook.com/photo/?fbid=10239471230057761&set=g.194826524192177';

  console.log('🎯 Testing Facebook Photo Integration');
  console.log('='.repeat(60));

  await integrateFacebookPhotoIntoWorkflow(photoUrl);

  console.log('\n💡 TO IMPLEMENT THIS FOR REAL:');
  console.log('1. Modify facebook-group-parser.ts to handle single photo URLs');
  console.log('2. Add photo extraction logic alongside existing group scraping');
  console.log('3. Use existing loadImagesSimple() for image downloading');
  console.log('4. Use existing parseImageWithWorker() for Gemini parsing');
  console.log('5. Store results in ParsedSchedule table with photo URL as source');

  console.log('\n🚀 BENEFITS:');
  console.log('✅ Reuse all existing authentication and session management');
  console.log('✅ Leverage existing image enhancement pipeline');
  console.log('✅ Use proven Gemini parsing rules and error handling');
  console.log('✅ Integrate seamlessly with current database schema');
}

// Check for API key and run
if (!process.env.GEMINI_API_KEY) {
  console.error('❌ GEMINI_API_KEY environment variable not set');
  process.exit(1);
}

testFacebookPhotoIntegration();
