/**
 * Facebook Group Parser Worker
 * Handles Puppeteer logic for Facebook group parsing
 * - Loads FB session cookies
 * - Checks login status and handles interactive login
 * - Navigates to group/media page
 * - Extracts header HTML for Gemini group name parsing
 * - Zooms to 50% and scrolls 5 times (optimized performance)
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
 * Load Facebook session cookies with enhanced validation and error reporting
 */
async function loadFacebookCookies(page: any, cookiesFilePath: string): Promise<boolean> {
  try {
    let cookies = [];
    let cookieSource = '';

    // Enhanced logging for production debugging
    sendProgress(`🔍 [COOKIE-LOAD] Environment: ${process.env.NODE_ENV || 'unknown'}`);
    sendProgress(`🔍 [COOKIE-LOAD] Checking FB_SESSION_COOKIES env var...`);

    // First try to get cookies from environment variable (for production/Cloud Run)
    const cookiesFromEnv = process.env.FB_SESSION_COOKIES;
    if (cookiesFromEnv) {
      sendProgress(`🔍 [COOKIE-LOAD] FB_SESSION_COOKIES found, length: ${cookiesFromEnv.length} chars`);
      sendProgress(`🔍 [COOKIE-LOAD] First 100 chars: ${cookiesFromEnv.substring(0, 100)}...`);
      try {
        cookies = JSON.parse(cookiesFromEnv);
        cookieSource = 'environment variable';
        sendProgress(`📦 [COOKIE-LOAD] Successfully parsed ${cookies.length} cookies from environment variable`);
      } catch (parseError) {
        sendProgress(
          `❌ [COOKIE-LOAD] Failed to parse FB_SESSION_COOKIES: ${parseError.message}`,
        );
        sendProgress(`🔍 [COOKIE-LOAD] Raw env var sample: ${cookiesFromEnv.substring(0, 200)}`);
        // Fall back to file loading
      }
    } else {
      sendProgress(`⚠️ [COOKIE-LOAD] FB_SESSION_COOKIES environment variable not found`);
    }

    // If no cookies from environment, try loading from file (development)
    if (cookies.length === 0 && fs.existsSync(cookiesFilePath)) {
      sendProgress(`📂 [COOKIE-LOAD] Fallback: Loading from file ${cookiesFilePath}`);
      const cookiesData = fs.readFileSync(cookiesFilePath, 'utf8');
      cookies = JSON.parse(cookiesData);
      cookieSource = `file: ${cookiesFilePath}`;
      sendProgress(`📂 [COOKIE-LOAD] Loaded ${cookies.length} cookies from file`);
    }

    if (cookies.length === 0) {
      sendProgress('❌ [COOKIE-LOAD] No Facebook cookies found (neither environment variable nor file)');
      if (process.env.NODE_ENV === 'production') {
        sendProgress(
          '💡 [COOKIE-LOAD] For production, set FB_SESSION_COOKIES environment variable with valid Facebook session cookies',
        );
      } else {
        sendProgress('💡 [COOKIE-LOAD] For development, ensure facebook-cookies.json exists in data/ directory');
      }
      return false;
    }

    // Enhanced cookie validation with detailed logging
    const now = Date.now();
    let validCookies = 0;
    let expiredCookies = 0;
    let criticalCookies = 0;
    const criticalCookieNames = ['c_user', 'xs', 'fr', 'sb', 'datr'];

    sendProgress(`🔍 [COOKIE-VALIDATION] Starting validation of ${cookies.length} cookies at ${new Date(now).toISOString()}`);

    for (const cookie of cookies) {
      // Enhanced cookie logging
      const cookieInfo = `${cookie.name}=${cookie.value?.substring(0, 20)}... (domain: ${cookie.domain}, expires: ${cookie.expires ? new Date(cookie.expires * 1000).toISOString() : 'session'})`;
      
      // Check if cookie has required fields
      if (!cookie.name || !cookie.value || !cookie.domain) {
        sendProgress(`⚠️ [COOKIE-VALIDATION] Malformed cookie: ${cookieInfo}`);
        continue;
      }

      // Check if this is a critical Facebook authentication cookie
      const isCritical = criticalCookieNames.includes(cookie.name);
      if (isCritical) {
        criticalCookies++;
        sendProgress(`🔑 [COOKIE-VALIDATION] Critical auth cookie: ${cookie.name}`);
      }

      // Check if cookie is expired
      if (cookie.expires && cookie.expires * 1000 < now) {
        expiredCookies++;
        const expiredDate = new Date(cookie.expires * 1000);
        sendProgress(`⏰ [COOKIE-VALIDATION] Expired cookie ${cookie.name}: expired ${expiredDate.toISOString()}`);
        if (isCritical) {
          sendProgress(`🚨 [COOKIE-VALIDATION] CRITICAL: Authentication cookie ${cookie.name} is expired!`);
        }
        continue;
      }

      // Set valid cookies with error handling
      try {
        await page.setCookie({
          name: cookie.name,
          value: cookie.value,
          domain: cookie.domain,
          path: cookie.path || '/',
          expires: cookie.expires,
          httpOnly: cookie.httpOnly,
          secure: cookie.secure,
          sameSite: cookie.sameSite,
        });
        validCookies++;
        if (isCritical) {
          sendProgress(`✅ [COOKIE-VALIDATION] Successfully set critical cookie: ${cookie.name}`);
        }
      } catch (setCookieError) {
        sendProgress(`⚠️ [COOKIE-VALIDATION] Failed to set cookie ${cookie.name}: ${setCookieError.message}`);
      }
    }

    // Enhanced validation summary
    sendProgress(`📊 [COOKIE-VALIDATION] Summary:`);
    sendProgress(`    - Total cookies: ${cookies.length}`);
    sendProgress(`    - Valid cookies set: ${validCookies}`);
    sendProgress(`    - Expired cookies: ${expiredCookies}`);
    sendProgress(`    - Critical auth cookies: ${criticalCookies}`);
    sendProgress(`    - Cookie source: ${cookieSource}`);

    if (validCookies === 0) {
      sendProgress(
        `❌ [COOKIE-VALIDATION] FATAL: No valid cookies could be set (${expiredCookies} expired, ${cookies.length - validCookies - expiredCookies} invalid)`,
      );
      return false;
    }

    if (criticalCookies === 0) {
      sendProgress(`⚠️ [COOKIE-VALIDATION] WARNING: No critical authentication cookies found. This may cause login issues.`);
    }

    sendProgress(
      `✅ [COOKIE-VALIDATION] Successfully loaded ${validCookies}/${cookies.length} Facebook session cookies from ${cookieSource}`,
    );

    if (expiredCookies > 0) {
      sendProgress(
        `⚠️ [COOKIE-VALIDATION] Note: ${expiredCookies} cookies were expired and skipped. Consider refreshing your session cookies.`,
      );
    }

    sendProgress(`🔍 [COOKIE-VALIDATION] Validating ${cookies.length} cookies...`);

    for (const cookie of cookies) {
      // Check if cookie has required fields
      if (!cookie.name || !cookie.value || !cookie.domain) {
        sendProgress(`⚠️ [COOKIE-VALIDATION] Skipping malformed cookie: ${JSON.stringify(cookie)}`);
        continue;
      }

      // Log critical cookies
      if (['c_user', 'xs', 'datr', 'fr'].includes(cookie.name)) {
        criticalCookies++;
        const expiryDate = cookie.expires ? new Date(cookie.expires * 1000).toISOString() : 'no expiry';
        sendProgress(`🔑 [CRITICAL-COOKIE] ${cookie.name}: expires=${expiryDate}, domain=${cookie.domain}`);
      }

      // Check if cookie is expired
      if (cookie.expires && cookie.expires * 1000 < now) {
        expiredCookies++;
        sendProgress(
          `⏰ [COOKIE-VALIDATION] Cookie ${cookie.name} is expired (expired: ${new Date(cookie.expires * 1000).toISOString()})`,
        );
        continue;
      }

      // Set valid cookies with enhanced error logging
      try {
        await page.setCookie({
          name: cookie.name,
          value: cookie.value,
          domain: cookie.domain,
          path: cookie.path || '/',
          expires: cookie.expires,
          httpOnly: cookie.httpOnly,
          secure: cookie.secure,
          sameSite: cookie.sameSite,
        });
        validCookies++;
        
        // Log successful setting of critical cookies
        if (['c_user', 'xs', 'datr', 'fr'].includes(cookie.name)) {
          sendProgress(`✅ [CRITICAL-COOKIE] Successfully set ${cookie.name}`);
        }
      } catch (setCookieError) {
        sendProgress(`⚠️ [COOKIE-VALIDATION] Failed to set cookie ${cookie.name}: ${setCookieError.message}`);
      }
    }

    sendProgress(`📊 [COOKIE-SUMMARY] Total: ${cookies.length}, Valid: ${validCookies}, Expired: ${expiredCookies}, Critical: ${criticalCookies}`);

    if (validCookies === 0) {
      sendProgress(
        `❌ [COOKIE-LOAD] No valid cookies could be set (${expiredCookies} expired, ${cookies.length - validCookies - expiredCookies} invalid)`,
      );
      return false;
    }

    if (criticalCookies === 0) {
      sendProgress(
        `⚠️ [COOKIE-LOAD] Warning: No critical authentication cookies (c_user, xs, datr, fr) found!`,
      );
    }

    sendProgress(
      `✅ [COOKIE-LOAD] Successfully loaded ${validCookies}/${cookies.length} Facebook session cookies from ${cookieSource}`,
    );

    if (expiredCookies > 0) {
      sendProgress(
        `⚠️ [COOKIE-LOAD] Note: ${expiredCookies} cookies were expired and skipped. Consider refreshing your session cookies.`,
      );
    }

    return true;
  } catch (error) {
    sendProgress(`❌ Failed to load Facebook cookies: ${error.message}`);
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
 * Check if user is logged into Facebook with comprehensive analysis and debugging
 */
async function checkIfLoggedIn(page: any): Promise<boolean> {
  try {
    sendProgress('🔍 [LOGIN-CHECK] Starting comprehensive Facebook login status analysis...');

    // Wait for page to stabilize
    await new Promise((resolve) => setTimeout(resolve, 2000));
    
    // First, check for blocking overlays
    const overlayAnalysis = await detectPageOverlays(page);
    if (overlayAnalysis.hasBlockingOverlay) {
      sendProgress(`⚠️ [LOGIN-CHECK] Blocking overlay detected - this may interfere with login detection`);
      if (overlayAnalysis.interactionBlocked) {
        sendProgress(`🚨 [LOGIN-CHECK] CRITICAL: Page interaction is completely blocked by overlay!`);
      }
    }

    // Enhanced page analysis with comprehensive logging
    const loginStatus = await page.evaluate(() => {
      // Page basic info
      const pageInfo = {
        url: window.location.href,
        title: document.title,
        pathname: window.location.pathname,
        search: window.location.search,
        hash: window.location.hash
      };

      // Login page indicators - comprehensive search
      const loginFormSelectors = [
        '#login_form', '[data-testid="login_form"]', 'form[action*="login"]',
        'form[action*="checkpoint"]', '.login-form', '#loginForm'
      ];
      const emailSelectors = [
        '#email', '[name="email"]', 'input[type="email"]', 
        '[data-testid="email"]', '[placeholder*="email"]', '[placeholder*="Email"]'
      ];
      const passwordSelectors = [
        '#pass', '[name="pass"]', '[name="password"]', 'input[type="password"]',
        '[data-testid="password"]', '[placeholder*="password"]', '[placeholder*="Password"]'
      ];
      const loginButtonSelectors = [
        '[data-testid="login_button"]', '[name="login"]', 'button[type="submit"]',
        'input[type="submit"]', 'button[value="Log In"]', '[aria-label*="Log in"]'
      ];

      // Logged-in user indicators - comprehensive search
      const userNavSelectors = [
        '[role="navigation"]', 'nav', '.navigation', '#userNavigationLabel',
        '[data-click="profile_icon"]', '[aria-label*="profile"]', '[aria-label*="account"]'
      ];
      const notificationSelectors = [
        '[aria-label*="notification"]', '[aria-label*="Notification"]',
        '[data-testid*="notification"]', '.notifications', '#notifications'
      ];
      const messagesSelectors = [
        '[aria-label*="message"]', '[aria-label*="Message"]', '[aria-label*="Messenger"]',
        '[data-testid*="message"]', '.messages', '#messages'
      ];

      // Comprehensive element detection
      const loginElements = {
        forms: loginFormSelectors.map(sel => ({ selector: sel, found: !!document.querySelector(sel), count: document.querySelectorAll(sel).length })),
        emailInputs: emailSelectors.map(sel => ({ selector: sel, found: !!document.querySelector(sel), count: document.querySelectorAll(sel).length })),
        passwordInputs: passwordSelectors.map(sel => ({ selector: sel, found: !!document.querySelector(sel), count: document.querySelectorAll(sel).length })),
        loginButtons: loginButtonSelectors.map(sel => ({ selector: sel, found: !!document.querySelector(sel), count: document.querySelectorAll(sel).length }))
      };

      const userElements = {
        navigation: userNavSelectors.map(sel => ({ selector: sel, found: !!document.querySelector(sel), count: document.querySelectorAll(sel).length })),
        notifications: notificationSelectors.map(sel => ({ selector: sel, found: !!document.querySelector(sel), count: document.querySelectorAll(sel).length })),
        messages: messagesSelectors.map(sel => ({ selector: sel, found: !!document.querySelector(sel), count: document.querySelectorAll(sel).length }))
      };

      // Count totals
      const loginElementsFound = Object.values(loginElements).flat().filter(el => el.found).length;
      const userElementsFound = Object.values(userElements).flat().filter(el => el.found).length;

      // Facebook-specific checks
      const fbSpecificElements = {
        fbLogo: !!document.querySelector('[aria-label="Facebook"]'),
        homeLink: !!document.querySelector('a[href="/"]'),
        searchBox: !!document.querySelector('[role="combobox"], [placeholder*="Search"], input[name="q"]'),
        feedContainer: !!document.querySelector('[role="feed"], #stream_pagelet, .feed')
      };

      // Error message detection
      const errorSelectors = [
        '[data-testid="form_error"]', '.error-message', '[role="alert"]', 
        '.alert', '.error', '[class*="error"]', '[id*="error"]'
      ];
      const errorElements = errorSelectors.map(sel => {
        const elements = Array.from(document.querySelectorAll(sel));
        return elements.map(el => ({
          selector: sel,
          text: el.textContent?.trim()?.substring(0, 100),
          visible: el.offsetWidth > 0 && el.offsetHeight > 0
        })).filter(err => err.text && err.text.length > 0);
      }).flat();

      // Content analysis
      const bodyText = document.body?.textContent?.toLowerCase() || '';
      const hasLoginKeywords = ['log in', 'sign in', 'login', 'signin', 'enter password'].some(keyword => 
        bodyText.includes(keyword)
      );
      const hasLoggedInKeywords = ['news feed', 'home', 'timeline', 'what\'s on your mind'].some(keyword => 
        bodyText.includes(keyword)
      );

      return {
        pageInfo,
        loginElements,
        userElements,
        fbSpecificElements,
        errorElements,
        loginElementsFound,
        userElementsFound,
        hasLoginKeywords,
        hasLoggedInKeywords,
        bodyTextSample: bodyText.substring(0, 500)
      };
    });

    // Comprehensive logging of analysis results
    sendProgress(`📊 [LOGIN-CHECK] Page Analysis Results:`);
    sendProgress(`    📍 URL: ${loginStatus.pageInfo.url}`);
    sendProgress(`    📄 Title: "${loginStatus.pageInfo.title}"`);
    sendProgress(`    🛤️  Path: ${loginStatus.pageInfo.pathname}`);
    if (loginStatus.pageInfo.search) {
      sendProgress(`    🔍 Query: ${loginStatus.pageInfo.search}`);
    }

    sendProgress(`📊 [LOGIN-CHECK] Element Detection Summary:`);
    sendProgress(`    🔐 Login elements found: ${loginStatus.loginElementsFound}`);
    sendProgress(`    👤 User elements found: ${loginStatus.userElementsFound}`);
    sendProgress(`    📝 Has login keywords: ${loginStatus.hasLoginKeywords}`);
    sendProgress(`    🏠 Has logged-in keywords: ${loginStatus.hasLoggedInKeywords}`);

    // Detailed element logging
    Object.entries(loginStatus.loginElements).forEach(([category, elements]) => {
      const foundElements = elements.filter(el => el.found);
      if (foundElements.length > 0) {
        sendProgress(`🔐 [LOGIN-CHECK] ${category}: ${foundElements.map(el => `${el.selector}(${el.count})`).join(', ')}`);
      }
    });

    Object.entries(loginStatus.userElements).forEach(([category, elements]) => {
      const foundElements = elements.filter(el => el.found);
      if (foundElements.length > 0) {
        sendProgress(`👤 [LOGIN-CHECK] ${category}: ${foundElements.map(el => `${el.selector}(${el.count})`).join(', ')}`);
      }
    });

    // Facebook-specific elements
    const fbElements = Object.entries(loginStatus.fbSpecificElements).filter(([key, found]) => found);
    if (fbElements.length > 0) {
      sendProgress(`🔵 [LOGIN-CHECK] Facebook elements: ${fbElements.map(([key]) => key).join(', ')}`);
    }

    // Error messages
    if (loginStatus.errorElements.length > 0) {
      sendProgress(`🚨 [LOGIN-CHECK] Errors detected:`);
      loginStatus.errorElements.forEach((error, index) => {
        sendProgress(`    ${index + 1}. "${error.text}" (${error.visible ? 'visible' : 'hidden'})`);
      });
    }

    // Body text sample for debugging
    if (loginStatus.bodyTextSample) {
      sendProgress(`📝 [LOGIN-CHECK] Page content sample: "${loginStatus.bodyTextSample.substring(0, 200)}..."`);
    }

    // Enhanced decision logic with detailed reasoning
    const analysis = {
      hasLoginElements: loginStatus.loginElementsFound > 0,
      hasUserElements: loginStatus.userElementsFound > 0,
      isLoginUrl: loginStatus.pageInfo.url.includes('/login') || 
                  loginStatus.pageInfo.url.includes('/checkpoint') ||
                  loginStatus.pageInfo.pathname === '/login' ||
                  loginStatus.pageInfo.pathname === '/checkpoint',
      isGroupUrl: loginStatus.pageInfo.url.includes('/groups/'),
      isHomepage: loginStatus.pageInfo.pathname === '/' || loginStatus.pageInfo.pathname === '',
      hasErrors: loginStatus.errorElements.length > 0,
      hasBlockingOverlay: overlayAnalysis.hasBlockingOverlay
    };

    sendProgress(`🤔 [LOGIN-CHECK] Decision Analysis:`);
    sendProgress(`    🔐 Has login elements: ${analysis.hasLoginElements}`);
    sendProgress(`    👤 Has user elements: ${analysis.hasUserElements}`);
    sendProgress(`    🔗 Is login URL: ${analysis.isLoginUrl}`);
    sendProgress(`    👥 Is group URL: ${analysis.isGroupUrl}`);
    sendProgress(`    🏠 Is homepage: ${analysis.isHomepage}`);
    sendProgress(`    ❌ Has errors: ${analysis.hasErrors}`);
    sendProgress(`    🚫 Has blocking overlay: ${analysis.hasBlockingOverlay}`);

    // Decision logic with detailed reasoning
    if (analysis.isLoginUrl) {
      sendProgress('❌ [LOGIN-CHECK] RESULT: NOT logged in - URL indicates login/checkpoint page');
      return false;
    }

    if (analysis.hasLoginElements && !analysis.hasUserElements) {
      sendProgress('❌ [LOGIN-CHECK] RESULT: NOT logged in - login elements present, no user navigation detected');
      return false;
    }

    if (analysis.hasBlockingOverlay && overlayAnalysis.interactionBlocked) {
      sendProgress('⚠️ [LOGIN-CHECK] WARNING: Blocking overlay detected, login status may be unreliable');
    }

    if (analysis.hasUserElements && !analysis.hasLoginElements) {
      sendProgress('✅ [LOGIN-CHECK] RESULT: LOGGED IN - user navigation elements present, no login forms');
      return true;
    }

    if (analysis.isGroupUrl && !analysis.hasLoginElements) {
      sendProgress('✅ [LOGIN-CHECK] RESULT: LOGGED IN - successfully accessing group page without login prompts');
      return true;
    }

    if (analysis.isHomepage && analysis.hasUserElements) {
      sendProgress('✅ [LOGIN-CHECK] RESULT: LOGGED IN - on homepage with user elements visible');
      return true;
    }

    // Default case with detailed reasoning
    sendProgress('⚠️ [LOGIN-CHECK] RESULT: UNCLEAR - defaulting to NOT logged in for safety');
    sendProgress(`    Reasoning: Mixed signals detected`);
    sendProgress(`    - Login elements: ${analysis.hasLoginElements}`);
    sendProgress(`    - User elements: ${analysis.hasUserElements}`);
    sendProgress(`    - Page type: ${analysis.isLoginUrl ? 'login' : analysis.isGroupUrl ? 'group' : 'other'}`);
    
    return false;
  } catch (error) {
    sendProgress(`❌ [LOGIN-CHECK] Error during login status check: ${error.message}`);
    sendProgress(`❌ [LOGIN-CHECK] Stack trace: ${error.stack}`);
    return false;
  }
}

    // Wait for page to stabilize
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Check for various login/logout indicators
    const loginStatus = await page.evaluate(() => {
      // Check for login page elements
      const loginForm = document.querySelector('#login_form, [data-testid="login_form"]');
      const emailInput = document.querySelector('#email, [name="email"]');
      const passwordInput = document.querySelector('#pass, [name="pass"]');
      const loginButton = document.querySelector('[data-testid="login_button"], [name="login"]');

      // Check for logged-in user elements
      const userNav = document.querySelector('[role="navigation"]');
      const profileMenu = document.querySelector(
        '[data-click="profile_icon"], [aria-label*="profile"], [aria-label*="account"]',
      );
      const homeLink = document.querySelector('a[href="/"]');

      // Check for Facebook navigation elements
      const fbLogo = document.querySelector('[aria-label="Facebook"]');
      const notificationIcon = document.querySelector(
        '[aria-label*="notification"], [aria-label*="Notification"]',
      );
      const messagesIcon = document.querySelector(
        '[aria-label*="message"], [aria-label*="Message"]',
      );

      // Check page URL and title for login indicators
      const url = window.location.href;
      const title = document.title;

      // Look for error messages or login prompts
      const errorMessages = Array.from(document.querySelectorAll('div, span')).filter(
        (el) =>
          el.textContent &&
          (el.textContent.includes('log in') ||
            el.textContent.includes('login') ||
            el.textContent.includes('password') ||
            el.textContent.includes('email')),
      );

      return {
        url,
        title,
        hasLoginForm: !!loginForm,
        hasEmailInput: !!emailInput,
        hasPasswordInput: !!passwordInput,
        hasLoginButton: !!loginButton,
        hasUserNav: !!userNav,
        hasProfileMenu: !!profileMenu,
        hasHomeLink: !!homeLink,
        hasFbLogo: !!fbLogo,
        hasNotificationIcon: !!notificationIcon,
        hasMessagesIcon: !!messagesIcon,
        errorCount: errorMessages.length,
        errorSample: errorMessages
          .slice(0, 2)
          .map((el) => el.textContent?.trim())
          .filter(Boolean),
      };
    });

    // Detailed logging for debugging
    sendProgress(`📊 Login analysis:`);
    sendProgress(`   URL: ${loginStatus.url}`);
    sendProgress(`   Title: ${loginStatus.title}`);
    sendProgress(
      `   Login elements: form=${loginStatus.hasLoginForm}, email=${loginStatus.hasEmailInput}, pass=${loginStatus.hasPasswordInput}`,
    );
    sendProgress(
      `   User elements: nav=${loginStatus.hasUserNav}, profile=${loginStatus.hasProfileMenu}, notifications=${loginStatus.hasNotificationIcon}`,
    );

    // Determine if logged in based on multiple indicators
    const loginPageIndicators =
      loginStatus.hasLoginForm || loginStatus.hasEmailInput || loginStatus.hasPasswordInput;
    const loggedInIndicators =
      loginStatus.hasUserNav ||
      loginStatus.hasProfileMenu ||
      loginStatus.hasNotificationIcon ||
      loginStatus.hasMessagesIcon;

    // Check URL patterns
    const isLoginUrl =
      loginStatus.url.includes('/login') || loginStatus.url.includes('/checkpoint');
    const isGroupUrl = loginStatus.url.includes('/groups/');

    if (loginPageIndicators && !loggedInIndicators) {
      sendProgress('❌ Login page detected - user is NOT logged in');
      if (loginStatus.errorSample.length > 0) {
        sendProgress(`   Error messages: ${loginStatus.errorSample.join(', ')}`);
      }
      return false;
    }

    if (isLoginUrl) {
      sendProgress('❌ Login URL detected - user is NOT logged in');
      return false;
    }

    if (loggedInIndicators && !loginPageIndicators && !isLoginUrl) {
      sendProgress('✅ User navigation elements detected - user IS logged in');
      return true;
    }

    // If accessing a group URL successfully without login prompts, likely logged in
    if (isGroupUrl && !loginPageIndicators) {
      sendProgress('✅ Successfully accessing group page - user IS logged in');
      return true;
    }

    // Default to not logged in if unclear
    sendProgress('⚠️ Login status unclear - defaulting to NOT logged in for safety');
    return false;
  } catch (error) {
    sendProgress(`❌ Error checking login status: ${error.message}`);
    return false;
  }
}

