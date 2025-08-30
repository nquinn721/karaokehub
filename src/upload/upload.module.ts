import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DJ } from '../dj/dj.entity';
import { Show } from '../show/show.entity';
import { Vendor } from '../vendor/vendor.entity';
import { Venue } from '../venue/venue.entity';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';

@Module({
  imports: [TypeOrmModule.forFeature([Vendor, DJ, Show, Venue])],
  controllers: [UploadController],
  providers: [UploadService],
  exports: [UploadService],
})
export class UploadModule {}
