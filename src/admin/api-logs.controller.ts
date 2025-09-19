import { Controller, Get, Query } from '@nestjs/common';
import { ApiLog, ApiLogType, ApiProvider, LogLevel } from '../api-logging/api-log.entity';
import { ApiLogService, ApiLogStats } from '../api-logging/api-log.service';

@Controller('admin/api-logs')
// @UseGuards(AuthGuard('jwt'), AdminGuard) // TODO: Add authentication when ready
export class ApiLogsController {
  constructor(private readonly apiLogService: ApiLogService) {}

  @Get('stats')
  async getStats(
    @Query('provider') provider?: ApiProvider,
    @Query('hours') hours?: string,
  ): Promise<ApiLogStats> {
    const hoursNum = hours ? parseInt(hours, 10) : 24;
    return this.apiLogService.getStats(provider, hoursNum);
  }

  @Get('recent')
  async getRecentLogs(
    @Query('limit') limit?: string,
    @Query('provider') provider?: ApiProvider,
    @Query('logType') logType?: ApiLogType,
    @Query('level') level?: LogLevel,
  ): Promise<ApiLog[]> {
    const limitNum = limit ? parseInt(limit, 10) : 100;
    return this.apiLogService.getRecentLogs(limitNum, provider, logType, level);
  }

  @Get('rate-limits')
  async getRateLimitLogs(
    @Query('limit') limit?: string,
    @Query('hours') hours?: string,
  ): Promise<ApiLog[]> {
    const limitNum = limit ? parseInt(limit, 10) : 50;
    return this.apiLogService.getRecentLogs(limitNum, ApiProvider.ITUNES, ApiLogType.RATE_LIMITED);
  }

  @Get('errors')
  async getErrorLogs(
    @Query('limit') limit?: string,
    @Query('hours') hours?: string,
  ): Promise<ApiLog[]> {
    const limitNum = limit ? parseInt(limit, 10) : 50;
    return this.apiLogService.getRecentLogs(
      limitNum,
      ApiProvider.ITUNES,
      undefined,
      LogLevel.ERROR,
    );
  }

  @Get('cleanup')
  async cleanupOldLogs(@Query('days') days?: string): Promise<{ deleted: number }> {
    const daysNum = days ? parseInt(days, 10) : 30;
    const deleted = await this.apiLogService.cleanupOldLogs(daysNum);
    return { deleted };
  }

  @Get('itunes/rate-limit-info')
  async getItunesRateLimitInfo() {
    return this.apiLogService.getItunesRateLimitStats();
  }

  @Get('itunes/usage-trends')
  async getItunesUsageTrends(@Query('hours') hours?: string) {
    const hoursNum = hours ? parseInt(hours, 10) : 24;
    return this.apiLogService.getItunesUsageTrends(hoursNum);
  }
}
