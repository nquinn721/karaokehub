import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DJ } from '../dj/dj.entity';
import { DJNickname } from '../entities/dj-nickname.entity';
import { User } from '../entities/user.entity';
import { Favorite } from '../favorite/favorite.entity';
import { Feedback } from '../feedback/feedback.entity';
import { ParsedSchedule } from '../parser/parsed-schedule.entity';
import { Show } from '../show/show.entity';
import { Vendor } from '../vendor/vendor.entity';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Vendor,
      Show,
      DJ,
      DJNickname,
      ParsedSchedule,
      Favorite,
      Feedback,
    ]),
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
