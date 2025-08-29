/**
 * Website Discovery Worker
 * Uses Puppeteer to extract header HTML and DeepSeek to discover all relevant URLs
 * Similar to facebook-group-parser but for general websites
 */

import axios from 'axios';
import * as puppeteer from 'puppeteer';
import { parentPort } from 'worker_threads';

interface DiscoveryWorkerData {
  url: string;
  deepSeekApiKey: string;
  tempDir: string;
  includeSubdomains?: boolean;
}

interface DiscoveryResult {
  success: boolean;
  urls: string[];
  siteName: string;
  error?: string;
  stats?: {
    discoveryTime: number;
  };
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
 * Fallback: Extract URLs directly from HTML when AI fails
 */
function extractUrlsDirectly(html: string, baseUrl: string, includeSubdomains: boolean): string[] {
  const urls: string[] = [];
  const baseDomain = new URL(baseUrl).hostname;

  // Extract all href attributes
  const hrefRegex = /href\s*=\s*["']([^"']+)["']/gi;
  let match;

  while ((match = hrefRegex.exec(html)) !== null) {
    try {
      let url = match[1];

      // Convert relative URLs to absolute
      if (url.startsWith('/')) {
        url = new URL(baseUrl).origin + url;
      } else if (url.startsWith('./') || !url.includes('://')) {
        url = new URL(url, baseUrl).href;
      }

      const urlObj = new URL(url);
      const urlDomain = urlObj.hostname;

      // Domain filtering
      const isDomainMatch = includeSubdomains
        ? urlDomain.endsWith(baseDomain) || baseDomain.endsWith(urlDomain)
        : urlDomain === baseDomain;

      // Skip unwanted file types and special URLs
      const skipPatterns = [
        /\.(css|js|jpg|jpeg|png|gif|svg|ico|pdf|zip|exe)$/i,
        /^mailto:/i,
        /^tel:/i,
        /^javascript:/i,
        /#$/,
        /login|admin|wp-admin/i,
      ];

      const shouldSkip = skipPatterns.some((pattern) => pattern.test(url));

      if (isDomainMatch && !shouldSkip && !urls.includes(url)) {
        // Prioritize karaoke-related URLs
        if (
          url.includes('karaoke') ||
          url.includes('venue') ||
          url.includes('location') ||
          url.includes('state') ||
          url.includes('event') ||
          url.includes('show')
        ) {
          urls.unshift(url); // Add to front
        } else {
          urls.push(url);
        }
      }
    } catch (e) {
      // Skip invalid URLs
    }
  }

  // For karaokeviewpoint.com, generate state-based URLs if pattern exists
  if (baseDomain.includes('karaokeviewpoint.com')) {
    const states = [
      'alabama',
      'alaska',
      'arizona',
      'arkansas',
      'california',
      'colorado',
      'connecticut',
      'delaware',
      'florida',
      'georgia',
      'hawaii',
      'idaho',
      'illinois',
      'indiana',
      'iowa',
      'kansas',
      'kentucky',
      'louisiana',
      'maine',
      'maryland',
      'massachusetts',
      'michigan',
      'minnesota',
      'mississippi',
      'missouri',
      'montana',
      'nebraska',
      'nevada',
      'new-hampshire',
      'new-jersey',
      'new-mexico',
      'new-york',
      'north-carolina',
      'north-dakota',
      'ohio',
      'oklahoma',
      'oregon',
      'pennsylvania',
      'rhode-island',
      'south-carolina',
      'south-dakota',
      'tennessee',
      'texas',
      'utah',
      'vermont',
      'virginia',
      'washington',
      'west-virginia',
      'wisconsin',
      'wyoming',
    ];

    const baseOrigin = new URL(baseUrl).origin;
    for (const state of states) {
      const stateUrl = `${baseOrigin}/karaoke-in-${state}/`;
      if (!urls.includes(stateUrl)) {
        urls.push(stateUrl);
      }
    }
  }

  return urls.slice(0, 100); // Reasonable limit for fallback
}

/**
 * Fallback: Extract site name directly from HTML
 */
function extractSiteNameDirectly(html: string): string {
  // Try to extract from title tag
  const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
  if (titleMatch) {
    const title = titleMatch[1].replace(/&[^;]+;/g, '').trim();
    if (title && title.length > 0) {
      return title;
    }
  }

  // Try meta description
  const metaMatch = html.match(
    /<meta[^>]*name\s*=\s*["']description["'][^>]*content\s*=\s*["']([^"']+)["']/i,
  );
  if (metaMatch) {
    return metaMatch[1].trim();
  }

  // Try h1 tag
  const h1Match = html.match(/<h1[^>]*>(.*?)<\/h1>/i);
  if (h1Match) {
    const h1Text = h1Match[1].replace(/<[^>]+>/g, '').trim();
    if (h1Text && h1Text.length > 0) {
      return h1Text;
    }
  }

  return 'Unknown Site';
}

/**
 * Use DeepSeek to analyze header HTML and discover relevant URLs
 */
async function discoverUrlsWithDeepSeek(
  headerHtml: string,
  baseUrl: string,
  deepSeekApiKey: string,
  includeSubdomains: boolean = false,
): Promise<{ urls: string[]; siteName: string }> {
  const deepSeekBaseUrl = 'https://api.deepseek.com/v1/chat/completions';

  const baseDomain = new URL(baseUrl).hostname;
  const subdomainFilter = includeSubdomains
    ? `Include subdomains of ${baseDomain}`
    : `Only include exact domain ${baseDomain}`;

  try {
    sendProgress('🤖 Using DeepSeek to discover relevant URLs...');

    // Smart content truncation for API limits while preserving important parts
    let processedHtml = headerHtml;

    // If content is too large, intelligently truncate while preserving navigation
    if (headerHtml.length > 50000) {
      sendProgress(`📄 Large content (${headerHtml.length} chars), applying smart truncation...`);

      // Extract and prioritize navigation-related content
      const navSections = [];
      const menuPattern =
        /<(?:nav|header|menu|ul|ol|div)[^>]*(?:class|id)="[^"]*(?:nav|menu|header|dropdown|breadcrumb|pagination)[^"]*"[^>]*>.*?<\/(?:nav|header|menu|ul|ol|div)>/gis;
      const navMatches = headerHtml.match(menuPattern) || [];

      // Also capture obvious karaoke-related links
      const linkPattern =
        /<a[^>]*href="[^"]*(?:karaoke|venue|location|state|event|show)[^"]*"[^>]*>.*?<\/a>/gis;
      const linkMatches = headerHtml.match(linkPattern) || [];

      // Combine and limit to reasonable size
      const priorityContent = [
        ...navMatches.slice(0, 10),
        ...linkMatches.slice(0, 20),
        headerHtml.substring(0, 20000), // First 20KB as fallback
      ].join('\n');

      processedHtml = priorityContent.substring(0, 8000); // Final limit for API
      sendProgress(`✂️ Truncated to ${processedHtml.length} chars while preserving navigation`);
    }

    // Create optimized prompt after processedHtml is ready
    const prompt = `Extract site name and karaoke-related URLs from this HTML:

${processedHtml}

Base: ${baseUrl}

Find: venue pages, state pages (/karaoke-in-state), event pages, directory pages. Return full URLs only.

JSON: {"siteName": "name", "urls": ["url1", "url2"]}`;

    // Call DeepSeek API directly
    const response = await axios.post(
      deepSeekBaseUrl,
      {
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content:
              'You are a professional web analysis AI. Extract site name and discover relevant URLs for karaoke venue/event information. Return valid JSON only.',
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

    const parsed = JSON.parse(aiResponse);

    // Validate and filter URLs
    const validUrls: string[] = [];
    const baseDomainCheck = new URL(baseUrl).hostname;

    for (const url of parsed.urls || []) {
      try {
        const urlObj = new URL(url);
        const urlDomain = urlObj.hostname;

        // Domain filtering
        const isDomainMatch = includeSubdomains
          ? urlDomain.endsWith(baseDomainCheck) || baseDomainCheck.endsWith(urlDomain)
          : urlDomain === baseDomainCheck;

        if (isDomainMatch) {
          validUrls.push(url);
        }
      } catch (error) {
        // Skip invalid URLs
      }
    }

    sendProgress(`✅ DeepSeek discovered ${validUrls.length} relevant URLs`);

    return {
      urls: validUrls,
      siteName: parsed.siteName || 'Unknown Site',
    };
  } catch (error) {
    let errorMessage = error.message;

    // Enhanced error logging for API debugging
    if (error.response) {
      errorMessage = `API Error ${error.response.status}: ${error.response.statusText}`;
      if (error.response.data) {
        try {
          const errorData =
            typeof error.response.data === 'string'
              ? error.response.data
              : JSON.stringify(error.response.data);
          errorMessage += ` - ${errorData}`;
        } catch (e) {
          errorMessage += ` - ${error.response.data}`;
        }
      }
    } else if (error.request) {
      errorMessage = `Network Error: No response received`;
    }

    sendProgress(`❌ DeepSeek URL discovery failed: ${errorMessage}`);
    sendProgress(`🔍 Request details - Content length: ${headerHtml.length} chars`);
    sendProgress(`🔄 Falling back to direct HTML link extraction...`);

    // Fallback: Direct HTML link extraction when AI fails
    const fallbackUrls = extractUrlsDirectly(headerHtml, baseUrl, includeSubdomains);
    sendProgress(`🔗 Fallback extraction found ${fallbackUrls.length} URLs`);

    return {
      urls: fallbackUrls,
      siteName: extractSiteNameDirectly(headerHtml) || 'Unknown Site',
    };
  }
}

/**
 * Main worker function - discover website URLs
 */
async function discoverWebsiteUrls(data: DiscoveryWorkerData): Promise<DiscoveryResult> {
  const { url, deepSeekApiKey, includeSubdomains = false } = data;
  let browser: any = null;
  const startTime = Date.now();

  try {
    // First, test basic connectivity
    sendProgress('🔍 Testing website connectivity...');
    try {
      const testResponse = await axios.get(url, {
        timeout: 10000,
        validateStatus: () => true, // Accept any status code
        maxRedirects: 5,
      });
      sendProgress(`📊 Website responded with status: ${testResponse.status}`);
    } catch (connectivityError) {
      sendProgress(`⚠️ Connectivity test warning: ${connectivityError.message}`);
      // Continue anyway - might still work with Puppeteer
    }

    sendProgress('🚀 Launching Puppeteer browser for URL discovery...');

    // Launch browser with optimal settings
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--disable-http2', // Prevent HTTP/2 protocol errors
        '--window-size=1920,1080',
      ],
    });

    const page = await browser.newPage();

    // Capture console logs and errors for debugging
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        sendProgress(`🐛 Browser console error: ${msg.text()}`);
      }
    });

