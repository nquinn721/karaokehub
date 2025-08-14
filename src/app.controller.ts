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

  @Get('api/env-info')
  getEnvInfo(): object {
    return {
      nodeEnv: process.env.NODE_ENV,
      frontendUrl: process.env.FRONTEND_URL,
      allowedOrigins: process.env.ALLOWED_ORIGINS,
      hasGoogleClientId: !!process.env.GOOGLE_CLIENT_ID,
      hasGoogleClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
      hasJwtSecret: !!process.env.JWT_SECRET,
      hasGeminiApiKey: !!process.env.GEMINI_API_KEY,
      hasOpenAiApiKey: !!process.env.OPENAI_API_KEY,
      hasOllamaConfig: !!(process.env.OLLAMA_HOST && process.env.OLLAMA_MODEL),
      timestamp: new Date().toISOString(),
    };
  }

  @Get('api/test-parser')
  async testParser() {
    try {
      // Testing with a generic website instead of the hardcoded Steve's DJ method
      const result = await this.parserService.parseWebsite('https://stevesdj.com/karaoke-schedule');
      return {
        success: true,
        message: 'Website parsed successfully',
        data: {
          vendor: result.vendor?.name || 'Unknown',
          djsCount: result.djs?.length || 0,
          showsCount: result.shows?.length || 0,
          confidence: {
            vendor: result.vendor?.confidence || 0,
            avgShowConfidence:
              result.shows?.length > 0
                ? Math.round(
                    result.shows.reduce((sum, show) => sum + show.confidence, 0) /
                      result.shows.length,
                  )
                : 0,
          },
        },
        rawShows: result.shows || [], // Include raw show data for debugging
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
