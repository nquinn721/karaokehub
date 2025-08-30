import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';

async function runMigrations() {
  console.log('🚀 Starting venue migration...');

  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);

  try {
    // Check current migration status
    const executedMigrations = await dataSource.query(
      `SELECT name FROM migrations ORDER BY timestamp DESC LIMIT 5`,
    );
    console.log(
      '📋 Recent migrations:',
      executedMigrations.map((m) => m.name),
    );

    // Run pending migrations
    const pendingMigrations = await dataSource.runMigrations();

    if (pendingMigrations.length > 0) {
      console.log('✅ Executed migrations:');
      pendingMigrations.forEach((migration) => {
        console.log(`  - ${migration.name}`);
      });
    } else {
      console.log('📝 No pending migrations found');
    }

    // Verify venues table exists
    const tablesResult = await dataSource.query(`SHOW TABLES LIKE 'venues'`);
    if (tablesResult.length > 0) {
      const venueCount = await dataSource.query(`SELECT COUNT(*) as count FROM venues`);
      console.log(`🏢 Venues table created with ${venueCount[0].count} venues`);
    }

    // Check show-venue relationships
    const linkedShows = await dataSource.query(`
      SELECT COUNT(*) as count FROM shows WHERE venueId IS NOT NULL
    `);
    console.log(`🔗 Shows linked to venues: ${linkedShows[0]?.count || 0}`);
  } catch (error) {
    console.error('❌ Migration error:', error);
  } finally {
    await app.close();
  }
}

runMigrations().catch(console.error);
