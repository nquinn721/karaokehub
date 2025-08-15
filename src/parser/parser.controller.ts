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
  async parseWebsite(@Body() body: { url: string }) {
    try {
      console.log('Parsing URL:', body.url);

      // First, try to add URL to the urls_to_parse table
      let urlToParse;
      try {
        urlToParse = await this.urlToParseService.create(body.url);
        console.log('URL added to urls_to_parse table:', urlToParse.id);
      } catch (error) {
        console.log('URL may already exist in urls_to_parse table, continuing with parsing');
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
  async parseAndSaveWebsite(@Body() body: { url: string }) {
    try {
      console.log('Parsing and saving URL:', body.url);

      // First, try to add URL to the urls_to_parse table
      let urlToParse;
      try {
        urlToParse = await this.urlToParseService.create(body.url);
        console.log('URL added to urls_to_parse table:', urlToParse.id);
      } catch (error) {
        console.log('URL may already exist in urls_to_parse table, continuing with parsing');
      }

      // Then parse and save the website
      const result = await this.karaokeParserService.parseAndSaveWebsite(body.url);

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
          console.log(`Successfully parsed ${url.url}`);
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
}