    page.on('pageerror', (error) => {
      sendProgress(`🐛 Page error: ${error.message}`);
    });

    page.on('response', (response) => {
      if (!response.ok()) {
        sendProgress(`⚠️ HTTP ${response.status()}: ${response.url()}`);
      }
    });

    // Set viewport and user agent (use Mac user agent to avoid blocking)
    await page.setViewport({ width: 1920, height: 1080 });
    const userAgents = [
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    ];
    const selectedUserAgent = userAgents[Math.floor(Math.random() * userAgents.length)];
    await page.setUserAgent(selectedUserAgent);
    sendProgress(`🕵️ Using user agent: ${selectedUserAgent.substring(0, 50)}...`);

    // Navigate to website with enhanced error handling
    sendProgress(`🌐 Navigating to: ${url}`);

    try {
      await page.goto(url, {
        waitUntil: ['domcontentloaded', 'networkidle0'],
        timeout: 30000,
      });
      sendProgress(`✅ Successfully loaded: ${url}`);
    } catch (navigationError) {
      sendProgress(`⚠️ Navigation warning: ${navigationError.message}`);

      // Try alternative navigation strategies
      try {
        sendProgress(`🔄 Retrying with simpler wait condition...`);
        await page.goto(url, {
          waitUntil: 'domcontentloaded',
          timeout: 20000,
        });
        sendProgress(`✅ Fallback navigation successful`);
      } catch (retryError) {
        sendProgress(`❌ Navigation failed completely: ${retryError.message}`);
        throw new Error(`Failed to load ${url}: ${retryError.message}`);
      }
    }

