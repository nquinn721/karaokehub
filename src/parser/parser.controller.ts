import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Logger,
  Param,
  Post,
} from '@nestjs/common';
import { CancellationService } from '../services/cancellation.service';
import { FacebookParserService } from './facebook-parser.service';
import { FacebookGroupDiscoveryService } from './facebook-group-discovery.service';
import { KaraokeParserService } from './karaoke-parser.service';
import { UrlToParse } from './url-to-parse.entity';
import { UrlToParseService } from './url-to-parse.service';

@Controller('parser')
export class ParserController {
  constructor(
    private readonly karaokeParserService: KaraokeParserService,
    private readonly urlToParseService: UrlToParseService,
    private readonly facebookParserService: FacebookParserService,
    private readonly facebookGroupDiscoveryService: FacebookGroupDiscoveryService,
    private readonly cancellationService: CancellationService,
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
        console.log('🔍 Detected Instagram URL, using visual parsing');
        result = await this.karaokeParserService.parseInstagramWithScreenshots(body.url);
      } else if (url.includes('facebook.com') || url.includes('fb.com')) {
        // Facebook URL - use new ULTRA CLEAN Facebook parsing method
        console.log('🔍 Detected Facebook URL, using ULTRA CLEAN FacebookParserService');
        result = await this.facebookParserService.parseAndSaveFacebookPageNew(body.url);
      } else {
        // Regular website - use specified method
        const parseMethod = body.parseMethod || 'html';
        console.log(`🔍 Detected regular website, using ${parseMethod} parsing`);

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

  @Post('submit-manual-show')
  async submitManualShow(
    @Body()
    body: {
      vendorId: string;
      venue: string;
      address?: string;
      day: string;
      startTime: string;
      endTime?: string;
      djName?: string;
      description?: string;
      venuePhone?: string;
      venueWebsite?: string;
    },
  ) {
    try {
      // Create manual show submission in a format similar to parsed data
      const manualShowData = {
        vendor: {
          name: 'Manual Submission', // This will be updated to match the actual vendor
          website: body.venueWebsite || '',
          description: body.description || '',
          confidence: 1.0,
        },
        djs: body.djName
          ? [
              {
                name: body.djName,
                confidence: 1.0,
              },
            ]
          : [],
        shows: [
          {
            venue: body.venue,
            date: body.day, // This could be enhanced to handle specific dates
            time: body.startTime,
            endTime: body.endTime,
            djName: body.djName,
            description: body.description,
            address: body.address,
            venuePhone: body.venuePhone,
            venueWebsite: body.venueWebsite,
            confidence: 1.0,
          },
        ],
      };

      // For now, we'll add this to the parsed schedules for admin review
      // This ensures manual submissions go through the same review process
      const manualEntry = await this.karaokeParserService.saveManualSubmissionForReview(
        body.vendorId,
        manualShowData,
      );

      return {
        success: true,
        message: 'Manual show submitted successfully for review',
        data: manualEntry,
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

    // Also keep console.log for good measure
    console.log('🔥🔥🔥 PENDING REVIEWS ENDPOINT HIT - REQUEST RECEIVED 🔥🔥🔥');
    console.error('🔥🔥🔥 THIS IS AN ERROR LOG - SHOULD ALWAYS SHOW 🔥🔥🔥');
    console.warn('🔥🔥🔥 THIS IS A WARNING LOG - SHOULD ALWAYS SHOW 🔥🔥🔥');

    try {
      const result = await this.karaokeParserService.getPendingReviews();
      logger.log('✅ Successfully retrieved pending reviews, count: ' + (result?.length || 0));
      console.log('✅ Successfully retrieved pending reviews, count:', result?.length || 0);
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
   * EMERGENCY CANCELLATION ENDPOINT
   * Immediately stops all parsing operations, workers, and browsers
   */
  @Post('emergency-cancel')
  async emergencyCancel() {
    try {
      console.log('🛑 EMERGENCY CANCEL requested via API endpoint');
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
      const successfulCities = results.filter(r => r.groupUrls.length > 0).length;
      const failedCities = results.filter(r => r.error).length;
      
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
}
