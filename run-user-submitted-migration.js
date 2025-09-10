const mysql = require('mysql2/promise');

async function runMigration() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'admin',
    password: 'password',
    database: 'karaoke-hub',
  });

  try {
    console.log('🔄 Starting userSubmitted to submittedBy migration...');

    // Add submittedBy columns to all entities
    console.log('📝 Adding submittedBy columns...');
    await connection.execute(`ALTER TABLE \`vendors\` ADD \`submittedBy\` varchar(36) NULL`);
    await connection.execute(`ALTER TABLE \`venues\` ADD \`submittedBy\` varchar(36) NULL`);
    await connection.execute(`ALTER TABLE \`shows\` ADD \`submittedBy\` varchar(36) NULL`);
    await connection.execute(`ALTER TABLE \`djs\` ADD \`submittedBy\` varchar(36) NULL`);

    // Add foreign key constraints
    console.log('🔗 Adding foreign key constraints...');
    await connection.execute(
      `ALTER TABLE \`vendors\` ADD CONSTRAINT \`FK_vendors_submittedBy\` FOREIGN KEY (\`submittedBy\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await connection.execute(
      `ALTER TABLE \`venues\` ADD CONSTRAINT \`FK_venues_submittedBy\` FOREIGN KEY (\`submittedBy\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await connection.execute(
      `ALTER TABLE \`shows\` ADD CONSTRAINT \`FK_shows_submittedBy\` FOREIGN KEY (\`submittedBy\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await connection.execute(
      `ALTER TABLE \`djs\` ADD CONSTRAINT \`FK_djs_submittedBy\` FOREIGN KEY (\`submittedBy\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`,
    );

    // Remove old userSubmitted columns
    console.log('🗑️ Removing old userSubmitted columns...');
    await connection.execute(`ALTER TABLE \`vendors\` DROP COLUMN \`userSubmitted\``);
    await connection.execute(`ALTER TABLE \`venues\` DROP COLUMN \`userSubmitted\``);
    await connection.execute(`ALTER TABLE \`shows\` DROP COLUMN \`userSubmitted\``);
    await connection.execute(`ALTER TABLE \`djs\` DROP COLUMN \`userSubmitted\``);

    console.log('✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('🔍 Column might already exist. Checking current state...');

      // Check if submittedBy columns already exist
      const [vendors] = await connection.execute(`SHOW COLUMNS FROM vendors LIKE 'submittedBy'`);
      const [venues] = await connection.execute(`SHOW COLUMNS FROM venues LIKE 'submittedBy'`);
      const [shows] = await connection.execute(`SHOW COLUMNS FROM shows LIKE 'submittedBy'`);
      const [djs] = await connection.execute(`SHOW COLUMNS FROM djs LIKE 'submittedBy'`);

      console.log('Current submittedBy column status:');
      console.log('- vendors:', vendors.length > 0 ? 'EXISTS' : 'MISSING');
      console.log('- venues:', venues.length > 0 ? 'EXISTS' : 'MISSING');
      console.log('- shows:', shows.length > 0 ? 'EXISTS' : 'MISSING');
      console.log('- djs:', djs.length > 0 ? 'EXISTS' : 'MISSING');
    }
  } finally {
    await connection.end();
  }
}

runMigration();