/**
 * Use Gemini AI to analyze page content and detect blocking popups/overlays
 */
async function analyzePageWithGemini(
  page: any,
  geminiApiKey: string,
): Promise<{
  hasBlockingPopup: boolean;
  popupDescription: string;
  suggestedActions: string[];
}> {
  try {
    if (!geminiApiKey) {
      sendProgress('No Gemini API key for page analysis, using basic detection...');
      return { hasBlockingPopup: false, popupDescription: '', suggestedActions: [] };
    }

    sendProgress('🤖 Analyzing page with Gemini AI to detect blocking elements...');

    // Get page screenshot and visible text
    const pageText = await page.evaluate(() => {
      // Get all visible text from dialogs, modals, and prominent elements
      const elements = [
        ...document.querySelectorAll('[role="dialog"]'),
        ...document.querySelectorAll('.modal'),
        ...document.querySelectorAll('[style*="position: fixed"]'),
        ...document.querySelectorAll('[style*="z-index"]'),
        ...document.querySelectorAll('button'),
        ...document.querySelectorAll('[aria-label]'),
      ];

      const textContent = [];
      elements.forEach((el) => {
        const text = el.textContent?.trim();
        const ariaLabel = el.getAttribute('aria-label');
        if (text && text.length > 0 && text.length < 200) {
          textContent.push(`Element: "${text}"`);
        }
        if (ariaLabel && ariaLabel.length > 0) {
          textContent.push(`Button: "${ariaLabel}"`);
        }
      });

      // Also get page title and any error messages
      textContent.push(`Page title: "${document.title}"`);

      return [...new Set(textContent)].join('\n');
    });

    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({ model: getGeminiModel('facebook') });

    const prompt = `Analyze this Facebook page content to determine if there are any blocking popups, modals, or overlays that would prevent normal browsing. 

Page content:
${pageText}

Look for:
1. Notification permission requests
2. Cookie consent banners  
3. Login prompts
4. "Allow notifications" dialogs
5. Privacy policy modals
6. Any other blocking overlays

Response format (JSON):
{
  "hasBlockingPopup": true/false,
  "popupDescription": "brief description of what popup is present",
  "suggestedActions": ["action1", "action2", "action3"]
}

Focus on elements that would block or interfere with scrolling and content viewing. Return ONLY the JSON, no other text.`;

    const result = await model.generateContent(prompt);
    const response = result.response.text().trim();

    try {
      const analysis = JSON.parse(response);
      sendProgress(
        `🧠 Gemini analysis: ${analysis.hasBlockingPopup ? 'Popup detected' : 'No blocking popups'} - ${analysis.popupDescription}`,
      );
      return analysis;
    } catch (parseError) {
      sendProgress(`⚠️ Failed to parse Gemini response, using fallback detection`);
      return { hasBlockingPopup: false, popupDescription: '', suggestedActions: [] };
    }
  } catch (error) {
    sendProgress(`❌ Gemini page analysis failed: ${error.message}`);
    return { hasBlockingPopup: false, popupDescription: '', suggestedActions: [] };
  }
}

