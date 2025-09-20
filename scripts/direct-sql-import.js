#!/usr/bin/env node

/**
 * Direct SQL Import Script
 *
 * This script imports avatar/microphone/coin package data directly to Cloud SQL
 * using a MySQL connection (no GCS bucket required).
 *
 * Usage:
 *   node scripts/direct-sql-import.js --sql-file avatar-store-data-2025-09-20.sql --host CLOUD_SQL_IP --user USER --password PASSWORD
 */

const mysql = require('mysql2/promise');
const fs = require('fs');

class DirectSQLImporter {
  constructor(options = {}) {
    this.sqlFile = options.sqlFile;
    this.host = options.host;
    this.user = options.user;
    this.password = options.password;
    this.database = options.database || 'karaokehub';
    this.port = options.port || 3306;
  }

  validateInputs() {
    if (!this.sqlFile || !fs.existsSync(this.sqlFile)) {
      throw new Error(`❌ SQL file not found: ${this.sqlFile}`);
    }

    if (!this.host || !this.user || !this.password) {
      throw new Error('❌ Database connection details required: --host, --user, --password');
    }

    console.log('✅ Input validation passed');
    console.log(`📁 SQL File: ${this.sqlFile}`);
    console.log(`🌐 Host: ${this.host}`);
    console.log(`👤 User: ${this.user}`);
    console.log(`💾 Database: ${this.database}`);
  }

  async import() {
    this.validateInputs();

    console.log('\n🔌 Connecting to Cloud SQL...');

    const connection = await mysql.createConnection({
      host: this.host,
      port: this.port,
      user: this.user,
      password: this.password,
      database: this.database,
      multipleStatements: true,
    });

    try {
      console.log('✅ Connected to database');

      console.log('\n📖 Reading SQL file...');
      const sqlContent = fs.readFileSync(this.sqlFile, 'utf8');

      console.log('\n🗑️  Clearing existing data...');
      await connection.execute('DELETE FROM user_microphones WHERE 1=1');
      await connection.execute('DELETE FROM user_avatars WHERE 1=1');
      await connection.execute('DELETE FROM avatars WHERE 1=1');
      await connection.execute('DELETE FROM microphones WHERE 1=1');
      await connection.execute('DELETE FROM coin_packages WHERE 1=1');

      console.log('✅ Existing data cleared');

      console.log('\n📥 Importing new data...');
      await connection.query(sqlContent);

      console.log('✅ Data imported successfully!');

      console.log('\n🔍 Verifying import...');
      const [avatarCount] = await connection.execute('SELECT COUNT(*) as count FROM avatars');
      const [micCount] = await connection.execute('SELECT COUNT(*) as count FROM microphones');
      const [coinCount] = await connection.execute('SELECT COUNT(*) as count FROM coin_packages');

      console.log(`📊 Import verification:`);
      console.log(`   avatars: ${avatarCount[0].count} records`);
      console.log(`   microphones: ${micCount[0].count} records`);
      console.log(`   coin_packages: ${coinCount[0].count} records`);
    } finally {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }

  static showUsage() {
    console.log(`
📚 Usage: node scripts/direct-sql-import.js [options]

Required options:
  --sql-file    Path to the exported SQL file
  --host        Cloud SQL instance IP address
  --user        Database username
  --password    Database password

Optional options:
  --database    Database name (default: karaokehub)
  --port        Database port (default: 3306)

Example:
  node scripts/direct-sql-import.js \\
    --sql-file avatar-store-data-2025-09-20.sql \\
    --host 34.123.456.789 \\
    --user root \\
    --password your-password

Note: Make sure your Cloud SQL instance allows connections from your IP address.
`);
  }
}

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {};

  for (let i = 0; i < args.length; i += 2) {
    const key = args[i];
    const value = args[i + 1];

    switch (key) {
      case '--sql-file':
        options.sqlFile = value;
        break;
      case '--host':
        options.host = value;
        break;
      case '--user':
        options.user = value;
        break;
      case '--password':
        options.password = value;
        break;
      case '--database':
        options.database = value;
        break;
      case '--port':
        options.port = parseInt(value);
        break;
      case '--help':
      case '-h':
        DirectSQLImporter.showUsage();
        process.exit(0);
        break;
      default:
        console.error(`❌ Unknown option: ${key}`);
        DirectSQLImporter.showUsage();
        process.exit(1);
    }
  }

  return options;
}

// Run the import
if (require.main === module) {
  const options = parseArgs();

  if (Object.keys(options).length === 0) {
    console.log('📋 Direct SQL Import Script');
    DirectSQLImporter.showUsage();
    process.exit(1);
  }

  const importer = new DirectSQLImporter(options);

  importer
    .import()
    .then(() => {
      console.log('\n🎉 Direct SQL import completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Direct SQL import failed:', error.message);
      process.exit(1);
    });
}

module.exports = DirectSQLImporter;
