import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VenueController } from './venue.controller';
import { Venue } from './venue.entity';
import { VenueService } from './venue.service';

@Module({
  imports: [TypeOrmModule.forFeature([Venue])],
  controllers: [VenueController],
  providers: [VenueService],
  exports: [VenueService],
})
export class VenueModule {}