/**
 * Comprehensive overlay and blocking element detection
 */
async function detectPageOverlays(page: any): Promise<{
  hasBlockingOverlay: boolean;
  overlayDetails: string[];
  interactionBlocked: boolean;
  recommendedActions: string[];
}> {
  try {
    sendProgress('🔍 [OVERLAY-DETECTION] Scanning page for blocking overlays and popups...');

    const overlayAnalysis = await page.evaluate(() => {
      const results = {
        hasBlockingOverlay: false,
        overlayDetails: [],
        interactionBlocked: false,
        recommendedActions: []
      };

      // Check for notification overlays
      const notificationElements = [
        ...document.querySelectorAll('[role="dialog"]'),
        ...document.querySelectorAll('.notification-popup'),
        ...document.querySelectorAll('[aria-label*="notification"]'),
        ...document.querySelectorAll('[aria-label*="Notification"]'),
        ...document.querySelectorAll('[data-testid*="notification"]')
      ];

      if (notificationElements.length > 0) {
        results.hasBlockingOverlay = true;
        results.overlayDetails.push(`Found ${notificationElements.length} notification dialog(s)`);
        
        notificationElements.forEach((el, index) => {
          const rect = el.getBoundingClientRect();
          const style = window.getComputedStyle(el);
          const text = el.textContent?.substring(0, 100) || 'No text';
          
          results.overlayDetails.push(
            `Dialog ${index + 1}: "${text}" (${rect.width}x${rect.height}, z-index: ${style.zIndex}, display: ${style.display})`
          );
        });
      }

      // Check for dark/black overlays that block interaction
      const overlayElements = document.querySelectorAll('div, span');
      let blackOverlayCount = 0;
      
      Array.from(overlayElements).forEach(el => {
        const style = window.getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        
        // Check for full-screen or large overlays
        if (
          style.position === 'fixed' &&
          parseInt(style.zIndex) > 100 &&
          rect.width > window.innerWidth * 0.8 &&
          rect.height > window.innerHeight * 0.8
        ) {
          const backgroundColor = style.backgroundColor;
          const opacity = parseFloat(style.opacity);
          
          if (
            backgroundColor.includes('rgba(0, 0, 0') ||
            backgroundColor === 'rgb(0, 0, 0)' ||
            (opacity > 0.3 && backgroundColor.includes('black'))
          ) {
            blackOverlayCount++;
            results.hasBlockingOverlay = true;
            results.interactionBlocked = true;
            results.overlayDetails.push(
              `Black overlay detected: ${rect.width}x${rect.height}, z-index: ${style.zIndex}, bg: ${backgroundColor}, opacity: ${opacity}`
            );
          }
        }
      });

      // Check for modal/popup blocking elements
      const modalElements = [
        ...document.querySelectorAll('.modal'),
        ...document.querySelectorAll('.popup'),
        ...document.querySelectorAll('[style*="position: fixed"]'),
        ...document.querySelectorAll('[style*="position:fixed"]')
      ];

      modalElements.forEach(el => {
        const style = window.getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        
        if (
          style.display !== 'none' &&
          style.visibility !== 'hidden' &&
          parseInt(style.zIndex) > 50 &&
          rect.width > 200 &&
          rect.height > 100
        ) {
          const text = el.textContent?.substring(0, 50) || 'No text';
          results.overlayDetails.push(
            `Modal/Popup: "${text}" (${rect.width}x${rect.height}, z-index: ${style.zIndex})`
          );
          
          if (rect.width > window.innerWidth * 0.5 || rect.height > window.innerHeight * 0.5) {
            results.hasBlockingOverlay = true;
          }
        }
      });

      // Test if page is actually interactive
      try {
        const testElement = document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2);
        if (!testElement || testElement.tagName === 'HTML') {
          results.interactionBlocked = true;
          results.overlayDetails.push('Center of page is not interactive - likely blocked by overlay');
        }
      } catch (e) {
        results.interactionBlocked = true;
        results.overlayDetails.push('Failed to test page interactivity');
      }

      // Generate recommendations
      if (results.hasBlockingOverlay) {
        results.recommendedActions.push('Close notification dialogs');
        results.recommendedActions.push('Dismiss modal popups');
        if (results.interactionBlocked) {
          results.recommendedActions.push('Remove black overlay blocking interaction');
          results.recommendedActions.push('Press Escape key multiple times');
        }
      }

      return results;
    });

    // Log overlay analysis results
    sendProgress(`📊 [OVERLAY-DETECTION] Analysis complete:`);
    sendProgress(`    - Blocking overlay detected: ${overlayAnalysis.hasBlockingOverlay}`);
    sendProgress(`    - Interaction blocked: ${overlayAnalysis.interactionBlocked}`);
    sendProgress(`    - Total overlay elements: ${overlayAnalysis.overlayDetails.length}`);

    if (overlayAnalysis.overlayDetails.length > 0) {
      sendProgress(`🔍 [OVERLAY-DETECTION] Overlay details:`);
      overlayAnalysis.overlayDetails.forEach((detail, index) => {
        sendProgress(`    ${index + 1}. ${detail}`);
      });
    }

    if (overlayAnalysis.recommendedActions.length > 0) {
      sendProgress(`💡 [OVERLAY-DETECTION] Recommended actions:`);
      overlayAnalysis.recommendedActions.forEach((action, index) => {
        sendProgress(`    ${index + 1}. ${action}`);
      });
    }

    return overlayAnalysis;
  } catch (error) {
    sendProgress(`❌ [OVERLAY-DETECTION] Error detecting overlays: ${error.message}`);
    return {
      hasBlockingOverlay: false,
      overlayDetails: [],
      interactionBlocked: false,
      recommendedActions: []
    };
  }
}

