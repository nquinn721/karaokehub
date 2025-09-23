import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiRateLimitStatus } from '../api-logging/entities/api-rate-limit-status.entity';
import { ApiRealtimeMetric } from '../api-logging/entities/api-realtime-metric.entity';
import { ApiRecentCall } from '../api-logging/entities/api-recent-call.entity';
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
    @InjectRepository(ApiRecentCall)
    private readonly recentCallRepository: Repository<ApiRecentCall>,
    @InjectRepository(ApiRealtimeMetric)
    private readonly realtimeMetricRepository: Repository<ApiRealtimeMetric>,
    @InjectRepository(ApiRateLimitStatus)
    private readonly rateLimitStatusRepository: Repository<ApiRateLimitStatus>,
  ) {}

  async logApiCall(data: ApiCallData): Promise<void> {
    try {
      console.log('📊 API Monitoring: Logging API call:', {
        provider: data.provider,
        endpointType: data.endpointType,
        url: data.requestUrl,
        status: data.responseStatus,
      });

      // Always update daily metrics
      await this.updateDailyMetrics(data);

      // Always save to recent calls for dashboard
      await this.saveRecentCall(data);

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

  private async saveRecentCall(data: ApiCallData): Promise<void> {
    console.log('💾 Saving recent call to database...');
    
    // Extract search query from URL if it's a search endpoint
    let searchQuery: string | undefined;
    if (data.requestUrl && data.endpointType === ApiEndpointType.SEARCH) {
      const url = new URL(data.requestUrl);
      searchQuery = url.searchParams.get('term') || url.searchParams.get('q') || undefined;
      console.log('🔍 Extracted search query:', searchQuery);
    }

    const recentCall = this.recentCallRepository.create({
      provider: data.provider,
      endpointType: data.endpointType,
      statusCode: data.responseStatus,
      responseTimeMs: data.responseTime,
      success: data.isSuccess,
      rateLimited: this.isRateLimit(data.responseStatus),
      errorType: data.errorCode || (!data.isSuccess ? 'API_ERROR' : undefined),
      searchQuery,
      requestUrl: data.requestUrl,
      timestamp: new Date(),
    });

    console.log('📝 Created recent call entity:', recentCall);
    
    await this.recentCallRepository.save(recentCall);
    console.log('✅ Saved recent call to database');

    // Keep only the last 20 records to avoid table bloat
    await this.trimRecentCalls();
  }

  private async trimRecentCalls(): Promise<void> {
    try {
      // Keep only the most recent 20 records
      const oldestToKeep = await this.recentCallRepository
        .createQueryBuilder('call')
        .orderBy('call.timestamp', 'DESC')
        .offset(20)
        .limit(1)
        .getOne();

      if (oldestToKeep) {
        await this.recentCallRepository
          .createQueryBuilder()
          .delete()
          .where('timestamp < :timestamp', { timestamp: oldestToKeep.timestamp })
          .execute();
      }
    } catch (error) {
      console.error('Error trimming recent calls:', error);
    }
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

  // New real-time monitoring methods
  async getRealtimeStatus() {
    const now = new Date();
    const currentMinute = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      now.getHours(),
      now.getMinutes(),
    );
    const currentHour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Get iTunes rate limit status
    const rateLimitStatus = await this.rateLimitStatusRepository.findOne({
      where: { provider: 'itunes' },
    });

    // Get current minute metrics
    const currentMinuteMetrics = await this.realtimeMetricRepository
      .createQueryBuilder('metric')
      .where('metric.provider = :provider', { provider: 'itunes' })
      .andWhere('metric.minuteTimestamp = :minute', { minute: currentMinute })
      .getOne();

    // Get current hour metrics
    const hourlyMetrics = await this.realtimeMetricRepository
      .createQueryBuilder('metric')
      .select('SUM(metric.totalRequests)', 'totalRequests')
      .addSelect('SUM(metric.successfulRequests)', 'successfulRequests')
      .addSelect('AVG(metric.totalResponseTimeMs / metric.totalRequests)', 'avgResponseTime')
      .where('metric.provider = :provider', { provider: 'itunes' })
      .andWhere('metric.minuteTimestamp >= :hour', { hour: currentHour })
      .getRawOne();

    // Get today's total metrics
    const dailyMetrics = await this.realtimeMetricRepository
      .createQueryBuilder('metric')
      .select('SUM(metric.totalRequests)', 'totalRequests')
      .addSelect('SUM(metric.successfulRequests)', 'successfulRequests')
      .where('metric.provider = :provider', { provider: 'itunes' })
      .andWhere('metric.minuteTimestamp >= :today', { today })
      .getRawOne();

    const usedThisMinute = currentMinuteMetrics?.totalRequests || 0;
    const requestsThisHour = parseInt(hourlyMetrics?.totalRequests) || 0;
    const requestsToday = parseInt(dailyMetrics?.totalRequests) || 0;
    const successToday = parseInt(dailyMetrics?.successfulRequests) || 0;
    const avgResponseTime = Math.round(parseFloat(hourlyMetrics?.avgResponseTime) || 0);

    return {
      rateLimiting: {
        maxPerMinute: rateLimitStatus?.maxRequestsPerMinute || 300,
        usedThisMinute,
        remaining: Math.max(0, (rateLimitStatus?.maxRequestsPerMinute || 300) - usedThisMinute),
        rateLimitsHitToday: 0, // TODO: Count from issues
      },
      usageStatistics: {
        requestsThisHour,
        requestsToday,
        avgMinLastHour: requestsThisHour > 0 ? Math.round(requestsThisHour / 60) : 0,
        circuitBreaker: rateLimitStatus?.circuitBreakerOpen ? 'open' : 'closed',
      },
      metrics: {
        totalCallsToday: requestsToday,
        successRateToday:
          requestsToday > 0 ? Math.round((successToday / requestsToday) * 100) : 100,
        activeIssues: 0, // TODO: Count active issues
        avgResponseTime,
      },
    };
  }

  async getRecentCalls(limit: number = 20) {
    return this.recentCallRepository.find({
      order: { timestamp: 'DESC' },
      take: limit,
    });
  }

  async getRateLimitStatus() {
    return this.rateLimitStatusRepository.find({
      order: { provider: 'ASC' },
    });
  }

  async getProviderRealtimeMetrics(provider: ApiProvider, hours: number = 24) {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    return this.realtimeMetricRepository.find({
      where: {
        provider,
        minuteTimestamp: since,
      },
      order: { minuteTimestamp: 'ASC' },
    });
  }
}
