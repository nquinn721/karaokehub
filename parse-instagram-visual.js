#!/usr/bin/env node

/**
 * Instagram Visual Parser for Karaoke Shows
 * Uses screenshots and Gemini Vision to parse Instagram posts with images
 * Scrolls 3 pages worth to capture more content
 */

const puppeteer = require('puppeteer');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp'); // Add sharp for image resizing

const PROFILE_URL = 'https://www.instagram.com/djmax614';

/**
 * Resize image to reduce file size for API calls
 */
async function resizeImage(imagePath, maxWidth = 1024, quality = 80) {
  try {
    const resizedBuffer = await sharp(imagePath)
      .resize({ width: maxWidth, withoutEnlargement: true })
      .jpeg({ quality: quality })
      .toBuffer();

    console.log(
      `📏 Resized image: ${fs.statSync(imagePath).size} bytes → ${resizedBuffer.length} bytes`,
    );
    return resizedBuffer;
  } catch (error) {
    console.error(`❌ Failed to resize image ${imagePath}:`, error.message);
    // Fallback to original file
    return fs.readFileSync(imagePath);
  }
}

async function parseInstagramWithScreenshots() {
  console.log('📷 Instagram Visual Parser with Screenshots');
  console.log(`Target: ${PROFILE_URL}\n`);

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: false, // Show browser for visual debugging
      defaultViewport: { width: 1200, height: 800 },
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--disable-default-apps',
        '--disable-extensions',
      ],
    });

    const page = await browser.newPage();

    // Set a realistic user agent
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    );

    console.log('🌐 Navigating to Instagram profile...');
    await page.goto(PROFILE_URL, { waitUntil: 'networkidle2', timeout: 30000 });

    // Wait for page to fully load
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Create screenshots directory
    const screenshotsDir = path.join(__dirname, 'instagram-screenshots');
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir);
    }

    const screenshots = [];

    // Take initial screenshot (page 1)
    console.log('📸 Taking initial screenshot...');
    const screenshot1Path = path.join(screenshotsDir, 'instagram-page-1.png');
    await page.screenshot({ path: screenshot1Path, fullPage: false });
    screenshots.push(screenshot1Path);
    console.log('✅ Screenshot 1 taken (initial view)');

    // Scroll down and take screenshot (page 2)
    console.log('📜 Scrolling to page 2...');
    await page.evaluate(() => {
      window.scrollBy(0, window.innerHeight * 0.8);
    });
    await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait for content to load

    const screenshot2Path = path.join(screenshotsDir, 'instagram-page-2.png');
    await page.screenshot({ path: screenshot2Path, fullPage: false });
    screenshots.push(screenshot2Path);
    console.log('✅ Screenshot 2 taken (after first scroll)');

    // Scroll down more and take screenshot (page 3)
    console.log('📜 Scrolling to page 3...');
    await page.evaluate(() => {
      window.scrollBy(0, window.innerHeight * 0.8);
    });
    await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait for content to load

    const screenshot3Path = path.join(screenshotsDir, 'instagram-page-3.png');
    await page.screenshot({ path: screenshot3Path, fullPage: false });
    screenshots.push(screenshot3Path);
    console.log('✅ Screenshot 3 taken (after second scroll)');

    console.log(`📱 Captured ${screenshots.length} screenshots`);

    // Try to extract some basic text data as well
    const basicProfileData = await page.evaluate(() => {
      const result = {
        username: '',
        followerCount: '',
        postCount: '',
        visibleText: '',
      };

      // Try to get username from page title or h2
      const usernameEl =
        document.querySelector('h2') || document.querySelector('[data-testid="user-name"]');
      if (usernameEl) result.username = usernameEl.textContent.trim();

      // Get visible text for backup analysis
      result.visibleText = document.body.textContent.substring(0, 2000);

      return result;
    });

    await browser.close();

    console.log('🧠 Sending to Gemini Vision for analysis...');
    const analysisResults = await analyzeScreenshotsWithGemini(screenshots, basicProfileData);

    // Display results
    console.log('\n🎤 === INSTAGRAM VISUAL ANALYSIS RESULTS ===\n');

    console.log('📷 Screenshots Analyzed:');
    screenshots.forEach((path, index) => {
      console.log(`   ${index + 1}. ${path}`);
    });

    console.log('\n🎧 DJs Found:');
    if (analysisResults.djs && analysisResults.djs.length > 0) {
      analysisResults.djs.forEach((dj, index) => {
        console.log(`   ${index + 1}. ${dj.name} (confidence: ${dj.confidence})`);
      });
    } else {
      console.log('   None found in visual analysis');
    }

    console.log('\n🏟️ Venues Found:');
    const uniqueVenues = [...new Set(analysisResults.shows?.map((show) => show.venue) || [])];
    if (uniqueVenues.length > 0) {
      uniqueVenues.forEach((venue, index) => {
        console.log(`   ${index + 1}. ${venue}`);
      });
    } else {
      console.log('   None found in visual analysis');
    }

    console.log('\n📅 Shows Found:');
    if (analysisResults.shows && analysisResults.shows.length > 0) {
      analysisResults.shows.forEach((show, index) => {
        console.log(
          `   ${index + 1}. ${show.venue} - ${show.day} at ${show.time} ${show.djName ? `(DJ: ${show.djName})` : ''}`,
        );
      });
    } else {
      console.log('   None found in visual analysis');
    }

    console.log('\n📊 Summary:');
    console.log(`   Pages analyzed: ${screenshots.length}`);
    console.log(`   DJs found: ${analysisResults.djs?.length || 0}`);
    console.log(`   Venues found: ${uniqueVenues.length}`);
    console.log(`   Shows found: ${analysisResults.shows?.length || 0}`);

    console.log('\n💾 Screenshots saved in ./instagram-screenshots/');
    console.log('🎯 Visual analysis complete!');

    return analysisResults;
  } catch (error) {
    console.error('❌ Error during Instagram parsing:', error.message);
    if (browser) {
      await browser.close();
    }
    throw error;
  }
}