    // Wait for page to stabilize
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Extract comprehensive HTML for DeepSeek analysis
    sendProgress('📄 Extracting comprehensive HTML for URL discovery...');

    const comprehensiveHtml = await page.evaluate(() => {
      // Get various elements that might contain navigation links
      const selectors = [
        'header',
        'nav',
        '.menu',
        '.navigation',
        '#menu',
        '#nav',
        '[role="navigation"]',
        '.navbar',
        '.nav-menu',
        '.main-menu',
        'footer',
        '.footer',
        '.sitemap',
        '.breadcrumb',
        '.pagination',
        '.page-links',
        'main',
        '.main-content',
        '.content',
        '#content',
        '.sidebar',
        '.links',
        'ul.menu',
        'ol.menu',
        '.dropdown',
        '.megamenu',
      ];

      let allContent = '';

      for (const selector of selectors) {
        const elements = document.querySelectorAll(selector);
        elements.forEach((element) => {
          if (element && element.innerHTML) {
            allContent += `\n<!-- ${selector} -->\n` + element.innerHTML + '\n';
          }
        });
      }

      // Also capture any obvious karaoke-related links from the main content
      const allLinks = document.querySelectorAll('a[href]');
      const karaokeLinks: string[] = [];

      allLinks.forEach((link) => {
        const href = link.getAttribute('href');
        const text = link.textContent?.toLowerCase() || '';

        if (
          href &&
          (href.includes('karaoke') ||
            href.includes('state') ||
            href.includes('location') ||
            href.includes('venue') ||
            href.includes('event') ||
            text.includes('karaoke') ||
            text.includes('venue') ||
            text.includes('location'))
        ) {
          karaokeLinks.push(`<a href="${href}">${link.textContent}</a>`);
        }
      });

      // Include page title and meta description
      const title = document.title || '';
      const metaDesc =
        document.querySelector('meta[name="description"]')?.getAttribute('content') || '';

      let result = `<title>${title}</title>\n<meta name="description" content="${metaDesc}">\n`;
      result += allContent;

      if (karaokeLinks.length > 0) {
        result += '\n<!-- Relevant Links Found -->\n' + karaokeLinks.join('\n');
      }

      return result;
    });

