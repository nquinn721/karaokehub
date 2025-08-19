import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FacebookController } from '../controllers/facebook.controller';
import { DJ } from '../dj/dj.entity';
import { DJNickname } from '../entities/dj-nickname.entity';
import { GeocodingService } from '../geocoding/geocoding.service';
import { DJNicknameService } from '../services/dj-nickname.service';
import { FacebookService } from '../services/facebook.service';
import { Show } from '../show/show.entity';
import { Vendor } from '../vendor/vendor.entity';
import { WebSocketModule } from '../websocket/websocket.module';
import { KaraokeParserService } from './karaoke-parser.service';
import { ParsedSchedule } from './parsed-schedule.entity';
import { ParserController } from './parser.controller';
import { UrlToParse } from './url-to-parse.entity';
import { UrlToParseService } from './url-to-parse.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Vendor, DJ, Show, ParsedSchedule, UrlToParse, DJNickname]),
    WebSocketModule,
  ],
  controllers: [ParserController, FacebookController],
  providers: [
    KaraokeParserService,
    UrlToParseService,
    DJNicknameService,
    GeocodingService,
    FacebookService,
  ],
  exports: [KaraokeParserService, UrlToParseService, DJNicknameService, FacebookService],
})
export class ParserModule {}
