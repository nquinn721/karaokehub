import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Show } from '../show/show.entity';
import { ShowModule } from '../show/show.module';
import { VenueModule } from '../venue/venue.module';
import { ShowReviewController } from './show-review.controller';
import { ShowReview } from './show-review.entity';
import { ShowReviewService } from './show-review.service';

@Module({
  imports: [TypeOrmModule.forFeature([ShowReview, Show]), ShowModule, VenueModule],
  controllers: [ShowReviewController],
  providers: [ShowReviewService],
  exports: [ShowReviewService],
})
export class ShowReviewModule {}
