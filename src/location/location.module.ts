import { Module } from '@nestjs/common';
import { GeocodingModule } from '../geocoding/geocoding.module';
import { ShowModule } from '../show/show.module';
import { UserModule } from '../user/user.module';
import { LocationController } from './location.controller';

@Module({
  imports: [ShowModule, GeocodingModule, UserModule],
  controllers: [LocationController],
})
export class LocationModule {}
