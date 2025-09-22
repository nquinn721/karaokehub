#!/usr/bin/env node

/**
 * Avatar UUID Data Fix Migration Runner
 * Safely runs the avatar data consistency migration
 */

const { createConnection } = require('typeorm');
require('dotenv').config();

async function runAvatarDataFix() {
  console.log('🔧 Avatar UUID Data Fix Migration Runner');
  console.log('=========================================\n');

  let connection;

  try {
    connection = await createConnection({
      type: 'mysql',
      host: process.env.DATABASE_HOST || 'localhost',
      port: process.env.DATABASE_PORT || 3306,
      username: process.env.DATABASE_USERNAME || 'admin',
      password: process.env.DATABASE_PASSWORD || 'password',
      database: process.env.DATABASE_NAME || 'karaoke-hub',
      synchronize: false,
      logging: false,
      migrations: ['dist/migrations/*.js'],
      migrationsTableName: 'migrations',
    });

    console.log('✅ Database connection established');

    // Run the specific migration
    console.log('🚀 Running Avatar UUID Data Fix Migration...\n');

    // Import and run the migration directly
    const {
      FixAvatarUuidData1737451000000,
    } = require('../dist/migrations/1737451000000-FixAvatarUuidData.js');
    const migration = new FixAvatarUuidData1737451000000();

    await migration.up(connection.createQueryRunner());

    console.log('\n🎉 Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.close();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run the migration
runAvatarDataFix();