async function analyzeScreenshotsWithGemini(screenshotPaths, basicData) {
  console.log('🔍 Analyzing screenshots with Gemini Vision...');

  try {
    // Check if server is running to use existing Gemini integration
    await axios.get('http://localhost:8000/api/config/client');
    console.log('✅ KaraokeHub server is running, using server-side Gemini');

    // Prepare resized images as base64
    const resizedImages = [];
    for (let i = 0; i < screenshotPaths.length; i++) {
      const screenshotPath = screenshotPaths[i];
      console.log(`📏 Resizing screenshot ${i + 1}/${screenshotPaths.length}...`);

      const resizedBuffer = await resizeImage(screenshotPath, 800, 75); // Smaller size for API
      const base64Image = resizedBuffer.toString('base64');
      resizedImages.push(base64Image);
    }

    // Send all screenshots to the new analyze-screenshots endpoint
    try {
      const response = await axios.post('http://localhost:8000/api/parser/analyze-screenshots', {
        screenshots: resizedImages,
        url: 'https://www.instagram.com/djmax614',
        description: `Instagram profile analysis with ${screenshotPaths.length} screenshots`,
      });

      console.log('✅ Instagram screenshots analyzed successfully');
      return response.data.data; // Return the ParsedKaraokeData
    } catch (error) {
      console.log(`❌ Failed to analyze screenshots:`, error.message);

      // Fallback to individual analysis
      return await fallbackIndividualAnalysis(screenshotPaths, basicData);
    }
  } catch (serverError) {
    console.log('⚠️  Server not available, using local analysis');
    return await fallbackIndividualAnalysis(screenshotPaths, basicData);
  }
}

