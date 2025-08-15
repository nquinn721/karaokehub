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
      const result = await this.karaokeParserService.parseWebsite(body.url);
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
      const result = await this.karaokeParserService.parseAndSaveWebsite(body.url);
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
      const result = await this.karaokeParserService.getPendingReviews();
      return result;
    } catch (error) {
      console.error('Error getting pending reviews:', error);
      throw new HttpException('Failed to get pending reviews', HttpStatus.INTERNAL_SERVER_ERROR);
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
