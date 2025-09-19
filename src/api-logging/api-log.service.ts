import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, FindOptionsWhere, Repository } from 'typeorm';
import { ApiLog, ApiLogType, ApiProvider, LogLevel } from './api-log.entity';

export interface LogApiCallOptions {
  provider: ApiProvider;
  logType: ApiLogType;
  level?: LogLevel;
  message?: string;
  query?: string;
  requestData?: any;
  responseData?: any;
  errorDetails?: any;
  statusCode?: number;
  responseTime?: number;
  userAgent?: string;
  ipAddress?: string;
  userId?: string;
  rateLimitRemaining?: number;
  rateLimitReset?: Date;
  wasRateLimited?: boolean;
  circuitBreakerTripped?: boolean;
}

export interface ApiLogStats {
  totalRequests: number;
  successfulRequests: number;
  rateLimitedRequests: number;
  errorRequests: number;
  averageResponseTime: number;
  circuitBreakerTrips: number;
  recentRequests: ApiLog[];
  timeRange: {
    start: Date;
    end: Date;
  };
}

@Injectable()
export class ApiLogService {
  constructor(
    @InjectRepository(ApiLog)
    private apiLogRepository: Repository<ApiLog>,
  ) {}

  async logApiCall(options: LogApiCallOptions): Promise<ApiLog> {
    const log = this.apiLogRepository.create({
      ...options,
      level: options.level || LogLevel.INFO,
    });

    return await this.apiLogRepository.save(log);
  }

  async logRateLimit(
    provider: ApiProvider,
    query?: string,
    rateLimitReset?: Date,
    userId?: string,
  ): Promise<ApiLog> {
    return this.logApiCall({
      provider,
      logType: ApiLogType.RATE_LIMITED,
      level: LogLevel.WARN,
      message: `Rate limit exceeded for ${provider}`,
      query,
      wasRateLimited: true,
      rateLimitReset,
      userId,
    });
  }

  async logCircuitBreaker(
    provider: ApiProvider,
    message: string,
    userId?: string,
  ): Promise<ApiLog> {
    return this.logApiCall({
      provider,
      logType: ApiLogType.CIRCUIT_BREAKER,
      level: LogLevel.ERROR,
      message,
      circuitBreakerTripped: true,
      userId,
    });
  }

  async logApiError(
    provider: ApiProvider,
    logType: ApiLogType,
    error: any,
    query?: string,
    userId?: string,
  ): Promise<ApiLog> {
    return this.logApiCall({
      provider,
      logType,
      level: LogLevel.ERROR,
      message: error.message || 'API Error',
      errorDetails: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      query,
      userId,
    });
  }

  async getStats(provider?: ApiProvider, hours: number = 24): Promise<ApiLogStats> {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - hours * 60 * 60 * 1000);

    const whereCondition: FindOptionsWhere<ApiLog> = {
      timestamp: Between(startDate, endDate),
    };

    if (provider) {
      whereCondition.provider = provider;
    }

    const [logs, totalRequests] = await this.apiLogRepository.findAndCount({
      where: whereCondition,
      order: { timestamp: 'DESC' },
      take: 100, // Limit recent requests
    });

    const successfulRequests = logs.filter(
      (log) => log.level === LogLevel.INFO && !log.wasRateLimited && !log.circuitBreakerTripped,
    ).length;

    const rateLimitedRequests = logs.filter((log) => log.wasRateLimited).length;
    const errorRequests = logs.filter((log) => log.level === LogLevel.ERROR).length;
    const circuitBreakerTrips = logs.filter((log) => log.circuitBreakerTripped).length;

    const responseTimes = logs
      .filter((log) => log.responseTime != null)
      .map((log) => log.responseTime);

    const averageResponseTime =
      responseTimes.length > 0
        ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
        : 0;

