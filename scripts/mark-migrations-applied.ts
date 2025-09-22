import * as readline from 'readline';
import AppDataSource from '../data-source';

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

async function markMigrationsAsApplied() {
  try {
    console.log('📝 Mark Manual Migrations as Applied\n');

    await AppDataSource.initialize();

    // List of migrations that were run manually but not tracked
    const manualMigrations = [
      {
        timestamp: '1737450800000',
        name: 'ConvertAvatarsToUuid1737450800000',
        description: 'Converted avatars table from varchar(50) to UUID',
      },
      {
        timestamp: '1737450850000',
        name: 'ConvertUrlsToParseToUuid1737450850000',
        description: 'Converted urls_to_parse table from integer to UUID',
      },
      {
        timestamp: '1737450950000',
        name: 'CleanupAvatarData1737450950000',
        description: 'Cleaned up avatar data to 8 final avatars',
      },
    ];

    console.log('🔍 Found these manually-run migrations:');
    console.log('─'.repeat(80));
    manualMigrations.forEach((mig) => {
      console.log(`📋 ${mig.timestamp} - ${mig.name}`);
      console.log(`   ${mig.description}`);
    });

    console.log(
      '\n💡 These migrations were run manually via SQL scripts but not tracked in TypeORM.',
    );
    console.log('We need to mark them as "applied" so TypeORM knows they\'ve been run.');

    const answer = await askQuestion(
      '\n❓ Mark these migrations as applied in the database? (y/N): ',
    );

    if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
      console.log('\n📝 Marking migrations as applied...');

      for (const migration of manualMigrations) {
        // Check if already exists
        const existing = await AppDataSource.query(
          'SELECT id FROM migrations WHERE timestamp = ?',
          [migration.timestamp],
        );

        if (existing.length === 0) {
          await AppDataSource.query('INSERT INTO migrations (timestamp, name) VALUES (?, ?)', [
            migration.timestamp,
            migration.name,
          ]);
          console.log(`✅ Marked as applied: ${migration.name}`);
        } else {
          console.log(`⚠️  Already exists: ${migration.name}`);
        }
      }

      console.log('\n🎉 Successfully marked manual migrations as applied!');
      console.log('\n💡 Next steps:');
      console.log('• Run: npm run migration:status to verify status');
      console.log('• Future migrations should be run via: npm run migration:run');
    } else {
      console.log('\n❌ Operation cancelled. No changes made.');
    }
  } catch (error) {
    console.error('❌ Error marking migrations as applied:', error);
  } finally {
    await AppDataSource.destroy();
  }
}

markMigrationsAsApplied();
