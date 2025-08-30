import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DJ } from '../dj/dj.entity';
import { User } from '../entities/user.entity';
import { FavoriteShow } from '../favorite/favorite.entity';
import { Feedback } from '../feedback/feedback.entity';
import { ParsedSchedule } from '../parser/parsed-schedule.entity';
import { ShowReview } from '../show-review/show-review.entity';
import { Show } from '../show/show.entity';
import { Vendor } from '../vendor/vendor.entity';
import { Venue } from '../venue/venue.entity';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
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
  ],
  controllers: [AdminController],
  providers: [AdminService, DeduplicationService],
  exports: [AdminService, DeduplicationService],
})
export class AdminModule {}
