import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DJModule } from '../dj/dj.module';
import { Show } from '../show/show.entity';
import { ShowModule } from '../show/show.module';
import { VendorModule } from '../vendor/vendor.module';
import { VenueModule } from '../venue/venue.module';
import { ProductionUploadController } from './production-upload.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Show]), ShowModule, VendorModule, DJModule, VenueModule],
  controllers: [ProductionUploadController],
})
export class ProductionUploadModule {}
