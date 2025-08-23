/**
 * Facebook Group Parser Worker
 * Handles Puppeteer logic for Facebook group parsing
 * - Loads FB session cookies
 * - Checks login status and handles interactive login
 * - Navigates to group/media page
 * - Extracts header HTML for Gemini group name parsing
 * - Zooms to 50% and scrolls 5 times
 * - Extracts all CDN image URLs
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import * as fs from 'fs';
import * as puppeteer from 'puppeteer';
import { parentPort } from 'worker_threads';
import { getGeminiModel } from '../../config/gemini.config';

interface WorkerData {
  url: string;
  tempDir: string;
  cookiesFilePath: string;
  geminiApiKey: string;
  websocketGateway?: any;
}

interface FacebookGroupResult {
  success: boolean;
  imageUrls: string[];
  pageName: string;
  error?: string;
}

/**
 * Send progress message to parent
 */
function sendProgress(message: string) {
  if (parentPort) {
    parentPort.postMessage({ type: 'progress', message });
  }
}

/**
 * Load Facebook session cookies
 */
async function loadFacebookCookies(page: any, cookiesFilePath: string): Promise<boolean> {
  try {
    if (fs.existsSync(cookiesFilePath)) {
      sendProgress('Loading Facebook session cookies...');
      const cookies = JSON.parse(fs.readFileSync(cookiesFilePath, 'utf8'));

      if (cookies && cookies.length > 0) {
        await page.setCookie(...cookies);
        sendProgress(`Loaded ${cookies.length} Facebook cookies`);
        return true;
      }
    }

    sendProgress('No saved Facebook cookies found');
    return false;
  } catch (error) {
    sendProgress(`Error loading cookies: ${error.message}`);
    return false;
  }
}

/**
 * Save Facebook session cookies
 */
async function saveFacebookCookies(page: any, cookiesFilePath: string): Promise<void> {
  try {
    const cookies = await page.cookies();
    fs.writeFileSync(cookiesFilePath, JSON.stringify(cookies, null, 2));
    sendProgress(`Saved ${cookies.length} Facebook session cookies`);
  } catch (error) {
    sendProgress(`Error saving cookies: ${error.message}`);
  }
}

/**
 * Check if user is logged into Facebook
 */
async function checkIfLoggedIn(page: any): Promise<boolean> {
  try {
    sendProgress('Checking Facebook login status...');

    // Check for common login indicators
    const loginIndicators = await page.evaluate(() => {
      // Check for login page elements
      const loginForm = document.querySelector('#login_form');
      const emailInput = document.querySelector('#email');
      const passwordInput = document.querySelector('#pass');

      // Check for logged-in user elements
      const userNav = document.querySelector('[role="navigation"]');
      const profileMenu = document.querySelector('[data-click="profile_icon"]');

      return {
        hasLoginForm: !!loginForm,
        hasEmailInput: !!emailInput,
        hasPasswordInput: !!passwordInput,
        hasUserNav: !!userNav,
        hasProfileMenu: !!profileMenu,
      };
    });

    const isLoggedIn =
      !loginIndicators.hasLoginForm &&
      !loginIndicators.hasEmailInput &&
      (loginIndicators.hasUserNav || loginIndicators.hasProfileMenu);

    if (isLoggedIn) {
      sendProgress('✅ User is logged into Facebook');
    } else {
      sendProgress('❌ User is NOT logged into Facebook');
    }

    return isLoggedIn;
  } catch (error) {
    sendProgress(`Error checking login status: ${error.message}`);
    return false;
  }
}

/**
 * Close Facebook popups and overlays (notifications, cookies, etc.)
 */
