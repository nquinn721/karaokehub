import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KJController } from './kj.controller';
import { KJ } from './kj.entity';
import { KJService } from './kj.service';

@Module({
  imports: [TypeOrmModule.forFeature([KJ])],
  controllers: [KJController],
  providers: [KJService],
  exports: [KJService],
})
export class KJModule {}
