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
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger:
      process.env.NODE_ENV === 'production'
        ? ['error', 'warn']
        : ['log', 'error', 'warn', 'debug', 'verbose'],
  });
  const configService = app.get(ConfigService);
  const urlService = app.get(UrlService);
  // const cancellationService = app.get(CancellationService);

  // Configure global prefix BEFORE static assets
  app.setGlobalPrefix('api');
  // Serve static files (this should come AFTER setting global prefix)
  app.useStaticAssets(join(__dirname, '..', 'public'), {
    prefix: '/',
  });

  // Security
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com'],
          imgSrc: ["'self'", 'data:', 'https:'],
          scriptSrc: [
            "'self'",
            "'unsafe-inline'",
            'https://maps.googleapis.com',
            'https://maps.gstatic.com',
            'https://www.googletagmanager.com',
            'https://accounts.google.com',
            'https://pagead2.googlesyndication.com',
            'https://www.highperformanceformat.com',
            'https://highperformanceformat.com',
          ],
          connectSrc: [
            "'self'",
            'https://maps.googleapis.com',
            'https://maps.gstatic.com',
            'https://www.google-analytics.com',
            'https://analytics.google.com',
            'https://www.highperformanceformat.com',
            'https://highperformanceformat.com',
          ],
          mediaSrc: ["'self'", 'https://audio-ssl.itunes.apple.com'],
          frameSrc: [
            "'self'", 
            'https://accounts.google.com',
            'https://www.highperformanceformat.com',
            'https://highperformanceformat.com',
          ],
        },
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
        console.log(`Allow local production upload: ${process.env.ALLOW_LOCAL_PRODUCTION_UPLOAD}`);
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
  await app.listen(port, '0.0.0.0');

  console.log(`🚀 KaraokeHub Server is running on http://localhost:${port}`);
  console.log(`📱 KaraokeHub Frontend: ${urlService.getFrontendUrl()}`);
  console.log(`🌐 WebSocket connection: ws://localhost:${port}`);
}

bootstrap();
