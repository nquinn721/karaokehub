import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Microphone } from '../avatar/entities/microphone.entity';
import { Outfit } from '../avatar/entities/outfit.entity';
import { Shoes } from '../avatar/entities/shoes.entity';
import { StoreGenerationController } from './store-generation.controller';
import { StoreGenerationService } from './store-generation.service';

@Module({
  imports: [TypeOrmModule.forFeature([Microphone, Outfit, Shoes])],
  controllers: [StoreGenerationController],
  providers: [StoreGenerationService],
  exports: [StoreGenerationService],
})
export class StoreGenerationModule {}
