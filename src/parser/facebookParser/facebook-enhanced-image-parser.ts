/**
 * Enhanced Facebook Image Parser Worker
 * Handles Facebook photo URLs with Gemini-guided navigation to extract high-resolution images
 * - Uses Puppeteer to navigate to /photo/ URLs
 * - Uses Gemini to guide navigation and close modals
 * - Extracts high-resolution CDN URLs
 * - Parses images with Gemini AI for karaoke show parsing
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import * as fs from 'fs';
import * as https from 'https';
import * as path from 'path';
import puppeteer from 'puppeteer';
import { parentPort } from 'worker_threads';
import { getGeminiModel } from '../../config/gemini.config';

interface ImageWorkerData {
  photoUrl: string; // Facebook photo URL (/photo/?fbid=...)
  geminiApiKey: string;
  workerId: number;
  cookiesPath?: string; // Path to Facebook cookies for session
}

interface ParsedImageResult {
  vendor?: string;
  dj?: string;
  show?: {
    venue?: string;
    address?: string;
    time?: string;
    startTime?: string;
    endTime?: string;
    state?: string;
    zip?: string;
    city?: string;
    lat?: string;
    lng?: string;
    day?: string;
    venuePhone?: string;
    venueWebsite?: string;
  };
  originalPhotoUrl: string;
  extractedImageUrl?: string;
  imageUrl?: string;
  source: string;
  success: boolean;
  error?: string;
}

/**
 * Send progress message to parent
 */
function sendProgress(workerId: number, message: string) {
  if (parentPort) {
    parentPort.postMessage({
      type: 'progress',
      workerId,
      message,
    });
  }
}

/**
 * Load Facebook session cookies (same as group parser)
 */
async function loadFacebookCookies(
  page: any,
  cookiesFilePath: string,
  workerId: number,
): Promise<boolean> {
  try {
    if (fs.existsSync(cookiesFilePath)) {
      sendProgress(workerId, '🍪 Loading Facebook session cookies...');
      const cookies = JSON.parse(fs.readFileSync(cookiesFilePath, 'utf8'));

      if (cookies && cookies.length > 0) {
        await page.setCookie(...cookies);
        sendProgress(workerId, `✅ Loaded ${cookies.length} Facebook cookies`);
        return true;
      }
    }

    sendProgress(workerId, '⚠️ No saved Facebook cookies found');
    return false;
  } catch (error) {
    sendProgress(workerId, `❌ Error loading cookies: ${error.message}`);
    return false;
  }
}

/**
 * Check if user is logged into Facebook by looking for login elements
 */
async function checkIfLoginRequired(page: any, workerId: number): Promise<boolean> {
  try {
    sendProgress(workerId, '🔍 Checking if login is required...');

    // Wait a moment for page to fully load
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Check for common login indicators
    const loginSelectors = [
      'input[name="email"]',
      'input[name="pass"]',
      'input[type="password"]',
      '[data-testid="royal_email"]',
      '[data-testid="royal_pass"]',
      'button[name="login"]',
      'input[placeholder*="Email"]',
      'input[placeholder*="Password"]',
    ];

    for (const selector of loginSelectors) {
      const element = await page.$(selector);
      if (element) {
        sendProgress(workerId, `🚫 Login required - found: ${selector}`);
        return true;
      }
    }

    // Check for login page URL patterns
    const currentUrl = page.url();
    if (currentUrl.includes('/login') || currentUrl.includes('/checkpoint')) {
      sendProgress(workerId, `🚫 Login required - redirected to: ${currentUrl}`);
      return true;
    }

    sendProgress(workerId, '✅ No login required - session is valid');
    return false;
  } catch (error) {
    sendProgress(workerId, `⚠️ Error checking login status: ${error.message}`);
    return false; // Assume no login required on error
  }
}

/**
 * Use Gemini to analyze page screenshot and find UI elements or close modals
 */
