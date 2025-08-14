import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as compression from 'compression';
import * as cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);

  // Serve static files
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
            'https://maps.googleapis.com',
            'https://maps.gstatic.com'
          ],
          connectSrc: [
            "'self'",
            'https://maps.googleapis.com',
            'https://maps.gstatic.com'
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

  // CORS
  const allowedOrigins = configService.get<string>('ALLOWED_ORIGINS')?.split(',') || [
    'http://localhost:5173', // Frontend Vite dev server
    'http://localhost:5174', // Alternative Vite port
    'http://localhost:5175', // Alternative Vite port
    'http://localhost:5176', // Alternative Vite port
    'http://localhost:8000', // Backend dev server
    'http://localhost:8080', // Cloud Run port
  ];

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Global validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Global prefix
  app.setGlobalPrefix('api');

  // Port configuration: 8000 for local dev, 8080 for Cloud Run
  const port = configService.get<number>('PORT') || 8000;
  await app.listen(port, '0.0.0.0');

  console.log(`🚀 KaraokeHub Server is running on http://localhost:${port}`);
  console.log(`📱 KaraokeHub Frontend should be accessible at http://localhost:5173`);
  console.log(`🌐 WebSocket connection: ws://localhost:${port}`);
}

bootstrap();
