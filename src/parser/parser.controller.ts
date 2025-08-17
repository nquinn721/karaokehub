import { Body, Controller, Get, HttpException, HttpStatus, Param, Post } from '@nestjs/common';
import { KaraokeParserService } from './karaoke-parser.service';
import { UrlToParse } from './url-to-parse.entity';
import { UrlToParseService } from './url-to-parse.service';

@Controller('parser')
export class ParserController {
  constructor(
    private readonly karaokeParserService: KaraokeParserService,
    private readonly urlToParseService: UrlToParseService,
  ) {}

  @Post('parse-website')
  async parseWebsite(@Body() body: { url: string; usePuppeteer?: boolean }) {
    try {
      // First, try to add URL to the urls_to_parse table
      let urlToParse;
      try {
        urlToParse = await this.urlToParseService.create(body.url);
      } catch (error) {
        // URL may already exist in urls_to_parse table, continuing with parsing
      }

      // Then parse the website
      const result = await this.karaokeParserService.parseWebsite(body.url);

      return {
        ...result,
        urlToParseId: urlToParse?.id,
      };
    } catch (error) {
      console.error('Error parsing website:', error);
      throw new HttpException('Failed to parse website', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('parse-and-save-website')
  async parseAndSaveWebsite(
    @Body() body: { 
      url: string; 
      usePuppeteer?: boolean; 
      isCustomUrl?: boolean;
      parseMethod?: 'html' | 'screenshot';
    },
  ) {
    try {
      // Only add URL to the urls_to_parse table if it's not a custom URL
      let urlToParse;
      if (!body.isCustomUrl) {
        try {
          urlToParse = await this.urlToParseService.create(body.url);
        } catch (error) {
          // URL may already exist in urls_to_parse table, continuing with parsing
        }
      }

      // Parse using the specified method (default to HTML parsing for backward compatibility)
      const parseMethod = body.parseMethod || 'html';
      let result;
      
      if (parseMethod === 'screenshot') {
        result = await this.karaokeParserService.parseWebsiteWithScreenshot(body.url);
      } else {
        result = await this.karaokeParserService.parseAndSaveWebsite(body.url);
      }

      return {
        message: 'Website parsed and saved for admin review',
        parsedScheduleId: result.parsedScheduleId,
        data: result.data,
        urlToParseId: urlToParse?.id,
      };
    } catch (error) {
      console.error('Error parsing and saving website:', error);
      throw new HttpException('Failed to parse and save website', HttpStatus.INTERNAL_SERVER_ERROR);
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
    try {
      const result = await this.karaokeParserService.getPendingReviews();
      return result;
    } catch (error) {
      console.error('Error getting pending reviews:', error);
      throw new HttpException('Failed to get pending reviews', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('approve-schedule/:id')
  async approveSchedule(@Param('id') id: string, @Body() body: { approvedData: any }) {
    try {
      const result = await this.karaokeParserService.approveAndSaveParsedData(
        id,
        body.approvedData,
      );
      return {
        message: 'Schedule approved and saved successfully',
        result,
      };
    } catch (error) {
      console.error('Error approving schedule:', error);
      throw new HttpException('Failed to approve schedule', HttpStatus.INTERNAL_SERVER_ERROR);
    }
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

  @Post('parse-facebook-event')
  async parseFacebookEvent(@Body() body: { url: string }) {
    try {
      const result = await this.karaokeParserService.parseFacebookEvent(body.url);
      return result;
    } catch (error) {
      console.error('Error parsing Facebook event:', error);
      throw new HttpException(
        `Failed to parse Facebook event: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('parse-and-save-facebook-event')
  async parseAndSaveFacebookEvent(@Body() body: { url: string }) {
    try {
      const result = await this.karaokeParserService.parseAndSaveFacebookEvent(body.url);
      return result;
    } catch (error) {
      console.error('Error parsing and saving Facebook event:', error);
      throw new HttpException(
        `Failed to parse and save Facebook event: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('parse-facebook-share')
  async parseFacebookShare(@Body() body: { url: string }) {
    try {
      const result = await this.karaokeParserService.parseFacebookShare(body.url);
      return result;
    } catch (error) {
      console.error('Error parsing Facebook share:', error);
      throw new HttpException(
        `Failed to parse Facebook share: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('parse-and-save-facebook-share')
  async parseAndSaveFacebookShare(@Body() body: { url: string }) {
    try {
      const result = await this.karaokeParserService.parseAndSaveFacebookShare(body.url);
      return result;
    } catch (error) {
      console.error('Error parsing and saving Facebook share:', error);
      throw new HttpException(
        `Failed to parse and save Facebook share: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('transform-facebook-url')
  async transformFacebookUrl(@Body() body: { url: string }) {
    try {
      const result = await this.karaokeParserService.transformFacebookUrlWithGemini(body.url);
      return {
        success: true,
        originalUrl: body.url,
        transformedUrl: result.transformedUrl,
        extractedInfo: result.extractedInfo,
        suggestions: result.suggestions,
      };
    } catch (error) {
      console.error('Error transforming Facebook URL with Gemini:', error);
      throw new HttpException(
        `Failed to transform Facebook URL: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
