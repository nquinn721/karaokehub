import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApiLoggingModule } from '../api-logging/api-logging.module';
import { User } from '../entities/user.entity';
import { MusicController } from './music.controller';
import { MusicService } from './music.service';
import { SongFavoriteController } from './song-favorite.controller';
import { SongFavorite } from './song-favorite.entity';
import { SongFavoriteService } from './song-favorite.service';
import { SongController } from './song.controller';
import { Song } from './song.entity';
import { SongService } from './song.service';

@Module({
  imports: [TypeOrmModule.forFeature([Song, SongFavorite, User]), ApiLoggingModule],
  controllers: [MusicController, SongController, SongFavoriteController],
  providers: [MusicService, SongService, SongFavoriteService],
  exports: [MusicService, SongService, SongFavoriteService],
})
export class MusicModule {}
