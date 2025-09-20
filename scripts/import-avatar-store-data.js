#!/usr/bin/env node

/**
 * Avatar & Store Data Import Script for Cloud SQL
 * 
 * This script helps import the exported avatar, microphone, and coin package data
 * to your Cloud SQL instance.
 * 
 * Prerequisites:
 * 1. gcloud CLI installed and authenticated
 * 2. Google Cloud Storage bucket access
 * 3. Cloud SQL instance configured
 * 
 * Usage:
 *   node scripts/import-avatar-store-data.js --sql-file avatar-store-data-2025-09-20.sql --instance your-instance --bucket your-bucket
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class AvatarStoreImporter {
  constructor(options = {}) {
    this.sqlFile = options.sqlFile;
    this.instanceName = options.instanceName;
    this.bucketName = options.bucketName;
    this.database = options.database || 'karaokehub';
    this.region = options.region || 'us-central1';
  }

  validateInputs() {
    if (!this.sqlFile) {
      throw new Error('❌ SQL file is required. Use --sql-file parameter.');
    }
    
    if (!fs.existsSync(this.sqlFile)) {
      throw new Error(`❌ SQL file not found: ${this.sqlFile}`);
    }
    
    if (!this.instanceName) {
      throw new Error('❌ Cloud SQL instance name is required. Use --instance parameter.');
    }
    
    if (!this.bucketName) {
      throw new Error('❌ Google Cloud Storage bucket name is required. Use --bucket parameter.');
    }
    
    console.log('✅ Input validation passed');
    console.log(`📁 SQL File: ${this.sqlFile}`);
    console.log(`🗄️  Instance: ${this.instanceName}`);
    console.log(`🪣 Bucket: ${this.bucketName}`);
    console.log(`💾 Database: ${this.database}`);
  }

  async uploadToGCS() {
    console.log('\n📤 Uploading SQL file to Google Cloud Storage...');
    
    const fileName = path.basename(this.sqlFile);
    const gcsPath = `gs://${this.bucketName}/${fileName}`;
    
    try {
      const uploadCmd = `gcloud storage cp "${this.sqlFile}" "${gcsPath}"`;
      console.log(`🔧 Running: ${uploadCmd}`);
      
      execSync(uploadCmd, { stdio: 'inherit' });
      
      console.log(`✅ File uploaded to: ${gcsPath}`);
      return gcsPath;
      
    } catch (error) {
      console.error('❌ Failed to upload to GCS:', error.message);
      throw error;
    }
  }

  async importToCloudSQL(gcsPath) {
    console.log('\n📥 Importing data to Cloud SQL...');
    
    try {
      const importCmd = [
        'gcloud sql import sql',
        this.instanceName,
        gcsPath,
        `--database=${this.database}`,
        '--quiet'
      ].join(' ');
      
      console.log(`🔧 Running: ${importCmd}`);
      
      execSync(importCmd, { stdio: 'inherit' });
      
      console.log('✅ Data imported successfully to Cloud SQL!');
      
    } catch (error) {
      console.error('❌ Failed to import to Cloud SQL:', error.message);
      throw error;
    }
  }

  async verifyImport() {
    console.log('\n🔍 Verifying import (optional)...');
    console.log('💡 You can verify the import by connecting to your Cloud SQL instance and running:');
    console.log('   SELECT COUNT(*) FROM avatars;');
    console.log('   SELECT COUNT(*) FROM microphones;');
    console.log('   SELECT COUNT(*) FROM coin_packages;');
    console.log('\n📊 Expected counts:');
    console.log('   avatars: 8 records');
    console.log('   microphones: 20 records');
    console.log('   coin_packages: 5 records');
  }

  async import() {
    try {
      this.validateInputs();
      
      const gcsPath = await this.uploadToGCS();
      await this.importToCloudSQL(gcsPath);
      await this.verifyImport();
      
      console.log('\n🎉 Avatar & store data import completed successfully!');
      console.log('\n🧹 Cleanup (optional):');
      console.log(`   gsutil rm ${gcsPath}`);
      
    } catch (error) {
      console.error('\n💥 Import failed:', error.message);
      throw error;
    }
  }

  static showUsage() {
    console.log(`
📚 Usage: node scripts/import-avatar-store-data.js [options]

Required options:
  --sql-file    Path to the exported SQL file
  --instance    Cloud SQL instance name
  --bucket      Google Cloud Storage bucket name

Optional options:
  --database    Database name (default: karaokehub)
  --region      Cloud SQL region (default: us-central1)

Example:
  node scripts/import-avatar-store-data.js \\
    --sql-file avatar-store-data-2025-09-20.sql \\
    --instance karaoke-prod \\
    --bucket karaoke-hub-imports

Prerequisites:
  1. gcloud CLI installed: https://cloud.google.com/sdk/docs/install
  2. Authenticated: gcloud auth login
  3. GCS bucket exists and you have write access
  4. Cloud SQL instance exists and you have import permissions
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
      case '--instance':
        options.instanceName = value;
        break;
      case '--bucket':
        options.bucketName = value;
        break;
      case '--database':
        options.database = value;
        break;
      case '--region':
        options.region = value;
        break;
      case '--help':
      case '-h':
        AvatarStoreImporter.showUsage();
        process.exit(0);
        break;
      default:
        console.error(`❌ Unknown option: ${key}`);
        AvatarStoreImporter.showUsage();
        process.exit(1);
    }
  }
  
  return options;
}

// Run the import
if (require.main === module) {
  const options = parseArgs();
  
  if (Object.keys(options).length === 0) {
    console.log('📋 Avatar & Store Data Import Script');
    AvatarStoreImporter.showUsage();
    process.exit(1);
  }
  
  const importer = new AvatarStoreImporter(options);
  
  importer.import()
    .then(() => {
      console.log('\n🚀 Import process completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Import process failed:', error.message);
      process.exit(1);
    });
}

module.exports = AvatarStoreImporter;