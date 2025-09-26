const { DataSource } = require('typeorm');
const path = require('path');

// Database configuration for production
const dataSource = new DataSource({
  type: 'mysql',
  host: process.env.DATABASE_SOCKET_PATH ? undefined : process.env.DATABASE_HOST || 'localhost',
  port: process.env.DATABASE_SOCKET_PATH ? undefined : parseInt(process.env.DATABASE_PORT) || 3306,
  socketPath: process.env.DATABASE_SOCKET_PATH,
  username: process.env.DATABASE_USERNAME || 'root',
  password: process.env.DATABASE_PASSWORD || '',
  database: process.env.DATABASE_NAME || 'karaoke-hub',
  entities: [path.join(__dirname, 'dist', 'src', '**', '*.entity.js')],
  migrations: [path.join(__dirname, 'dist', 'src', 'migrations', '*.js')],
  synchronize: false,
  logging: true,
  ssl: false,
  acquireTimeout: 60000,
  timeout: 60000,
});

async function runMigrations() {
  console.log('🔧 Starting manual migration runner...');
  console.log('Environment:', process.env.NODE_ENV);
  console.log('Database:', process.env.DATABASE_NAME);
  console.log('Socket path:', process.env.DATABASE_SOCKET_PATH || 'TCP connection');

  try {
    console.log('📞 Initializing database connection...');
    await dataSource.initialize();
    console.log('✅ Database connection established');

    console.log('🔍 Checking for pending migrations...');
    const pendingMigrations = await dataSource.showMigrations();
    console.log(`Found ${pendingMigrations.length} pending migrations`);

    if (pendingMigrations.length > 0) {
      console.log('🚀 Running migrations...');
      const executedMigrations = await dataSource.runMigrations();
      console.log(`✅ Successfully executed ${executedMigrations.length} migrations:`);
      executedMigrations.forEach((migration) => {
        console.log(`  ✓ ${migration.name}`);
      });
    } else {
      console.log('📋 No pending migrations found');
    }

    console.log('🏁 Migration process completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run if called directly
if (require.main === module) {
  runMigrations().catch((error) => {
    console.error('💥 Migration runner failed:', error);
    process.exit(1);
  });
}

module.exports = runMigrations;