/**
 * Enhanced function to try clicking buttons with specific text content
 */
async function tryClickButtons(page: any, buttonTexts: string[]): Promise<boolean> {
  for (const text of buttonTexts) {
    try {
      // Try multiple approaches to find and click the button
      const clicked = await page.evaluate((buttonText) => {
        // Method 1: Find by exact text content
        const buttons = Array.from(document.querySelectorAll('button, [role="button"], a'));
        for (const button of buttons) {
          if (button.textContent?.trim() === buttonText) {
            (button as HTMLElement).click();
            return true;
          }
        }

        // Method 2: Find by aria-label
        for (const button of buttons) {
          if (button.getAttribute('aria-label') === buttonText) {
            (button as HTMLElement).click();
            return true;
          }
        }

        // Method 3: Find by partial text match (case insensitive)
        for (const button of buttons) {
          const content = button.textContent?.trim().toLowerCase();
          if (content && content.includes(buttonText.toLowerCase())) {
            (button as HTMLElement).click();
            return true;
          }
        }

        return false;
      }, text);

      if (clicked) {
        sendProgress(`✅ Successfully clicked button: "${text}"`);
        await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait for action to take effect
        return true;
      }
    } catch (error) {
      // Continue to next button text
    }
  }
  return false;
}

/**
 * Close Facebook popups and overlays (notifications, cookies, etc.)
 */
