import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Logger,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DJ } from '../dj/dj.entity';
import { CancellationService } from '../services/cancellation.service';
import { Show } from '../show/show.entity';
import { VenueService } from '../venue/venue.service';
import { FacebookCookieValidatorService } from './facebook-cookie-validator.service';
import { FacebookGroupDiscoveryService } from './facebook-group-discovery.service';
import { FacebookParserService } from './facebook-parser.service';
import { KaraokeParserService } from './karaoke-parser.service';
import { UrlToParse } from './url-to-parse.entity';
import { UrlToParseService } from './url-to-parse.service';
import { WorkerBasedWebsiteParserService } from './websiteParser/worker-based-website-parser.service';

@Controller('parser')
export class ParserController {
  private readonly logger = new Logger(ParserController.name);

  constructor(
    private readonly karaokeParserService: KaraokeParserService,
    private readonly urlToParseService: UrlToParseService,
    private readonly facebookParserService: FacebookParserService,
    private readonly facebookGroupDiscoveryService: FacebookGroupDiscoveryService,
    private readonly facebookCookieValidatorService: FacebookCookieValidatorService,
    private readonly cancellationService: CancellationService,
    private readonly workerBasedWebsiteParserService: WorkerBasedWebsiteParserService,
    private readonly venueService: VenueService,
    @InjectRepository(DJ)
    private readonly djRepository: Repository<DJ>,
    @InjectRepository(Show)
    private readonly showRepository: Repository<Show>,
  ) {}

