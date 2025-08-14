import { Body, Controller, Get, Logger, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminGuard } from '../auth/guards/admin.guard';
import { KaraokeParserService } from './karaoke-parser.service';

@Controller('admin/parser')
@UseGuards(AuthGuard('jwt'), AdminGuard)
export class ParserController {
  private readonly logger = new Logger(ParserController.name);

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

  @Patch('approve-selected/:id')
  async approveSelectedItems(
    @Param('id') id: string,
    @Body()
    selectedItems: {
      vendor?: boolean;
      kjIds?: string[];
      showIds?: string[];
    },
  ) {
    try {
      this.logger.log(`🔍 Approving selected items for schedule ${id}`, selectedItems);

      const result = await this.parserService.approveSelectedItems(id, selectedItems);

      this.logger.log(`✅ Approval result:`, {
        vendor: result.vendor ? `${result.vendor.name} (ID: ${result.vendor.id})` : 'None',
        kjsCount: result.kjs.length,
        showsCount: result.shows.length,
        kjsDetails: result.kjs.map((kj) => `${kj.name} (ID: ${kj.id})`),
        showsDetails: result.shows.map((show) => `${show.venue} at ${show.time} (ID: ${show.id})`),
      });

      return {
        success: true,
        message: 'Selected items approved and saved successfully',
        data: result,
        summary: {
          vendor: result.vendor ? 1 : 0,
          kjs: result.kjs.length,
          shows: result.shows.length,
        },
      };
    } catch (error) {
      this.logger.error('❌ Failed to approve selected items:', error);
      throw error;
    }
  }

  @Patch('approve-all/:id')
  async approveAllItems(@Param('id') id: string) {
    try {
      this.logger.log(`🔍 Approving all items for schedule ${id}`);

      const result = await this.parserService.approveAllItems(id);

      this.logger.log(`✅ Approval result:`, {
        vendor: result.vendor ? `${result.vendor.name} (ID: ${result.vendor.id})` : 'None',
        kjsCount: result.kjs.length,
        showsCount: result.shows.length,
        kjsDetails: result.kjs.map((kj) => `${kj.name} (ID: ${kj.id})`),
        showsDetails: result.shows.map((show) => `${show.venue} at ${show.time} (ID: ${show.id})`),
      });

      return {
        success: true,
        message: 'All items approved and saved successfully',
        data: result,
        summary: {
          vendor: result.vendor ? 1 : 0,
          kjs: result.kjs.length,
          shows: result.shows.length,
        },
      };
    } catch (error) {
      this.logger.error('❌ Failed to approve all items:', error);
      throw error;
    }
  }

  @Patch('reject/:id')
  async rejectParsedData(@Param('id') id: string, @Body() body: { reason?: string }) {
    await this.parserService.rejectParsedData(id, body.reason);
    return { success: true, message: 'Data rejected successfully' };
  }

  @Post('cleanup-invalid-reviews')
  async cleanupInvalidPendingReviews() {
    const removedCount = await this.parserService.cleanupInvalidPendingReviews();
    return {
      success: true,
      message: `Cleaned up ${removedCount} invalid pending reviews`,
      removedCount,
    };
  }

  @Post('cleanup-all-pending-reviews')
  async cleanupAllPendingReviews() {
    const removedCount = await this.parserService.cleanupAllPendingReviews();
    return {
      success: true,
      message: `Cleaned up ${removedCount} pending reviews`,
      removedCount,
    };
  }

  @Get('debug/entities-count')
  async getEntitiesCount() {
    const debug = await this.parserService.getEntitiesDebugInfo();
    return {
      success: true,
      data: debug,
    };
  }

  @Get('debug/parsed-schedules')
  async getDebugParsedSchedules() {
    try {
      // Get all parsed schedules for debugging
      const allParsedSchedules = await this.parserService.getAllParsedSchedulesForDebug();
      return {
        success: true,
        data: allParsedSchedules,
      };
    } catch (error) {
      this.logger.error('❌ Failed to get debug parsed schedules:', error);
      throw error;
    }
  }