async function analyzePageWithGemini(screenshotBase64: string, task: string, geminiApiKey: string) {
  const genAI = new GoogleGenerativeAI(geminiApiKey);
  const model = genAI.getGenerativeModel({ model: getGeminiModel('vision') });

  let prompt;

  switch (task) {
    case 'find-close-button':
      prompt = `Analyze this Facebook page screenshot and help me close any login modal or overlay.

Look for:
- X button (close button) in corners of modals/dialogs
- Close button text or icon
- Login modal that needs to be dismissed

Return JSON:
{
  "hasModal": true/false,
  "closeButtonFound": true/false,
  "closeButtonLocation": "description of location",
  "suggestedAction": "what to click or do"
}`;
      break;

    case 'check-image-visible':
      prompt = `Analyze this Facebook photo page and check if the main image is visible and clear.

Look for:
- Main karaoke event image/poster
- Image quality and readability
- Any overlays blocking the image

Return JSON:
{
  "imageVisible": true/false,
  "imageQuality": "description",
  "readyToParse": true/false
}`;
      break;

    default:
      prompt = `Analyze this page and describe what you see.`;
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

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    return { analysis: text };
  } catch (error) {
    return { error: error.message };
  }
}

/**
 * Extract high-resolution image URL from Facebook photo page using Gemini guidance
 */
async function extractHighResImageFromPhotoPage(
  photoUrl: string,
  workerId: number,
  geminiApiKey: string,
  cookiesPath?: string,
): Promise<{ success: boolean; imageUrl?: string; error?: string }> {
  sendProgress(workerId, `🚀 Navigating to Facebook photo page...`);

  const browser = await puppeteer.launch({
    headless: true, // Set to false for debugging
    defaultViewport: { width: 1200, height: 800 },
  });

  try {
    const page = await browser.newPage();

    // Load Facebook cookies robustly
    const cookiesFilePath =
      cookiesPath || path.join(__dirname, '../../../data/facebook-cookies.json');
    await loadFacebookCookies(page, cookiesFilePath, workerId);

    // Navigate to the photo URL
    sendProgress(workerId, `🌐 Loading: ${photoUrl.substring(0, 80)}...`);
    await page.goto(photoUrl, { waitUntil: 'networkidle0' });

    // Check if login is required after navigation
    const loginRequired = await checkIfLoginRequired(page, workerId);
    if (loginRequired) {
      sendProgress(workerId, `🚫 Facebook session expired - cannot access photo`);
      return { success: false, error: 'Facebook login required - session cookies may be expired' };
    }

    // Wait for page to load
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Take screenshot for Gemini analysis
    sendProgress(workerId, `📸 Taking screenshot for AI analysis...`);
    const screenshot1 = await page.screenshot({ encoding: 'base64' });

    // Ask Gemini to check for modals that need closing
    sendProgress(workerId, `🤖 Asking Gemini to analyze page...`);
    const modalAnalysis = await analyzePageWithGemini(
      screenshot1,
      'find-close-button',
      geminiApiKey,
    );

    // Close modal if Gemini found one
    if (modalAnalysis.hasModal && modalAnalysis.closeButtonFound) {
      sendProgress(workerId, `🎯 Gemini detected modal - attempting to close...`);

      try {
        // Try common close button selectors
        const closeSelectors = [
          '[aria-label="Close"]',
          '.x1a2a7pz[role="button"]',
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
              await element.click();
              await new Promise((resolve) => setTimeout(resolve, 2000));
              closed = true;
              sendProgress(workerId, `✅ Closed modal using: ${selector}`);
              break;
            }
          } catch (e) {
            // Try next selector
          }
        }

        if (!closed) {
          // Fallback: coordinate-based click
          const viewport = page.viewport();
          if (viewport) {
            await page.mouse.click(viewport.width - 50, 50);
            await new Promise((resolve) => setTimeout(resolve, 2000));
            sendProgress(workerId, `🎯 Used coordinate-based close`);
          }
        }
      } catch (error) {
        sendProgress(workerId, `⚠️ Modal close failed, continuing anyway...`);
      }
    }

    // Extract the high-resolution image URL
    sendProgress(workerId, `🖼️ Extracting high-resolution image URL...`);
    const imageUrl = await page.evaluate(() => {
      // Try multiple selectors to find the main image
      const selectors = [
        'img[data-visualcompletion="media-vc-image"]',
        'img[src*="scontent"]',
        'img[src*="fbcdn"]',
        '.x1ey2m1c img',
        '[role="img"] img',
        'img[style*="object-fit"]',
      ];

      for (const selector of selectors) {
        const img = document.querySelector(selector) as HTMLImageElement;
        if (img && img.src && img.src.includes('scontent')) {
          // Look for higher resolution version in src
          return img.src;
        }
      }

      // Fallback: find largest scontent image
      const allImages = Array.from(document.querySelectorAll('img')) as HTMLImageElement[];
      const scontentImages = allImages.filter((img) => img.src && img.src.includes('scontent'));

      if (scontentImages.length > 0) {
        // Sort by natural size (largest first)
        scontentImages.sort(
          (a, b) => b.naturalWidth * b.naturalHeight - a.naturalWidth * a.naturalHeight,
        );
        return scontentImages[0].src;
      }

      return null;
    });

    if (imageUrl) {
      sendProgress(workerId, `✅ Extracted high-res URL: ${imageUrl.substring(0, 80)}...`);
      return { success: true, imageUrl };
    } else {
      return { success: false, error: 'Could not find high-resolution image on photo page' };
    }
  } catch (error) {
    return { success: false, error: error.message };
  } finally {
    await browser.close();
  }
}

