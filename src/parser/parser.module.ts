import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DJ } from '../dj/dj.entity';
import { GeocodingService } from '../geocoding/geocoding.service';
import { CancellationService } from '../services/cancellation.service';
import { FacebookService } from '../services/facebook.service';
import { Show } from '../show/show.entity';
import { Vendor } from '../vendor/vendor.entity';
import { WebSocketModule } from '../websocket/websocket.module';
import { FacebookParserService } from './facebook-parser.service';
import { KaraokeParserService } from './karaoke-parser.service';
import { ParsedSchedule } from './parsed-schedule.entity';
import { ParserController } from './parser.controller';
import { UrlToParse } from './url-to-parse.entity';
import { UrlToParseService } from './url-to-parse.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Vendor, DJ, Show, ParsedSchedule, UrlToParse]),
    WebSocketModule,
  ],
  controllers: [ParserController],
  providers: [
    KaraokeParserService,
    FacebookParserService,
    UrlToParseService,
    GeocodingService,
    FacebookService,
    CancellationService,
  ],
  exports: [
    KaraokeParserService,
    FacebookParserService,
    UrlToParseService,
    FacebookService,
    CancellationService,
  ],
})
export class ParserModule {}
