import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GeocodingService } from '../geocoding/geocoding.service';
import { VenueModule } from '../venue/venue.module';
import { ShowController } from './show.controller';
import { Show } from './show.entity';
import { ShowService } from './show.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Show]),
    VenueModule, // Import VenueModule for VenueService
  ],
  controllers: [ShowController],
  providers: [ShowService, GeocodingService],
  exports: [ShowService],
})
export class ShowModule {}
