import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DJ } from '../dj/dj.entity';
import { GeocodingService } from '../geocoding/geocoding.service';
import { CancellationService } from '../services/cancellation.service';
import { FacebookService } from '../services/facebook.service';
import { Show } from '../show/show.entity';
import { Vendor } from '../vendor/vendor.entity';
import { Venue } from '../venue/venue.entity';
import { VenueModule } from '../venue/venue.module';
import { WebSocketModule } from '../websocket/websocket.module';
import { FacebookCookieValidatorService } from './facebook-cookie-validator.service';
import { FacebookGroupDiscoveryService } from './facebook-group-discovery.service';
import { FacebookParserService } from './facebook-parser.service';
import { KaraokeParserService } from './karaoke-parser.service';
import { ParsedSchedule } from './parsed-schedule.entity';
import { ParserController } from './parser.controller';
import { UrlToParse } from './url-to-parse.entity';
import { UrlToParseService } from './url-to-parse.service';
import { DeepSeekParserService } from './websiteParser/deepseek-parser.service';
import { HtmlParserService } from './websiteParser/html-parser.service';
import { ImageParserService } from './websiteParser/image-parser.service';
import { WebsiteParserService } from './websiteParser/website-parser.service';
import { WorkerBasedWebsiteParserService } from './websiteParser/worker-based-website-parser.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Vendor, DJ, Show, Venue, ParsedSchedule, UrlToParse]),
    VenueModule,
    WebSocketModule,
    ConfigModule,
  ],
  controllers: [ParserController],
  providers: [
    KaraokeParserService,
    FacebookParserService,
    FacebookGroupDiscoveryService,
    FacebookCookieValidatorService,
    UrlToParseService,
    GeocodingService,
    FacebookService,
    CancellationService,
    WebsiteParserService,
    WorkerBasedWebsiteParserService,
    HtmlParserService,
    ImageParserService,
    DeepSeekParserService,
  ],
  exports: [
    KaraokeParserService,
    FacebookParserService,
    FacebookGroupDiscoveryService,
    UrlToParseService,
    FacebookService,
    CancellationService,
    WebsiteParserService,
  ],
})
export class ParserModule {}
