/**
 * Facebook Photo URL Image Extraction and Parsing Test
 * Extracts image from Facebook photo URL and parses with Gemini
 */

// Load environment variables
require('dotenv').config();

const { GoogleGenerativeAI } = require('@google/generative-ai');
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

// Test Facebook photo URL
const FACEBOOK_PHOTO_URL =
  'https://www.facebook.com/photo/?fbid=10239471230057761&set=g.194826524192177';

/**
 * Extract actual image URL from Facebook photo page
 * This would typically require web scraping with Puppeteer
 */
async function extractImageFromFacebookPhoto(photoUrl) {
  // For now, we'll simulate what would happen with a real implementation
  // In practice, you'd need to:
  // 1. Load the page with Puppeteer
  // 2. Find the main image element
  // 3. Extract the high-resolution src URL

  console.log(`🔍 Extracting image from Facebook photo: ${photoUrl}`);
  console.log('⚠️ Note: This would require Puppeteer implementation in practice');

  // For demonstration, let's try to construct possible CDN URLs
  // Facebook photo URLs often follow patterns based on the fbid
  const fbid = photoUrl.match(/fbid=(\d+)/)?.[1];

  if (!fbid) {
    throw new Error('Could not extract fbid from URL');
  }

  console.log(`📷 Extracted fbid: ${fbid}`);

  // Common Facebook CDN URL patterns for photos
  const possibleUrls = [
    `https://scontent.xx.fbcdn.net/v/t39.30808-6/${fbid}_n.jpg`,
    `https://scontent-lga3-1.xx.fbcdn.net/v/t39.30808-6/${fbid}_n.jpg`,
    `https://scontent-lga3-2.xx.fbcdn.net/v/t39.30808-6/${fbid}_n.jpg`,
    `https://scontent-lga3-3.xx.fbcdn.net/v/t39.30808-6/${fbid}_n.jpg`,
    // Try different size variants
    `https://scontent.xx.fbcdn.net/v/t39.30808-6/${fbid}_o.jpg`, // Original size
    `https://scontent.xx.fbcdn.net/v/t39.30808-6/${fbid}_s.jpg`, // Small
    `https://scontent.xx.fbcdn.net/v/t39.30808-6/${fbid}_m.jpg`, // Medium
  ];

  console.log('🌐 Trying possible CDN URLs...');

  // Try each URL to see which one works
  for (const url of possibleUrls) {
    try {
      console.log(`   Testing: ${url.substring(0, 80)}...`);
      const response = await testUrl(url);
      if (response.success) {
        console.log(`✅ Found working URL: ${url}`);
        return url;
      }
    } catch (error) {
      // Continue to next URL
    }
  }

  throw new Error('Could not find accessible image URL. May require authentication.');
}

/**
 * Test if a URL returns a valid image
 */
async function testUrl(url) {
  return new Promise((resolve) => {
    const protocol = url.startsWith('https') ? https : http;

    const req = protocol.get(url, (response) => {
      if (response.statusCode === 200 && response.headers['content-type']?.startsWith('image/')) {
        resolve({ success: true, contentType: response.headers['content-type'] });
      } else {
        resolve({ success: false, statusCode: response.statusCode });
      }
      response.destroy(); // Don't download the full image, just test
    });

    req.on('error', () => {
      resolve({ success: false, error: 'Network error' });
    });

    req.setTimeout(5000, () => {
      req.destroy();
      resolve({ success: false, error: 'Timeout' });
    });
  });
}

/**
 * Download image as base64
 */
async function downloadImageAsBase64(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;

    protocol
      .get(url, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`Failed to download image: ${response.statusCode}`));
          return;
        }

        const chunks = [];
        response.on('data', (chunk) => chunks.push(chunk));
        response.on('end', () => {
          const buffer = Buffer.concat(chunks);
          const base64 = buffer.toString('base64');
          resolve(base64);
        });
      })
      .on('error', reject);
  });
}

/**
 * Save base64 image to file
 */
function saveBase64ToFile(base64Data, filename) {
  const buffer = Buffer.from(base64Data, 'base64');
  const filePath = path.join(__dirname, 'temp', filename);

  // Ensure temp directory exists
  if (!fs.existsSync(path.dirname(filePath))) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
  }

  fs.writeFileSync(filePath, buffer);
  console.log(`✅ Saved image: ${filePath}`);
  return filePath;
}

/**
 * Parse karaoke image with Gemini
 */
