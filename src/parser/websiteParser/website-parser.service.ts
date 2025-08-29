import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DJ } from '../../dj/dj.entity';
import { Show } from '../../show/show.entity';
import { Vendor } from '../../vendor/vendor.entity';
import { DeepSeekAnalysisResult, DeepSeekParserService } from './deepseek-parser.service';
import { HtmlContent, HtmlParserService } from './html-parser.service';
import { ImageParserService, ImageParsingResult } from './image-parser.service';

export interface WebsiteParsingOptions {
  url: string;
  includeSubdomains: boolean;
  maxPages: number;
  usePuppeteer: boolean;
  downloadImages: boolean;
  maxImages: number;
  aiAnalysis: boolean;
}

export interface ParsedWebsiteData {
  url: string;
  title: string;
  description: string;
  navLinks: string[];
  allPages: ParsedPageData[];
  shows: any[];
  djs: any[];
  vendors: any[];
  images?: ImageParsingResult[];
  summary: {
    totalPages: number;
    totalShows: number;
    totalDJs: number;
    totalVendors: number;
    totalImages: number;
    parseMethod: string;
    aiModel: string;
    processingTime: number;
  };
}

export interface ParsedPageData {
  url: string;
  title: string;
  content: string;
  navLinks: string[];
  shows: any[];
  djs: any[];
  vendors: any[];
  images?: ExtractedImage[];
  aiAnalysis?: DeepSeekAnalysisResult;
  processingTime: number;
}

interface ExtractedImage {
  src: string;
  alt?: string;
  title?: string;
}

@Injectable()
export class WebsiteParserService {
  private readonly logger = new Logger(WebsiteParserService.name);

  constructor(
    @InjectRepository(Show)
    private showRepository: Repository<Show>,
    @InjectRepository(DJ)
    private djRepository: Repository<DJ>,
    @InjectRepository(Vendor)
    private vendorRepository: Repository<Vendor>,
    private htmlParser: HtmlParserService,
    private imageParser: ImageParserService,
    private deepSeekParser: DeepSeekParserService,
  ) {}

