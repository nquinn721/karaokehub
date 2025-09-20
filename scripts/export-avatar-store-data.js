#!/usr/bin/env node

/**
 * Avatar & Store Data Export Script
 * 
 * This script exports avatars, microphones, and coin packages from local database
 * for import to Cloud SQL production.
 * 
 * Usage:
 *   node scripts/export-avatar-store-data.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Tables to export for avatar and store data
const AVATAR_STORE_TABLES = [
  'avatars',
  'microphones', 
  'coin_packages'
];

class AvatarStoreExporter {
  constructor() {
    this.outputFile = `avatar-store-data-${this.getTimestamp()}.sql`;
    this.dbConfig = {
      host: 'localhost',
      port: 3306,
      user: 'admin',
      password: 'password',
      database: 'karaoke-hub'
    };
  }

  getTimestamp() {
    return new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
  }

  async export() {
    console.log('📤 Starting avatar & store data export...');
    console.log(`🎯 Exporting tables: ${AVATAR_STORE_TABLES.join(', ')}`);
    
    const outputPath = path.resolve(this.outputFile);
    
    // Create mysqldump command for avatar and store tables
    const tablesList = AVATAR_STORE_TABLES.join(' ');
    const mysqldumpCmd = [
      'mysqldump',
      `--host=${this.dbConfig.host}`,
      `--port=${this.dbConfig.port}`,
      `--user=${this.dbConfig.user}`,
      `--password=${this.dbConfig.password}`,
      '--single-transaction',
      '--no-create-db',
      '--skip-add-locks',
      '--skip-disable-keys',
      '--skip-set-charset',
      '--default-character-set=utf8mb4',
      '--complete-insert', // Include column names for clarity
      '--extended-insert=FALSE', // One INSERT per row for readability
      this.dbConfig.database,
      tablesList
    ].join(' ');

    console.log('🔧 Running mysqldump...');
    
    try {
      const output = execSync(mysqldumpCmd, { 
        encoding: 'utf8',
        maxBuffer: 10 * 1024 * 1024 // 10MB buffer
      });
      
      // Add helpful header comment
      const header = `-- Avatar & Store Data Export
-- Generated: ${new Date().toISOString()}
-- Tables: ${AVATAR_STORE_TABLES.join(', ')}
-- Source: ${this.dbConfig.database}@${this.dbConfig.host}
--
-- Import to Cloud SQL:
-- gcloud sql import sql [INSTANCE_NAME] gs://[BUCKET_NAME]/${this.outputFile}
--
-- Or via mysql client:
-- mysql -h [CLOUD_SQL_IP] -u [USER] -p [DATABASE] < ${this.outputFile}

`;
      
      const finalOutput = header + output;
      
      fs.writeFileSync(outputPath, finalOutput);
      
      console.log(`✅ Export completed successfully!`);
      console.log(`📁 Output file: ${outputPath}`);
      console.log(`📊 File size: ${(fs.statSync(outputPath).size / 1024).toFixed(2)} KB`);
      
      // Show quick stats
      const stats = this.getTableStats();
      console.log('📈 Data exported:');
      stats.forEach(stat => {
        console.log(`   ${stat.table}: ${stat.count} records`);
      });
      
      console.log('\n🚀 Next steps:');
      console.log('1. Upload file to Google Cloud Storage bucket');
      console.log('2. Import to Cloud SQL using gcloud command or SQL client');
      console.log('3. Verify data integrity after import');
      
      return outputPath;
      
    } catch (error) {
      console.error('❌ Export failed:', error.message);
      throw error;
    }
  }

  getTableStats() {
    const stats = [];
    
    for (const table of AVATAR_STORE_TABLES) {
      try {
        const countCmd = `mysql -h ${this.dbConfig.host} -u ${this.dbConfig.user} -p${this.dbConfig.password} ${this.dbConfig.database} -e "SELECT COUNT(*) FROM ${table};" -N`;
        const count = execSync(countCmd, { encoding: 'utf8' }).trim();
        stats.push({ table, count: parseInt(count) });
      } catch (error) {
        stats.push({ table, count: 'Error' });
      }
    }
    
    return stats;
  }
}

// Run the export
if (require.main === module) {
  const exporter = new AvatarStoreExporter();
  
  exporter.export()
    .then(outputFile => {
      console.log(`\n🎉 Avatar & store data export completed: ${outputFile}`);
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Export failed:', error);
      process.exit(1);
    });
}

module.exports = AvatarStoreExporter;