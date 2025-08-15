import { DataSource } from 'typeorm';
import { DJ } from './src/dj/dj.entity';
import { User } from './src/entities/user.entity';
import { Favorite } from './src/favorite/favorite.entity';
import { SongFavorite } from './src/music/song-favorite.entity';
import { Song } from './src/music/song.entity';
import { ParsedSchedule } from './src/parser/parsed-schedule.entity';
import { Show } from './src/show/show.entity';
import { Vendor } from './src/vendor/vendor.entity';

export default new DataSource({
  type: 'mysql',
  host: 'localhost',
  port: 3306,
  username: 'karaoke_user',
  password: 'karaoke_password',
  database: 'karaoke_pal',
  entities: [User, Vendor, DJ, Show, Favorite, ParsedSchedule, Song, SongFavorite],
  migrations: ['./src/migrations/*.ts'],
  synchronize: false,
  logging: true,
});
