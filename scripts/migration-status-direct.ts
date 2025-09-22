import * as fs from 'fs';
import * as mysql from 'mysql2/promise';
import * as path from 'path';

interface MigrationRecord {
  id: number;
  timestamp: string;
  name: string;
}

async function getMigrationStatus() {
  let connection: mysql.Connection | undefined;

  try {
    console.log('🔍 Analyzing migration status...\n');

    // Connect to database directly
    connection = await mysql.createConnection({
      host: 'localhost',
      port: 3306,
      user: 'admin',
      password: 'password',
      database: 'karaoke-hub',
    });

    // Get migrations from database
    const [dbRows] = await connection.execute(
      'SELECT id, timestamp, name FROM migrations ORDER BY timestamp',
    );
    const dbMigrations = dbRows as MigrationRecord[];

    // Get migration files from filesystem
    const migrationsDir = path.join(__dirname, '..', 'src', 'migrations');
    const migrationFiles = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith('.ts'))
      .map((filename) => {
        const [timestamp, ...nameParts] = filename.replace('.ts', '').split('-');
        return {
          filename,
          timestamp,
          name: nameParts.join('-'),
          exists: true,
        };
      })
      .sort((a, b) => parseInt(a.timestamp) - parseInt(b.timestamp));

    console.log('📊 MIGRATION STATUS REPORT');
    console.log('═'.repeat(80));

    console.log('\n📁 MIGRATIONS IN DATABASE:');
    console.log('─'.repeat(80));
    dbMigrations.forEach((migration) => {
      const hasFile = migrationFiles.some((file) => file.timestamp === migration.timestamp);
      const status = hasFile ? '✅' : '❌ MISSING FILE';
      console.log(`${status} ${migration.timestamp} - ${migration.name}`);
    });

    console.log('\n📄 MIGRATION FILES ON DISK:');
    console.log('─'.repeat(80));
    migrationFiles.forEach((file) => {
      const inDb = dbMigrations.some((db) => db.timestamp === file.timestamp);
      const status = inDb ? '✅' : '⚠️  NOT RUN';
      console.log(`${status} ${file.timestamp} - ${file.name}`);
    });

    // Analysis
    const missingFiles = dbMigrations.filter(
      (db) => !migrationFiles.some((file) => file.timestamp === db.timestamp),
    );

    const unrunMigrations = migrationFiles.filter(
      (file) => !dbMigrations.some((db) => db.timestamp === file.timestamp),
    );

    console.log('\n🚨 ISSUES FOUND:');
    console.log('─'.repeat(80));

    if (missingFiles.length > 0) {
      console.log(`❌ ${missingFiles.length} migrations in DB but missing files:`);
      missingFiles.forEach((migration) => {
        console.log(`   - ${migration.timestamp}: ${migration.name}`);
      });
    }

    if (unrunMigrations.length > 0) {
      console.log(`⚠️  ${unrunMigrations.length} migration files not yet run:`);
      unrunMigrations.forEach((file) => {
        console.log(`   - ${file.timestamp}: ${file.name}`);
      });
    }

    if (missingFiles.length === 0 && unrunMigrations.length === 0) {
      console.log('✅ All migrations are in sync!');
    }

    console.log('\n💡 RECOMMENDATIONS:');
    console.log('─'.repeat(80));

    if (unrunMigrations.length > 0) {
      console.log('• Mark manual migrations as applied: npm run migration:mark-applied');
      console.log('• Run pending TypeORM migrations: npm run migration:run');
    }

    if (missingFiles.length > 0) {
      console.log('• Consider cleaning up orphaned migration records');
      console.log('• Use: npm run migration:clean');
    }

    console.log('• For new migrations: npm run migration:generate src/migrations/DescriptiveName');
    console.log('• Check status anytime: npm run migration:status');
  } catch (error) {
    console.error('❌ Error checking migration status:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

getMigrationStatus();
