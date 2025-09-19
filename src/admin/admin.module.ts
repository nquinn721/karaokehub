import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DJ } from '../dj/dj.entity';
import { User } from '../entities/user.entity';
import { FavoriteShow } from '../favorite/favorite.entity';
import { Feedback } from '../feedback/feedback.entity';
import { ApiLoggingModule } from '../api-logging/api-logging.module';
import { ParsedSchedule } from '../parser/parsed-schedule.entity';
import { ShowReview } from '../show-review/show-review.entity';
import { Show } from '../show/show.entity';
import { Vendor } from '../vendor/vendor.entity';
import { Venue } from '../venue/venue.entity';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { ApiLogsController } from './api-logs.controller';
import { DeduplicationService } from './deduplication.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Vendor,
      Venue,
      Show,
      DJ,
      ParsedSchedule,
      FavoriteShow,
      Feedback,
      ShowReview,
    ]),
    ApiLoggingModule,
  ],
  controllers: [AdminController, ApiLogsController],
  providers: [AdminService, DeduplicationService],
  exports: [AdminService, DeduplicationService],
})
export class AdminModule {}