async function closeFacebookPopups(page: any): Promise<void> {
  try {
    sendProgress('🚫 Checking for Facebook popups and overlays...');

    // Wait a moment for any popups to appear
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // More specific and comprehensive selectors for Facebook notifications
    const popupSelectors = [
      // Facebook notification permission popup - most common patterns
      'div[role="dialog"] button[aria-label="Not now"]',
      'div[role="dialog"] button[aria-label="Not Now"]',
      'div[role="dialog"] button[aria-label="Block"]',
      'div[role="dialog"] button[aria-label="Don\'t allow"]',
      'div[role="dialog"] button[aria-label="Don\'t Allow"]',
      'div[role="dialog"] button[aria-label="No thanks"]',
      'div[role="dialog"] button[aria-label="No Thanks"]',

      // Text content based selectors (more reliable)
      'div[role="dialog"] button:has-text("Not now")',
      'div[role="dialog"] button:has-text("Not Now")',
      'div[role="dialog"] button:has-text("Block")',
      'div[role="dialog"] button:has-text("Don\'t allow")',
      'div[role="dialog"] button:has-text("Don\'t Allow")',
      'div[role="dialog"] button:has-text("No thanks")',
      'div[role="dialog"] button:has-text("Maybe later")',
      'div[role="dialog"] button:has-text("Skip")',

      // Generic dialog close buttons
      'div[role="dialog"] button[aria-label*="Close"]',
      'div[role="dialog"] button[aria-label="Close"]',
      'div[role="dialog"] [data-testid="modal-close-button"]',

      // Cookie banners
      '[data-testid="cookie-policy-banner-decline"]',
      'button[data-cookiebanner="accept_only_essential_button"]',

      // Fallback selectors for any modal/overlay
      '[role="dialog"] button[type="button"]',
      '.uiLayerPositioner button',
      '._3ixn button', // Facebook specific class
    ];

    let popupsClosed = 0;

    // Debug: Check what dialogs are present
    const dialogs = await page.$$('[role="dialog"]');
    sendProgress(`🔍 Found ${dialogs.length} dialog(s) on page`);

    // If we have dialogs, try to get their text content for debugging
    if (dialogs.length > 0) {
      for (let i = 0; i < dialogs.length; i++) {
        try {
          const dialogText = await page.evaluate(
            (el) => el.textContent?.substring(0, 100),
            dialogs[i],
          );
          sendProgress(`📝 Dialog ${i + 1}: "${dialogText}"`);
        } catch (e) {
          // Ignore errors getting dialog text
        }
      }
    }

    // Try selectors in order of most common to least common
    for (const selector of popupSelectors) {
      try {
        const elements = await page.$$(selector);

        if (elements.length > 0) {
          sendProgress(`🎯 Found ${elements.length} element(s) matching: ${selector}`);

          for (const element of elements) {
            try {
              const isVisible = await page.evaluate((el) => {
                const rect = el.getBoundingClientRect();
                const style = window.getComputedStyle(el);
                return (
                  rect.width > 0 &&
                  rect.height > 0 &&
                  style.display !== 'none' &&
                  style.visibility !== 'hidden' &&
                  style.opacity !== '0'
                );
              }, element);

              if (isVisible) {
                // Get button text for confirmation
                const buttonText = await page.evaluate((el) => el.textContent?.trim(), element);
                sendProgress(`🖱️ Clicking button: "${buttonText}"`);

                await element.click();
                popupsClosed++;

                // Wait for popup to disappear
                await new Promise((resolve) => setTimeout(resolve, 1000));

                // Check if dialog is gone
                const remainingDialogs = await page.$$('[role="dialog"]');
                if (remainingDialogs.length === 0) {
                  sendProgress(`✅ All dialogs closed successfully`);
                  break;
                }
              }
            } catch (clickError) {
              sendProgress(`⚠️ Failed to click element: ${clickError.message}`);
            }
          }

          // If we successfully closed something, break out of selector loop
          if (popupsClosed > 0) {
            break;
          }
        }
      } catch (error) {
        // Ignore errors for individual selectors
      }
    }

    // If no popups were closed via selectors, try more aggressive methods
    if (popupsClosed === 0) {
      try {
        sendProgress('🚨 Trying escape key and overlay clicks...');

        // Try escape key multiple times
        await page.keyboard.press('Escape');
        await new Promise((resolve) => setTimeout(resolve, 500));
        await page.keyboard.press('Escape');
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Try clicking on potential overlay backgrounds
        const overlays = await page.$$('div[style*="position: fixed"]');
        for (const overlay of overlays) {
          try {
            const style = await page.evaluate((el) => {
              const computedStyle = window.getComputedStyle(el);
              return {
                zIndex: computedStyle.zIndex,
                backgroundColor: computedStyle.backgroundColor,
                position: computedStyle.position,
              };
            }, overlay);

            if (style.position === 'fixed' && parseInt(style.zIndex) > 100) {
              sendProgress(`🎯 Clicking on overlay with z-index ${style.zIndex}`);
              await overlay.click();
              await new Promise((resolve) => setTimeout(resolve, 500));

              // Check if dialogs are gone
              const remainingDialogs = await page.$$('[role="dialog"]');
              if (remainingDialogs.length === 0) {
                popupsClosed++;
                break;
              }
            }
          } catch (e) {
            // Ignore overlay click errors
          }
        }
      } catch (error) {
        sendProgress(`⚠️ Aggressive popup closing failed: ${error.message}`);
      }
    }

    const finalDialogs = await page.$$('[role="dialog"]');
    if (popupsClosed > 0) {
      sendProgress(
        `✅ Successfully closed ${popupsClosed} popup(s), ${finalDialogs.length} dialogs remaining`,
      );
    } else {
      sendProgress(`ℹ️ No popups closed, ${finalDialogs.length} dialogs still present`);
    }
  } catch (error) {
    sendProgress(`⚠️ Error while closing popups: ${error.message}`);
  }
}