  /**
   * Main website parsing method
   */
  async parseWebsite(options: WebsiteParsingOptions): Promise<ParsedWebsiteData> {
    const startTime = Date.now();
    this.logger.log(`🧪 Starting comprehensive website parsing for: ${options.url}`);
    this.logger.log(`🤖 AI Analysis: ${options.aiAnalysis ? 'Enabled' : 'Disabled'}`);
    this.logger.log(
      `⚙️ Options: Puppeteer=${options.usePuppeteer}, MaxPages=${options.maxPages}, Subdomains=${options.includeSubdomains}`,
    );

    try {
      // 1. Parse the main page
      const mainPage = await this.parseSinglePage(options.url, options);

      // 2. Discover additional pages from navigation
      const additionalUrls = await this.discoverNavigationPages(
        mainPage.navLinks,
        options.url,
        options.includeSubdomains,
        options.maxPages - 1,
      );

      // 3. Parse additional pages
      const additionalPages: ParsedPageData[] = [];
      for (const url of additionalUrls) {
        try {
          const page = await this.parseSinglePage(url, options);
          additionalPages.push(page);
        } catch (error) {
          this.logger.error(`❌ Failed to parse page ${url}: ${error.message}`);
        }
      }

      // 4. Combine all pages
      const allPages = [mainPage, ...additionalPages];

      // 5. Aggregate data from all pages
      const aggregatedData = this.aggregatePageData(allPages);

      // 6. Build final result
      const processingTime = Date.now() - startTime;
      const result: ParsedWebsiteData = {
        url: options.url,
        title: mainPage.title,
        description: mainPage.aiAnalysis?.description || 'No description available',
        navLinks: mainPage.navLinks,
        allPages,
        shows: aggregatedData.shows,
        djs: aggregatedData.djs,
        vendors: aggregatedData.vendors,
        summary: {
          totalPages: allPages.length,
          totalShows: aggregatedData.shows.length,
          totalDJs: aggregatedData.djs.length,
          totalVendors: aggregatedData.vendors.length,
          totalImages: aggregatedData.totalImages,
          parseMethod: options.usePuppeteer ? 'Puppeteer + Axios fallback' : 'Axios only',
          aiModel: options.aiAnalysis ? 'DeepSeek-V3' : 'None',
          processingTime,
        },
      };

      this.logger.log(`✅ Website parsing completed in ${processingTime}ms`);
      this.logger.log(
        `📊 Results: ${result.summary.totalPages} pages, ${result.summary.totalShows} shows, ${result.summary.totalDJs} DJs, ${result.summary.totalVendors} vendors`,
      );

      return result;
    } catch (error) {
      this.logger.error(`❌ Website parsing failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Parse a single page
   */
  private async parseSinglePage(
    url: string,
    options: WebsiteParsingOptions,
  ): Promise<ParsedPageData> {
    const startTime = Date.now();
    this.logger.log(`📄 Parsing single page: ${url}`);

    try {
      // 1. Extract HTML content
      const htmlContent: HtmlContent = await this.htmlParser.extractContent(
        url,
        options.usePuppeteer,
      );

      // 2. Extract navigation links
      const navLinks = await this.htmlParser.extractNavigationLinks(
        htmlContent.htmlSource,
        url,
        options.includeSubdomains,
      );

      // 3. Parse images if requested
      let images: ExtractedImage[] = [];
      if (options.downloadImages) {
        const imageResult = await this.imageParser.parseImages(
          htmlContent.htmlSource,
          url,
          false, // Don't download for now
          options.maxImages,
        );
        images = imageResult.images.map((img) => ({
          src: img.src,
          alt: img.alt,
          title: img.title,
        }));
      }

      // 4. AI analysis if enabled
      let aiAnalysis: DeepSeekAnalysisResult | undefined;
      if (options.aiAnalysis) {
        try {
          aiAnalysis = await this.deepSeekParser.analyzeContent(
            url,
            htmlContent.content,
            htmlContent.title,
          );
        } catch (error) {
          this.logger.error(`❌ AI analysis failed for ${url}: ${error.message}`);
        }
      }

      const processingTime = Date.now() - startTime;

      return {
        url,
        title: htmlContent.title,
        content: htmlContent.content,
        navLinks,
        shows: aiAnalysis?.shows || [],
        djs: aiAnalysis?.djs || [],
        vendors: aiAnalysis?.vendors || [],
        images,
        aiAnalysis,
        processingTime,
      };
    } catch (error) {
      this.logger.error(`❌ Failed to parse page ${url}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Discover additional pages from navigation links
   */
  private async discoverNavigationPages(
    navLinks: string[],
    baseUrl: string,
    includeSubdomains: boolean,
    maxPages: number,
  ): Promise<string[]> {
    if (maxPages <= 0) return [];

    this.logger.log(`🔍 Discovering navigation pages (max: ${maxPages})`);

    // Filter and deduplicate links
    const baseDomain = new URL(baseUrl).hostname;
    const validLinks = navLinks.filter((link) => {
      try {
        const linkDomain = new URL(link).hostname;
        const isDomainMatch = includeSubdomains
          ? linkDomain.endsWith(baseDomain) || baseDomain.endsWith(linkDomain)
          : linkDomain === baseDomain;

        return isDomainMatch && link !== baseUrl;
      } catch {
        return false;
      }
    });

    // Remove duplicates and limit
    const uniqueLinks = Array.from(new Set(validLinks)).slice(0, maxPages);

    this.logger.log(`📋 Found ${uniqueLinks.length} unique navigation pages to parse`);
    return uniqueLinks;
  }

  /**
   * Aggregate data from all parsed pages
   */
  private aggregatePageData(pages: ParsedPageData[]): {
    shows: any[];
    djs: any[];
    vendors: any[];
    totalImages: number;
  } {
    const allShows: any[] = [];
    const allDJs: any[] = [];
    const allVendors: any[] = [];
    let totalImages = 0;

    for (const page of pages) {
      allShows.push(...page.shows);
      allDJs.push(...page.djs);
      allVendors.push(...page.vendors);
      totalImages += page.images?.length || 0;
    }

    // Remove duplicates based on name/title
    const uniqueShows = this.removeDuplicates(allShows, 'title');
    const uniqueDJs = this.removeDuplicates(allDJs, 'name');
    const uniqueVendors = this.removeDuplicates(allVendors, 'name');

    return {
      shows: uniqueShows,
      djs: uniqueDJs,
      vendors: uniqueVendors,
      totalImages,
    };
  }

  /**
   * Remove duplicates from array based on a key
   */
  private removeDuplicates(items: any[], key: string): any[] {
    const seen = new Set();
    return items.filter((item) => {
      const value = item[key]?.toLowerCase().trim();
      if (!value || seen.has(value)) {
        return false;
      }
      seen.add(value);
      return true;
    });
  }

  /**
   * Test DeepSeek connectivity
   */
  async testDeepSeekConnection(): Promise<any> {
    return this.deepSeekParser.testConnection();
  }

  /**
   * Get parser status
   */
  getStatus(): {
    htmlParser: boolean;
    imageParser: boolean;
    deepSeekParser: boolean;
    version: string;
  } {
    return {
      htmlParser: true,
      imageParser: true,
      deepSeekParser: !!this.deepSeekParser,
      version: '2.0.0',
    };
  }

  /**
   * Clean up temporary files
   */
  async cleanup(): Promise<void> {
    await this.imageParser.cleanup();
  }
}
