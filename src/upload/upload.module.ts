import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';
import { Vendor } from '../vendor/vendor.entity';
import { DJ } from '../dj/dj.entity';
import { Show } from '../show/show.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Vendor, DJ, Show]),
  ],
  controllers: [UploadController],
  providers: [UploadService],
  exports: [UploadService],
})
export class UploadModule {}
