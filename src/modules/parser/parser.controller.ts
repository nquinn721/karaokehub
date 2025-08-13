import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminGuard } from '../../auth/guards/admin.guard';
import { KaraokeParserService } from './karaoke-parser.service';

@Controller('admin/parser')
@UseGuards(AuthGuard('jwt'), AdminGuard)
export class ParserController {
  constructor(private readonly parserService: KaraokeParserService) {}

  @Post('parse-website')
  async parseWebsite(@Body() body: { url: string }) {
    return this.parserService.parseWebsite(body.url);
  }

  @Get('pending-reviews')
  async getPendingReviews() {
    return this.parserService.getPendingReviews();
  }

  @Patch('approve/:id')
  async approveParsedData(@Param('id') id: string, @Body() approvedData: any) {
    await this.parserService.approveAndSaveParsedData(id, approvedData);
    return { success: true, message: 'Data approved and saved successfully' };
  }

  @Patch('reject/:id')
  async rejectParsedData(@Param('id') id: string, @Body() body: { reason?: string }) {
    await this.parserService.rejectParsedData(id, body.reason);
    return { success: true, message: 'Data rejected successfully' };
  }

  @Post('parse-and-save')
  async parseAndSaveWebsite(@Body() body: { url: string; autoApprove?: boolean }) {
    const result = await this.parserService.parseAndSaveWebsite(
      body.url,
      body.autoApprove || false,
    );
    return {
      success: true,
      message: 'Website parsed and data saved successfully',
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
      entities: result.savedEntities,
    };
  }

  @Post('parse-stevesdj')
  async parseStevesdj() {
    const result = await this.parserService.parseStevesdj();
    return {
      success: true,
      message: "Steve's DJ website parsed and data saved successfully",
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
      entities: result.savedEntities,
    };
  }
}

// Temporary test endpoint without authentication
@Controller('test-parser')
export class TestParserController {
  constructor(private readonly parserService: KaraokeParserService) {}

  @Post('parse-stevesdj')
  async parseStevesdj() {
    const result = await this.parserService.parseStevesdj();
    return {
      success: true,
      message: "Steve's DJ website parsed and data saved successfully",
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
      entities: result.savedEntities,
    };
  }
}
