import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApiLoggingModule } from '../api-logging/api-logging.module';
import { Avatar } from '../avatar/entities/avatar.entity';
import { Microphone } from '../avatar/entities/microphone.entity';
import { UserAvatar } from '../avatar/entities/user-avatar.entity';
import { UserMicrophone } from '../avatar/entities/user-microphone.entity';
import { DJ } from '../dj/dj.entity';
import { User } from '../entities/user.entity';
import { FavoriteShow } from '../favorite/favorite.entity';
import { Feedback } from '../feedback/feedback.entity';
import { GeocodingModule } from '../geocoding/geocoding.module';
import { ParsedSchedule } from '../parser/parsed-schedule.entity';
import { ProductionMigrationService } from '../services/production-migration.service';
import { ShowReview } from '../show-review/show-review.entity';
import { Show } from '../show/show.entity';
import { CoinPackage } from '../store/entities/coin-package.entity';
import { Transaction } from '../store/entities/transaction.entity';
import { Vendor } from '../vendor/vendor.entity';
import { Venue } from '../venue/venue.entity';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { ApiLogsController } from './api-logs.controller';
import { DeduplicationService } from './deduplication.service';
import { EnhancedVenueValidationService } from './enhanced-venue-validation.service';
import { TimeValidationService } from './time-validation.service';
import { VenueDuplicateDetectionService } from './venue-duplicate-detection.service';
import { VenueGeocodingValidationService } from './venue-geocoding-validation.service';
import { FuzzySearchService } from '../common/services/fuzzy-search.service';
import { FuzzyPaginationService } from '../common/services/fuzzy-pagination.service';

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
      Transaction,
      CoinPackage,
      Avatar,
      Microphone,
      UserAvatar,
      UserMicrophone,
    ]),
    ApiLoggingModule,
    GeocodingModule,
  ],
  controllers: [AdminController, ApiLogsController],
  providers: [
    AdminService,
    DeduplicationService,
    ProductionMigrationService,
    EnhancedVenueValidationService,
    TimeValidationService,
    VenueDuplicateDetectionService,
    VenueGeocodingValidationService,
    FuzzySearchService,
    FuzzyPaginationService,
  ],
  exports: [AdminService, DeduplicationService],
})
export class AdminModule {}
