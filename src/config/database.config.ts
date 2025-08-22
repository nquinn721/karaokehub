import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { DJ } from '../dj/dj.entity';
import { DJNickname } from '../entities/dj-nickname.entity';
import { User } from '../entities/user.entity';
import { FavoriteShow } from '../favorite/favorite.entity';
import { Feedback } from '../feedback/feedback.entity';
import { FriendRequest } from '../friends/friend-request.entity';
import { Friendship } from '../friends/friendship.entity';
import { SongFavorite } from '../music/song-favorite.entity';
import { Song } from '../music/song.entity';
import { ParsedSchedule } from '../parser/parsed-schedule.entity';
import { UrlToParse } from '../parser/url-to-parse.entity';
import { Show } from '../show/show.entity';
import { Subscription } from '../subscription/subscription.entity';
import { Vendor } from '../vendor/vendor.entity';

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
      DJ,
      DJNickname,
      Show,
      FavoriteShow,
      Feedback,
      ParsedSchedule,
      Subscription,
      UrlToParse,
      Song,
      SongFavorite,
      FriendRequest,
      Friendship,
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
        connectTimeout: 20000,
        queueLimit: 0,
        socketPath,
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
        connectTimeout: 20000,
        queueLimit: 0,
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