/**
 * Download image as base64
 */
async function downloadImageAsBase64(imageUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    https
      .get(imageUrl, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`Failed to download: ${response.statusCode}`));
          return;
        }

        const chunks: Buffer[] = [];
        response.on('data', (chunk) => chunks.push(chunk));
        response.on('end', () => {
          const buffer = Buffer.concat(chunks);
          resolve(buffer.toString('base64'));
        });
      })
      .on('error', reject);
  });
}

/**
 * Parse karaoke show image using Gemini AI
 */
async function parseKaraokeImageWithGemini(
  base64Image: string,
  imageUrl: string,
  geminiApiKey: string,
): Promise<ParsedImageResult> {
  const genAI = new GoogleGenerativeAI(geminiApiKey);
  const model = genAI.getGenerativeModel({ model: getGeminiModel('vision') });

  const prompt = `You are analyzing karaoke event images. Extract all event information in JSON format.

IMPORTANT: Look for ALL text and details including:
- Venue name and business information
- Complete address (street, city, state, zip code)
- Geographic location data (latitude, longitude, coordinates if visible)
- Event schedule (days, times, recurring vs one-time)
- DJ/host names or contact info
- Phone numbers and websites
- Special offers or pricing
- Event descriptions

CRITICAL: Extract ALL geographical data available including:
- Full street address
- City name
- State (full name or abbreviation)
- ZIP/postal code
- Any latitude/longitude coordinates mentioned
- Any geographic references or landmarks

Return structured JSON:
{
  "vendor": "business/venue name",
  "dj": "dj or host name if visible",
  "show": {
    "venue": "venue name",
    "address": "complete street address",
    "city": "city name",
    "state": "state name or abbreviation",
    "zip": "zip or postal code",
    "lat": "latitude if available",
    "lng": "longitude if available",
    "day": "day(s) of week",
    "time": "time range",
    "startTime": "start time",
    "endTime": "end time",
    "venuePhone": "phone number",
    "venueWebsite": "website if visible"
  },
  "success": true
}

If no karaoke information is found, return {"success": false}`;

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

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);

      return {
        ...parsed,
        originalPhotoUrl: '',
        extractedImageUrl: imageUrl,
        source: imageUrl,
        success: parsed.success !== false,
      };
    }

    return {
      originalPhotoUrl: '',
      extractedImageUrl: imageUrl,
      source: imageUrl,
      success: false,
      error: 'No valid JSON response from Gemini',
    };
  } catch (error) {
    return {
      originalPhotoUrl: '',
      extractedImageUrl: imageUrl,
      source: imageUrl,
      success: false,
      error: error.message,
    };
  }
}

