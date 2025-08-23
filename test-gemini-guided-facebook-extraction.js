/**
 * Facebook Photo Parser with Gemini-Assisted Navigation
 * Uses Gemini to analyze page content and guide Puppeteer actions
 */

// Load environment variables
require('dotenv').config();

const { GoogleGenerativeAI } = require('@google/generative-ai');
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

/**
 * Use Gemini to analyze page screenshot and find UI elements
 */
async function analyzePageWithGemini(screenshotBase64, task) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  let prompt;

  switch (task) {
    case 'find-close-button':
      prompt = `Analyze this Facebook page screenshot and help me find the close button for the login modal.

Look for:
- X button (close button) in the top-right corner of a modal/dialog
- Close button text or icon
- Modal overlay that needs to be dismissed

Return JSON with:
{
  "hasModal": true/false,
  "closeButtonFound": true/false,
  "closeButtonLocation": "description of where it is",
  "suggestedSelector": "CSS selector or description for Puppeteer",
  "instructions": "step by step instructions for closing the modal"
}`;
      break;

    case 'find-image':
      prompt = `Analyze this Facebook page and identify the main karaoke event image.

Look for:
- The main event image (karaoke poster/flyer)
- Image quality and visibility
- Any overlays or obstructions

Return JSON with:
{
  "imageVisible": true/false,
  "imageQuality": "description",
  "needsAction": true/false,
  "actionRequired": "what needs to be done",
  "imageLocation": "description of where image is located"
}`;
      break;

    default:
      prompt = `Analyze this Facebook page screenshot and describe what you see.`;
  }

  try {
    const imagePart = {
      inlineData: {
        data: screenshotBase64,
        mimeType: 'image/png',
      },
    };

    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    const text = response.text().trim();

    // Extract JSON if present
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    return { analysis: text };
  } catch (error) {
    console.error('❌ Gemini analysis error:', error.message);
    return { error: error.message };
  }
}

/**
 * Extract Facebook photo with Gemini-guided navigation
 */
async function extractFacebookPhotoWithGemini(photoUrl) {
  console.log('🚀 Starting Gemini-guided Facebook photo extraction...');
  console.log(`📷 URL: ${photoUrl}`);

  const browser = await puppeteer.launch({
    headless: false, // Set to true for production
    defaultViewport: { width: 1200, height: 800 },
  });

  try {
    const page = await browser.newPage();

    // Load cookies if available (from your existing system)
    const cookiesPath = path.join(__dirname, 'data', 'facebook-cookies.json');
    if (fs.existsSync(cookiesPath)) {
      const cookies = JSON.parse(fs.readFileSync(cookiesPath, 'utf8'));
      await page.setCookie(...cookies);
      console.log('🍪 Loaded Facebook cookies');
    }

    // Navigate to the photo URL
    console.log('🌐 Navigating to Facebook photo...');
    await page.goto(photoUrl, { waitUntil: 'networkidle0' });

    // Wait a moment for page to fully load
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Take initial screenshot for Gemini analysis
    console.log('📸 Taking initial screenshot for analysis...');
    const screenshot1 = await page.screenshot({ encoding: 'base64' });

    // Ask Gemini to analyze and find the close button
    console.log('🤖 Asking Gemini to analyze page and find close button...');
    const modalAnalysis = await analyzePageWithGemini(screenshot1, 'find-close-button');
    console.log('📋 Modal Analysis:', JSON.stringify(modalAnalysis, null, 2));

    // If Gemini found a modal that needs closing
    if (modalAnalysis.hasModal && modalAnalysis.closeButtonFound) {
      console.log('🎯 Gemini found modal - attempting to close...');

      try {
        // Try common close button selectors based on Gemini's analysis
        const closeSelectors = [
          '[aria-label="Close"]',
          '.x1a2a7pz[role="button"]', // Facebook X button class
          '[data-testid="modal-close"]',
          'button[title="Close"]',
          '.x1n2onr6[role="button"]',
          'div[aria-label="Close"][role="button"]',
        ];

        let closed = false;
        for (const selector of closeSelectors) {
          try {
            const element = await page.$(selector);
            if (element) {
              console.log(`✅ Found close button with selector: ${selector}`);
              await element.click();
              await new Promise((resolve) => setTimeout(resolve, 2000));
              closed = true;
              break;
            }
          } catch (e) {
            // Try next selector
          }
        }

        if (!closed) {
          // Fallback: Try clicking the X in the top-right area based on Gemini's description
          console.log('🎯 Trying coordinate-based click in top-right area...');
          const viewport = page.viewport();
          await page.click(viewport.width - 50, 50); // Top-right corner area
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      } catch (error) {
        console.log('⚠️ Close attempt failed, continuing anyway...');
      }
    }

    // Take another screenshot to see if modal was closed
    console.log('📸 Taking post-action screenshot...');
    const screenshot2 = await page.screenshot({ encoding: 'base64' });

    // Ask Gemini to analyze if the image is now visible
    console.log('🔍 Asking Gemini to check if image is now visible...');
    const imageAnalysis = await analyzePageWithGemini(screenshot2, 'find-image');
    console.log('📋 Image Analysis:', JSON.stringify(imageAnalysis, null, 2));

    // Extract the image URL
    console.log('🖼️ Extracting image URL...');
    const imageUrl = await page.evaluate(() => {
      // Look for the main image with various selectors
      const selectors = [
        'img[data-visualcompletion="media-vc-image"]',
        'img[src*="scontent"]',
        'img[src*="fbcdn"]',
        '.x1ey2m1c img', // Facebook image container
        '[role="img"] img',
        'img[style*="object-fit"]',
      ];

      for (const selector of selectors) {
        const img = document.querySelector(selector);
        if (img && img.src && img.src.includes('scontent')) {
          return img.src;
        }
      }

      // Fallback: get the largest image
      const allImages = Array.from(document.querySelectorAll('img'));
      const largestImage = allImages
        .filter((img) => img.src && img.src.includes('scontent'))
        .sort((a, b) => b.naturalWidth * b.naturalHeight - a.naturalWidth * a.naturalHeight)[0];

      return largestImage ? largestImage.src : null;
    });

    if (imageUrl) {
      console.log('✅ Found image URL:', imageUrl);

      // Save the final screenshot showing the extracted image
      const finalScreenshot = path.join(__dirname, 'temp', 'facebook-photo-extracted.png');
      await page.screenshot({ path: finalScreenshot });
      console.log(`📸 Saved final screenshot: ${finalScreenshot}`);

      return {
        success: true,
        imageUrl: imageUrl,
        photoInfo: {
          originalUrl: photoUrl,
          extractedAt: new Date().toISOString(),
          modalClosed: modalAnalysis.hasModal,
        },
        geminiAnalysis: {
          modalAnalysis,
          imageAnalysis,
        },
      };
    } else {
      throw new Error('Could not extract image URL from page');
    }
  } finally {
    await browser.close();
  }
}

/**
 * Download and parse the extracted image
 */
async function downloadAndParseImage(imageUrl) {
  console.log('📥 Downloading image for parsing...');

  const https = require('https');

  return new Promise((resolve, reject) => {
    https
      .get(imageUrl, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`Failed to download: ${response.statusCode}`));
          return;
        }

        const chunks = [];
        response.on('data', (chunk) => chunks.push(chunk));
        response.on('end', async () => {
          try {
            const buffer = Buffer.concat(chunks);
            const base64 = buffer.toString('base64');

            // Save the image locally
            const imagePath = path.join(__dirname, 'temp', 'extracted-facebook-photo.jpg');
            fs.writeFileSync(imagePath, buffer);
            console.log(`💾 Saved image: ${imagePath}`);

            // Parse with Gemini
            console.log('🤖 Parsing image with Gemini...');
            const parseResult = await parseImageWithGemini(base64, imageUrl);

            resolve({
              imagePath,
              imageUrl,
              base64,
              parseResult,
            });
          } catch (error) {
            reject(error);
          }
        });
      })
      .on('error', reject);
  });
}

