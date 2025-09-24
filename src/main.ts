import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as compression from 'compression';
import * as cookieParser from 'cookie-parser';
import * as express from 'express';
import helmet from 'helmet';
import { join } from 'path';
import { AppModule } from './app.module';
import { UrlService } from './config/url.service';
// import { CancellationService } from './services/cancellation.service';

async function bootstrap() {
  try {
    console.error('BOOTSTRAP START - MAIN.TS EXECUTING');
    console.log('🚀 Starting KaraokeHub application...');
    console.log('📊 Environment:', process.env.NODE_ENV);
    console.log(
      '🗄️  Database Socket Path:',
      process.env.DATABASE_SOCKET_PATH ? 'Using Cloud SQL socket' : 'Using TCP connection',
    );
    console.log('🔍 Database Name:', process.env.DATABASE_NAME);

    console.error('ABOUT TO CREATE NESTJS APP');
    const app = await NestFactory.create<NestExpressApplication>(AppModule, {
      logger:
        process.env.NODE_ENV === 'production'
          ? ['error', 'warn', 'log']
          : ['log', 'error', 'warn', 'debug', 'verbose'],
    });

    console.error('NESTJS APP CREATED - ABOUT TO CHECK MIGRATIONS');
    console.log('✅ NestJS application created successfully');

    // Run database migrations on startup in production
    console.error('CHECKING NODE_ENV:', process.env.NODE_ENV);
    console.error('IS PRODUCTION?', process.env.NODE_ENV === 'production');
    if (process.env.NODE_ENV === 'production') {
      console.error('=== STARTING DATABASE MIGRATIONS ===');
      try {
        const { DataSource } = await import('typeorm');
        const dataSource = app.get(DataSource);
        console.error('DataSource acquired, executing migrations...');
        const migrations = await dataSource.runMigrations();
        console.error(`SUCCESS: Executed ${migrations.length} migrations`);
        if (migrations.length > 0) {
          migrations.forEach((migration) => {
            console.error(`  - EXECUTED: ${migration.name}`);
          });
        } else {
          console.error('No pending migrations found');
        }
        console.error('=== MIGRATIONS COMPLETE ===');
      } catch (migrationError) {
        console.error('MIGRATION ERROR:', migrationError.message);
        console.error('Migration error stack:', migrationError.stack);
        // Don't fail the startup for migration issues, just log them
        console.error('Application will continue despite migration failures');
      }
    }

    const configService = app.get(ConfigService);
    const urlService = app.get(UrlService);
    // const cancellationService = app.get(CancellationService);

    // Configure global prefix BEFORE static assets
    app.setGlobalPrefix('api');
    // Serve static files (this should come AFTER setting global prefix)
    app.useStaticAssets(join(__dirname, '..', 'public'), {
      prefix: '/',
    });

    console.log('✅ Static assets and global prefix configured');

    // Security
    app.use(
      helmet({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            styleSrc: [
              "'self'",
              "'unsafe-inline'",
              'https://fonts.googleapis.com',
              'https://accounts.google.com',
            ],
            fontSrc: ["'self'", 'https://fonts.gstatic.com'],
            imgSrc: ["'self'", 'data:', 'https:'],
            scriptSrc: [
              "'self'",
              "'unsafe-inline'",
              "'unsafe-eval'",
              'https://maps.googleapis.com',
              'https://maps.gstatic.com',
              'https://www.googletagmanager.com',
              'https://accounts.google.com',
              'https://www.google.com',
              'https://google.com',
              'https://pagead2.googlesyndication.com',
              'https://www.highperformanceformat.com',
              'https://highperformanceformat.com',
              'https://wayfarerorthodox.com',
              'https://*.adsterra.com',
              'https://*.adsterraadblocker.com',
              'https://*.adsterranet.com',
              // Native banner ad domains - comprehensive coverage
              'https://*.revenuecpmgate.com',
              'https://pl27650211.revenuecpmgate.com',
              'https://*.cpmstar.com',
              'https://*.adblockers.com',
              'https://*.adblockanalytics.com',
              'https://*.adsterra-serve.com',
              'https://*.adsterra-network.com',
              // Additional ad network domains that might be used
              'https://*.adsystem.com',
              'https://*.doubleclick.net',
              'https://*.googleadservices.com',
              'https://*.googlesyndication.com',
              // Fix for torchfriendlypay.com and other ad script domains
              'https://torchfriendlypay.com',
              'https://*.torchfriendlypay.com',
              'https://static.adsystem.com',
              'https://syndication.dynsrvtbg.com',
              'https://syndication.exdynsrv.com',
              'https://syndication.exosrv.com',
              'https://*.adnxs.com',
              'https://*.amazon-adsystem.com',
              'https://*.rubiconproject.com',
              'https://*.pubmatic.com',
              'https://*.openx.net',
              'https://*.contextweb.com',
              'https://*.casalemedia.com',
              // Adsterra tracking and analytics domains (they use many rotating domains)
              'https://rashcolonizeexpand.com',
              'https://*.rashcolonizeexpand.com',
              // Additional common Adsterra tracking domains
              'https://*.exosrv.com',
              'https://*.exdynsrv.com',
              'https://*.dynsrvtbg.com',
              'https://*.exoclick.com',
              'https://*.propellerads.com',
              'https://*.adnium.com',
            ],
            connectSrc: [
              "'self'",
              'https://maps.googleapis.com',
              'https://maps.gstatic.com',
              'https://www.google-analytics.com',
              'https://analytics.google.com',
              'https://www.google.com',
              'https://google.com',
              'https://www.highperformanceformat.com',
              'https://highperformanceformat.com',
              'https://wayfarerorthodox.com',
              'https://*.adsterra.com',
              'https://*.adsterraadblocker.com',
              'https://*.adsterranet.com',
              // Native banner ad connection domains
              'https://*.revenuecpmgate.com',
              'https://pl27650211.revenuecpmgate.com',
              'https://*.cpmstar.com',
              'https://*.adblockers.com',
              'https://*.adblockanalytics.com',
              'https://*.adsterra-serve.com',
              'https://*.adsterra-network.com',
              // Additional ad network domains that might be used
              'https://*.adsystem.com',
              'https://*.doubleclick.net',
              'https://*.googleadservices.com',
              'https://*.googlesyndication.com',
              // Fix for torchfriendlypay.com and other ad tracking domains
              'https://torchfriendlypay.com',
              'https://*.torchfriendlypay.com',
              'https://static.adsystem.com',
              'https://syndication.dynsrvtbg.com',
              'https://syndication.exdynsrv.com',
              'https://syndication.exosrv.com',
              'https://*.adnxs.com',
              'https://*.adsystem.com',
              'https://*.amazon-adsystem.com',
              'https://*.rubiconproject.com',
              'https://*.pubmatic.com',
              'https://*.openx.net',
              'https://*.contextweb.com',
              'https://*.casalemedia.com',
              // Adsterra tracking and analytics domains (they use many rotating domains)
              'https://rashcolonizeexpand.com',
              'https://*.rashcolonizeexpand.com',
              'https://skinnycrawlinglax.com',
              'https://*.skinnycrawlinglax.com',
              // Additional common Adsterra tracking domains
              'https://*.exosrv.com',
              'https://*.exdynsrv.com',
              'https://*.dynsrvtbg.com',
              'https://*.exoclick.com',
              'https://*.propellerads.com',
              'https://*.adnium.com',
              // More permissive for ad tracking connections (less security risk than scripts)
              'https://*.com',
            ],
            mediaSrc: ["'self'", 'https://audio-ssl.itunes.apple.com'],
            frameSrc: [
              "'self'",
              'https://accounts.google.com',
              'https://www.highperformanceformat.com',
              'https://highperformanceformat.com',
              'https://wayfarerorthodox.com',
              'https://*.adsterra.com',
              'https://*.adsterraadblocker.com',
              'https://*.adsterranet.com',
              // Native banner ad frame domains
              'https://*.revenuecpmgate.com',
              'https://pl27650211.revenuecpmgate.com',
              'https://*.cpmstar.com',
              'https://*.adblockers.com',
              'https://*.adblockanalytics.com',
              'https://*.adsterra-serve.com',
              'https://*.adsterra-network.com',
              // Additional ad network domains that might be used
              'https://*.adsystem.com',
              'https://*.doubleclick.net',
              'https://*.googleadservices.com',
              'https://*.googlesyndication.com',
              // Fix for torchfriendlypay.com and other ad frame domains
              'https://torchfriendlypay.com',
              'https://*.torchfriendlypay.com',
              'https://static.adsystem.com',
              'https://syndication.dynsrvtbg.com',
              'https://syndication.exdynsrv.com',
              'https://syndication.exosrv.com',
              'https://*.adnxs.com',
              'https://*.amazon-adsystem.com',
              'https://*.rubiconproject.com',
              'https://*.pubmatic.com',
              'https://*.openx.net',
              'https://*.contextweb.com',
              'https://*.casalemedia.com',
              // Adsterra tracking and analytics domains (they use many rotating domains)
              'https://rashcolonizeexpand.com',
              'https://*.rashcolonizeexpand.com',
              // Additional common Adsterra tracking domains
              'https://*.exosrv.com',
              'https://*.exdynsrv.com',
              'https://*.dynsrvtbg.com',
              'https://*.exoclick.com',
              'https://*.propellerads.com',
              'https://*.adnium.com',
            ],
            // Report CSP violations for monitoring
            reportUri: ['/api/csp-violation-report'],
          },
          reportOnly: false, // Set to true for monitoring without blocking
        },
        crossOriginEmbedderPolicy: false,
      }),
    );

    // Compression
    app.use(compression());

    // Cookie parser
    app.use(cookieParser());

    // Increase payload size limits for image uploads
    app.use(express.json({ limit: '50mb' }));
    app.use(express.urlencoded({ limit: '50mb', extended: true }));

    // CORS
    const allowedOrigins = urlService.getAllowedOrigins();

    app.enableCors({
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, etc.)
        if (!origin) {
          return callback(null, true);
        }

        // Special handling for production upload endpoint from localhost
        // This allows local development to upload to production
        const isProductionUploadFromLocal =
          origin &&
          origin.includes('localhost') &&
          process.env.ALLOW_LOCAL_PRODUCTION_UPLOAD === 'true';

        if (allowedOrigins.includes(origin) || isProductionUploadFromLocal) {
          callback(null, true);
        } else {
          console.log(`CORS blocked origin: ${origin}`);
          console.log(`Allowed origins: ${JSON.stringify(allowedOrigins)}`);
          console.log(
            `Allow local production upload: ${process.env.ALLOW_LOCAL_PRODUCTION_UPLOAD}`,
          );
          callback(new Error('Not allowed by CORS'), false);
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-upload-token'],
    });

    // Global validation
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );

    // Add graceful shutdown handlers for cancellation service
    process.on('SIGTERM', async () => {
      console.log('🛑 SIGTERM received, shutting down gracefully...');
      // await cancellationService.cancelAll();
      await app.close();
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      console.log('🛑 SIGINT received, shutting down gracefully...');
      // await cancellationService.cancelAll();
      await app.close();
      process.exit(0);
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', async (error) => {
      console.error('💥 Uncaught Exception:', error);
      // await cancellationService.cancelAll();
      process.exit(1);
    });

    process.on('unhandledRejection', async (reason, promise) => {
      console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
      // await cancellationService.cancelAll();
      process.exit(1);
    });

    // Port configuration: 8000 for local dev, 8080 for Cloud Run
    const port = configService.get<number>('PORT') || 8000;
    console.log(`🔌 Attempting to start server on port ${port}...`);

    await app.listen(port, '0.0.0.0');

    console.error('SERVER LISTEN COMPLETED - ABOUT TO LOG FINAL MESSAGES');
    console.log(`🚀 KaraokeHub Server is running on http://localhost:${port}`);
    console.log(`📱 KaraokeHub Frontend: ${urlService.getFrontendUrl()}`);
    console.log(`🌐 WebSocket connection: ws://localhost:${port}`);
    console.log(`🩺 Health check: http://localhost:${port}/health`);
  } catch (error) {
    console.error('❌ Failed to start KaraokeHub application:', error);
    console.error('📊 Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });
    process.exit(1);
  }
}

bootstrap().catch((error) => {
  console.error('❌ Bootstrap function failed:', error);
  process.exit(1);
});
