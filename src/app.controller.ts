import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import { join } from 'path';
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
      backendUrl: process.env.BACKEND_URL,
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

  @Get('api/oauth-debug')
  getOAuthDebug(): object {
    const isProduction = process.env.NODE_ENV === 'production';
    const backendUrl = isProduction
      ? process.env.BACKEND_URL || 'https://karaokehub-203453576607.us-central1.run.app'
      : 'http://localhost:8000';

    return {
      environment: process.env.NODE_ENV,
      isProduction,
      backendUrl,
      frontendUrl: process.env.FRONTEND_URL,
      googleCallbackUrl: `${backendUrl}/api/auth/google/callback`,
      hasGoogleClientId: !!process.env.GOOGLE_CLIENT_ID,
      googleClientIdPrefix: process.env.GOOGLE_CLIENT_ID?.substring(0, 10) + '...',
      hasGoogleClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
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

  // Specific client routes that should serve the React app
  @Get(['/', '/dashboard', '/submit'])
  serveClient(@Res() res: Response) {
    // Set cache-busting headers to force HTML refresh
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    // Add a timestamp parameter to the HTML to force browser refresh
    const indexPath = join(__dirname, '..', 'public', 'index.html');
    res.sendFile(indexPath);
  }

  // Handle /music client route specifically (after API routes are handled)
  @Get('music')
  serveMusicPage(@Res() res: Response) {
    // Set cache-busting headers to force HTML refresh
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    // Add a timestamp parameter to the HTML to force browser refresh
    const indexPath = join(__dirname, '..', 'public', 'index.html');
    res.sendFile(indexPath);
  }

  // Facebook App Compliance - Data Deletion Instructions
  @Get('data-deletion-instructions')
  serveDataDeletionInstructions(@Res() res: Response) {
    const filePath = join(__dirname, '..', 'public', 'data-deletion-instructions.html');
    res.sendFile(filePath);
  }
}
