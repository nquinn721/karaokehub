const puppeteer = require('puppeteer');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

async function testFullPageGroupNameExtraction() {
  console.log('🚀 Testing full page group name extraction...');

  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    // Navigate to the Facebook group
    const groupUrl = 'https://www.facebook.com/groups/194826524192177';
    console.log('🌐 Navigating to Facebook group...');
    await page.goto(groupUrl, { waitUntil: 'networkidle0', timeout: 30000 });

    // Wait a bit for the page to fully load
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Take a full page screenshot
    console.log('📸 Capturing full page screenshot...');
    const screenshot = await page.screenshot({
      type: 'png',
      fullPage: true,
    });

    const base64Screenshot = Buffer.from(screenshot).toString('base64');

    // Use Gemini to extract group name
    console.log('🧠 Using Gemini to extract group name...');
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `
      You are analyzing a Facebook group page screenshot to extract the EXACT group name/title.
      
      WHERE TO LOOK FOR THE GROUP NAME:
      1. Main header area - usually the largest, most prominent text
      2. Near or over a cover photo/banner image
      3. At the top of the page content area
      4. May appear as white text on dark background or dark text on light background
      
      WHAT THE GROUP NAME LOOKS LIKE:
      - Usually the most prominent text element on the page
      - Often larger than other text elements
      - May include special characters, emojis, or punctuation
      - Could be 1-2 lines if it's a longer name
      - Stands out visually as the "main title" of the page
      
      WHAT TO IGNORE:
      - Facebook navigation ("Home", "Groups", "Marketplace", etc.)
      - Button text ("Join Group", "Share", "More", "See all", "About")
      - User names, member counts, timestamps
      - Menu items, sidebar text
      - Generic labels ("Public group", "Private group", "Community")
      - Post content, comments, or user-generated content
      
      RESPONSE FORMAT:
      - Return ONLY the group name exactly as it appears
      - Include emojis, punctuation, and special characters
      - Preserve original capitalization and spacing
      - Do NOT add quotes, explanations, or extra text
      - If you cannot clearly identify a group name, respond: "no group name visible"
      
      Analyze this Facebook page screenshot and extract the main group name:
    `;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: base64Screenshot,
          mimeType: 'image/png',
        },
      },
    ]);

    const response = await result.response;
    const groupName = response.text().trim();

    console.log(`🏷️ Extracted group name: "${groupName}"`);

    // Also save the screenshot for debugging
    const screenshotPath = path.join(__dirname, 'debug-full-page-screenshot.png');
    fs.writeFileSync(screenshotPath, screenshot);
    console.log(`💾 Screenshot saved to: ${screenshotPath}`);
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
}

testFullPageGroupNameExtraction();
