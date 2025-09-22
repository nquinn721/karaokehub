import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApiMonitoringController } from './api-monitoring.controller';
import { ApiMonitoringService } from './api-monitoring.service';
import { ApiIssue } from './entities/api-issue.entity';
import { ApiMetricsDaily } from './entities/api-metrics-daily.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ApiMetricsDaily, ApiIssue])],
  controllers: [ApiMonitoringController],
  providers: [ApiMonitoringService],
  exports: [ApiMonitoringService],
})
export class ApiMonitoringModule {}
