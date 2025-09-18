import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { Microphone } from '../avatar/entities/microphone.entity';
import { Outfit } from '../avatar/entities/outfit.entity';
import { Shoes } from '../avatar/entities/shoes.entity';
import { UserAvatar } from '../avatar/entities/user-avatar.entity';
import { UserMicrophone } from '../avatar/entities/user-microphone.entity';
import { UserOutfit } from '../avatar/entities/user-outfit.entity';
import { UserShoes } from '../avatar/entities/user-shoes.entity';
import { DJ } from '../dj/dj.entity';
import { User } from '../entities/user.entity';
import { FavoriteShow } from '../favorite/favorite.entity';
import { Feedback } from '../feedback/feedback.entity';
import { FriendRequest } from '../friends/friend-request.entity';
import { Friendship } from '../friends/friendship.entity';
import { ApiLog } from '../logs/api-log.entity';
import { SongFavorite } from '../music/song-favorite.entity';
import { Song } from '../music/song.entity';
import { ParsedSchedule } from '../parser/parsed-schedule.entity';
import { UrlToParse } from '../parser/url-to-parse.entity';
import { ShowReview } from '../show-review/show-review.entity';
import { Show } from '../show/show.entity';
import { Subscription } from '../subscription/subscription.entity';
import { UserFeatureOverride } from '../user-feature-override/user-feature-override.entity';
import { Vendor } from '../vendor/vendor.entity';
import { Venue } from '../venue/venue.entity';

export const getDatabaseConfig = (configService: ConfigService): TypeOrmModuleOptions => {
  const isProduction = configService.get('NODE_ENV') === 'production';
  const socketPath = configService.get('DATABASE_SOCKET_PATH');

  const baseConfig = {
    type: 'mysql',
    username: configService.get('DATABASE_USERNAME', 'admin'),
    password: configService.get('DATABASE_PASSWORD', 'password'),
    database: configService.get('DATABASE_NAME', 'karaoke-hub'),

    entities: [
      User,
      Vendor,
      Venue,
      DJ,
      Show,
      ShowReview,
      FavoriteShow,
      Feedback,
      ParsedSchedule,
      Subscription,
      UrlToParse,
      Song,
      SongFavorite,
      FriendRequest,
      Friendship,
      UserFeatureOverride,
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
    synchronize: true, // Enable sync if explicitly set or in development
    logging: false, // Turn off SQL logging completely

    // Connection pool options for TypeORM
    ...(isProduction && {
      maxQueryExecutionTime: 5000,
    }),

    // Migration configuration - disabled in development since we use synchronize
    migrations: isProduction ? ['dist/migrations/*.js'] : [],
    migrationsTableName: 'migrations',
    migrationsRun: false, // We'll run migrations manually
  };

  if (socketPath) {
    // For Unix socket connection via Cloud SQL Proxy
    return {
      ...baseConfig,
      extra: {
        connectionLimit: 5,
        connectTimeout: 60000, // Increased timeout
        acquireTimeout: 60000,
        timeout: 60000,
        queueLimit: 0,
        socketPath,
        retry: {
          max: 3,
          delay: 2000,
        },
      },
    } as TypeOrmModuleOptions;
  } else {
    // For regular TCP connection
    return {
      ...baseConfig,
      host: configService.get('DATABASE_HOST', 'localhost'),
      port: parseInt(configService.get('DATABASE_PORT', '3306')),
      extra: {
        connectionLimit: 5,
        connectTimeout: 60000, // Increased timeout
        acquireTimeout: 60000,
        timeout: 60000,
        queueLimit: 0,
        retry: {
          max: 3,
          delay: 2000,
        },
        // Only add SSL in production
        ...(isProduction && {
          ssl: {
            rejectUnauthorized: true,
            ca: configService.get('DATABASE_SSL_CA'),
          },
        }),
      },
    } as TypeOrmModuleOptions;
  }
};
