const mysql = require('mysql2/promise');

async function checkMigrationStatus() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'admin',
    password: 'password',
    database: 'karaoke-hub',
  });

  try {
    console.log('🔍 Checking migration status...');

    // Check if userSubmitted columns still exist
    const [vendorsOld] = await connection.execute(`SHOW COLUMNS FROM vendors LIKE 'userSubmitted'`);
    const [venuesOld] = await connection.execute(`SHOW COLUMNS FROM venues LIKE 'userSubmitted'`);
    const [showsOld] = await connection.execute(`SHOW COLUMNS FROM shows LIKE 'userSubmitted'`);
    const [djsOld] = await connection.execute(`SHOW COLUMNS FROM djs LIKE 'userSubmitted'`);

    // Check if submittedBy columns exist
    const [vendorsNew] = await connection.execute(`SHOW COLUMNS FROM vendors LIKE 'submittedBy'`);
    const [venuesNew] = await connection.execute(`SHOW COLUMNS FROM venues LIKE 'submittedBy'`);
    const [showsNew] = await connection.execute(`SHOW COLUMNS FROM shows LIKE 'submittedBy'`);
    const [djsNew] = await connection.execute(`SHOW COLUMNS FROM djs LIKE 'submittedBy'`);

    console.log('\n📊 Migration Status:');
    console.log('userSubmitted columns (should be removed):');
    console.log('- vendors:', vendorsOld.length > 0 ? '❌ EXISTS' : '✅ REMOVED');
    console.log('- venues:', venuesOld.length > 0 ? '❌ EXISTS' : '✅ REMOVED');
    console.log('- shows:', showsOld.length > 0 ? '❌ EXISTS' : '✅ REMOVED');
    console.log('- djs:', djsOld.length > 0 ? '❌ EXISTS' : '✅ REMOVED');

    console.log('\nsubmittedBy columns (should exist):');
    console.log('- vendors:', vendorsNew.length > 0 ? '✅ EXISTS' : '❌ MISSING');
    console.log('- venues:', venuesNew.length > 0 ? '✅ EXISTS' : '❌ MISSING');
    console.log('- shows:', showsNew.length > 0 ? '✅ EXISTS' : '❌ MISSING');
    console.log('- djs:', djsNew.length > 0 ? '✅ EXISTS' : '❌ MISSING');

    // Check foreign key constraints
    console.log('\n🔗 Checking foreign key constraints...');
    const [constraints] = await connection.execute(`
      SELECT 
        TABLE_NAME,
        CONSTRAINT_NAME,
        COLUMN_NAME,
        REFERENCED_TABLE_NAME,
        REFERENCED_COLUMN_NAME
      FROM 
        INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
      WHERE 
        CONSTRAINT_SCHEMA = 'karaoke-hub' 
        AND REFERENCED_TABLE_NAME = 'users'
        AND COLUMN_NAME = 'submittedBy'
    `);

    console.log('Foreign key constraints for submittedBy:');
    constraints.forEach((constraint) => {
      console.log(
        `- ${constraint.TABLE_NAME}.${constraint.COLUMN_NAME} -> ${constraint.REFERENCED_TABLE_NAME}.${constraint.REFERENCED_COLUMN_NAME}`,
      );
    });

    if (constraints.length === 0) {
      console.log('❌ No foreign key constraints found for submittedBy columns');
    }
  } catch (error) {
    console.error('❌ Error checking migration status:', error.message);
  } finally {
    await connection.end();
  }
}

checkMigrationStatus();
