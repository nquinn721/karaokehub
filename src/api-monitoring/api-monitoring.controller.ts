import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiMonitoringService } from './api-monitoring.service';
import { ApiIssue, ApiIssueType } from './entities/api-issue.entity';
import { ApiEndpointType, ApiMetricsDaily, ApiProvider } from './entities/api-metrics-daily.entity';

@Controller('api-monitoring')
export class ApiMonitoringController {
  constructor(private readonly apiMonitoringService: ApiMonitoringService) {}

  @Get('dashboard/summary')
  async getDashboardSummary() {
    return this.apiMonitoringService.getDashboardSummary();
  }

  @Get('metrics/daily')
  async getDailyMetrics(
    @Query('days') days?: string,
    @Query('provider') provider?: ApiProvider,
    @Query('endpointType') endpointType?: ApiEndpointType,
  ): Promise<ApiMetricsDaily[]> {
    const daysNum = days ? parseInt(days) : 7;
    return this.apiMonitoringService.getDailyMetrics(daysNum, provider, endpointType);
  }

  @Get('issues/active')
  async getActiveIssues(@Query('limit') limit?: string): Promise<ApiIssue[]> {
    const limitNum = limit ? parseInt(limit) : 100;
    return this.apiMonitoringService.getActiveIssues(limitNum);
  }

  @Get('issues/by-type/:type')
  async getIssuesByType(
    @Param('type') type: ApiIssueType,
    @Query('resolved') resolved?: string,
  ): Promise<ApiIssue[]> {
    const isResolved = resolved === 'true';
    return this.apiMonitoringService.getIssuesByType(type, isResolved);
  }

  @Post('issues/:id/resolve')
  @HttpCode(HttpStatus.NO_CONTENT)
  async resolveIssue(
    @Param('id') id: string,
    @Body() body: { resolvedBy: string; resolutionNotes?: string },
  ): Promise<void> {
    await this.apiMonitoringService.resolveIssue(id, body.resolvedBy, body.resolutionNotes);
  }

  @Delete('issues/cleanup')
  async clearResolvedIssues(
    @Query('olderThanDays') olderThanDays?: string,
  ): Promise<{ deletedCount: number }> {
    const days = olderThanDays ? parseInt(olderThanDays) : 30;
    const deletedCount = await this.apiMonitoringService.clearResolvedIssues(days);
    return { deletedCount };
  }

  // Chart data endpoints
  @Get('charts/calls-over-time')
  async getCallsOverTime(@Query('days') days?: string, @Query('provider') provider?: ApiProvider) {
    const daysNum = days ? parseInt(days) : 7;
    const metrics = await this.apiMonitoringService.getDailyMetrics(daysNum, provider);

    return {
      labels: metrics.map((m) => m.date),
      datasets: [
        {
          label: 'Total Calls',
          data: metrics.map((m) => m.totalCalls),
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
        },
        {
          label: 'Successful Calls',
          data: metrics.map((m) => m.successCount),
          borderColor: 'rgb(54, 162, 235)',
          backgroundColor: 'rgba(54, 162, 235, 0.2)',
        },
        {
          label: 'Failed Calls',
          data: metrics.map((m) => m.errorCount),
          borderColor: 'rgb(255, 99, 132)',
          backgroundColor: 'rgba(255, 99, 132, 0.2)',
        },
      ],
    };
  }

  @Get('charts/response-times')
  async getResponseTimes(@Query('days') days?: string, @Query('provider') provider?: ApiProvider) {
    const daysNum = days ? parseInt(days) : 7;
    const metrics = await this.apiMonitoringService.getDailyMetrics(daysNum, provider);

    return {
      labels: metrics.map((m) => m.date),
      datasets: [
        {
          label: 'Average Response Time (ms)',
          data: metrics.map((m) => m.avgResponseTime),
          borderColor: 'rgb(153, 102, 255)',
          backgroundColor: 'rgba(153, 102, 255, 0.2)',
        },
        {
          label: 'Max Response Time (ms)',
          data: metrics.map((m) => m.maxResponseTime),
          borderColor: 'rgb(255, 159, 64)',
          backgroundColor: 'rgba(255, 159, 64, 0.2)',
        },
      ],
    };
  }

  @Get('charts/success-rate')
  async getSuccessRate(@Query('days') days?: string, @Query('provider') provider?: ApiProvider) {
    const daysNum = days ? parseInt(days) : 7;
    const metrics = await this.apiMonitoringService.getDailyMetrics(daysNum, provider);

    return {
      labels: metrics.map((m) => m.date),
      datasets: [
        {
          label: 'Success Rate (%)',
          data: metrics.map((m) =>
            m.totalCalls > 0 ? (m.successCount / m.totalCalls) * 100 : 100,
          ),
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          fill: true,
        },
      ],
    };
  }

  @Get('charts/provider-breakdown')
  async getProviderBreakdown(@Query('days') days?: string) {
    const daysNum = days ? parseInt(days) : 7;
    const metrics = await this.apiMonitoringService.getDailyMetrics(daysNum);

    // Aggregate by provider
    const providerData = metrics.reduce(
      (acc, metric) => {
        const provider = metric.provider;
        if (!acc[provider]) {
          acc[provider] = { totalCalls: 0, successCount: 0, errorCount: 0 };
        }
        acc[provider].totalCalls += metric.totalCalls;
        acc[provider].successCount += metric.successCount;
        acc[provider].errorCount += metric.errorCount;
        return acc;
      },
      {} as Record<string, any>,
    );

    return {
      labels: Object.keys(providerData),
      datasets: [
        {
          label: 'Total Calls by Provider',
          data: Object.values(providerData).map((data: any) => data.totalCalls),
          backgroundColor: [
            'rgba(255, 99, 132, 0.8)',
            'rgba(54, 162, 235, 0.8)',
            'rgba(255, 205, 86, 0.8)',
            'rgba(75, 192, 192, 0.8)',
            'rgba(153, 102, 255, 0.8)',
          ],
        },
      ],
    };
  }

  @Get('charts/error-types')
  async getErrorTypes(@Query('days') days?: string) {
    const daysNum = days ? parseInt(days) : 7;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysNum);

    // This would require a custom query to count issues by type within date range
    // For now, we'll get all active issues and group them
    const issues = await this.apiMonitoringService.getActiveIssues(1000);
    const recentIssues = issues.filter((issue) => issue.createdAt && issue.createdAt >= cutoffDate);

    const errorTypeCounts = recentIssues.reduce(
      (acc, issue) => {
        const type = issue.issueType;
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      labels: Object.keys(errorTypeCounts),
      datasets: [
        {
          label: 'Error Count by Type',
          data: Object.values(errorTypeCounts),
          backgroundColor: [
            'rgba(255, 99, 132, 0.8)',
            'rgba(255, 159, 64, 0.8)',
            'rgba(255, 205, 86, 0.8)',
            'rgba(153, 102, 255, 0.8)',
          ],
        },
      ],
    };
  }
}