async function closeFacebookPopups(page: any, geminiApiKey?: string): Promise<void> {
  try {
    sendProgress('🚫 Checking for Facebook popups and overlays...');

    // First, use Gemini to analyze the page for blocking elements
    if (geminiApiKey) {
      const geminiAnalysis = await analyzePageWithGemini(page, geminiApiKey);

      if (geminiAnalysis.hasBlockingPopup) {
        sendProgress(`🔍 Gemini detected popup: ${geminiAnalysis.popupDescription}`);

        // Try Gemini's suggested actions first
        for (const action of geminiAnalysis.suggestedActions) {
          sendProgress(`🎯 Trying Gemini suggestion: ${action}`);

          // Convert suggestions to actionable selectors
          if (action.toLowerCase().includes('not now') || action.toLowerCase().includes('block')) {
            await tryClickButtons(page, [
              'Not now',
              'Not Now',
              'Block',
              "Don't allow",
              "Don't Allow",
            ]);
          } else if (
            action.toLowerCase().includes('close') ||
            action.toLowerCase().includes('dismiss')
          ) {
            await tryClickButtons(page, ['Close', 'Dismiss', 'X', '×']);
          } else if (action.toLowerCase().includes('skip')) {
            await tryClickButtons(page, ['Skip', 'Maybe later', 'No thanks']);
          }

          // Check if popup is gone after each action
          const stillBlocked = await analyzePageWithGemini(page, geminiApiKey);
          if (!stillBlocked.hasBlockingPopup) {
            sendProgress('✅ Gemini confirmed popup was successfully dismissed');
            return;
          }
        }
      } else {
        sendProgress('✅ Gemini analysis: No blocking popups detected');
      }
    }

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
 * Attempt to dismiss blocking overlays with comprehensive approach
 */
async function dismissOverlays(page: any): Promise<void> {
  try {
    sendProgress('🚫 [OVERLAY-DISMISS] Attempting to dismiss blocking overlays...');
    
    const dismissCount = await page.evaluate(() => {
      // Common overlay close button selectors
      const closeSelectors = [
        '[aria-label="Close"]',
        '[aria-label="close"]', 
        '[data-testid="close"]',
        '.close-button',
        '.close',
        '[role="button"][aria-label*="close" i]',
        '[role="button"][aria-label*="dismiss" i]',
        '[role="button"][aria-label*="Cancel" i]',
        'button[aria-label*="Close" i]',
        'div[aria-label*="Close" i]',
        // Facebook specific
        '[data-testid="modal-close-button"]',
        'div[role="dialog"] button[aria-label="Close"]',
        'div[role="dialog"] [data-testid*="close"]'
      ];
      
      let dismissCount = 0;
      closeSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
          if (element instanceof HTMLElement && element.offsetWidth > 0 && element.offsetHeight > 0) {
            try {
              (element as HTMLElement).click();
              dismissCount++;
            } catch (e) {
              // Ignore click errors
            }
          }
        });
      });
      
      return dismissCount;
    });
    
    // Press Escape key multiple times
    await page.keyboard.press('Escape');
    await new Promise(resolve => setTimeout(resolve, 500));
    await page.keyboard.press('Escape');
    
    // Wait for any animations to complete
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    sendProgress(`✅ [OVERLAY-DISMISS] Dismissal completed - ${dismissCount} elements clicked, Escape pressed`);
  } catch (error) {
    sendProgress(`⚠️ [OVERLAY-DISMISS] Error dismissing overlays: ${error.message}`);
  }
}