async function parseKaraokeImageWithGemini(base64Image, imageUrl) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  console.log('🤖 Parsing image with Gemini...');

  const prompt = `Parse this karaoke event image and extract all relevant information.

EXTRACT ALL VISIBLE INFORMATION:
- Venue name
- Full address (street, city, state, zip)
- Event day/time details
- DJ or host name
- Phone number if visible
- Any other event details

Return structured JSON:
{
  "venue": "venue name",
  "address": "street address", 
  "city": "city name",
  "state": "state",
  "zip": "zip code",
  "day": "day of week or date",
  "time": "time range",
  "startTime": "start time",
  "endTime": "end time",
  "dj": "dj/host name",
  "phone": "phone number",
  "eventType": "karaoke",
  "description": "any additional details",
  "success": true
}

Be very thorough in reading all text, even if small or unclear.`;

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

    console.log('📝 Gemini response:');
    console.log(text);

    // Try to extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      parsed.source = imageUrl;
      return parsed;
    }

    // If no JSON, return the text analysis
    return {
      success: true,
      source: imageUrl,
      analysis: text,
      note: 'Gemini provided text analysis instead of structured JSON',
    };
  } catch (error) {
    console.error('❌ Gemini parsing error:', error.message);
    return {
      success: false,
      error: error.message,
      source: imageUrl,
    };
  }
}

/**
 * Enhanced approach: Try to get higher resolution image
 */
async function findBestQualityImage(fbid) {
  console.log('🔍 Searching for highest quality version...');

  // Facebook image URL patterns with different quality markers
  const qualityVariants = [
    // Original/highest quality first
    `https://scontent.xx.fbcdn.net/v/t39.30808-6/${fbid}_o.jpg`,
    `https://scontent-lga3-1.xx.fbcdn.net/v/t39.30808-6/${fbid}_o.jpg`,
    `https://scontent-lga3-2.xx.fbcdn.net/v/t39.30808-6/${fbid}_o.jpg`,
    `https://scontent-lga3-3.xx.fbcdn.net/v/t39.30808-6/${fbid}_o.jpg`,

    // Large versions
    `https://scontent.xx.fbcdn.net/v/t39.30808-6/${fbid}_n.jpg`,
    `https://scontent-lga3-1.xx.fbcdn.net/v/t39.30808-6/${fbid}_n.jpg`,

    // Medium fallbacks
    `https://scontent.xx.fbcdn.net/v/t39.30808-6/${fbid}_m.jpg`,
    `https://scontent-lga3-1.xx.fbcdn.net/v/t39.30808-6/${fbid}_m.jpg`,
  ];

  for (const url of qualityVariants) {
    try {
      const test = await testUrl(url);
      if (test.success) {
        console.log(`✅ Found accessible image: ${url}`);

        // Download a small sample to check actual size
        try {
          const base64 = await downloadImageAsBase64(url);
          const buffer = Buffer.from(base64, 'base64');
          console.log(`📏 Image size: ${(buffer.length / 1024).toFixed(1)}KB`);

          return { url, base64, size: buffer.length };
        } catch (downloadError) {
          console.log(`⚠️ URL accessible but download failed: ${downloadError.message}`);
          continue;
        }
      }
    } catch (error) {
      // Continue to next variant
    }
  }

  return null;
}

/**
 * Main test function
 */
async function testFacebookPhotoExtraction() {
  try {
    console.log('🚀 Testing Facebook Photo URL Image Extraction');
    console.log(`📷 Photo URL: ${FACEBOOK_PHOTO_URL}`);

    // Extract fbid from URL
    const fbid = FACEBOOK_PHOTO_URL.match(/fbid=(\d+)/)?.[1];
    if (!fbid) {
      throw new Error('Could not extract fbid from URL');
    }

    console.log(`🔢 Extracted fbid: ${fbid}`);

    // Try to find the best quality accessible image
    console.log('\n🔍 Step 1: Finding accessible image URL...');
    const imageResult = await findBestQualityImage(fbid);

    if (!imageResult) {
      console.log('\n❌ Could not find an accessible image URL.');
      console.log('💡 This may be because:');
      console.log('   - The photo requires Facebook authentication');
      console.log('   - The photo is private/restricted');
      console.log('   - The URL pattern has changed');
      console.log('   - Network/CDN restrictions');
      console.log('\n🛠️ For production use, you would need:');
      console.log('   - Puppeteer with Facebook session cookies');
      console.log('   - Proper authentication flow');
      console.log('   - Navigate to the photo page and extract the image src');
      return;
    }

    // Save the image
    console.log('\n💾 Step 2: Saving image locally...');
    const filename = `facebook-photo-${fbid}.jpg`;
    const savedPath = saveBase64ToFile(imageResult.base64, filename);

    // Parse with Gemini
    console.log('\n🤖 Step 3: Parsing with Gemini...');
    const parseResult = await parseKaraokeImageWithGemini(imageResult.base64, imageResult.url);

    console.log('\n📋 PARSING RESULTS:');
    console.log('='.repeat(60));
    console.log(JSON.stringify(parseResult, null, 2));

    console.log('\n✅ Test completed successfully!');
    console.log(`📁 Image saved: ${savedPath}`);
    console.log(`🌐 Source URL: ${imageResult.url}`);
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n💡 Note: Facebook photo extraction often requires:');
    console.log('   - Valid Facebook session cookies');
    console.log('   - Puppeteer-based web scraping');
    console.log('   - Proper authentication handling');
  }
}

// Check for API key and run
if (!process.env.GEMINI_API_KEY) {
  console.error('❌ GEMINI_API_KEY environment variable not set');
  process.exit(1);
}

testFacebookPhotoExtraction();
