import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApiLog } from './api-log.entity';
import { ApiLogService } from './api-log.service';

@Module({
  imports: [TypeOrmModule.forFeature([ApiLog])],
  providers: [ApiLogService],
  exports: [ApiLogService],
})
export class ApiLoggingModule {}
