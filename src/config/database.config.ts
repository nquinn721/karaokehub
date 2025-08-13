import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { Favorite } from '../favorite/favorite.entity';
import { KJ } from '../kj/kj.entity';
import { ParsedSchedule } from '../modules/parser/parsed-schedule.entity';
import { Show } from '../show/show.entity';
import { Vendor } from '../vendor/vendor.entity';

export const getDatabaseConfig = (configService: ConfigService): TypeOrmModuleOptions => {
  const isProduction = configService.get('NODE_ENV') === 'production';
  const host =
    isProduction && process.env.INSTANCE_CONNECTION_NAME
      ? 'localhost' // Use localhost when Cloud SQL Proxy is available
      : configService.get('DATABASE_HOST');

  return {
    type: 'mysql',
    host: host,
    port: configService.get('DATABASE_PORT'),
    username: configService.get('DATABASE_USERNAME'),
    password: configService.get('DATABASE_PASSWORD'),
    database: configService.get('DATABASE_NAME'),
    entities: [User, Vendor, KJ, Show, Favorite, ParsedSchedule],
    synchronize: configService.get('DATABASE_SYNCHRONIZE') === 'true', // Always true as requested
    logging: false, // Disable SQL logging
    timezone: 'Z',
    charset: 'utf8mb4',
    extra: {
      // For Cloud SQL Proxy connection (when Cloud Run connects to Cloud SQL)
      ...(isProduction && process.env.INSTANCE_CONNECTION_NAME && {
        socketPath: `/cloudsql/${process.env.INSTANCE_CONNECTION_NAME}`,
      }),
      // Connection pool settings for MySQL2 (compatible options only)
      connectionLimit: 5, // Reduced for Cloud Run
      connectTimeout: 20000, // 20 seconds for connection
      // Additional MySQL2 settings
      queueLimit: 0,
      reconnect: true,
      dateStrings: false,
      // SSL settings for Cloud SQL (only for direct connections)
      ...(isProduction && !process.env.INSTANCE_CONNECTION_NAME && {
        ssl: {
          rejectUnauthorized: false, // Cloud SQL uses self-signed certificates
        },
      }),
    },
    // Migration settings
    migrations: ['dist/migrations/*.js'],
    migrationsTableName: 'migrations',
    migrationsRun: false, // We'll run migrations manually
  };
};