    return {
      totalRequests,
      successfulRequests,
      rateLimitedRequests,
      errorRequests,
      averageResponseTime: Math.round(averageResponseTime),
      circuitBreakerTrips,
      recentRequests: logs.slice(0, 50), // Most recent 50 requests
      timeRange: {
        start: startDate,
        end: endDate,
      },
    };
  }

  async getRecentLogs(
    limit: number = 100,
    provider?: ApiProvider,
    logType?: ApiLogType,
    level?: LogLevel,
  ): Promise<ApiLog[]> {
    const whereCondition: FindOptionsWhere<ApiLog> = {};

    if (provider) whereCondition.provider = provider;
    if (logType) whereCondition.logType = logType;
    if (level) whereCondition.level = level;

    return this.apiLogRepository.find({
      where: whereCondition,
      order: { timestamp: 'DESC' },
      take: limit,
    });
  }

  async cleanupOldLogs(daysToKeep: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await this.apiLogRepository.delete({
      timestamp: Between(new Date(0), cutoffDate),
    });

    return result.affected || 0;
  }

  async getItunesRateLimitStats(): Promise<{
    maxRequestsPerMinute: number;
    minDelayBetweenRequests: number;
    requestsThisMinute: number;
    requestsThisHour: number;
    requestsToday: number;
    averageRequestsPerMinute: number;
    circuitBreakerStatus: string;
    timeUntilReset: number;
    remainingQuotaThisMinute: number;
    projectedMinutelyUsage: number;
    rateLimitReachedCount: number;
  }> {
    const now = new Date();
    const currentMinute = new Date(Math.floor(now.getTime() / 60000) * 60000);
    const currentHour = new Date(Math.floor(now.getTime() / 3600000) * 3600000);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // iTunes API limits (from ApiRateLimiter)
    const maxRequestsPerMinute = 300;
    const minDelayBetweenRequests = 50; // milliseconds

    // Get requests this minute
    const requestsThisMinute = await this.apiLogRepository.count({
      where: {
        provider: ApiProvider.ITUNES,
        timestamp: Between(currentMinute, now),
      },
    });

    // Get requests this hour
    const requestsThisHour = await this.apiLogRepository.count({
      where: {
        provider: ApiProvider.ITUNES,
        timestamp: Between(currentHour, now),
      },
    });

    // Get requests today
    const requestsToday = await this.apiLogRepository.count({
      where: {
        provider: ApiProvider.ITUNES,
        timestamp: Between(today, now),
      },
    });

    // Calculate average requests per minute over the last hour
    const averageRequestsPerMinute = Math.round(requestsThisHour / 60);

    // Get rate limit hit count today
    const rateLimitReachedCount = await this.apiLogRepository.count({
      where: {
        provider: ApiProvider.ITUNES,
        logType: ApiLogType.RATE_LIMITED,
        timestamp: Between(today, now),
      },
    });

    // Calculate remaining quota this minute
    const remainingQuotaThisMinute = Math.max(0, maxRequestsPerMinute - requestsThisMinute);

    // Calculate time until current minute resets
    const nextMinute = new Date(currentMinute.getTime() + 60000);
    const timeUntilReset = nextMinute.getTime() - now.getTime();

    // Project usage based on current rate
    const secondsPassedThisMinute = (now.getTime() - currentMinute.getTime()) / 1000;
    const projectedMinutelyUsage =
      secondsPassedThisMinute > 0
        ? Math.round((requestsThisMinute / secondsPassedThisMinute) * 60)
        : 0;

    // Check circuit breaker status (simplified - would need access to MusicService instance)
    const recentErrors = await this.apiLogRepository.count({
      where: {
        provider: ApiProvider.ITUNES,
        level: LogLevel.ERROR,
        timestamp: Between(new Date(now.getTime() - 300000), now), // Last 5 minutes
      },
    });

    const circuitBreakerStatus = recentErrors >= 5 ? 'OPEN' : 'CLOSED';

    return {
      maxRequestsPerMinute,
      minDelayBetweenRequests,
      requestsThisMinute,
      requestsThisHour,
      requestsToday,
      averageRequestsPerMinute,
      circuitBreakerStatus,
      timeUntilReset,
      remainingQuotaThisMinute,
      projectedMinutelyUsage,
      rateLimitReachedCount,
    };
  }

  async getItunesUsageTrends(hours: number = 24): Promise<{
    hourlyUsage: Array<{ hour: string; requests: number; errors: number; avgResponseTime: number }>;
    peakUsageTimes: Array<{ time: string; requests: number }>;
    performanceTrends: Array<{ period: string; avgResponseTime: number; successRate: number }>;
  }> {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - hours * 60 * 60 * 1000);

    // Get hourly usage data
    const hourlyUsage = [];
    for (let i = 0; i < hours; i++) {
      const hourStart = new Date(startDate.getTime() + i * 60 * 60 * 1000);
      const hourEnd = new Date(hourStart.getTime() + 60 * 60 * 1000);

      const [requests, errors] = await Promise.all([
        this.apiLogRepository.count({
          where: {
            provider: ApiProvider.ITUNES,
            timestamp: Between(hourStart, hourEnd),
          },
        }),
        this.apiLogRepository.count({
          where: {
            provider: ApiProvider.ITUNES,
            level: LogLevel.ERROR,
            timestamp: Between(hourStart, hourEnd),
          },
        }),
      ]);

      const responseTimes = await this.apiLogRepository.find({
        where: {
          provider: ApiProvider.ITUNES,
          timestamp: Between(hourStart, hourEnd),
        },
        select: ['responseTime'],
      });

      const avgResponseTime =
        responseTimes.length > 0
          ? Math.round(
              responseTimes
                .filter((log) => log.responseTime != null)
                .reduce((sum, log) => sum + log.responseTime, 0) / responseTimes.length,
            )
          : 0;

      hourlyUsage.push({
        hour: hourStart.toISOString().substr(11, 5), // HH:MM format
        requests,
        errors,
        avgResponseTime,
      });
    }

    // Find peak usage times (top 5 hours)
    const peakUsageTimes = hourlyUsage
      .sort((a, b) => b.requests - a.requests)
      .slice(0, 5)
      .map((usage) => ({
        time: usage.hour,
        requests: usage.requests,
      }));

    // Calculate performance trends (4-hour periods)
    const performanceTrends = [];
    const periodsCount = Math.floor(hours / 4);
    for (let i = 0; i < periodsCount; i++) {
      const periodStart = new Date(startDate.getTime() + i * 4 * 60 * 60 * 1000);
      const periodEnd = new Date(periodStart.getTime() + 4 * 60 * 60 * 1000);

      const [totalRequests, errorRequests, responseTimes] = await Promise.all([
        this.apiLogRepository.count({
          where: {
            provider: ApiProvider.ITUNES,
            timestamp: Between(periodStart, periodEnd),
          },
        }),
        this.apiLogRepository.count({
          where: {
            provider: ApiProvider.ITUNES,
            level: LogLevel.ERROR,
            timestamp: Between(periodStart, periodEnd),
          },
        }),
        this.apiLogRepository.find({
          where: {
            provider: ApiProvider.ITUNES,
            timestamp: Between(periodStart, periodEnd),
          },
          select: ['responseTime'],
        }),
      ]);

      const avgResponseTime =
        responseTimes.length > 0
          ? Math.round(
              responseTimes
                .filter((log) => log.responseTime != null)
                .reduce((sum, log) => sum + log.responseTime, 0) / responseTimes.length,
            )
          : 0;

      const successRate =
        totalRequests > 0
          ? Math.round(((totalRequests - errorRequests) / totalRequests) * 100)
          : 100;

      performanceTrends.push({
        period: `${periodStart.toISOString().substr(11, 5)}-${periodEnd.toISOString().substr(11, 5)}`,
        avgResponseTime,
        successRate,
      });
    }

    return {
      hourlyUsage,
      peakUsageTimes,
      performanceTrends,
    };
  }
}
