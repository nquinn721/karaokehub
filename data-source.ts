import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';
import { ApiLog } from './src/api-logging/api-log.entity';
import { ApiRateLimitStatus } from './src/api-logging/entities/api-rate-limit-status.entity';
import { ApiRealtimeMetric } from './src/api-logging/entities/api-realtime-metric.entity';
import { ApiRecentCall } from './src/api-logging/entities/api-recent-call.entity';
import { ApiIssue } from './src/api-monitoring/entities/api-issue.entity';
import { ApiMetricsDaily } from './src/api-monitoring/entities/api-metrics-daily.entity';
import { Avatar } from './src/avatar/entities/avatar.entity';
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
import { SongFavorite } from './src/music/song-favorite.entity';
import { Song } from './src/music/song.entity';
import { ParsedSchedule } from './src/parser/parsed-schedule.entity';
import { UrlToParse } from './src/parser/url-to-parse.entity';
import { ShowReview } from './src/show-review/show-review.entity';
import { Show } from './src/show/show.entity';
import { CoinPackage } from './src/store/entities/coin-package.entity';
import { Transaction } from './src/store/entities/transaction.entity';
import { Subscription } from './src/subscription/subscription.entity';
import { UserFeatureOverride } from './src/user-feature-override/user-feature-override.entity';
import { Vendor } from './src/vendor/vendor.entity';
import { Venue } from './src/venue/venue.entity';

dotenv.config();

export default new DataSource({
  type: 'mysql',
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '3306'),
  username: process.env.DATABASE_USERNAME || 'admin',
  password: process.env.DATABASE_PASSWORD || 'password',
  database: process.env.DATABASE_NAME || 'karaoke-hub',
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
    // API Monitoring entities
    ApiMetricsDaily,
    ApiIssue,
    // Real-time API monitoring entities
    ApiRecentCall,
    ApiRealtimeMetric,
    ApiRateLimitStatus,
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
  migrations: [
    'src/migrations/1727906400000-RecordMicrophoneUuidConversion.ts',
    'src/migrations/1727906500000-ConvertMicrophonesToUuid.ts',
    'src/migrations/1727906600000-PopulateAvatarsTable.ts',
    'src/migrations/1736531800000-CreateApiMonitoringTables.ts',
    'src/migrations/1737450000000-DropDjNicknamesTable.ts',
    'src/migrations/1737450050000-CreateAvatarsTable.ts',
    'src/migrations/1737450100000-CreateAvatarSystem.ts',
    'src/migrations/1737450200000-RemoveAvatarFromUsers.ts',
    'src/migrations/1737450310000-PopulateUserAvatars.ts',
    'src/migrations/1737450350000-CreateStoreSystem.ts',
    'src/migrations/1737450400000-SeedBasicMicrophones.ts',
    'src/migrations/1737450450000-SeedAvatarsAndMicrophones.ts',
    'src/migrations/1737450500000-UpdateToNamedAvatars.ts',
    'src/migrations/1737450600000-PopulateUserAvatars.ts',
    'src/migrations/1737450650000-UpdateUserAvatarsTableStructure.ts',
    'src/migrations/1737450700000-AddAvatarIdToTransactions.ts',
    'src/migrations/1737450850000-ConvertUrlsToParseToUuid.ts',
    'src/migrations/1737450900000-AddStatusToTransactionsTable.ts',
    'src/migrations/1737453000000-StandardizeAvatarProperties.ts',
    'src/migrations/1737454000000-CreateRealTimeApiMetrics.ts',
    'src/migrations/1737454100000-AddSearchQueryToApiRecentCalls.ts',
    'src/migrations/1737454200000-AddProfileImageUrlToUser.ts',
    'src/migrations/1737454300000-AddRockThemeAvatars.ts',
    'src/migrations/1737454400000-FixProductionDatabaseIssues.ts',
    'src/migrations/1737454500000-AddLocationToShowReviews.ts',
    'src/migrations/1737462000000-FixUserAvatarsConstraints.ts',
    'src/migrations/1737462100000-FixUserAvatarData.ts',
    'src/migrations/1737462200000-SeedAllNewAvatars.ts',
    'src/migrations/1737462300000-EnsureProductionAvatarSystemReady.ts',
    'src/migrations/1737462400000-AddProfileImageUrlToUsers.ts',
    'src/migrations/1737810000000-FixRockstarAlexNameData.ts',
    'src/migrations/1727814000000-AddIsAIValidatedToVenues.ts',
  ],
  synchronize: false,
  logging: true,
});