/**
 * Main worker function - extract high-res image from Facebook photo URL and parse it
 */
async function parseImage(data: ImageWorkerData): Promise<ParsedImageResult> {
  const { photoUrl, geminiApiKey, workerId, cookiesPath } = data;
  let cdnImageUrl: string | null = null; // Track CDN URL for consistent source field

  try {
    sendProgress(workerId, `🎬 Starting enhanced Facebook photo parsing...`);
    sendProgress(workerId, `📷 Photo URL: ${photoUrl.substring(0, 80)}...`);

    // Step 1: Extract high-resolution image URL from photo page
    const extractResult = await extractHighResImageFromPhotoPage(
      photoUrl,
      workerId,
      geminiApiKey,
      cookiesPath,
    );

    if (!extractResult.success || !extractResult.imageUrl) {
      return {
        originalPhotoUrl: photoUrl,
        source: photoUrl, // Fallback to photo URL only when CDN extraction completely fails
        success: false,
        error: extractResult.error || 'Failed to extract high-resolution image URL',
      };
    }

    cdnImageUrl = extractResult.imageUrl; // Store CDN URL for consistent use

    // Step 2: Download the high-resolution image
    sendProgress(workerId, `📥 Downloading high-resolution image...`);
    const base64Image = await downloadImageAsBase64(cdnImageUrl);
    sendProgress(workerId, `✅ Downloaded ${(base64Image.length / 1024).toFixed(1)}KB image`);

    // Step 3: Parse with Gemini
    sendProgress(workerId, `🤖 Parsing image with Gemini AI...`);
    const parseResult = await parseKaraokeImageWithGemini(
      base64Image,
      cdnImageUrl, // Pass CDN URL to ensure it's used as source
      geminiApiKey,
    );

    // Update with photo URL info - ENSURE source is always the CDN URL
    parseResult.originalPhotoUrl = photoUrl;
    parseResult.extractedImageUrl = cdnImageUrl;
    parseResult.imageUrl = cdnImageUrl; // Set imageUrl to CDN URL for consistency
    parseResult.source = cdnImageUrl; // Always use high-res CDN URL as source

    if (parseResult.success) {
      const fields = [
        parseResult.vendor && `Vendor: ${parseResult.vendor}`,
        parseResult.dj && `DJ: ${parseResult.dj}`,
        parseResult.show?.venue && `Venue: ${parseResult.show.venue}`,
        parseResult.show?.address && `Address: ${parseResult.show.address}`,
        parseResult.show?.time && `Time: ${parseResult.show.time}`,
      ]
        .filter(Boolean)
        .join(', ');

      sendProgress(workerId, `✅ Parsed: ${fields || 'No data'}`);
    } else {
      sendProgress(workerId, `❌ No karaoke data found in image`);
    }

    return parseResult;
  } catch (error) {
    const errorResult: ParsedImageResult = {
      originalPhotoUrl: photoUrl,
      source: cdnImageUrl || photoUrl, // Use CDN URL if available, otherwise photo URL fallback
      success: false,
      error: error.message,
    };

    sendProgress(workerId, `❌ Error: ${error.message}`);
    return errorResult;
  }
}

// Worker entry point
if (parentPort) {
  parentPort.on('message', async (data: ImageWorkerData) => {
    try {
      const result = await parseImage(data);
      parentPort?.postMessage({ type: 'complete', workerId: data.workerId, data: result });
    } catch (error) {
      parentPort?.postMessage({
        type: 'error',
        workerId: data.workerId,
        error: error.message,
        data: {
          originalPhotoUrl: data.photoUrl,
          source: data.photoUrl, // In case of complete failure, use photo URL as fallback
          success: false,
          error: error.message,
        },
      });
    }
  });
}

// Export for testing
export { parseImage };
