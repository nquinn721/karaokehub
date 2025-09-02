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

        console.log(`🔍 Parsing URL: ${body.url} with method: ${parseMethod}`);

        if (parseMethod === 'screenshot') {
          console.log(`📸 Using screenshot parsing for: ${body.url}`);
          result = await this.karaokeParserService.parseWebsiteWithScreenshot(body.url);
        } else {
          console.log(`📄 Using HTML parsing for: ${body.url}`);
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

  @Post('analyze-screenshots')
  async analyzeScreenshots(
    @Body()
    body: {
      screenshots: string[]; // base64 encoded screenshot data
      url: string;
      description?: string;
    },
  ) {
    try {
      const result = await this.karaokeParserService.analyzeScreenshotsWithGemini(
        body.screenshots,
        body.url,
        body.description,
      );
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      console.error('Error analyzing screenshots:', error);
      throw new HttpException(
        `Failed to analyze screenshots: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Save user-submitted parsed image data directly to database with proper deduplication
   */
  @Post('submit-parsed-image-data')
  async submitParsedImageData(
    @Body()
    body: {
      venues: Array<{
        name: string;
        address?: string;
        city?: string;
        state?: string;
        zip?: string;
        lat?: number;
        lng?: number;
        phone?: string;
        website?: string;
        confidence?: number;
      }>;
      djs: Array<{
        name: string;
        confidence?: number;
        context?: string;
      }>;
      shows: Array<{
        venueName: string;
        time?: string;
        startTime?: string;
        endTime?: string;
        day: string;
        djName: string;
        description?: string;
        confidence?: number;
      }>;
      sourceUrl?: string;
      description?: string;
    },
  ) {
    try {
      const createdShows = [];
      const createdDJs = [];
      const createdVenues = [];

      // Process each venue
      for (const venueData of body.venues) {
        const venue = await this.venueService.findOrCreate({
          name: venueData.name,
          address: venueData.address,
          city: venueData.city,
          state: venueData.state,
          zip: venueData.zip,
          phone: venueData.phone,
          website: venueData.website,
          lat: venueData.lat,
          lng: venueData.lng,
        });
        createdVenues.push(venue);
      }

      // Process each DJ - first check if they exist by name across all vendors
      for (const djData of body.djs) {
        // Look for existing DJ by name (without vendor restriction for image uploads)
        let existingDJ = await this.djRepository.findOne({
          where: {
            name: djData.name.trim(),
          },
          relations: ['vendor'],
        });

        if (existingDJ) {
          createdDJs.push(existingDJ);
          console.log(
            `Found existing DJ: ${existingDJ.name} with vendor: ${existingDJ.vendor?.name || 'No vendor'}`,
          );
        } else {
          // Create DJ without vendor (will be managed by admin later)
          const newDJ = this.djRepository.create({
            name: djData.name.trim(),
            isActive: true,
            // No vendorId for image-uploaded DJs - they'll be assigned by admin
          });
          const savedDJ = await this.djRepository.save(newDJ);
          createdDJs.push(savedDJ);
          console.log(`Created new DJ: ${savedDJ.name}`);
        }
      }

      // Process each show
      for (const showData of body.shows) {
        // Find the corresponding venue
        const venue = createdVenues.find((v) => v.name === showData.venueName);
        if (!venue) {
          console.error(`Venue not found for show: ${showData.venueName}`);
          continue;
        }

        // Find the corresponding DJ
        const dj = createdDJs.find((d) => d.name === showData.djName);
        if (!dj) {
          console.error(`DJ not found for show: ${showData.djName}`);
          continue;
        }

        // Convert start/end times to proper format
        let startTime = showData.startTime;
        let endTime = showData.endTime;

        // If we have a time range like "6 pm - 9 pm", parse it
        if (showData.time && !startTime) {
          const timeMatch = showData.time.match(/(\d{1,2})\s*([ap]m)\s*-\s*(\d{1,2})\s*([ap]m)/i);
          if (timeMatch) {
            const [, startHour, startMeridiem, endHour, endMeridiem] = timeMatch;

            // Convert to 24-hour format
            let start24 = parseInt(startHour);
            let end24 = parseInt(endHour);

            if (startMeridiem.toLowerCase() === 'pm' && start24 !== 12) start24 += 12;
            if (startMeridiem.toLowerCase() === 'am' && start24 === 12) start24 = 0;
            if (endMeridiem.toLowerCase() === 'pm' && end24 !== 12) end24 += 12;
            if (endMeridiem.toLowerCase() === 'am' && end24 === 12) end24 = 0;

            startTime = `${start24.toString().padStart(2, '0')}:00`;
            endTime = `${end24.toString().padStart(2, '0')}:00`;
          }
        }

        const finalStartTime = startTime || '18:00'; // Default to 6 PM
        const finalEndTime = endTime || '21:00'; // Default to 9 PM

        // Check for existing show with same venue/day/startTime (deduplication)
        const existingShow = await this.showRepository.findOne({
          where: {
            venueId: venue.id,
            day: showData.day.toLowerCase() as any,
            startTime: finalStartTime,
          },
        });

        if (existingShow) {
          console.log(
            `Show already exists for ${venue.name} on ${showData.day} at ${finalStartTime} - skipping`,
          );
          createdShows.push(existingShow); // Include in response but don't create duplicate
          continue;
        }

        const show = this.showRepository.create({
          djId: dj.id,
          venueId: venue.id,
          day: showData.day.toLowerCase() as any, // DayOfWeek enum
          startTime: finalStartTime,
          endTime: finalEndTime,
          description: showData.description || `Karaoke with ${dj.name}`,
          source: 'image_upload',
          userSubmitted: true, // Mark as user-submitted from image upload
        });

        const savedShow = await this.showRepository.save(show);
        createdShows.push(savedShow);
        console.log(`Created new show for ${venue.name} on ${showData.day} at ${finalStartTime}`);
      }

      // Count what was actually created vs found
      const newShows = createdShows.filter((show) => show.source === 'image_upload');
      const newDJs = createdDJs.filter((dj) => !dj.vendor);
      const newVenues = createdVenues.filter(
        (venue) => venue.createdAt && new Date(venue.createdAt).getTime() > Date.now() - 10000,
      ); // Created in last 10 seconds

      return {
        success: true,
        message: `Successfully processed: ${newShows.length} new show(s), ${createdShows.length - newShows.length} existing show(s), ${newDJs.length} new DJ(s), ${createdVenues.length} venue(s)`,
        data: {
          shows: createdShows,
          djs: createdDJs,
          venues: createdVenues,
          stats: {
            newShows: newShows.length,
            existingShows: createdShows.length - newShows.length,
            newDJs: newDJs.length,
            totalVenues: createdVenues.length,
          },
        },
      };
    } catch (error) {
      console.error('Error submitting parsed image data:', error);
      throw new HttpException(
        `Failed to submit parsed data: ${error.message}`,
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
}
