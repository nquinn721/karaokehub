import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KJ } from '../../kj/kj.entity';
import { Show } from '../../show/show.entity';
import { Vendor } from '../../vendor/vendor.entity';
import { KaraokeParserService } from './karaoke-parser.service';
import { ParsedSchedule } from './parsed-schedule.entity';
import { ParserController, SimpleTestController } from './parser.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Vendor, KJ, Show, ParsedSchedule])],
  controllers: [ParserController, SimpleTestController],
  providers: [KaraokeParserService],
  exports: [KaraokeParserService],
})
export class ParserModule {}
