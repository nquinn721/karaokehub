import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { join } from 'path';
import { AdminModule } from './admin/admin.module';
import { ApiLoggingModule } from './api-logging/api-logging.module';
import { ApiMonitoringModule } from './api-monitoring/api-monitoring.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { AvatarModule } from './avatar/avatar.module';
import { ConfigApiModule } from './config/config.module';
import { getDatabaseConfig } from './config/database.config';
import { DJModule } from './dj/dj.module';
import { FavoriteModule } from './favorite/favorite.module';
import { FeedbackModule } from './feedback/feedback.module';
import { FriendsModule } from './friends/friends.module';
import { LocationModule } from './location/location.module';
import { MusicModule } from './music/music.module';
import { ParserModule } from './parser/parser.module';
import { ProductionUploadModule } from './production-upload/production-upload.module';
import { SecurityModule } from './security/security.module';
import { ShowReviewModule } from './show-review/show-review.module';
import { ShowModule } from './show/show.module';
import { StoreGenerationModule } from './store-generation/store-generation.module';
import { StoreModule } from './store/store.module';
import { SubscriptionModule } from './subscription/subscription.module';
import { UploadModule } from './upload/upload.module';
import { UserFeatureOverrideModule } from './user-feature-override/user-feature-override.module';
import { UserModule } from './user/user.module';
import { VendorModule } from './vendor/vendor.module';
import { VenueModule } from './venue/venue.module';
import { WebSocketModule } from './websocket/websocket.module';

// Trigger restart by adding this comment

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Rate limiting
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 20, // 20 requests per minute
      },
    ]),

    // Database
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: getDatabaseConfig,
      inject: [ConfigService],
    }),

    // Serve static files (React app)
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
      exclude: ['/api*', '/socket.io*'],
    }),

    // Feature modules
    AuthModule,
    AvatarModule,
    AdminModule,
    ConfigApiModule,
    WebSocketModule,
    UserModule,
    UserFeatureOverrideModule,
    VendorModule,
    VenueModule,
    DJModule,
    ShowModule,
    ShowReviewModule,
    FavoriteModule,
    FeedbackModule,
    FriendsModule,
    LocationModule,
    ApiLoggingModule,
    ApiMonitoringModule,
    ParserModule,
    MusicModule,
    SubscriptionModule,
    UploadModule,
    ProductionUploadModule,
    SecurityModule,
    StoreModule,
    StoreGenerationModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
