import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LiveShowController } from './live-show.controller';
import { LiveShowService } from './live-show.service';
// import { LiveShowGateway } from './live-show.gateway';
import { User } from '../entities/user.entity';
import { GeocodingModule } from '../geocoding/geocoding.module';
import { Show } from '../show/show.entity';
import { Venue } from '../venue/venue.entity';
// TODO: Add these imports when avatar system is available
// import { Avatar } from '../avatar/entities/avatar.entity';
// import { Microphone } from '../avatar/entities/microphone.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Venue, Show]), GeocodingModule],
  providers: [LiveShowService],
  controllers: [LiveShowController],
  exports: [LiveShowService],
})
export class LiveShowModule {}
