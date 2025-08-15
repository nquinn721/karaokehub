import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DJNicknameController } from '../controllers/dj-nickname.controller';
import { DJNickname } from '../entities/dj-nickname.entity';
import { DJNicknameService } from '../services/dj-nickname.service';
import { DJController } from './dj.controller';
import { DJ } from './dj.entity';
import { DJService } from './dj.service';

@Module({
  imports: [TypeOrmModule.forFeature([DJ, DJNickname])],
  controllers: [DJController, DJNicknameController],
  providers: [DJService, DJNicknameService],
  exports: [DJService, DJNicknameService],
})
export class DJModule {}