/**
 * Interactive Facebook login using WebSocket modal
 */
async function performInteractiveLogin(page: any, cookiesFilePath: string): Promise<boolean> {
  try {
    sendProgress('🔐 Starting interactive Facebook login...');

    // Navigate to Facebook login page
    await page.goto('https://www.facebook.com/login', { waitUntil: 'networkidle0' });

    // Request credentials from main process via WebSocket
    sendProgress('📡 Requesting Facebook credentials from admin...');

    // Send login required message to main process
    if (parentPort) {
      parentPort.postMessage({
        type: 'loginRequired',
        message: 'Facebook login required',
      });
    }

    // Wait for credentials from main process
    const credentials = await waitForCredentials();

    if (!credentials) {
      throw new Error('No credentials received from admin');
    }

    // Perform login with received credentials
    sendProgress('🔑 Logging in with provided credentials...');

    // Fill in email
    const emailInput = await page.waitForSelector('#email', { timeout: 10000 });
    await emailInput.type(credentials.email);

    // Fill in password
    const passwordInput = await page.waitForSelector('#pass', { timeout: 10000 });
    await passwordInput.type(credentials.password);

    // Click login button
    await page.click('[name="login"]');

    // Wait for navigation and check for successful login
    await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 });

    // Check if login was successful (not on login page anymore)
    const currentUrl = page.url();
    if (!currentUrl) {
      throw new Error('Failed to get current URL after login attempt');
    }
    if (currentUrl.includes('/login')) {
      throw new Error('Login failed - still on login page');
    }

    // Save session cookies
    await saveFacebookCookies(page, cookiesFilePath);
    sendProgress('✅ Facebook login successful, session saved');

    return true;
  } catch (error) {
    sendProgress(`Interactive login failed: ${error.message}`);
    return false;
  }
}

/**
 * Wait for credentials from main process
 */
function waitForCredentials(): Promise<any> {
  return new Promise((resolve) => {
    if (!parentPort) {
      resolve(null);
      return;
    }

    const timeout = setTimeout(
      () => {
        resolve(null);
      },
      5 * 60 * 1000,
    ); // 5 minute timeout

    parentPort.on('message', (message) => {
      if (message.type === 'credentials') {
        clearTimeout(timeout);
        resolve({
          email: message.email,
          password: message.password,
        });
      }
    });
  });
}

