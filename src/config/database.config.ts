import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ApiLog } from '../api-logging/api-log.entity';
import { Avatar } from '../avatar/entities/avatar.entity';
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
import { SongFavorite } from '../music/song-favorite.entity';
import { Song } from '../music/song.entity';
import { ParsedSchedule } from '../parser/parsed-schedule.entity';
import { UrlToParse } from '../parser/url-to-parse.entity';
import { ShowReview } from '../show-review/show-review.entity';
import { Show } from '../show/show.entity';
import { CoinPackage } from '../store/entities/coin-package.entity';
import { Transaction } from '../store/entities/transaction.entity';
import { Subscription } from '../subscription/subscription.entity';
import { UserFeatureOverride } from '../user-feature-override/user-feature-override.entity';
import { Vendor } from '../vendor/vendor.entity';
import { Venue } from '../venue/venue.entity';

export const getDatabaseConfig = (configService: ConfigService): TypeOrmModuleOptions => {
  const isProduction = configService.get('NODE_ENV') === 'production';
  const socketPath = configService.get('DATABASE_SOCKET_PATH');

  console.log('🗃️  Database Config:', {
    NODE_ENV: configService.get('NODE_ENV'),
    isProduction,
    synchronize: false, // Always false for safety
    migrationsEnabled: true, // Migrations enabled for database updates
  });

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
      Avatar,
      UserAvatar,
      Microphone,
      Outfit,
      Shoes,
      UserMicrophone,
      UserOutfit,
      UserShoes,
      // Store system entities
      CoinPackage,
      Transaction,
    ],
    synchronize: false, // Disabled to prevent foreign key constraint issues
    logging: false, // SQL logging disabled

    // Handle schema synchronization more gracefully
    dropSchema: false, // Never drop the entire schema

    // Additional safety options to prevent ANY schema changes
    autoLoadEntities: false, // Disable auto-loading to prevent unexpected schema changes
    retryAttempts: 0, // Don't retry failed connections that might trigger schema operations

    // Completely disable schema validation
    extra: {
      charset: 'utf8mb4_unicode_ci',
      // Disable foreign key checks during connection to prevent constraint errors
      initSQLCommands: ['SET foreign_key_checks = 0;'],
    },

    // Migration configuration - environment specific
    migrations: isProduction ? ['dist/migrations/*.js'] : ['src/migrations/*.ts'],
    migrationsTableName: 'migrations',
    migrationsRun: true, // Enable automatic migration execution on startup

    // Connection pool options for TypeORM
    ...(isProduction && {
      maxQueryExecutionTime: 5000,
      // Additional Cloud Run specific settings
      acquireTimeout: 30000,
      timeout: 30000,
    }),
  };

  if (socketPath) {
    // For Unix socket connection via Cloud SQL Proxy
    return {
      ...baseConfig,
      extra: {
        connectionLimit: 5,
        connectTimeout: 30000, // Reduced from 60000
        acquireTimeout: 30000,
        timeout: 30000,
        queueLimit: 0,
        socketPath,
        // Additional MySQL settings for Cloud SQL
        ...(isProduction && {
          charset: 'utf8mb4',
          timezone: '+00:00',
        }),
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
        connectTimeout: 30000, // Reduced from 60000
        acquireTimeout: 30000,
        timeout: 30000,
        queueLimit: 0,
        // Only add SSL in production
        ...(isProduction && {
          ssl: {
            rejectUnauthorized: true,
            ca: configService.get('DATABASE_SSL_CA'),
          },
          charset: 'utf8mb4',
          timezone: '+00:00',
        }),
      },
    } as TypeOrmModuleOptions;
  }
};
