import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import * as cheerio from 'cheerio';
import * as puppeteer from 'puppeteer';

export interface HtmlContent {
  url: string;
  title: string;
  content: string;
  htmlSource: string;
  extractionMethod: 'puppeteer' | 'axios';
  metadata: {
    description?: string;
    keywords?: string;
    author?: string;
    viewport?: string;
  };
}

@Injectable()
export class HtmlParserService {
  private readonly logger = new Logger(HtmlParserService.name);

  /**
   * Extract HTML content from a URL with fallback strategies
   */
  async extractContent(url: string, usePuppeteer: boolean = true): Promise<HtmlContent> {
    this.logger.log(`🌐 Extracting HTML content from: ${url}`);

    try {
      if (usePuppeteer) {
        try {
          return await this.extractWithPuppeteer(url);
        } catch (puppeteerError) {
          this.logger.warn(`⚠️ Puppeteer failed for ${url}: ${puppeteerError.message}`);
          this.logger.log(`🔄 Falling back to Axios for ${url}`);
          return await this.extractWithAxios(url);
        }
      } else {
        return await this.extractWithAxios(url);
      }
    } catch (error) {
      this.logger.error(`❌ Failed to extract content from ${url}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Extract content using Puppeteer for dynamic/JavaScript-heavy sites
   */
  private async extractWithPuppeteer(url: string): Promise<HtmlContent> {
    let browser: puppeteer.Browser | null = null;

    try {
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
          '--disable-http2',
          '--disable-features=VizDisplayCompositor',
          '--disable-web-security',
          '--ignore-certificate-errors',
          '--ignore-ssl-errors',
        ],
      });

      const page = await browser.newPage();
      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      );

      // Set extra headers to appear more like a real browser
      await page.setExtraHTTPHeaders({
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      });

      // Try multiple loading strategies
      let htmlSource = '';
      try {
        // First try: Standard approach with networkidle0
        await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
        htmlSource = await page.content();
      } catch (error) {
        this.logger.warn(`⚠️ Standard loading failed for ${url}, trying fallback approach: ${error.message}`);
        
        try {
          // Second try: Use domcontentloaded instead of networkidle0
          await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
          // Wait a bit for dynamic content
          await this.delay(3000);
          htmlSource = await page.content();
        } catch (fallbackError) {
          this.logger.warn(`⚠️ Fallback loading also failed for ${url}, trying minimal approach: ${fallbackError.message}`);
          
          try {
            // Third try: Minimal loading with just load event
            await page.goto(url, { waitUntil: 'load', timeout: 15000 });
            await this.delay(2000);
            htmlSource = await page.content();
          } catch (finalError) {
            throw new Error(`All loading strategies failed for ${url}: ${finalError.message}`);
          }
        }
      }

      // Wait for any dynamic content to load
      await this.delay(2000);

      return this.parseHtmlContent(url, htmlSource, 'puppeteer');
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  /**
   * Extract content using Axios for static sites
   */
  private async extractWithAxios(url: string): Promise<HtmlContent> {
    try {
      const response = await axios.get(url, {
        timeout: 30000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
        },
        maxRedirects: 5,
        validateStatus: function (status) {
          return status >= 200 && status < 400; // Accept redirects as valid
        },
      });
      
      this.logger.log(`✅ Successfully fetched content from ${url} (${response.status})`);
      return this.parseHtmlContent(url, response.data, 'axios');
    } catch (error) {
      if (error.response) {
        this.logger.error(`❌ HTTP error ${error.response.status} for ${url}: ${error.response.statusText}`);
      } else if (error.request) {
        this.logger.error(`❌ Network error for ${url}: ${error.message}`);
      } else {
        this.logger.error(`❌ Failed to fetch content from ${url}: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Parse HTML content and extract metadata
   */
  private parseHtmlContent(url: string, htmlSource: string, method: 'puppeteer' | 'axios'): HtmlContent {
    const $ = cheerio.load(htmlSource);
    
    // Extract basic content
    const title = $('title').text().trim() || $('h1').first().text().trim() || 'No title found';
    
    // Remove script and style elements for cleaner content
    $('script, style, nav, footer, header, aside').remove();
    const content = $('body').text().replace(/\s+/g, ' ').trim();
    
    // Extract metadata
    const metadata = {
      description: $('meta[name="description"]').attr('content') || $('meta[property="og:description"]').attr('content'),
      keywords: $('meta[name="keywords"]').attr('content'),
      author: $('meta[name="author"]').attr('content'),
      viewport: $('meta[name="viewport"]').attr('content'),
    };

    return {
      url,
      title,
      content,
      htmlSource,
      extractionMethod: method,
      metadata,
    };
  }

  /**
   * Extract navigation links from HTML content
   */
  async extractNavigationLinks(
    htmlContent: string,
    baseUrl: string,
    includeSubdomains: boolean = false,
  ): Promise<string[]> {
    const $ = cheerio.load(htmlContent);
    const links = new Set<string>();
    const baseDomain = new URL(baseUrl).hostname;

    // Look for navigation links in common selectors
    const navSelectors = [
      'nav a',
      '.nav a',
      '.navigation a',
      '.menu a',
      'header a',
      '.header a',
      '[role="navigation"] a',
    ];

    navSelectors.forEach(selector => {
      $(selector).each((_, element) => {
        const href = $(element).attr('href');
        if (href) {
          try {
            const absoluteUrl = new URL(href, baseUrl).href;
            const linkDomain = new URL(absoluteUrl).hostname;

            // Check domain matching
            const isDomainMatch = includeSubdomains 
              ? linkDomain.endsWith(baseDomain) || baseDomain.endsWith(linkDomain)
              : linkDomain === baseDomain;

            if (isDomainMatch && !this.isExcludedUrl(absoluteUrl)) {
              links.add(absoluteUrl);
            }
          } catch (error) {
            // Skip invalid URLs
          }
        }
      });
    });

    return Array.from(links);
  }

  /**
   * Check if URL should be excluded from parsing
   */
  private isExcludedUrl(url: string): boolean {
    const excludePatterns = [
      /\.(pdf|doc|docx|xls|xlsx|ppt|pptx|zip|rar|7z)$/i,
      /\.(jpg|jpeg|png|gif|svg|webp|ico)$/i,
      /\.(mp3|mp4|avi|mov|wmv|flv)$/i,
      /mailto:/i,
      /tel:/i,
      /#/,
      /javascript:/i,
    ];

    return excludePatterns.some(pattern => pattern.test(url));
  }

  /**
   * Utility method to add delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
