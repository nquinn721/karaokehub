import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { getDatabaseConfig } from './config/database.config';
import { FavoriteModule } from './favorite/favorite.module';
import { KJModule } from './kj/kj.module';
import { ParserModule } from './modules/parser/parser.module';
import { KaraokeParserService } from './modules/parser/karaoke-parser.service';
import { ShowModule } from './show/show.module';
import { UserModule } from './user/user.module';
import { VendorModule } from './vendor/vendor.module';
import { WebSocketModule } from './websocket/websocket.module';

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
      rootPath: join(__dirname, '..', 'dist', 'client'),
      exclude: ['/api*', '/socket.io*'],
    }),

    // Feature modules
    AuthModule,
    WebSocketModule,
    UserModule,
    VendorModule,
    KJModule,
    ShowModule,
    FavoriteModule,
    ParserModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
