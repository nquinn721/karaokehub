import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DJController } from './dj.controller';
import { DJ } from './dj.entity';
import { DJService } from './dj.service';

@Module({
  imports: [TypeOrmModule.forFeature([DJ])],
  controllers: [DJController],
  providers: [DJService],
  exports: [DJService],
})
export class DJModule {}
