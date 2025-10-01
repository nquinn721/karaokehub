import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ApiLog } from '../api-logging/api-log.entity';
import { ApiRateLimitStatus } from '../api-logging/entities/api-rate-limit-status.entity';
import { ApiRealtimeMetric } from '../api-logging/entities/api-realtime-metric.entity';
import { ApiRecentCall } from '../api-logging/entities/api-recent-call.entity';
import { ApiIssue } from '../api-monitoring/entities/api-issue.entity';
import { ApiMetricsDaily } from '../api-monitoring/entities/api-metrics-daily.entity';
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

  console.log('🗃️  Database Config:', {
    NODE_ENV: configService.get('NODE_ENV'),
    isProduction,
    synchronize: configService.get('DATABASE_SYNCHRONIZE', 'false') === 'true',
    migrationsEnabled: isProduction,
  });

  // Base configuration shared between environments
  const baseConfig: Partial<TypeOrmModuleOptions> = {
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
      // Real-time API monitoring entities
      ApiRecentCall,
      ApiRealtimeMetric,
      ApiRateLimitStatus,
      // API monitoring entities
      ApiMetricsDaily,
      ApiIssue,
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
    synchronize: configService.get('DATABASE_SYNCHRONIZE', 'false') === 'true', // Use environment variable
    logging: false, // SQL logging disabled

    // Handle schema synchronization more gracefully
    dropSchema: false, // Never drop the entire schema

    // Additional safety options to prevent ANY schema changes
    autoLoadEntities: false, // Disable auto-loading to prevent unexpected schema changes
    retryAttempts: 0, // Don't retry failed connections that might trigger schema operations

    // Database connection options
    extra: {
      charset: 'utf8mb4_unicode_ci',
      // Disable foreign key checks during connection to prevent constraint errors
      initSQLCommands: ['SET foreign_key_checks = 0;'],
    },

    // Migration configuration - enabled with all necessary migration files for production
    migrations: isProduction
      ? [
          'dist/migrations/1727814000000-AddIsAIValidatedToVenues.js',
          'dist/migrations/1727906400000-RecordMicrophoneUuidConversion.js',
          'dist/migrations/1727906500000-ConvertMicrophonesToUuid.js',
          'dist/migrations/1727906600000-PopulateAvatarsTable.js',
          'dist/migrations/1736531800000-CreateApiMonitoringTables.js',
          'dist/migrations/1737450000000-DropDjNicknamesTable.js',
          'dist/migrations/1737450050000-CreateAvatarsTable.js',
          'dist/migrations/1737450100000-CreateAvatarSystem.js',
          'dist/migrations/1737450200000-RemoveAvatarFromUsers.js',
          'dist/migrations/1737450310000-PopulateUserAvatars.js',
          'dist/migrations/1737450350000-CreateStoreSystem.js',
          'dist/migrations/1737450400000-SeedBasicMicrophones.js',
          'dist/migrations/1737450450000-SeedAvatarsAndMicrophones.js',
          'dist/migrations/1737450500000-UpdateToNamedAvatars.js',
          'dist/migrations/1737450600000-PopulateUserAvatars.js',
          'dist/migrations/1737450650000-UpdateUserAvatarsTableStructure.js',
          'dist/migrations/1737450700000-AddAvatarIdToTransactions.js',
          'dist/migrations/1737450850000-ConvertUrlsToParseToUuid.js',
          'dist/migrations/1737450900000-AddStatusToTransactionsTable.js',
          'dist/migrations/1737453000000-StandardizeAvatarProperties.js',
          'dist/migrations/1737454000000-CreateRealTimeApiMetrics.js',
          'dist/migrations/1737454100000-AddSearchQueryToApiRecentCalls.js',
          'dist/migrations/1737454300000-AddRockThemeAvatars.js',
          'dist/migrations/1737454400000-FixProductionDatabaseIssues.js',
          'dist/migrations/1737454500000-AddLocationToShowReviews.js',
          'dist/migrations/1737462000000-FixUserAvatarsConstraints.js',
          'dist/migrations/1737462100000-FixUserAvatarData.js',
          'dist/migrations/1737462200000-SeedAllNewAvatars.js',
          'dist/migrations/1737462300000-EnsureProductionAvatarSystemReady.js',
          'dist/migrations/1737810000000-FixRockstarAlexNameData.js',
          'dist/migrations/1737820000000-AddSearchContextToApiRecentCalls.js',
          'dist/migrations/1737825000000-AddDjSubscriptionToUsers.js',
          'dist/migrations/1737830000000-AddDjCancellationTracking.js',
          'dist/migrations/1759250563000-IncreaseAvgResponseTimePrecision.js',
          'dist/migrations/1759300000000-DisableSynchronizationAndFixConstraints.js',
        ]
      : [],
    migrationsTableName: 'migrations',
    migrationsRun: isProduction,

    // Connection pool options for TypeORM
    ...(isProduction && {
      maxQueryExecutionTime: 5000,
      // Additional Cloud Run specific settings
      acquireTimeout: 30000,
      timeout: 30000,
    }),
  };

  const socketPath = configService.get('DATABASE_SOCKET_PATH');
  if (socketPath) {
    console.log('🔌 Using socket path for database connection:', socketPath);
    // For Unix socket connection via Cloud SQL Proxy
    return {
      ...baseConfig,
      host: undefined, // Don't set host when using socket
      port: undefined, // Don't set port when using socket
      extra: {
        connectionLimit: 5,
        connectTimeout: 30000,
        acquireTimeout: 30000,
        timeout: 30000,
        queueLimit: 0,
        socketPath: socketPath,
        // Additional MySQL settings for Cloud SQL
        ...(isProduction && {
          charset: 'utf8mb4',
          timezone: '+00:00',
        }),
      },
    } as TypeOrmModuleOptions;
  }

  // Local development configuration
  return {
    ...baseConfig,
    host: configService.get('DATABASE_HOST', 'localhost'),
    port: parseInt(configService.get('DATABASE_PORT', '3306')),
    extra: {
      connectionLimit: 5,
      connectTimeout: 30000,
      acquireTimeout: 30000,
      timeout: 30000,
      queueLimit: 0,
      charset: 'utf8mb4_unicode_ci',
    },
  } as TypeOrmModuleOptions;
};
