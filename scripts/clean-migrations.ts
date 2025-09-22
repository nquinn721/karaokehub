import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import AppDataSource from '../data-source';

interface MigrationRecord {
  id: number;
  timestamp: string;
  name: string;
}

async function askQuestion(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function cleanMigrations() {
  try {
    console.log('🧹 Migration Cleanup Tool\n');

    await AppDataSource.initialize();

    // Get migrations from database
    const dbMigrations = (await AppDataSource.query(
      'SELECT id, timestamp, name FROM migrations ORDER BY timestamp',
    )) as MigrationRecord[];

    // Get migration files from filesystem
    const migrationsDir = path.join(__dirname, '..', 'src', 'migrations');
    const migrationFiles = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith('.ts'))
      .map((filename) => {
        const [timestamp] = filename.split('-');
        return { filename, timestamp };
      });

    // Find orphaned database records (no corresponding file)
    const orphanedRecords = dbMigrations.filter(
      (dbMig) => !migrationFiles.some((file) => file.timestamp === dbMig.timestamp),
    );

    if (orphanedRecords.length === 0) {
      console.log('✅ No orphaned migration records found!');
      return;
    }

    console.log('🚨 Found orphaned migration records in database:');
    console.log('─'.repeat(80));
    orphanedRecords.forEach((record) => {
      console.log(`❌ ${record.timestamp} - ${record.name} (ID: ${record.id})`);
    });

    console.log('\n⚠️  These migrations exist in the database but their files are missing.');
    console.log('This usually happens when:');
    console.log('• Migration files were deleted manually');
    console.log('• Database was imported from another environment');
    console.log('• Migrations were run directly via SQL instead of TypeORM');

    const answer = await askQuestion(
      '\n❓ Do you want to remove these orphaned records from the database? (y/N): ',
    );

    if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
      console.log('\n🗑️  Removing orphaned migration records...');

      for (const record of orphanedRecords) {
        await AppDataSource.query('DELETE FROM migrations WHERE id = ?', [record.id]);
        console.log(`✅ Removed: ${record.timestamp} - ${record.name}`);
      }

      console.log(
        `\n🎉 Successfully removed ${orphanedRecords.length} orphaned migration records!`,
      );
      console.log('\n💡 Next steps:');
      console.log('• Run: npm run migration:status to verify cleanup');
      console.log('• Run: npm run migration:run to apply any pending migrations');
    } else {
      console.log('\n❌ Cleanup cancelled. No changes made.');
    }
  } catch (error) {
    console.error('❌ Error during migration cleanup:', error);
  } finally {
    await AppDataSource.destroy();
  }
}

cleanMigrations();