/**
 * Parse image with Gemini
 */
async function parseImageWithGemini(base64Image, imageUrl) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const prompt = `Analyze this karaoke event image and extract all information in JSON format.

Look for ALL text and details:
- Venue name and business info
- Complete address
- Event schedule and times
- DJ/host information
- Contact details
- Special offers

Return JSON:
{
  "venue": "venue name",
  "address": "street address", 
  "city": "city",
  "state": "state",
  "zip": "zip code",
  "day": "day(s)",
  "time": "time range",
  "dj": "dj/host",
  "phone": "phone",
  "eventType": "karaoke",
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

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      parsed.source = imageUrl;
      return parsed;
    }

    return { success: false, error: 'No valid JSON returned', source: imageUrl };
  } catch (error) {
    return { success: false, error: error.message, source: imageUrl };
  }
}

/**
 * Main test function
 */
async function testGeminiGuidedExtraction() {
  try {
    const photoUrl = 'https://www.facebook.com/photo/?fbid=10239471230057761&set=g.194826524192177';

    console.log('🎬 Starting Gemini-guided Facebook photo extraction test...');

    // Step 1: Extract photo using Gemini-guided navigation
    const extractResult = await extractFacebookPhotoWithGemini(photoUrl);
    console.log('📊 Extraction Result:', JSON.stringify(extractResult, null, 2));

    if (extractResult.success && extractResult.imageUrl) {
      // Step 2: Download and parse the image
      const parseResult = await downloadAndParseImage(extractResult.imageUrl);

      console.log('\n🎉 Complete Results:');
      console.log('='.repeat(60));
      console.log('📷 Original URL:', photoUrl);
      console.log('🔗 Extracted Image URL:', parseResult.imageUrl);
      console.log('💾 Saved to:', parseResult.imagePath);
      console.log('\n📝 Parsed Data:');
      console.log(JSON.stringify(parseResult.parseResult, null, 2));

      // Show Gemini's guidance
      if (extractResult.geminiAnalysis) {
        console.log('\n🤖 Gemini Analysis Summary:');
        console.log(
          'Modal handling:',
          extractResult.geminiAnalysis.modalAnalysis?.instructions || 'No modal detected',
        );
        console.log(
          'Image visibility:',
          extractResult.geminiAnalysis.imageAnalysis?.imageVisible
            ? '✅ Visible'
            : '❌ Not visible',
        );
      }
    } else {
      console.error('❌ Failed to extract image from Facebook photo URL');
    }
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Check requirements
if (!process.env.GEMINI_API_KEY) {
  console.error('❌ GEMINI_API_KEY not set');
  process.exit(1);
}

// Run the test
testGeminiGuidedExtraction();
