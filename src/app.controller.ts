import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import { join } from 'path';
import { AppService } from './app.service';
import { UrlService } from './config/url.service';
import { KaraokeParserService } from './parser/karaoke-parser.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly parserService: KaraokeParserService,
    private readonly urlService: UrlService,
  ) {}

  @Get('api')
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  async getHealth(): Promise<{ 
    status: string; 
    timestamp: string; 
    parser?: { status: string; details?: string } 
  }> {
    const health: any = {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };

    // Check parser dependencies
    try {
      const puppeteer = require('puppeteer');
      const fs = require('fs');
      
      const parserChecks = {
        puppeteer: !!puppeteer,
        geminiApiKey: !!process.env.GEMINI_API_KEY,
        chromiumPath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium-browser',
        chromiumExists: false,
      };

      // Check if Chromium exists
      try {
        if (fs.existsSync(parserChecks.chromiumPath)) {
          parserChecks.chromiumExists = true;
        }
      } catch (error) {
        // Ignore file system errors
      }

      const parserHealthy = parserChecks.puppeteer && 
                           parserChecks.geminiApiKey && 
                           parserChecks.chromiumExists;

      health.parser = {
        status: parserHealthy ? 'healthy' : 'unhealthy',
        details: JSON.stringify(parserChecks),
      };

    } catch (error) {
      health.parser = {
        status: 'error',
        details: error.message,
      };
    }

    return health;
  }

  @Get('api/env-info')
  getEnvInfo(): object {
    const urlConfig = this.urlService.getUrlConfig();
    return {
      nodeEnv: process.env.NODE_ENV,
      urlConfig,
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
    const urlConfig = this.urlService.getUrlConfig();
    const oauthUrls = this.urlService.getOAuthUrls();

    return {
      urlConfig,
      oauthUrls,
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