    sendProgress(`📄 Extracted ${comprehensiveHtml.length} chars of comprehensive HTML`);

    // Use DeepSeek to discover URLs
    const discoveryResult = await discoverUrlsWithDeepSeek(
      comprehensiveHtml,
      url,
      deepSeekApiKey,
      includeSubdomains,
    );

    const processingTime = Date.now() - startTime;
    sendProgress(
      `✅ URL discovery complete! Found ${discoveryResult.urls.length} URLs in ${processingTime}ms`,
    );

    // Log discovered URLs for debugging
    if (discoveryResult.urls.length > 0) {
      sendProgress(`🔍 Discovered URLs:`);
      discoveryResult.urls.forEach((url, index) => {
        sendProgress(`   ${index + 1}. ${url}`);
      });
    }

    return {
      success: true,
      urls: discoveryResult.urls,
      siteName: discoveryResult.siteName,
      stats: {
        discoveryTime: Date.now() - startTime,
      },
    };
  } catch (error) {
    const processingTime = Date.now() - startTime;

    // Provide more detailed error information
    let errorType = 'Unknown Error';
    let errorDetails = error.message;

    if (error.message.includes('ERR_EMPTY_RESPONSE')) {
      errorType = 'Empty Response';
      errorDetails =
        'The website returned an empty response. This could indicate the site is down, blocking automated requests, or has connectivity issues.';
    } else if (error.message.includes('ERR_CONNECTION_REFUSED')) {
      errorType = 'Connection Refused';
      errorDetails =
        'The website refused the connection. The server may be down or blocking requests.';
    } else if (error.message.includes('ERR_NAME_NOT_RESOLVED')) {
      errorType = 'DNS Resolution Failed';
      errorDetails = 'Could not resolve the website domain name. Check if the URL is correct.';
    } else if (error.message.includes('Navigation timeout')) {
      errorType = 'Timeout';
      errorDetails = 'The website took too long to load (>30 seconds).';
    }

    sendProgress(`❌ ${errorType} after ${processingTime}ms`);
    sendProgress(`📋 Details: ${errorDetails}`);

    return {
      success: false,
      urls: [],
      siteName: 'Unknown Site',
      error: `${errorType}: ${errorDetails}`,
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
  parentPort.on('message', async (data: DiscoveryWorkerData) => {
    // Add a global timeout for the entire discovery operation
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error('Discovery worker operation timeout after 100 seconds'));
      }, 100000); // 100-second global timeout
    });

    try {
      const result = await Promise.race([discoverWebsiteUrls(data), timeoutPromise]);
      parentPort?.postMessage({ type: 'complete', data: result });
    } catch (error) {
      parentPort?.postMessage({
        type: 'error',
        error: error.message,
        data: {
          success: false,
          urls: [],
          siteName: 'Unknown Site',
          error: error.message,
        },
      });
    }
  });
}

// Export for testing
export { discoverWebsiteUrls };