/**
 * Main worker function - extract Facebook group data with comprehensive debugging
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
        // Enhanced notification and permission blocking
        '--disable-notifications',
        '--disable-extensions',
        '--disable-plugins',
        '--disable-popup-blocking',
        '--disable-default-apps',
        '--disable-background-networking',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-ipc-flooding-protection',
        // Permissions blocking
        '--deny-permission-prompts',
        '--disable-permissions-api',
        // Additional stability improvements
        '--disable-accelerated-2d-canvas',
        '--disable-accelerated-jpeg-decoding',
        '--disable-accelerated-mjpeg-decode',
        '--disable-accelerated-video-decode',
        '--disable-gpu',
        '--disable-gpu-sandbox',
      ],
    });

    const page = await browser.newPage();

    // Block all permission requests and notifications
    await page.evaluateOnNewDocument(() => {
      // Override notification permission
      Object.defineProperty(Notification, 'permission', {
        get: () => 'denied',
      });

      // Block geolocation
      Object.defineProperty(navigator, 'geolocation', {
        get: () => undefined,
      });

      // Disable push notifications
      delete (window as any).PushManager;
      delete (window as any).ServiceWorkerRegistration;
    });

    // Block specific permissions
    const context = browser.defaultBrowserContext();
    await context.overridePermissions(url, []);

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
    await closeFacebookPopups(page, geminiApiKey);

    // Check if logged in and handle production vs development differently
    const isLoggedIn = await checkIfLoggedIn(page);

    if (!isLoggedIn) {
      if (process.env.NODE_ENV === 'production') {
        // In production, we rely entirely on session cookies - provide better diagnostics
        sendProgress(
          '❌ Not logged in to Facebook. In production mode, this requires valid session cookies.',
        );

        // Try to extract more information about why authentication failed
        const pageUrl = await page.url();
        const pageTitle = await page.title();

        sendProgress(`📍 Current URL: ${pageUrl}`);
        sendProgress(`📄 Page Title: ${pageTitle}`);

        // Check if we're on a login page
        if (pageUrl.includes('login') || pageTitle.toLowerCase().includes('log in')) {
          sendProgress('🔄 Detected login page - cookies may be expired');
        }

        // Check for any error messages on the page
        try {
          const errorMessage = await page.evaluate(() => {
            const errorSelectors = [
              '[data-testid="form_error"]',
              '.error-message',
              '[role="alert"]',
              '.alert',
            ];

            for (const selector of errorSelectors) {
              const element = document.querySelector(selector);
              if (element && element.textContent) {
                return element.textContent.trim();
              }
            }
            return null;
          });

          if (errorMessage) {
            sendProgress(`🚨 Error on page: ${errorMessage}`);
          }
        } catch (err) {
          // Ignore evaluation errors
        }

        sendProgress('💡 To fix this:');
        sendProgress('1. Check if FB_SESSION_COOKIES environment variable is set');
        sendProgress('2. Verify cookies are not expired (expires field in cookies)');
        sendProgress('3. Generate fresh cookies by logging in locally and running setup script');

        throw new Error(
          'Facebook authentication failed. Session cookies may be expired or invalid. Check logs for details.',
        );
      } else {
        // Development mode - attempt interactive login
        const loginSuccess = await performInteractiveLogin(page, cookiesFilePath);
        if (!loginSuccess) {
          throw new Error('Facebook login required. Please login through admin panel first.');
        }

        // Navigate back to group page after login
        await page.goto(mediaUrl, { waitUntil: 'networkidle0', timeout: 30000 });

        // Close popups again after re-navigation
        await closeFacebookPopups(page, geminiApiKey);
      }
    } else {
      sendProgress('✅ Successfully authenticated with Facebook using session cookies');
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
    const maxScrollAttempts = 5; // Reduced from 20 to 5 for better performance
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

                photoUrls.push(fullPhotoUrl);
              }
            }
          }
        }
      });

      // Remove duplicates
      const uniqueUrls = [...new Set(photoUrls)];

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
