import { DataSource } from 'typeorm';
import { Microphone } from './src/avatar/entities/microphone.entity';
import { Outfit } from './src/avatar/entities/outfit.entity';
import { Shoes } from './src/avatar/entities/shoes.entity';
import { UserAvatar } from './src/avatar/entities/user-avatar.entity';
import { UserMicrophone } from './src/avatar/entities/user-microphone.entity';
import { UserOutfit } from './src/avatar/entities/user-outfit.entity';
import { UserShoes } from './src/avatar/entities/user-shoes.entity';
import { DJ } from './src/dj/dj.entity';
import { User } from './src/entities/user.entity';
import { FavoriteShow } from './src/favorite/favorite.entity';
import { Feedback } from './src/feedback/feedback.entity';
import { FriendRequest } from './src/friends/friend-request.entity';
import { Friendship } from './src/friends/friendship.entity';
import { ApiLog } from './src/api-logging/api-log.entity';
import { SongFavorite } from './src/music/song-favorite.entity';
import { Song } from './src/music/song.entity';
import { ParsedSchedule } from './src/parser/parsed-schedule.entity';
import { UrlToParse } from './src/parser/url-to-parse.entity';
import { ShowReview } from './src/show-review/show-review.entity';
import { Show } from './src/show/show.entity';
import { Subscription } from './src/subscription/subscription.entity';
import { UserFeatureOverride } from './src/user-feature-override/user-feature-override.entity';
import { Vendor } from './src/vendor/vendor.entity';
import { Venue } from './src/venue/venue.entity';

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
    Venue,
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
    Subscription,
    UserFeatureOverride,
    ShowReview,
    ApiLog,
    // Avatar system entities
    UserAvatar,
    Microphone,
    Outfit,
    Shoes,
    UserMicrophone,
    UserOutfit,
    UserShoes,
  ],
  migrations: ['./src/migrations/*.ts'],
  synchronize: false,
  logging: true,
});
