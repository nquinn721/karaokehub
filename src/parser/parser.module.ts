import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DJ } from '../dj/dj.entity';
import { Show } from '../show/show.entity';
import { Vendor } from '../vendor/vendor.entity';
import { KaraokeParserService } from './karaoke-parser.service';
import { ParsedSchedule } from './parsed-schedule.entity';
import { ParserController } from './parser.controller';
import { UrlToParse } from './url-to-parse.entity';
import { UrlToParseService } from './url-to-parse.service';

@Module({
  imports: [TypeOrmModule.forFeature([Vendor, DJ, Show, ParsedSchedule, UrlToParse])],
  controllers: [ParserController],
  providers: [KaraokeParserService, UrlToParseService],
  exports: [KaraokeParserService, UrlToParseService],
})
export class ParserModule {}
