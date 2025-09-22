const mysql = require('mysql2/promise');

async function fixTransactionTable() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'admin',
    password: 'password',
    database: 'karaoke-hub',
  });

  try {
    console.log('🔧 Checking and fixing transactions table...');

    // Check if avatarId column exists
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'karaoke-hub' 
      AND TABLE_NAME = 'transactions' 
      AND COLUMN_NAME = 'avatarId'
    `);

    if (columns.length === 0) {
      console.log('➕ Adding avatarId column to transactions table...');
      await connection.execute(`
        ALTER TABLE transactions 
        ADD COLUMN avatarId varchar(50) NULL
      `);
      console.log('✅ avatarId column added successfully');
    } else {
      console.log('ℹ️  avatarId column already exists');
    }

    // Check if foreign key constraint exists for avatarId
    const [constraints] = await connection.execute(`
      SELECT CONSTRAINT_NAME 
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
      WHERE TABLE_SCHEMA = 'karaoke-hub' 
      AND TABLE_NAME = 'transactions' 
      AND COLUMN_NAME = 'avatarId'
      AND REFERENCED_TABLE_NAME IS NOT NULL
    `);

    if (constraints.length === 0) {
      console.log('🔗 Adding foreign key constraint for avatarId...');
      try {
        await connection.execute(`
          ALTER TABLE transactions 
          ADD CONSTRAINT FK_transaction_avatar 
          FOREIGN KEY (avatarId) REFERENCES avatars(id) 
          ON DELETE SET NULL
        `);
        console.log('✅ Foreign key constraint added successfully');
      } catch (error) {
        console.log(
          'ℹ️  Foreign key constraint may already exist or avatars table not ready:',
          error.message,
        );
      }
    } else {
      console.log('ℹ️  Foreign key constraint already exists');
    }

    console.log('🎉 Transaction table fix completed');
  } catch (error) {
    console.error('❌ Error fixing transaction table:', error.message);
  } finally {
    await connection.end();
  }
}

fixTransactionTable();
