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
    // Serve the actual vite.svg file directly instead of redirecting
    res.sendFile('vite.svg', { root: './public' }, (err) => {
      if (err) {
        // Fallback if file doesn't exist
        res.status(404).json({ error: 'Image not found' });
      }
    });
  }
}
