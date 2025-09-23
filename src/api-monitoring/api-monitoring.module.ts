import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApiRateLimitStatus } from '../api-logging/entities/api-rate-limit-status.entity';
import { ApiRealtimeMetric } from '../api-logging/entities/api-realtime-metric.entity';
import { ApiRecentCall } from '../api-logging/entities/api-recent-call.entity';
import { ApiMonitoringController } from './api-monitoring.controller';
import { ApiMonitoringService } from './api-monitoring.service';
import { ApiIssue } from './entities/api-issue.entity';
import { ApiMetricsDaily } from './entities/api-metrics-daily.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ApiMetricsDaily,
      ApiIssue,
      ApiRecentCall,
      ApiRealtimeMetric,
      ApiRateLimitStatus,
    ]),
  ],
  controllers: [ApiMonitoringController],
  providers: [ApiMonitoringService],
  exports: [ApiMonitoringService],
})
export class ApiMonitoringModule {}
