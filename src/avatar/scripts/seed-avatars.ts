import { ConfigService } from '@nestjs/config';
import { config } from 'dotenv';
import { DataSource } from 'typeorm';
import { AvatarSeeder } from '../seeders/avatar.seeder';

// Load environment variables
config();

const configService = new ConfigService();

const AppDataSource = new DataSource({
  type: 'postgres',
  host: configService.get('DB_HOST', 'localhost'),
  port: configService.get('DB_PORT', 5432),
  username: configService.get('DB_USERNAME', 'postgres'),
  password: configService.get('DB_PASSWORD', 'password'),
  database: configService.get('DB_NAME', 'karaokehub'),
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/../../migrations/*{.ts,.js}'],
  synchronize: false,
  logging: false,
});

async function runSeeder() {
  try {
    await AppDataSource.initialize();
    console.log('Database connected successfully');

    await AvatarSeeder.run(AppDataSource);

    await AppDataSource.destroy();
    console.log('Database connection closed');
  } catch (error) {
    console.error('Error running seeder:', error);
    process.exit(1);
  }
}

runSeeder();