async function fallbackIndividualAnalysis(screenshotPaths, basicData) {
  const analysisResults = [];

  for (let i = 0; i < screenshotPaths.length; i++) {
    const screenshotPath = screenshotPaths[i];
    console.log(`📷 Analyzing screenshot ${i + 1}/${screenshotPaths.length}...`);

    // Try individual screenshot analysis
    try {
      const resizedBuffer = await resizeImage(screenshotPath, 800, 75);
      const base64Image = resizedBuffer.toString('base64');

      const response = await axios.post('http://localhost:8000/api/parser/analyze-screenshots', {
        screenshots: [base64Image], // Single image
        url: 'https://www.instagram.com/djmax614',
        description: `Instagram screenshot ${i + 1} analysis`,
      });

      analysisResults.push({
        page: i + 1,
        screenshotPath: screenshotPath,
        analysis: response.data.data,
      });

      console.log(`✅ Screenshot ${i + 1} analyzed successfully`);
    } catch (error) {
      console.log(`❌ Failed to analyze screenshot ${i + 1}:`, error.message);

      // Fallback: analyze locally if we have Gemini key
      const localAnalysis = await analyzeScreenshotLocally(screenshotPath, i + 1);
      if (localAnalysis) {
        analysisResults.push({
          page: i + 1,
          screenshotPath: screenshotPath,
          analysis: localAnalysis,
        });
      }
    }
  }

  // Combine analyses if we have any
  if (analysisResults.length > 0) {
    return combineScreenshotAnalyses(analysisResults);
  } else {
    // Return empty structure if no analyses succeeded
    return {
      vendor: {
        name: 'DJ Max 614',
        website: 'https://www.instagram.com/djmax614',
        confidence: 0.5,
      },
      djs: [],
      shows: [],
    };
  }
}

async function analyzeScreenshotLocally(screenshotPath, pageNumber) {
  console.log(`🔍 Local analysis of screenshot ${pageNumber}...`);

  try {
    const { GoogleGenerativeAI } = require('@google/generative-ai');

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.log('❌ GEMINI_API_KEY not found for local analysis');
      return null;
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    // Read and encode the image
    const resizedBuffer = await resizeImage(screenshotPath, 1024, 80);
    const base64Image = resizedBuffer.toString('base64');

    const prompt = `Analyze this Instagram profile screenshot for karaoke show information.

EXTRACT:
1. DJ/Host names mentioned in posts or bio
2. Venue names (bars, clubs, restaurants, pubs)
3. Show times and dates
4. Weekly recurring events
5. Location information

Return JSON format:
{
  "djs": [{"name": "DJ Name", "confidence": 0.8}],
  "shows": [{"venue": "Venue Name", "day": "monday", "time": "8pm", "djName": "DJ Name"}]
}`;

    const imagePart = {
      inlineData: {
        data: base64Image,
        mimeType: 'image/jpeg',
      },
    };

    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    const text = response.text();

    // Parse JSON response
    const cleanedResponse = text.replace(/```json|```/g, '').trim();
    const parsedData = JSON.parse(cleanedResponse);

    console.log(`✅ Local analysis of screenshot ${pageNumber} complete`);
    return parsedData;
  } catch (error) {
    console.log(`❌ Local analysis failed for screenshot ${pageNumber}:`, error.message);
    return null;
  }
}

function combineScreenshotAnalyses(analysisResults) {
  const combined = {
    vendor: { name: 'DJ Max 614', website: 'https://www.instagram.com/djmax614', confidence: 0.8 },
    djs: [],
    shows: [],
  };

  const djSet = new Set();
  const showSet = new Set();

  for (const result of analysisResults) {
    if (result.analysis) {
      // Combine DJs
      if (result.analysis.djs) {
        result.analysis.djs.forEach((dj) => {
          if (dj.name && !djSet.has(dj.name.toLowerCase())) {
            djSet.add(dj.name.toLowerCase());
            combined.djs.push(dj);
          }
        });
      }

      // Combine shows
      if (result.analysis.shows) {
        result.analysis.shows.forEach((show) => {
          const showKey = `${show.venue}-${show.day}-${show.time}`;
          if (!showSet.has(showKey)) {
            showSet.add(showKey);
            combined.shows.push(show);
          }
        });
      }
    }
  }

  return combined;
}

// Run the parser if called directly
if (require.main === module) {
  parseInstagramWithScreenshots()
    .then((results) => {
      console.log('\n🎉 Instagram parsing completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Instagram parsing failed:', error.message);
      process.exit(1);
    });
}

module.exports = { parseInstagramWithScreenshots, analyzeScreenshotsWithGemini };