  /**
   * UNIFIED SMART PARSER ENDPOINT
   * Auto-detects URL type and routes to appropriate parser:
   * - Facebook URLs → Facebook Parser (Clean Method)
   * - Instagram URLs → Instagram Visual Parser
   * - Other URLs → Website Parser
   */
  @Post('parse-url')
  async parseUrl(
    @Body()
    body: {
      url: string;
      usePuppeteer?: boolean;
      isCustomUrl?: boolean;
      parseMethod?: 'html' | 'screenshot';
    },
  ) {
    try {
      // Only add URL to the urls_to_parse table if it's not a custom URL
      if (!body.isCustomUrl) {
        try {
          await this.urlToParseService.create(body.url);
        } catch (error) {
          // URL may already exist, continue with parsing
        }
      }

      // Detect URL type and route accordingly
      const url = body.url;
      let result;

      if (url.includes('instagram.com')) {
        // Instagram URL - use visual parsing with screenshots
        result = await this.karaokeParserService.parseInstagramWithScreenshots(body.url);
      } else if (url.includes('facebook.com') || url.includes('fb.com')) {
        // Facebook URL - use new ULTRA CLEAN Facebook parsing method
        result = await this.facebookParserService.parseAndSaveFacebookPageNew(body.url);
      } else {
        // Regular website - use specified method
        const parseMethod = body.parseMethod || 'html';

        if (parseMethod === 'screenshot') {
          result = await this.karaokeParserService.parseWebsiteWithScreenshot(body.url);
        } else {
          result = await this.karaokeParserService.parseAndSaveWebsite(body.url);
        }
      }

      return {
        success: true,
        urlType:
          url.includes('facebook.com') || url.includes('fb.com')
            ? 'facebook'
            : url.includes('instagram.com')
              ? 'instagram'
              : 'website',
        ...result,
      };
    } catch (error) {
      console.error('❌ Error in unified parser:', error);
      throw new HttpException(
        `Failed to parse URL: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Parse website using DeepSeek AI - worker-based parallel processing
   */
  @Post('parse-deepseek')
  async parseWithDeepSeek(
    @Body()
    body: {
      url: string;
      usePuppeteer?: boolean;
      maxPages?: number;
      includeSubdomains?: boolean;
    },
  ) {
    try {
      this.logger.log(`🔧 DeepSeek worker-based parsing request for: ${body.url}`);

      const options = {
        url: body.url,
        maxPages: body.maxPages ?? 10,
        includeSubdomains: body.includeSubdomains ?? false,
        maxWorkers: 5,
      };

      const result = await this.workerBasedWebsiteParserService.parseWebsiteWithWorkers(options);

      return {
        success: true,
        parseMethod: 'worker-based-parallel-processing',
        aiModel: 'deepseek-v3.1',
        ...result,
      };
    } catch (error) {
      this.logger.error(`❌ DeepSeek parsing failed for ${body.url}: ${error.message}`);

      return {
        success: false,
        error: error.message,
        parseMethod: 'deepseek-website-parser',
        aiModel: 'deepseek-v3.1',
      };
    }
  }

  /**
   * Parse website - Now using worker-based architecture for DeepSeek parsing
   */
  @Post('parse-website')
  async parseWebsite(
    @Body()
    body: {
      url: string;
      usePuppeteer?: boolean;
      includeSubdomains?: boolean;
      downloadImages?: boolean;
      maxImages?: number;
      aiAnalysis?: boolean;
    },
  ) {
    try {
      this.logger.log(`🔧 Worker-based website parsing request for: ${body.url}`);

      // Convert to worker-based options
      const options = {
        url: body.url,
        includeSubdomains: body.includeSubdomains ?? false,
        maxWorkers: 5, // Default worker count
      };

      const result = await this.workerBasedWebsiteParserService.parseWebsiteWithWorkers(options);

      return {
        success: true,
        parseMethod: 'worker-based-parallel-processing',
        aiModel: 'deepseek-v3.1',
        ...result,
      };
    } catch (error) {
      this.logger.error(`❌ Worker-based parsing failed for ${body.url}: ${error.message}`);

      return {
        success: false,
        error: error.message,
        parseMethod: 'worker-based-parallel-processing',
        aiModel: 'deepseek-v3.1',
      };
    }
  }

  /**
   * Test DeepSeek API connection
   */
  @Get('test-deepseek')
  async testDeepSeekConnection() {
    try {
      this.logger.log('🧪 Testing DeepSeek API connection...');

      const result = await this.workerBasedWebsiteParserService.testConnection();

      this.logger.log('✅ DeepSeek API connection test completed');

      return {
        success: true,
        status: {
          workerBasedParser: true,
          deepSeekParser: result.available,
          version: '3.0.0-workers',
        },
        connectionTest: result,
      };
    } catch (error) {
      this.logger.error(`❌ DeepSeek API connection test failed: ${error.message}`);

      return {
        success: false,
        error: error.message,
        status: {
          workerBasedParser: false,
          deepSeekParser: false,
          version: '3.0.0-workers',
        },
      };
    }
  }

  @Post('submit-manual-show')
  async submitManualShow(
    @Body()
    body: {
      vendorId: string;
      venue: string;
      address?: string;
      days: string[]; // Changed from day to days array
      startTime: string;
      endTime?: string;
      djName?: string;
      description?: string;
      venuePhone?: string;
      venueWebsite?: string;
      city?: string;
      state?: string;
      zip?: string;
      lat?: number;
      lng?: number;
    },
  ) {
    try {
      // Handle DJ creation/finding
      let djId: string | null = null;
      if (body.djName && body.djName.trim()) {
        // Check if DJ already exists for this vendor
        const existingDJ = await this.djRepository.findOne({
          where: {
            name: body.djName.trim(),
            vendorId: body.vendorId,
          },
        });

        if (existingDJ) {
          djId = existingDJ.id;
        } else {
          // Create new DJ
          const newDJ = this.djRepository.create({
            name: body.djName.trim(),
            vendorId: body.vendorId,
            isActive: true,
          });
          const savedDJ = await this.djRepository.save(newDJ);
          djId = savedDJ.id;
        }
      }

      // Handle venue creation/finding with coordinates
      const venue = await this.venueService.findOrCreate({
        name: body.venue,
        address: body.address,
        city: body.city,
        state: body.state,
        zip: body.zip,
        phone: body.venuePhone,
        website: body.venueWebsite,
        lat: body.lat,
        lng: body.lng,
      });

      // Create shows for each selected day
      const createdShows = [];
      for (const day of body.days) {
        const show = this.showRepository.create({
          djId: djId,
          venueId: venue.id,
          day: day as any, // DayOfWeek enum
          startTime: body.startTime,
          endTime: body.endTime,
          description: body.description,
          source: 'manual_submission',
        });

        const savedShow = await this.showRepository.save(show);
        createdShows.push(savedShow);
      }

      return {
        success: true,
        message: `Successfully created ${createdShows.length} show(s)`,
        data: createdShows,
      };
    } catch (error) {
      console.error('Error submitting manual show:', error);
      throw new HttpException('Failed to submit manual show', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('pending-reviews')
  async getPendingReviews() {
    // Use NestJS Logger instead of console.log
    const logger = new Logger('ParserController');
    logger.log('🔥🔥🔥 PENDING REVIEWS ENDPOINT HIT - REQUEST RECEIVED 🔥🔥🔥');
    logger.log('Timestamp: ' + new Date().toISOString());

    try {
      const result = await this.karaokeParserService.getPendingReviews();
      logger.log('✅ Successfully retrieved pending reviews, count: ' + (result?.length || 0));
      return result;
    } catch (error) {
      logger.error('❌ Error getting pending reviews: ' + error);
      console.error('❌ Error getting pending reviews:', error);
      throw new HttpException('Failed to get pending reviews', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('approve-schedule/:id')
  async approveSchedule(@Param('id') id: string, @Body() body: { approvedData: any }) {
    try {
      // Normalize confidence values before processing
      const normalizedData = this.normalizeDataConfidence(body.approvedData);

      const result = await this.karaokeParserService.approveAndSaveParsedData(id, normalizedData);
      return {
        message: 'Schedule approved and saved successfully',
        result,
      };
    } catch (error) {
      console.error('Error approving schedule:', error);
      throw new HttpException('Failed to approve schedule', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Normalize parsed data to ensure confidence values are valid numbers
   */
  private normalizeDataConfidence(data: any): any {
    if (!data) return data;

    // Normalize vendor confidence
    if (data.vendor && typeof data.vendor.confidence !== 'number') {
      data.vendor.confidence = 0;
    }
    if (data.vendors && Array.isArray(data.vendors)) {
      data.vendors = data.vendors.map((vendor: any) => ({
        ...vendor,
        confidence: typeof vendor.confidence === 'number' ? vendor.confidence : 0,
      }));
    }

    // Normalize DJ confidence
    if (data.djs && Array.isArray(data.djs)) {
      data.djs = data.djs.map((dj: any) => ({
        ...dj,
        confidence: typeof dj.confidence === 'number' ? dj.confidence : 0,
      }));
    }

    // Normalize show confidence
    if (data.shows && Array.isArray(data.shows)) {
      data.shows = data.shows.map((show: any) => ({
        ...show,
        confidence: typeof show.confidence === 'number' ? show.confidence : 0,
      }));
    }

    return data;
  }

  @Post('approve-all/:id')
  async approveAll(@Param('id') id: string) {
    try {
      const result = await this.karaokeParserService.approveAllItems(id);
      return {
        message: 'All items approved and saved successfully',
        result,
      };
    } catch (error) {
      console.error('Error approving all items:', error);
      throw new HttpException('Failed to approve all items', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('reject-schedule/:id')
  async rejectSchedule(@Param('id') id: string, @Body() body: { reason?: string }) {
    try {
      const result = await this.karaokeParserService.rejectSchedule(id, body.reason);
      return {
        message: 'Schedule rejected successfully',
        result,
      };
    } catch (error) {
      console.error('Error rejecting schedule:', error);
      throw new HttpException('Failed to reject schedule', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // URL management endpoints
  @Get('urls')
  async getAllUrls(): Promise<UrlToParse[]> {
    try {
      return await this.urlToParseService.findAll();
    } catch (error) {
      console.error('Error getting URLs:', error);
      throw new HttpException('Failed to get URLs', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('urls/unapproved')
  async getUnapprovedUrls(): Promise<UrlToParse[]> {
    try {
      return await this.urlToParseService.findUnapproved();
    } catch (error) {
      console.error('Error getting unapproved URLs:', error);
      throw new HttpException('Failed to get unapproved URLs', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('urls/unparsed')
  async getUnparsedUrls(): Promise<UrlToParse[]> {
    try {
      return await this.urlToParseService.findUnparsed();
    } catch (error) {
      console.error('Error getting unparsed URLs:', error);
      throw new HttpException('Failed to get unparsed URLs', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('urls/approved-and-unparsed')
  async getApprovedAndUnparsedUrls(): Promise<UrlToParse[]> {
    try {
      return await this.urlToParseService.findApprovedAndUnparsed();
    } catch (error) {
      console.error('Error getting approved and unparsed URLs:', error);
      throw new HttpException(
        'Failed to get approved and unparsed URLs',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('urls')
  async addUrl(@Body() body: { url: string }): Promise<UrlToParse> {
    try {
      return await this.urlToParseService.create(body.url);
    } catch (error) {
      console.error('Error adding URL:', error);
      throw new HttpException('Failed to add URL', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('urls/:id/delete')
  async deleteUrl(@Param('id') id: string): Promise<{ message: string }> {
    try {
      await this.urlToParseService.delete(parseInt(id));
      return { message: 'URL deleted successfully' };
    } catch (error) {
      console.error('Error deleting URL:', error);
      throw new HttpException('Failed to delete URL', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('urls/:id/mark-parsed')
  async markUrlAsParsed(@Param('id') id: string): Promise<{ message: string }> {
    try {
      await this.urlToParseService.markAsParsed(parseInt(id));
      return { message: 'URL marked as parsed successfully' };
    } catch (error) {
      console.error('Error marking URL as parsed:', error);
      throw new HttpException('Failed to mark URL as parsed', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('urls/:id/mark-unparsed')
  async markUrlAsUnparsed(@Param('id') id: string): Promise<{ message: string }> {
    try {
      await this.urlToParseService.markAsUnparsed(parseInt(id));
      return { message: 'URL marked as unparsed successfully' };
    } catch (error) {
      console.error('Error marking URL as unparsed:', error);
      throw new HttpException('Failed to mark URL as unparsed', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Put('urls/:id')
  async updateUrl(
    @Param('id') id: string,
    @Body() body: { name?: string; city?: string; state?: string },
  ): Promise<UrlToParse> {
    try {
      return await this.urlToParseService.update(parseInt(id), body);
    } catch (error) {
      console.error('Error updating URL:', error);
      throw new HttpException('Failed to update URL', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('urls/:id/approve')
  async approveUrl(@Param('id') id: string): Promise<{ message: string }> {
    try {
      await this.urlToParseService.approve(parseInt(id));
      return { message: 'URL approved successfully' };
    } catch (error) {
      console.error('Error approving URL:', error);
      throw new HttpException('Failed to approve URL', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('urls/:id/unapprove')
  async unapproveUrl(@Param('id') id: string): Promise<{ message: string }> {
    try {
      await this.urlToParseService.unapprove(parseInt(id));
      return { message: 'URL unapproved successfully' };
    } catch (error) {
      console.error('Error unapproving URL:', error);
      throw new HttpException('Failed to unapprove URL', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('parse-all')
  async parseAllUrls(): Promise<{ message: string; processed: number }> {
    try {
      const urls = await this.urlToParseService.findAll();
      let processed = 0;

      for (const url of urls) {
        try {
          const result = await this.karaokeParserService.parseAndSaveWebsite(url.url);
          processed++;
        } catch (error) {
          console.error(`Failed to parse ${url.url}:`, error);
        }
      }

      return {
        message: `Processed ${processed} out of ${urls.length} URLs`,
        processed,
      };
    } catch (error) {
      console.error('Error in batch parsing:', error);
      throw new HttpException('Failed to parse URLs', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('debug-puppeteer')
  async debugPuppeteer(@Body() body: { url: string; takeScreenshot?: boolean }) {
    try {
      const result = await this.karaokeParserService.debugPuppeteerExtraction(body.url);
      return result;
    } catch (error) {
      console.error('Error debugging Puppeteer:', error);
      throw new HttpException(
        `Failed to debug Puppeteer: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('parsing-status')
  async getParsingStatus() {
    try {
      return this.karaokeParserService.getParsingStatus();
    } catch (error) {
      console.error('Error getting parsing status:', error);
      throw new HttpException('Failed to get parsing status', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('debug-request')
  async debugRequest(@Body() body: any) {
    return {
      success: true,
      received: {
        bodyKeys: Object.keys(body),
        url: body.url,
        urlType: typeof body.url,
        urlLength: body.url?.length,
        screenshots: body.screenshots?.length || 'undefined',
        screenshotsType: typeof body.screenshots,
        description: body.description,
        fullBody: body,
      },
    };
  }

  @Post('validate-screenshots')
  async validateScreenshots(
    @Body()
    body: {
      screenshots: string[];
    },
  ) {
    try {
      if (!body.screenshots || !Array.isArray(body.screenshots)) {
        throw new HttpException('Screenshots array is required', HttpStatus.BAD_REQUEST);
      }

      const validationResults = body.screenshots.map((screenshot, index) => {
        try {
          // Basic validations
          const result = {
            index,
            isString: typeof screenshot === 'string',
            length: screenshot?.length || 0,
            hasDataPrefix: screenshot?.startsWith('data:image/') || false,
            isValidBase64: false,
            isValidImage: false,
            format: 'unknown',
            error: null,
          };

          if (!result.isString) {
            result.error = 'Not a string';
            return result;
          }

          if (result.length === 0) {
            result.error = 'Empty string';
            return result;
          }

          if (result.length > 10_000_000) {
            result.error = 'Too large (>10MB)';
            return result;
          }

          // Try to validate base64
          try {
            let cleanBase64 = screenshot;
            if (result.hasDataPrefix) {
              const base64Index = screenshot.indexOf(',');
              if (base64Index !== -1) {
                cleanBase64 = screenshot.substring(base64Index + 1);
              }
            }

            // Remove whitespace
            cleanBase64 = cleanBase64.replace(/\s/g, '');

            // Check base64 format
            if (cleanBase64.match(/^[A-Za-z0-9+/]*={0,2}$/)) {
              result.isValidBase64 = true;

              // Try to decode and check image format
              const buffer = Buffer.from(cleanBase64, 'base64');

              if (buffer.length > 0) {
                // Check image headers
                if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
                  result.format = 'JPEG';
                  result.isValidImage = true;
                } else if (
                  buffer[0] === 0x89 &&
                  buffer[1] === 0x50 &&
                  buffer[2] === 0x4e &&
                  buffer[3] === 0x47
                ) {
                  result.format = 'PNG';
                  result.isValidImage = true;
                } else if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) {
                  result.format = 'GIF';
                  result.isValidImage = true;
                } else if (
                  buffer[0] === 0x52 &&
                  buffer[1] === 0x49 &&
                  buffer[2] === 0x46 &&
                  buffer[3] === 0x46
                ) {
                  result.format = 'WEBP';
                  result.isValidImage = true;
                } else {
                  result.error = 'Not a recognized image format';
                }
              } else {
                result.error = 'Empty buffer after base64 decode';
              }
            } else {
              result.error = 'Invalid base64 format';
            }
          } catch (decodeError) {
            result.error = `Decode error: ${decodeError.message}`;
          }

          return result;
        } catch (error) {
          return {
            index,
            isString: false,
            length: 0,
            hasDataPrefix: false,
            isValidBase64: false,
            isValidImage: false,
            format: 'unknown',
            error: error.message,
          };
        }
      });

      const summary = {
        total: body.screenshots.length,
        valid: validationResults.filter((r) => r.isValidImage).length,
        invalid: validationResults.filter((r) => !r.isValidImage).length,
        formats: validationResults.reduce(
          (acc, r) => {
            if (r.isValidImage) {
              acc[r.format] = (acc[r.format] || 0) + 1;
            }
            return acc;
          },
          {} as Record<string, number>,
        ),
      };

      return {
        success: true,
        summary,
        details: validationResults,
      };
    } catch (error) {
      throw new HttpException(
        `Failed to validate screenshots: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('analyze-screenshots')
  async analyzeScreenshots(
    @Body()
    body: {
      screenshots: string[]; // base64 encoded screenshot data
      url?: string; // Optional for admin uploads
      description?: string;
      vendor?: string; // For admin uploads
      isAdminUpload?: boolean; // Flag to distinguish admin uploads
    },
  ) {
    try {
      // Debug logging
      console.log('Received request body keys:', Object.keys(body));
      console.log('URL value:', body.url);
      console.log('URL type:', typeof body.url);
      console.log('Screenshots count:', body.screenshots?.length || 'undefined');
      console.log('Is admin upload:', body.isAdminUpload);
      console.log('Vendor:', body.vendor);

      // Validate screenshots array
      if (!body.screenshots || !Array.isArray(body.screenshots)) {
        throw new HttpException('Screenshots array is required', HttpStatus.BAD_REQUEST);
      }

      if (body.screenshots.length === 0) {
        throw new HttpException('At least one screenshot is required', HttpStatus.BAD_REQUEST);
      }

      // URL validation - required for user submissions, optional for admin uploads
      let url = '';
      if (body.isAdminUpload) {
        // For admin uploads, use a placeholder URL or vendor name
        url = body.vendor ? `admin-upload-${body.vendor}` : 'admin-upload';
      } else {
        // For user submissions, URL is required
        const providedUrl = typeof body.url === 'string' ? body.url.trim() : body.url;
        if (!providedUrl || typeof providedUrl !== 'string' || providedUrl.length === 0) {
          throw new HttpException(
            'URL is required and must be a non-empty string for user submissions',
            HttpStatus.BAD_REQUEST,
          );
        }
        url = providedUrl;
      }

      // Basic validation of screenshot data
      body.screenshots.forEach((screenshot, index) => {
        if (typeof screenshot !== 'string') {
          throw new HttpException(
            `Screenshot at index ${index} must be a string`,
            HttpStatus.BAD_REQUEST,
          );
        }

        if (screenshot.length === 0) {
          throw new HttpException(
            `Screenshot at index ${index} cannot be empty`,
            HttpStatus.BAD_REQUEST,
          );
        }

        // Check for suspicious data length (extremely long strings might be corrupted)
        if (screenshot.length > 10_000_000) {
          // 10MB limit
          throw new HttpException(
            `Screenshot at index ${index} is too large (max 10MB)`,
            HttpStatus.BAD_REQUEST,
          );
        }
      });

      const result = await this.karaokeParserService.analyzeScreenshotsWithGemini(
        body.screenshots,
        url,
        body.description,
      );
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      console.error('Error analyzing screenshots:', error);

      // If it's already an HttpException, re-throw it
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        `Failed to analyze screenshots: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * EMERGENCY CANCELLATION ENDPOINT
   * Immediately stops all parsing operations, workers, and browsers
   */
  @Post('emergency-cancel')
  async emergencyCancel() {
    try {
      await this.cancellationService.cancelAll();

      return {
        success: true,
        message: 'All parsing operations have been cancelled',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('❌ Emergency cancellation failed:', error);
      throw new HttpException(
        `Failed to cancel operations: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * GET CANCELLATION STATUS
   * Returns current status of cancellation service and active tasks
   */
  @Get('cancellation-status')
  getCancellationStatus() {
    try {
      const status = this.cancellationService.getStatus();
      return {
        success: true,
        data: status,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('❌ Failed to get cancellation status:', error);
      throw new HttpException(
        `Failed to get cancellation status: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * RESET CANCELLATION SERVICE
   * Resets the cancellation service for new operations
   */
  @Post('reset-cancellation')
  resetCancellation() {
    try {
      this.cancellationService.reset();
      return {
        success: true,
        message: 'Cancellation service has been reset',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('❌ Failed to reset cancellation service:', error);
      throw new HttpException(
        `Failed to reset cancellation service: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * DISCOVER FACEBOOK GROUPS
   * Discovers karaoke groups from all cities using Puppeteer and Gemini AI
   */
  @Post('discover-facebook-groups')
  async discoverFacebookGroups() {
    const logger = new Logger('FacebookGroupDiscovery');

    try {
      logger.log('🚀 Starting Facebook group discovery for all cities...');

      const results = await this.facebookGroupDiscoveryService.discoverGroupsFromAllCities();

      const totalGroups = results.reduce((sum, r) => sum + r.groupUrls.length, 0);
      const successfulCities = results.filter((r) => r.groupUrls.length > 0).length;
      const failedCities = results.filter((r) => r.error).length;

      logger.log(`✅ Facebook group discovery completed!`);
      logger.log(`📊 Results: ${totalGroups} groups found across ${successfulCities} cities`);
      if (failedCities > 0) {
        logger.warn(`⚠️ Failed to process ${failedCities} cities`);
      }

      return {
        success: true,
        message: 'Facebook group discovery completed successfully',
        data: {
          totalGroups,
          successfulCities,
          failedCities,
          totalCitiesProcessed: results.length,
          results: results.slice(0, 10), // Return first 10 for preview
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error(`❌ Facebook group discovery failed: ${error.message}`);
      throw new HttpException(
        `Failed to discover Facebook groups: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * GET FACEBOOK GROUP DISCOVERY STATUS
   * Returns current status and progress of group discovery
   */
  @Get('facebook-groups/status')
  async getFacebookGroupDiscoveryStatus() {
    try {
      const status = await this.facebookGroupDiscoveryService.getDiscoveryStatus();

      return {
        success: true,
        data: status,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('❌ Failed to get Facebook group discovery status:', error);
      throw new HttpException(
        `Failed to get discovery status: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * VALIDATE FACEBOOK COOKIES
   * Check if Facebook session cookies are valid and not expired
   */
  @Get('facebook-cookies/validate')
  async validateFacebookCookies() {
    try {
      const analysis = await this.facebookCookieValidatorService.getCookieAnalysis();

      return {
        success: true,
        data: analysis,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('❌ Failed to validate Facebook cookies:', error);
      throw new HttpException(
        `Failed to validate cookies: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * TEST FACEBOOK AUTHENTICATION
   * Test if current Facebook cookies can successfully authenticate
   */
  @Post('facebook-cookies/test')
  async testFacebookAuthentication() {
    const logger = new Logger('FacebookAuthTest');

    try {
      logger.log('🧪 Testing Facebook authentication...');

      const testResult = await this.facebookCookieValidatorService.testFacebookAuthentication();

      if (testResult.success) {
        logger.log('✅ Facebook authentication test passed');
      } else {
        logger.warn(
          `⚠️ Facebook authentication test failed: ${testResult.error || 'Unknown error'}`,
        );
      }

      return {
        success: true,
        data: testResult,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error(`❌ Facebook authentication test failed: ${error.message}`);
      throw new HttpException(
        `Failed to test authentication: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('analyze-admin-screenshots')
  async analyzeAdminScreenshots(
    @Body()
    body: {
      screenshots: string[]; // base64 encoded screenshot data
      vendor?: string;
      description?: string;
    },
  ) {
    try {
      // Debug logging
      console.log('Admin screenshot analysis - received request body keys:', Object.keys(body));
      console.log('Screenshots count:', body.screenshots?.length || 'undefined');
      console.log('Vendor:', body.vendor);

      // Validate screenshots array
      if (!body.screenshots || !Array.isArray(body.screenshots)) {
        throw new HttpException('Screenshots array is required', HttpStatus.BAD_REQUEST);
      }

      if (body.screenshots.length === 0) {
        throw new HttpException('At least one screenshot is required', HttpStatus.BAD_REQUEST);
      }

      // Basic validation of screenshot data
      body.screenshots.forEach((screenshot, index) => {
        if (typeof screenshot !== 'string') {
          throw new HttpException(
            `Screenshot at index ${index} must be a string`,
            HttpStatus.BAD_REQUEST,
          );
        }

        if (screenshot.length === 0) {
          throw new HttpException(
            `Screenshot at index ${index} cannot be empty`,
            HttpStatus.BAD_REQUEST,
          );
        }
      });

      // Call the service to analyze screenshots
      const result = await this.karaokeParserService.analyzeScreenshotsWithGemini(
        body.screenshots,
        body.vendor || 'Unknown Venue', // Use vendor as URL placeholder for admin uploads
        body.description,
      );

      console.log('✅ Admin screenshot analysis completed successfully');

      // Return the analysis result for admin review
      return {
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
        requiresApproval: true,
      };
    } catch (error) {
      console.error('❌ Admin screenshot analysis failed:', error.message);
      throw new HttpException(
        `Failed to analyze admin screenshots: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('approve-admin-analysis')
  async approveAdminAnalysis(
    @Body()
    body: {
      data: any; // ParsedKaraokeData structure
    },
  ) {
    try {
      console.log('Admin analysis approval - received data keys:', Object.keys(body.data || {}));

      if (!body.data) {
        throw new HttpException('Analysis data is required', HttpStatus.BAD_REQUEST);
      }

      // Call the service to save the approved admin data
      const result = await this.karaokeParserService.approveAndSaveAdminData(body.data);

      console.log('✅ Admin analysis approved and saved successfully');

      return {
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('❌ Admin analysis approval failed:', error.message);
      throw new HttpException(
        `Failed to approve admin analysis: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
