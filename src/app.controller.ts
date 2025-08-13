import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { KaraokeParserService } from './parser/karaoke-parser.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly parserService: KaraokeParserService,
  ) {}

  @Get('api')
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  getHealth(): { status: string; timestamp: string } {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('api/test-parser')
  async testParser() {
    try {
      const result = await this.parserService.parseStevesdj();
      return {
        success: true,
        message: "Steve's DJ website parsed successfully",
        data: {
          vendor: result.savedEntities.vendor.name,
          kjsCount: result.savedEntities.kjs.length,
          showsCount: result.savedEntities.shows.length,
          confidence: {
            vendor: result.parsedData.vendor.confidence,
            avgKjConfidence:
              result.parsedData.kjs.length > 0
                ? Math.round(
                    result.parsedData.kjs.reduce((sum, kj) => sum + kj.confidence, 0) /
                      result.parsedData.kjs.length,
                  )
                : 0,
            avgShowConfidence:
              result.parsedData.shows.length > 0
                ? Math.round(
                    result.parsedData.shows.reduce((sum, show) => sum + show.confidence, 0) /
                      result.parsedData.shows.length,
                  )
                : 0,
          },
        },
        rawShows: result.parsedData.shows, // Include raw show data for debugging
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        stack: error.stack,
      };
    }
  }
}
