// Add this to your NestJS app to help with AdSense crawling
import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';

@Controller()
export class SeoController {
  // AdSense verification endpoint
  @Get('ads.txt')
  serveAdsTxt(@Res() res: Response) {
    res.setHeader('Content-Type', 'text/plain');
    res.send(`# Ads.txt file for karaoke-hub.com
# This helps AdSense verify ownership
google.com, pub-XXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0
`);
  }

  // Health check specifically for crawlers
  @Get('ping')
  ping(@Res() res: Response) {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'KaraokeHub',
    });
  }

  // OpenGraph image endpoint
  @Get('og-image.png')
  serveOgImage(@Res() res: Response) {
    // You'll need to create an actual image file
    res.redirect('/vite.svg'); // Temporary redirect
  }
}
