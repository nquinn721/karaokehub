import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as compression from 'compression';
import * as cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { join } from 'path';
import { AppModule } from './app.module';
import { UrlService } from './config/url.service';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger:
      process.env.NODE_ENV === 'production'
        ? ['error', 'warn']
        : ['log', 'error', 'warn', 'debug', 'verbose'],
  });
  const configService = app.get(ConfigService);
  const urlService = app.get(UrlService);

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
          scriptSrc: ["'self'", 'https://maps.googleapis.com', 'https://maps.gstatic.com'],
          connectSrc: ["'self'", 'https://maps.googleapis.com', 'https://maps.gstatic.com'],
        },
      },
      crossOriginEmbedderPolicy: false,
    }),
  );

  // Compression
  app.use(compression());

  // Cookie parser
  app.use(cookieParser());

  // CORS
  const allowedOrigins = urlService.getAllowedOrigins();

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, etc.)
      if (!origin) {
        return callback(null, true);
      }

      // Special handling for production upload endpoint
      const isProductionUpload =
        origin &&
        origin.includes('localhost') &&
        process.env.ALLOW_LOCAL_PRODUCTION_UPLOAD === 'true';

      if (allowedOrigins.includes(origin) || isProductionUpload) {
        callback(null, true);
      } else {
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

  // Port configuration: 8000 for local dev, 8080 for Cloud Run
  const port = configService.get<number>('PORT') || 8000;
  await app.listen(port, '0.0.0.0');

  console.log(`🚀 KaraokeHub Server is running on http://localhost:${port}`);
  console.log(`📱 KaraokeHub Frontend: ${urlService.getFrontendUrl()}`);
  console.log(`🌐 WebSocket connection: ws://localhost:${port}`);
}

bootstrap();
