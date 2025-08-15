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

  // Request logging middleware
  app.use((req, res, next) => {
    console.log('🔵 [REQUEST] Incoming request', {
      method: req.method,
      url: req.url,
      origin: req.get('origin'),
      referer: req.get('referer'),
      userAgent: req.get('user-agent'),
      authorization: req.get('authorization') ? 'Present' : 'Missing',
      authPrefix: req.get('authorization')?.substring(0, 20) + '...',
      contentType: req.get('content-type'),
      timestamp: new Date().toISOString(),
    });
    next();
  });

  // CORS
  const allowedOrigins = configService.get<string>('ALLOWED_ORIGINS')?.split(',') || [
    'http://localhost:5173', // Frontend Vite dev server
    'http://localhost:5174', // Alternative Vite port
    'http://localhost:5175', // Alternative Vite port
    'http://localhost:5176', // Alternative Vite port
    'http://localhost:8000', // Backend dev server
    'http://localhost:8080', // Cloud Run port
  ];

  console.log('CORS Configuration:', {
    allowedOrigins,
    environment: configService.get('NODE_ENV'),
    allowedOriginsEnv: configService.get<string>('ALLOWED_ORIGINS'),
  });

  app.enableCors({
    origin: (origin, callback) => {
      console.log('CORS Request from origin:', origin);

      // Allow requests with no origin (like mobile apps, curl, etc.)
      if (!origin) {
        console.log('Allowing request with no origin');
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        console.log('Origin allowed:', origin);
        callback(null, true);
      } else {
        console.log('Origin rejected:', origin, 'Allowed origins:', allowedOrigins);
        callback(new Error('Not allowed by CORS'), false);
      }
    },
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

  // Port configuration: 8000 for local dev, 8080 for Cloud Run
  const port = configService.get<number>('PORT') || 8000;
  await app.listen(port, '0.0.0.0');

  console.log(`🚀 KaraokeHub Server is running on http://localhost:${port}`);
  console.log(`📱 KaraokeHub Frontend should be accessible at http://localhost:5173`);
  console.log(`🌐 WebSocket connection: ws://localhost:${port}`);
}

bootstrap();
