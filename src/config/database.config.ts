import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { Favorite } from '../favorite/favorite.entity';
import { KJ } from '../kj/kj.entity';
import { DJ } from '../dj/dj.entity';
import { ParsedSchedule } from '../parser/parsed-schedule.entity';
import { Show } from '../show/show.entity';
import { Vendor } from '../vendor/vendor.entity';

export const getDatabaseConfig = (configService: ConfigService): TypeOrmModuleOptions => {
  const isProduction = configService.get('NODE_ENV') === 'production';

  // MySQL2-specific driver options (go in 'extra')
  const mysql2Options = {
    connectionLimit: 5, // Maximum connections in pool
    connectTimeout: 20000, // Time to wait for initial connection (20 seconds)
    queueLimit: 0, // No limit on queued connections
    // Only add SSL in production
    ...(isProduction && {
      ssl: {
        rejectUnauthorized: true,
        ca: configService.get('DATABASE_SSL_CA'),
      },
    }),
  };

  return {
    type: 'mysql',
    host: configService.get('DATABASE_HOST', 'localhost'),
    port: parseInt(configService.get('DATABASE_PORT', '3306')),
    username: configService.get('DATABASE_USERNAME', 'admin'),
    password: configService.get('DATABASE_PASSWORD', 'password'),
    database: configService.get('DATABASE_NAME', 'karaoke-hub'),

    // MySQL2 driver-specific options
    extra: mysql2Options,

    entities: [User, Vendor, KJ, DJ, Show, Favorite, ParsedSchedule],
    synchronize: !isProduction, // Only sync schema in development
    logging: !isProduction
      ? ['query', 'error', 'warn']
      : configService.get('DATABASE_LOGGING') === 'true'
        ? ['error', 'warn']
        : false,

    // Connection pool options for TypeORM
    ...(isProduction && {
      maxQueryExecutionTime: 5000,
      cache: {
        type: 'database',
        options: {
          type: 'mysql',
          database: configService.get('DATABASE_NAME', 'karaoke-hub'),
          host: configService.get('DATABASE_HOST', 'localhost'),
          port: parseInt(configService.get('DATABASE_PORT', '3306')),
          username: configService.get('DATABASE_USERNAME', 'admin'),
          password: configService.get('DATABASE_PASSWORD', 'password'),
        },
      },
    }),

    // Migration configuration
    migrations: ['dist/migrations/*.js'],
    migrationsTableName: 'migrations',
    migrationsRun: false, // We'll run migrations manually
  };
};
