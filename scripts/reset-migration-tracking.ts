import * as mysql from 'mysql2/promise';
import * as readline from 'readline';

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

async function resetMigrationTable() {
  let connection: mysql.Connection | undefined;

  try {
    console.log('🧹 Migration Table Reset Tool\n');

    console.log('⚠️  WARNING: This will completely reset your migration tracking!');
    console.log('This is recommended when:');
    console.log('• Your database schema is already in the correct state');
    console.log('• Migration tracking has become inconsistent');
    console.log('• You want to start fresh with proper migration management');
    console.log();
    console.log('🎯 What this will do:');
    console.log('• Clear all records from the migrations table');
    console.log('• Your database schema will remain unchanged');
    console.log('• Future migrations will be tracked properly');
    console.log();

    const confirm1 = await askQuestion(
      '❓ Are you sure you want to reset migration tracking? (y/N): ',
    );

    if (confirm1.toLowerCase() !== 'y' && confirm1.toLowerCase() !== 'yes') {
      console.log('❌ Operation cancelled.');
      return;
    }

    const confirm2 = await askQuestion('❓ Type "RESET" to confirm this action: ');

    if (confirm2 !== 'RESET') {
      console.log('❌ Confirmation failed. Operation cancelled.');
      return;
    }

    // Connect to database
    connection = await mysql.createConnection({
      host: 'localhost',
      port: 3306,
      user: 'admin',
      password: 'password',
      database: 'karaoke-hub',
    });

    console.log('\n🗑️  Clearing migration table...');

    // Get current count
    const [countRows] = await connection.execute('SELECT COUNT(*) as count FROM migrations');
    const currentCount = (countRows as any)[0].count;

    // Clear the table
    await connection.execute('DELETE FROM migrations');

    console.log(`✅ Removed ${currentCount} migration records`);
    console.log('\n🎉 Migration tracking has been reset!');

    console.log('\n💡 Next steps:');
    console.log('• Your database schema is preserved and functional');
    console.log('• Future schema changes should use: npm run migration:generate');
    console.log('• Run migrations with: npm run migration:run');
    console.log('• Check status with: npm run migration:status');
    console.log('\n📋 For your reference, here were the changes that had been applied:');
    console.log('• Avatars: Converted to UUID, cleaned to 8 avatars, all free');
    console.log('• Friendships: Fixed friendship-1, friendship-2 to proper UUIDs');
    console.log('• URLs to Parse: Converted from integer to UUID');
    console.log('• All other tables: Already using proper UUIDs');
  } catch (error) {
    console.error('❌ Error resetting migration table:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

resetMigrationTable();
