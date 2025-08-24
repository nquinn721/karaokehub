import { Module } from '@nestjs/common';
import { GeocodingModule } from '../geocoding/geocoding.module';
import { ShowModule } from '../show/show.module';
import { LocationController } from './location.controller';

@Module({
  imports: [ShowModule, GeocodingModule],
  controllers: [LocationController],
})
export class LocationModule {}
