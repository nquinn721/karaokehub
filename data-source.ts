import { DataSource } from 'typeorm';
import { DJ } from './src/dj/dj.entity';
import { User } from './src/entities/user.entity';
import { FavoriteShow } from './src/favorite/favorite-show.entity';
import { Feedback } from './src/feedback/feedback.entity';
import { FriendRequest } from './src/friends/friend-request.entity';
import { Friendship } from './src/friends/friendship.entity';
import { SongFavorite } from './src/music/song-favorite.entity';
import { Song } from './src/music/song.entity';
import { ParsedSchedule } from './src/parser/parsed-schedule.entity';
import { UrlToParse } from './src/parser/url-to-parse.entity';
import { Show } from './src/show/show.entity';
import { Vendor } from './src/vendor/vendor.entity';

export default new DataSource({
  type: 'mysql',
  host: 'localhost',
  port: 3306,
  username: 'admin',
  password: 'password',
  database: 'karaoke-hub',
  entities: [
    User,
    Vendor,
    DJ,
    Show,
    FavoriteShow,
    Feedback,
    ParsedSchedule,
    UrlToParse,
    Song,
    SongFavorite,
    FriendRequest,
    Friendship,
  ],
  migrations: ['./src/migrations/*.ts'],
  synchronize: false,
  logging: true,
});
