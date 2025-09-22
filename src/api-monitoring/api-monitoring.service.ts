import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiIssue, ApiIssueType } from './entities/api-issue.entity';
import { ApiEndpointType, ApiMetricsDaily, ApiProvider } from './entities/api-metrics-daily.entity';

export interface ApiCallData {
  provider: ApiProvider;
  endpointType: ApiEndpointType;
  requestUrl: string;
  requestHeaders?: any;
  requestBody?: any;
  responseStatus: number;
  responseHeaders?: any;
  responseBody?: any;
  responseTime: number;
  errorCode?: string;
  errorMessage?: string;
  isSuccess: boolean;
}

@Injectable()
export class ApiMonitoringService {
  constructor(
    @InjectRepository(ApiMetricsDaily)
    private readonly metricsRepository: Repository<ApiMetricsDaily>,
    @InjectRepository(ApiIssue)
    private readonly issueRepository: Repository<ApiIssue>,
  ) {}

  async logApiCall(data: ApiCallData): Promise<void> {
    try {
      // Always update daily metrics
      await this.updateDailyMetrics(data);

      // Store detailed issue if it's an error or rate limit
      if (!data.isSuccess || this.isRateLimit(data.responseStatus)) {
        await this.logApiIssue(data);
      }
    } catch (error) {
      console.error('Error logging API call:', error);
      // Don't throw to avoid breaking the main API flow
    }
  }

  private async updateDailyMetrics(data: ApiCallData): Promise<void> {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    // Find or create today's metrics for this provider/endpoint
    let metrics = await this.metricsRepository.findOne({
      where: {
        date: today,
        provider: data.provider,
        endpointType: data.endpointType,
      },
    });

    if (!metrics) {
      metrics = this.metricsRepository.create({
        date: today,
        provider: data.provider,
        endpointType: data.endpointType,
        totalCalls: 0,
        successCount: 0,
        errorCount: 0,
        rateLimitHits: 0,
        avgResponseTime: 0,
        minResponseTime: data.responseTime,
        maxResponseTime: data.responseTime,
        totalResponseTime: 0,
      });
    }

    // Update counters
    metrics.totalCalls += 1;

    if (data.isSuccess) {
      metrics.successCount += 1;
    } else {
      metrics.errorCount += 1;
    }

    if (this.isRateLimit(data.responseStatus)) {
      metrics.rateLimitHits += 1;
    }

    // Update response time metrics
    metrics.totalResponseTime += data.responseTime;
    metrics.avgResponseTime = metrics.totalResponseTime / metrics.totalCalls;
    metrics.minResponseTime = Math.min(metrics.minResponseTime, data.responseTime);
    metrics.maxResponseTime = Math.max(metrics.maxResponseTime, data.responseTime);

    await this.metricsRepository.save(metrics);
  }

  private async logApiIssue(data: ApiCallData): Promise<void> {
    const issueType = this.determineIssueType(data);

    const issue = this.issueRepository.create({
      timestamp: new Date(),
      provider: data.provider,
      endpointType: data.endpointType,
      issueType,
      errorCode: data.errorCode,
      errorMessage: data.errorMessage,
      requestDetails: {
        url: data.requestUrl,
        headers: data.requestHeaders,
        body: data.requestBody,
      },
      responseDetails: {
        status: data.responseStatus,
        headers: data.responseHeaders,
        body: data.responseBody,
      },
      responseTime: data.responseTime,
      isResolved: false,
    });

    await this.issueRepository.save(issue);
  }

  private determineIssueType(data: ApiCallData): ApiIssueType {
    if (this.isRateLimit(data.responseStatus)) {
      return ApiIssueType.RATE_LIMIT;
    }

    if (data.responseTime > 30000) {
      // 30 seconds
      return ApiIssueType.TIMEOUT;
    }

    if (data.responseStatus >= 400) {
      return ApiIssueType.ERROR;
    }

    return ApiIssueType.INVALID_RESPONSE;
  }

  private isRateLimit(status: number): boolean {
    return status === 429 || status === 503;
  }

  // Analytics methods
  async getDailyMetrics(
    days: number = 7,
    provider?: ApiProvider,
    endpointType?: ApiEndpointType,
  ): Promise<ApiMetricsDaily[]> {
    const query = this.metricsRepository
      .createQueryBuilder('metrics')
      .where('metrics.date >= DATE_SUB(CURDATE(), INTERVAL :days DAY)', { days })
      .orderBy('metrics.date', 'ASC');

    if (provider) {
      query.andWhere('metrics.provider = :provider', { provider });
    }

    if (endpointType) {
      query.andWhere('metrics.endpointType = :endpointType', { endpointType });
    }

    return query.getMany();
  }

  async getActiveIssues(limit: number = 100): Promise<ApiIssue[]> {
    return this.issueRepository.find({
      where: { isResolved: false },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async getIssuesByType(issueType: ApiIssueType, resolved: boolean = false): Promise<ApiIssue[]> {
    return this.issueRepository.find({
      where: { issueType, isResolved: resolved },
      order: { createdAt: 'DESC' },
    });
  }

  async resolveIssue(issueId: string, resolvedBy: string, resolutionNotes?: string): Promise<void> {
    await this.issueRepository.update(issueId, {
      isResolved: true,
      resolvedAt: new Date(),
      resolvedBy,
      resolutionNotes,
    });
  }

  async clearResolvedIssues(olderThanDays: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const result = await this.issueRepository
      .createQueryBuilder()
      .delete()
      .where('isResolved = true')
      .andWhere('resolvedAt <= :cutoffDate', { cutoffDate })
      .execute();

    return result.affected || 0;
  }

  // Dashboard data aggregation
  async getDashboardSummary(): Promise<{
    totalCallsToday: number;
    successRateToday: number;
    activeIssues: number;
    avgResponseTimeToday: number;
  }> {
    const today = new Date().toISOString().split('T')[0];

    const todayMetrics = await this.metricsRepository
      .createQueryBuilder('metrics')
      .select('SUM(metrics.totalCalls)', 'totalCalls')
      .addSelect('SUM(metrics.successCount)', 'successCount')
      .addSelect('AVG(metrics.avgResponseTime)', 'avgResponseTime')
      .where('metrics.date = :today', { today })
      .getRawOne();

    const activeIssuesCount = await this.issueRepository.count({
      where: { isResolved: false },
    });

    const totalCalls = parseInt(todayMetrics.totalCalls) || 0;
    const successCount = parseInt(todayMetrics.successCount) || 0;
    const successRate = totalCalls > 0 ? (successCount / totalCalls) * 100 : 100;

    return {
      totalCallsToday: totalCalls,
      successRateToday: Math.round(successRate * 100) / 100,
      activeIssues: activeIssuesCount,
      avgResponseTimeToday: Math.round(parseFloat(todayMetrics.avgResponseTime) || 0),
    };
  }
}