/**
 * Parse group name from header text using Gemini (optimized for text input)
 */
async function parseGroupNameWithGemini(headerText: string, geminiApiKey: string): Promise<string> {
  try {
    if (!geminiApiKey) {
      sendProgress('No Gemini API key provided, using fallback parsing...');
      return parseGroupNameFallback(headerText);
    }

    sendProgress('🤖 Parsing group name with Gemini AI...');

    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({ model: getGeminiModel('facebook') });

    const prompt = `Extract the Facebook group name from this page text. Return ONLY the group name, nothing else.

Page text: ${headerText}

Group name:`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    let groupName = response.text().trim();

    // Clean up the response
    groupName = groupName.replace(/['"]/g, '').trim();

    if (groupName && groupName.length > 0) {
      sendProgress(`✅ Gemini parsed group name: "${groupName}"`);
      return groupName;
    } else {
      sendProgress('Gemini returned empty result, using fallback...');
      return parseGroupNameFallback(headerText);
    }
  } catch (error) {
    sendProgress(`Gemini parsing failed: ${error.message}, using fallback...`);
    return parseGroupNameFallback(headerText);
  }
}

/**
 * Fallback group name parsing using text patterns (optimized for text input)
 */
function parseGroupNameFallback(headerText: string): string {
  try {
    // Split text into lines and look for group-like names
    const lines = headerText
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    for (const line of lines) {
      // Skip very long lines (likely not group names)
      if (line.length > 100) continue;

      // Skip common Facebook UI text
      if (line.includes('Facebook') && line.includes('log in')) continue;
      if (line.includes('Home') || line.includes('Profile') || line.includes('Settings')) continue;
      if (line.includes('Notifications') || line.includes('Messages')) continue;

      // Look for lines that seem like group names
      if (line.length > 5 && line.length < 80) {
        // If it contains common group keywords, it's likely a group name
        if (
          line.toLowerCase().includes('group') ||
          line.toLowerCase().includes('community') ||
          line.toLowerCase().includes('club') ||
          line.toLowerCase().includes('society') ||
          line.match(/\w+\s+\w+/)
        ) {
          // At least two words
          return line;
        }
      }
    }

    // If no good match found, return the first reasonable line
    for (const line of lines) {
      if (line.length > 5 && line.length < 50) {
        return line;
      }
    }

    return 'Unknown Facebook Group';
  } catch (error) {
    return 'Unknown Facebook Group';
  }
}

/**
 * Main worker function - extract Facebook group data
 */
async function extractFacebookGroupData(data: WorkerData): Promise<FacebookGroupResult> {
  const { url, tempDir, cookiesFilePath, geminiApiKey } = data;
  let browser: any = null;
  const startTime = Date.now();

  try {
    sendProgress('🚀 Launching Puppeteer browser...');

    // Launch browser with optimal settings
    browser = await puppeteer.launch({
      headless: true, // Run in headless mode for production
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--window-size=1920,1080',
      ],
    });

    const page = await browser.newPage();

    // Set viewport and user agent
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    );

    // Load Facebook cookies
    await loadFacebookCookies(page, cookiesFilePath);

    // Navigate to group page with /media
    if (!url) {
      throw new Error('URL parameter is undefined');
    }
    const mediaUrl = url.includes('/media') ? url : `${url}/media`;
    sendProgress(`📱 Navigating to: ${mediaUrl}`);

    await page.goto(mediaUrl, { waitUntil: 'networkidle0', timeout: 30000 });

    // Close any Facebook popups (notifications, overlays, etc.) - do this once after navigation
    await closeFacebookPopups(page);

    // Check if logged in
    const isLoggedIn = await checkIfLoggedIn(page);

    if (!isLoggedIn) {
      // Attempt interactive login
      const loginSuccess = await performInteractiveLogin(page, cookiesFilePath);
      if (!loginSuccess) {
        throw new Error('Facebook login required. Please login through admin panel first.');
      }

      // Navigate back to group page after login
      await page.goto(mediaUrl, { waitUntil: 'networkidle0', timeout: 30000 });

      // Only close popups again if we had to re-navigate after login
      // The login process might have triggered new popups
      await closeFacebookPopups(page);
    } // Save cookies after successful navigation
    await saveFacebookCookies(page, cookiesFilePath);

    // Extract header text for group name parsing (optimized - text only instead of HTML)
    sendProgress('📄 Extracting header text for group name...');

    const headerText = await page.evaluate(() => {
      // Get header elements that might contain group name
      const selectors = [
        'header',
        '[data-pagelet="GroupsRHCHeader"]',
        '[data-pagelet="GroupHeader"]',
        'h1',
        'h2',
        '[role="banner"]',
        '.group-header',
        '.group-name',
        '[data-testid="group_name"]',
        '[aria-label*="group"]',
      ];

      let headerTexts = [];

      for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element) {
          const text = element.textContent?.trim();
          if (text && text.length > 0 && text.length < 200) {
            // Only include reasonable length text that might be a group name
            headerTexts.push(text);
          }
        }
      }

      // Also get page title
      const title = document.title?.trim();
      if (title) {
        headerTexts.push(title);
      }

      // Get all h1-h3 elements text (likely contains group name)
      const headings = document.querySelectorAll('h1, h2, h3');
      headings.forEach((heading) => {
        const text = heading.textContent?.trim();
        if (text && text.length > 0 && text.length < 100) {
          headerTexts.push(text);
        }
      });

      // Remove duplicates and join
      const uniqueTexts = [...new Set(headerTexts)];
      return uniqueTexts.join('\n');
    });

    sendProgress(`📄 Extracted ${headerText.length} chars of header text (optimized)`);

    // Parse group name using Gemini
    const pageName = await parseGroupNameWithGemini(headerText, geminiApiKey);

    // Zoom out to 50%
    sendProgress('🔍 Zooming out to 50% for better image visibility...');
    await page.evaluate(() => {
      document.body.style.zoom = '0.5';
    });

    // Wait for zoom to take effect
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Enhanced scrolling to load all images
    sendProgress('📜 Starting enhanced scroll sequence to load all images...');

    let previousImageCount = 0;
    let scrollAttempts = 0;
    const maxScrollAttempts = 20; // Increased from 5 to 20
    let stableCount = 0;

    while (scrollAttempts < maxScrollAttempts && stableCount < 3) {
      scrollAttempts++;
      sendProgress(`📜 Scroll ${scrollAttempts}/${maxScrollAttempts} - scrolling down...`);

      // Scroll down more aggressively
      await page.evaluate(() => {
        window.scrollBy(0, window.innerHeight * 0.8); // Scroll 80% of viewport height
      });

      // Wait for images to load
      await new Promise((resolve) => setTimeout(resolve, 3000)); // Increased wait time

      // Check current image count
      const currentImageCount = await page.evaluate(() => {
        const images = document.querySelectorAll('img[src*="scontent"], img[src*="fbcdn"]');
        return images.length;
      });

      sendProgress(`🖼️ Found ${currentImageCount} images so far...`);

      // If image count hasn't changed for 3 consecutive scrolls, we're probably at the bottom
      if (currentImageCount === previousImageCount) {
        stableCount++;
      } else {
        stableCount = 0;
        previousImageCount = currentImageCount;
      }

      // Additional scroll to bottom if we seem to have reached the end
      if (stableCount >= 2) {
        sendProgress('📜 Scrolling to absolute bottom to ensure all content is loaded...');
        await page.evaluate(() => {
          window.scrollTo(0, document.body.scrollHeight);
        });
        await new Promise((resolve) => setTimeout(resolve, 5000)); // Longer wait at bottom
        break;
      }
    }

    sendProgress(`📜 Scroll sequence complete after ${scrollAttempts} attempts`);

    // Additional wait for any final loading
    sendProgress('⏳ Final wait for lazy-loaded images...');
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Extract Facebook photo URLs (not CDN thumbnails) for high-resolution access
    sendProgress('🖼️ Extracting Facebook photo URLs for high-resolution image access...');

    const imageUrls = await page.evaluate(() => {
      // Find all <a> tags that contain <img> elements and link to photo pages
      const photoLinks = Array.from(document.querySelectorAll('a[href*="/photo/"]'));
      const photoUrls: string[] = [];

      console.log(`Found ${photoLinks.length} photo links`);

      photoLinks.forEach((link, index) => {
        const href = (link as HTMLAnchorElement).href;
        const img = link.querySelector('img') as HTMLImageElement;

        if (img && href) {
          const imgSrc = img.src || img.getAttribute('data-src');

          // Verify this is a content image (not profile/UI)
          if (
            imgSrc &&
            (imgSrc.includes('scontent') ||
              imgSrc.includes('fbcdn') ||
              imgSrc.includes('cdninstagram'))
          ) {
            // Check image size to filter out small UI elements
            const width = img.naturalWidth || img.width || 0;
            const height = img.naturalHeight || img.height || 0;

            if (width > 100 && height > 100) {
              // Exclude profile pictures and UI elements
              if (
                !imgSrc.includes('profile') &&
                !imgSrc.includes('avatar') &&
                !imgSrc.includes('icon') &&
                !imgSrc.includes('emoji') &&
                !imgSrc.includes('reaction')
              ) {
                // Convert relative URLs to absolute URLs
                const fullPhotoUrl = href.startsWith('http')
                  ? href
                  : `https://www.facebook.com${href}`;

                console.log(
                  `Adding photo URL ${index + 1}: ${width}x${height} - ${fullPhotoUrl.substring(0, 100)}...`,
                );
                photoUrls.push(fullPhotoUrl);
              }
            }
          }
        }
      });

      console.log(`Filtered to ${photoUrls.length} valid photo URLs`);

      // Remove duplicates
      const uniqueUrls = [...new Set(photoUrls)];
      console.log(`After deduplication: ${uniqueUrls.length} unique photo URLs`);

      return uniqueUrls;
    });

    const processingTime = Date.now() - startTime;

    sendProgress(`✅ Extraction complete! Found ${imageUrls.length} Facebook photo URLs`);

    // Log first few URLs for debugging
    if (imageUrls.length > 0) {
      sendProgress(`🔍 First 3 photo URLs for debugging:`);
      imageUrls.slice(0, 3).forEach((url, index) => {
        sendProgress(`   ${index + 1}. ${url.substring(0, 100)}...`);
      });
    } else {
      sendProgress(
        `❌ No photo URLs found - this might indicate an issue with photo link detection`,
      );
    }

    sendProgress(`⏱️ Total processing time: ${processingTime}ms`);

    return {
      success: true,
      imageUrls,
      pageName,
    };
  } catch (error) {
    const processingTime = Date.now() - startTime;
    sendProgress(`❌ Error after ${processingTime}ms: ${error.message}`);

    return {
      success: false,
      imageUrls: [],
      pageName: 'Unknown Group',
      error: error.message,
    };
  } finally {
    if (browser) {
      sendProgress('🔒 Closing browser...');
      await browser.close();
    }
  }
}

// Worker entry point
if (parentPort) {
  parentPort.on('message', async (data: WorkerData) => {
    try {
      const result = await extractFacebookGroupData(data);
      parentPort?.postMessage({ type: 'complete', data: result });
    } catch (error) {
      parentPort?.postMessage({
        type: 'error',
        error: error.message,
        data: {
          success: false,
          imageUrls: [],
          pageName: 'Unknown Group',
          error: error.message,
        },
      });
    }
  });
}

// Export for testing
export { extractFacebookGroupData };
