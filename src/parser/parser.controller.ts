import { Body, Controller, Get, HttpException, HttpStatus, Param, Post } from '@nestjs/common';
import { KaraokeParserService } from './karaoke-parser.service';

@Controller('parser')
export class ParserController {
  constructor(private readonly parserService: KaraokeParserService) {}

  @Post('parse-website')
  async parseWebsite(@Body() body: { url: string }) {
    try {
      console.log('Parsing URL:', body.url);
      const result = await this.parserService.parseWebsite(body.url);
      return result;
    } catch (error) {
      console.error('Error parsing website:', error);
      throw new HttpException('Failed to parse website', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('parse-and-save-website')
  async parseAndSaveWebsite(@Body() body: { url: string }) {
    try {
      console.log('Parsing and saving URL:', body.url);
      const result = await this.parserService.parseAndSaveWebsite(body.url);
      return {
        message: 'Website parsed and saved for admin review',
        parsedScheduleId: result.parsedScheduleId,
        data: result.data,
      };
    } catch (error) {
      console.error('Error parsing and saving website:', error);
      throw new HttpException('Failed to parse and save website', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('pending-reviews')
  async getPendingReviews() {
    try {
      return await this.parserService.getPendingReviews();
    } catch (error) {
      console.error('Error getting pending reviews:', error);
      throw new HttpException('Failed to get pending reviews', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Disabled during DJ migration
  // @Post('approve-dj/:id')
  // async approveDj(@Param('id') id: string) {
  //   // Temporarily disabled during migration
  //   throw new HttpException('Feature temporarily disabled during migration', HttpStatus.NOT_IMPLEMENTED);
  // }

  // @Post('reject-dj/:id')
  // async rejectDj(@Param('id') id: string) {
  //   // Temporarily disabled during migration
  //   throw new HttpException('Feature temporarily disabled during migration', HttpStatus.NOT_IMPLEMENTED);
  // }

  @Post('cleanup-invalid-reviews')
  async cleanupInvalidReviews() {
    try {
      const count = await this.parserService.cleanupInvalidPendingReviews();
      return { message: `Cleaned up ${count} invalid pending reviews` };
    } catch (error) {
      console.error('Error cleaning up invalid reviews:', error);
      throw new HttpException(
        'Failed to cleanup invalid reviews',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('cleanup-all-reviews')
  async cleanupAllReviews() {
    try {
      const count = await this.parserService.cleanupAllPendingReviews();
      return { message: `Cleaned up ${count} pending reviews` };
    } catch (error) {
      console.error('Error cleaning up all reviews:', error);
      throw new HttpException('Failed to cleanup all reviews', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('test-puppeteer')
  async testPuppeteer(@Body() body: { url: string }) {
    try {
      console.log('Testing Puppeteer extraction for URL:', body.url);
      // This will use the new Puppeteer-based extraction
      const result = await this.parserService.parseWebsite(body.url);
      return {
        success: true,
        vendor: result.vendor,
        showsFound: result.shows.length,
        djsFound: result.djs.length,
        firstShow: result.shows[0] || null,
        textPreview: result.rawData?.content?.substring(0, 200) || 'No preview available',
      };
    } catch (error) {
      console.error('Puppeteer test error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  @Post('approve-parsed-data/:id')
  async approveParsedData(@Param('id') id: string, @Body() body: { data?: any }) {
    try {
      await this.parserService.approveAndSaveParsedData(id, body.data);
      return { message: 'Parsed data approved and entities created successfully' };
    } catch (error) {
      console.error('Error approving parsed data:', error);
      throw new HttpException('Failed to approve parsed data', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('reject-parsed-data/:id')
  async rejectParsedData(@Param('id') id: string, @Body() body: { reason?: string }) {
    try {
      await this.parserService.rejectParsedData(id, body.reason);
      return { message: 'Parsed data rejected successfully' };
    } catch (error) {
      console.error('Error rejecting parsed data:', error);
      throw new HttpException('Failed to reject parsed data', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}

@Controller('simple-test')
export class SimpleTestController {
  constructor(private readonly parserService: KaraokeParserService) {}

  @Get('test')
  testEndpoint() {
    return { message: 'Test endpoint working', timestamp: new Date() };
  }

  @Post('parse-test')
  async parseTest(@Body() body: { url: string }) {
    try {
      console.log('Simple parse test for URL:', body.url);
      const result = await this.parserService.parseWebsite(body.url);
      return {
        success: true,
        showsFound: result.shows.length,
        vendor: result.vendor?.name || 'None',
        djsFound: result.djs.length,
      };
    } catch (error) {
      console.error('Parse test error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