  @Post('parse-and-save')
  async parseAndSaveWebsite(@Body() body: { url: string; autoApprove?: boolean }) {
    try {
      this.logger.log(`🌐 Parse and save website: ${body.url}, autoApprove: ${body.autoApprove}`);

      const parsedData = await this.parserService.parseWebsite(body.url);

      // Calculate confidence scores from the parsed data
      const avgKjConfidence =
        parsedData.kjs?.length > 0
          ? parsedData.kjs.reduce((sum, kj) => sum + (kj.confidence || 50), 0) /
            parsedData.kjs.length
          : 0;

      const avgShowConfidence =
        parsedData.shows?.length > 0
          ? parsedData.shows.reduce((sum, show) => sum + (show.confidence || 50), 0) /
            parsedData.shows.length
          : 0;

      return {
        success: true,
        message: body.autoApprove
          ? 'Website parsed and saved automatically'
          : 'Website parsed and saved for review',
        data: {
          vendor: parsedData.vendor?.name || 'Unknown',
          kjsCount: parsedData.kjs?.length || 0,
          showsCount: parsedData.shows?.length || 0,
          confidence: {
            vendor: parsedData.vendor?.confidence || 50,
            avgKjConfidence,
            avgShowConfidence,
          },
        },
      };
    } catch (error) {
      this.logger.error('❌ Failed to parse and save website:', error);
      throw error;
    }
  }

  @Post('parse-stevesdj')
  async parseStevesdj() {
    const result = await this.parserService.parseStevesdj();

    // Calculate confidence scores from the parsed data
    const avgKjConfidence =
      result.parsedData.kjs?.length > 0
        ? result.parsedData.kjs.reduce((sum, kj) => sum + (kj.confidence || 50), 0) /
          result.parsedData.kjs.length
        : 0;

    const avgShowConfidence =
      result.parsedData.shows?.length > 0
        ? result.parsedData.shows.reduce((sum, show) => sum + (show.confidence || 50), 0) /
          result.parsedData.shows.length
        : 0;

    return {
      success: true,
      message: "Steve's DJ website parsed and data saved for review",
      data: {
        vendor: result.savedEntities.vendor?.name || result.parsedData.vendor?.name || 'Unknown',
        kjsCount: result.parsedData.kjs?.length || 0, // Use parsed data, not saved data
        showsCount: result.parsedData.shows?.length || 0, // Use parsed data, not saved data
        confidence: {
          vendor: result.parsedData.vendor?.confidence || 50,
          avgKjConfidence,
          avgShowConfidence,
        },
        parsedKjsCount: result.parsedData.kjs?.length || 0,
        parsedShowsCount: result.parsedData.shows?.length || 0,
        status: result.savedEntities.vendor ? 'saved' : 'pending_review',
      },
      entities: result.savedEntities,
    };
  }
}

// Simple test controller without authentication
@Controller('parser-test')
export class SimpleTestController {
  constructor(private readonly parserService: KaraokeParserService) {}

  @Get('stevesdj')
  async testParseStevesdj() {
    try {
      const result = await this.parserService.parseStevesdj();

      // Calculate confidence averages
      const avgKjConfidence =
        result.parsedData.kjs?.length > 0
          ? Math.round(
              result.parsedData.kjs.reduce((sum, kj) => sum + (kj.confidence || 70), 0) /
                result.parsedData.kjs.length,
            )
          : 70;
      const avgShowConfidence =
        result.parsedData.shows?.length > 0
          ? Math.round(
              result.parsedData.shows.reduce((sum, show) => sum + (show.confidence || 80), 0) /
                result.parsedData.shows.length,
            )
          : 80;

      return {
        success: true,
        message: "Steve's DJ website parsed successfully",
        data: {
          vendor:
            result.savedEntities.vendor?.name || result.parsedData.vendor?.name || 'Unknown Vendor',
          kjsCount: result.parsedData.kjs?.length || 0,
          djsCount: result.parsedData.djs?.length || 0, // Show DJ count
          showsCount: result.parsedData.shows?.length || 0,
          confidence: {
            vendor: result.parsedData.vendor?.confidence || 75,
            avgKjConfidence,
            avgShowConfidence,
          },
          parsedKjsCount: result.parsedData.kjs?.length || 0,
          parsedDjsCount: result.parsedData.djs?.length || 0, // Show parsed DJ count
          parsedShowsCount: result.parsedData.shows?.length || 0,
          status: result.savedEntities.vendor ? 'saved' : 'pending_review',
        },
        rawShows: result.parsedData.shows || [], // Include raw show data for debugging
        rawKJs: result.parsedData.kjs || [], // Include raw KJ data for debugging
        rawDJs: result.parsedData.djs || [], // Include raw DJ data for debugging
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        stack: error.stack,
      };
    }
  }

  @Post('cleanup')
  async testCleanupInvalidReviews() {
    try {
      const removedCount = await this.parserService.cleanupInvalidPendingReviews();
      return {
        success: true,
        message: `Cleaned up ${removedCount} invalid pending reviews`,
        removedCount,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        stack: error.stack,
      };
    }
  }

  @Post('cleanup-all')
  async testCleanupAllReviews() {
    try {
      const removedCount = await this.parserService.cleanupAllPendingReviews();
      return {
        success: true,
        message: `Cleaned up ${removedCount} pending reviews`,
        removedCount,
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
