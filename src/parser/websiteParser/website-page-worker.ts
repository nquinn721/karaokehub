/**
 * Website Page Processing Worker
 * Uses Puppeteer to extract page content and DeepSeek to parse venue/show/DJ data
 * Similar to facebook-enhanced-image-parser but for web pages
 */

import axios from 'axios';
import * as puppeteer from 'puppeteer';
import { parentPort } from 'worker_threads';

interface PageWorkerData {
  url: string;
  workerId: number;
  deepSeekApiKey: string;
}

interface ParsedPageResult {
  url: string;
  workerId: number;
  success: boolean;
  vendor?: string;
  dj?: string;
  show?: {
    venue?: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    time?: string;
    dayOfWeek?: string;
    djName?: string;
    description?: string;
    lat?: string;
    lng?: string;
    venuePhone?: string;
    venueWebsite?: string;
  };
  source: string;
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
 * Parse page content using DeepSeek AI
 */
async function parsePageContentWithDeepSeek(
  pageContent: string,
  pageUrl: string,
  deepSeekApiKey: string,
): Promise<ParsedPageResult> {
  const deepSeekBaseUrl = 'https://api.deepseek.com/v1/chat/completions';

  const prompt = `You are analyzing web page content to extract karaoke venue and event information.

PAGE URL: ${pageUrl}
PAGE CONTENT:
${pageContent}

TASK: Extract all karaoke venue, show, and DJ information from this web page content.

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
- Latitude/longitude if present
- Area/neighborhood information

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
    "description": "event description",
    "lat": "latitude if available",
    "lng": "longitude if available", 
    "venuePhone": "venue phone number",
    "venueWebsite": "venue website"
  }
}

RULES:
1. Set success=true only if you find karaoke-related venue/event information
2. Extract ALL available address components
3. Include phone numbers, websites, and contact info
4. If multiple venues/events, focus on the most complete one
5. If no karaoke information found, return {"success": false}

Focus on extracting complete, actionable venue and event data.`;

  try {
    // Call DeepSeek API directly with improved error handling
    const response = await axios.post(
      deepSeekBaseUrl,
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
          Authorization: `Bearer ${deepSeekApiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 25000, // Reduced from 30s to 25s
        maxRedirects: 0, // Prevent hanging on redirects
        validateStatus: (status) => status < 500, // Accept 4xx errors for better handling
      },
    );

    // Check response status
    if (response.status >= 400) {
      throw new Error(`DeepSeek API returned status ${response.status}: ${response.statusText}`);
    }

    const aiResponse = response.data.choices[0]?.message?.content;
    if (!aiResponse) {
      throw new Error('No response content from DeepSeek API');
    }

    // Parse AI response
    const parsed = JSON.parse(aiResponse);

    return {
      url: pageUrl,
      workerId: 0, // Will be set by caller
      success: parsed.success !== false,
      vendor: parsed.vendor,
      dj: parsed.dj,
      show: parsed.show,
      source: pageUrl,
    };
  } catch (error) {
    return {
      url: pageUrl,
      workerId: 0,
      success: false,
      source: pageUrl,
      error: error.message,
    };
  }
}

/**
 * Extract text content from page using multiple strategies
 */
async function extractPageContent(page: any): Promise<string> {
  return await page.evaluate(() => {
    // Remove script and style elements
    const scripts = document.querySelectorAll('script, style, noscript');
    scripts.forEach((el) => el.remove());

    // Enhanced content selectors for better extraction
    const contentSelectors = [
      'main',
      '[role="main"]',
      '.content',
      '.main-content',
      '.page-content',
      '.entry-content',
      '.post-content',
      'article',
      '.article-content',
      '#content',
      '.container',
      '.wrapper',
      '.site-content',
      '.primary-content',
      '[class*="content"]',
      '[class*="main"]',
      '[id*="content"]',
      '[id*="main"]',
      'body',
    ];

    let bestContent = '';
    let fallbackContent = '';

    // Try each selector and keep the one with most content
    for (const selector of contentSelectors) {
      try {
        const element = document.querySelector(selector);
        if (element) {
          const text = (element as HTMLElement).innerText || element.textContent || '';
          const cleanText = text.replace(/\s+/g, ' ').trim();

          // Prioritize content that mentions karaoke or venues
          if (
            cleanText.toLowerCase().includes('karaoke') ||
            cleanText.toLowerCase().includes('venue') ||
            cleanText.toLowerCase().includes('bar') ||
            cleanText.toLowerCase().includes('restaurant')
          ) {
            if (cleanText.length > bestContent.length) {
              bestContent = cleanText;
            }
          }

          // Keep as fallback if it's substantial
          if (cleanText.length > fallbackContent.length) {
            fallbackContent = cleanText;
          }
        }
      } catch (e) {
        // Skip problematic selectors
      }
    }

    // Use best content or fallback
    let finalContent = bestContent || fallbackContent;

    // If still no good content, try more aggressive extraction
    if (!finalContent || finalContent.length < 100) {
      // Try to get all visible text
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
        acceptNode: function (node) {
          // Skip if parent is hidden
          const parent = node.parentElement;
          if (parent) {
            const style = window.getComputedStyle(parent);
            if (style.display === 'none' || style.visibility === 'hidden') {
              return NodeFilter.FILTER_REJECT;
            }
          }

          // Skip empty or whitespace-only text
          if (!node.textContent || node.textContent.trim().length === 0) {
            return NodeFilter.FILTER_REJECT;
          }

          return NodeFilter.FILTER_ACCEPT;
        },
      });

      const textNodes = [];
      let node;
      while ((node = walker.nextNode())) {
        textNodes.push(node.textContent?.trim());
      }

      finalContent = textNodes.filter((text) => text && text.length > 3).join(' ');
    }

    // Final cleanup - preserve meaningful content but remove excessive whitespace
    return finalContent.replace(/\s+/g, ' ').replace(/\n+/g, '\n').trim();
  });
}

/**
 * Main worker function - process single page
 */
async function processPage(data: PageWorkerData): Promise<ParsedPageResult> {
  const { url, workerId, deepSeekApiKey } = data;
  let browser: any = null;

  try {
    sendProgress(workerId, `🚀 Starting page processing for: ${url.substring(0, 60)}...`);

    // Launch browser
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--disable-http2', // Prevent HTTP/2 protocol errors
      ],
    });

    const page = await browser.newPage();

    // Set viewport and user agent (use Mac user agent to avoid blocking)
    await page.setViewport({ width: 1200, height: 800 });
    const userAgents = [
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    ];
    const selectedUserAgent = userAgents[Math.floor(Math.random() * userAgents.length)];
    await page.setUserAgent(selectedUserAgent);

    // Navigate to page with improved fallback strategies
    sendProgress(workerId, `🌐 Loading page...`);

    let pageContent = '';

    // Strategy 1: Fast domcontentloaded (best for slow sites)
    try {
      sendProgress(workerId, `📄 Trying fast loading strategy...`);
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });

      // Brief wait for immediate JavaScript
      await page.waitForTimeout(2000);

      pageContent = await extractPageContent(page);

      if (pageContent.length > 200) {
        sendProgress(workerId, `✅ Fast strategy successful: ${pageContent.length} chars`);
      } else {
        throw new Error('Insufficient content from fast strategy');
      }
    } catch (error) {
      sendProgress(workerId, `⚠️ Fast strategy failed: ${error.message}`);

      // Strategy 2: Medium wait with networkidle0
      try {
        sendProgress(workerId, `📄 Trying medium loading strategy...`);
        await page.goto(url, { waitUntil: 'networkidle0', timeout: 25000 });
        pageContent = await extractPageContent(page);

        if (pageContent.length > 200) {
          sendProgress(workerId, `✅ Medium strategy successful: ${pageContent.length} chars`);
        } else {
          throw new Error('Insufficient content from medium strategy');
        }
      } catch (error2) {
        sendProgress(workerId, `⚠️ Medium strategy failed: ${error2.message}`);

        // Strategy 3: Slow with extra waits (for JavaScript-heavy sites)
        try {
          sendProgress(workerId, `📄 Trying slow loading strategy...`);
          await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });

          // Wait for potential AJAX/JavaScript
          await page.waitForTimeout(5000);

          // Scroll to trigger lazy loading
          await page.evaluate(() => {
            window.scrollTo(0, document.body.scrollHeight);
          });

          await page.waitForTimeout(2000);
          pageContent = await extractPageContent(page);

          if (pageContent.length > 50) {
            sendProgress(workerId, `✅ Slow strategy successful: ${pageContent.length} chars`);
          } else {
            throw new Error('Insufficient content from slow strategy');
          }
        } catch (error3) {
          sendProgress(workerId, `⚠️ Slow strategy failed: ${error3.message}`);

          // Strategy 4: Raw HTML extraction as last resort
          try {
            sendProgress(workerId, `📄 Trying HTML extraction...`);
            const htmlContent = await page.content();

            // Convert HTML to clean text
            pageContent = htmlContent
              .replace(/<script[^>]*>.*?<\/script>/gis, '')
              .replace(/<style[^>]*>.*?<\/style>/gis, '')
              .replace(/<[^>]+>/g, ' ')
              .replace(/\s+/g, ' ')
              .trim();

            if (pageContent.length > 50) {
              sendProgress(workerId, `✅ HTML extraction successful: ${pageContent.length} chars`);
            } else {
              throw new Error('No content could be extracted from page');
            }
          } catch (error4) {
            throw new Error(`All loading strategies failed. Last error: ${error4.message}`);
          }
        }
      }
    }

    sendProgress(workerId, `✅ Extracted ${pageContent.length} chars of content`);

    // Check if we have sufficient content for analysis
    if (pageContent.length < 50) {
      return {
        url,
        workerId,
        success: false,
        source: url,
        error: 'Insufficient content extracted from page (< 50 characters)',
      };
    }

    // Check if content appears to be an error page or blocked
    const lowerContent = pageContent.toLowerCase();
    if (
      lowerContent.includes('403 forbidden') ||
      lowerContent.includes('access denied') ||
      lowerContent.includes('not found') ||
      lowerContent.includes('page not found') ||
      (lowerContent.includes('error') && pageContent.length < 200)
    ) {
      return {
        url,
        workerId,
        success: false,
        source: url,
        error: 'Page appears to be blocked or contains error content',
      };
    }

    // Parse with DeepSeek
    sendProgress(workerId, `🤖 Parsing content with DeepSeek AI...`);
    const parseResult = await parsePageContentWithDeepSeek(pageContent, url, deepSeekApiKey);

    // Set worker ID
    parseResult.workerId = workerId;

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

      sendProgress(workerId, `✅ Parsed: ${fields || 'Basic info'}`);
    } else {
      sendProgress(workerId, `❌ No karaoke data found in page`);
    }

    return parseResult;
  } catch (error) {
    const errorResult: ParsedPageResult = {
      url,
      workerId,
      success: false,
      source: url,
      error: error.message,
    };

    sendProgress(workerId, `❌ Error: ${error.message}`);
    return errorResult;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Worker entry point
if (parentPort) {
  parentPort.on('message', async (data: PageWorkerData) => {
    // Add a global timeout for the entire worker operation
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Worker ${data.workerId} operation timeout after 100 seconds`));
      }, 100000); // 100-second global timeout
    });

    try {
      const result = await Promise.race([processPage(data), timeoutPromise]);
      parentPort?.postMessage({ type: 'complete', workerId: data.workerId, data: result });
    } catch (error) {
      parentPort?.postMessage({
        type: 'error',
        workerId: data.workerId,
        error: error.message,
        data: {
          url: data.url,
          workerId: data.workerId,
          success: false,
          source: data.url,
          error: error.message,
        },
      });
    }
  });
}

// Export for testing
export { processPage };
