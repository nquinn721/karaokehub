import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { Favorite } from '../favorite/favorite.entity';
import { KJ } from '../kj/kj.entity';
import { ParsedSchedule } from '../parser/parsed-schedule.entity';
import { Show } from '../show/show.entity';
import { Vendor } from '../vendor/vendor.entity';

export const getDatabaseConfig = (configService: ConfigService): TypeOrmModuleOptions => {
  const isProduction = configService.get('NODE_ENV') === 'production';

  return {
    type: 'mysql',
    host: configService.get('DATABASE_HOST'),
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
      // Connection pool settings for MySQL2 (compatible options only)
      connectionLimit: 5, // Reduced for Cloud Run
      acquireTimeout: 30000, // 30 seconds
      connectTimeout: 20000, // 20 seconds
      // Additional MySQL2 settings
      queueLimit: 0,
      reconnect: true,
      dateStrings: false,
      // SSL settings for Cloud SQL
      ...(isProduction && {
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
