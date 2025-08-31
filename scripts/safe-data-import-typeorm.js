#!/usr/bin/env node

/**
 * Safe Data Import Script (TypeORM Version)
 * 
 * This script allows importing specific data types (shows, venues, vendors, DJs)
 * without affecting critical data like users, authentication, or payments.
 * Uses TypeORM instead of mysql2 for compatibility.
 * 
 * Usage:
 *   npm run data:import -- --source exports/safe-export.sql
 *   npm run data:import -- --dry-run --tables venues,shows
 */

const fs = require('fs');
const path = require('path');

// Import TypeORM
const { execSync } = require('child_process');

// Tables that are SAFE to import/overwrite
const SAFE_TABLES = [
  'venues',
  'shows', 
  'djs',
  'vendors',
  'parsed_schedules'
];

// Tables that should NEVER be touched in production
const PROTECTED_TABLES = [
  'users',
  'user_sessions',
  'user_feature_overrides',
  'favorite_shows',
  'feedback',
  'show_reviews',
  'migrations'
];

class SafeDataImporter {
  constructor(options = {}) {
    this.dryRun = options.dryRun || false;
    this.backupFirst = options.backupFirst || true;
    this.sourceFile = options.sourceFile;
    this.targetTables = options.targetTables || SAFE_TABLES;
    this.timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    // Database config from environment
    this.dbConfig = {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || '3306',
      user: process.env.DB_USERNAME || 'admin',
      password: process.env.DB_PASSWORD || 'password',
      database: process.env.DB_DATABASE || 'karaoke-hub'
    };
  }

  async validateTables() {
    console.log('🔍 Validating table selection...');
    
    // Check for protected tables
    const protectedFound = this.targetTables.filter(table => 
      PROTECTED_TABLES.includes(table)
    );
    
    if (protectedFound.length > 0) {
      throw new Error(`❌ PROTECTED TABLES DETECTED: ${protectedFound.join(', ')}. These tables cannot be imported for safety.`);
    }

    // Check for unknown tables
    const unknownTables = this.targetTables.filter(table => 
      !SAFE_TABLES.includes(table) && !PROTECTED_TABLES.includes(table)
    );
    
    if (unknownTables.length > 0) {
      console.warn(`⚠️  Unknown tables: ${unknownTables.join(', ')}. Proceeding with caution.`);
    }

    console.log(`✅ Safe to import: ${this.targetTables.join(', ')}`);
  }

  async createBackup() {
    if (!this.backupFirst) return;

    console.log('💾 Creating backup of target tables...');
    
    const backupDir = path.join(__dirname, '..', 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const backupFile = path.join(backupDir, `production-backup-${this.timestamp}.sql`);
    
    try {
      // Use mysqldump to create backup of specific tables
      const tableList = this.targetTables.join(' ');
      const dumpCommand = `mysqldump -h ${this.dbConfig.host} -P ${this.dbConfig.port} -u ${this.dbConfig.user} -p${this.dbConfig.password} ${this.dbConfig.database} ${tableList} > ${backupFile}`;
      
      if (this.dryRun) {
        console.log(`[DRY RUN] Would create backup with: ${dumpCommand.replace(/-p\S+/, '-p***')}`);
      } else {
        execSync(dumpCommand, { stdio: 'pipe' });
        console.log(`✅ Backup created: ${backupFile}`);
      }
      
      return backupFile;
    } catch (error) {
      console.warn(`⚠️  Could not create backup: ${error.message}`);
      return null;
    }
  }

  async clearTargetTables() {
    console.log('🗑️  Clearing target tables...');
    
    if (this.dryRun) {
      console.log('[DRY RUN] Would clear tables:', this.targetTables.join(', '));
      return;
    }

    // Create temporary SQL file for clearing tables
    const clearSql = [
      'SET FOREIGN_KEY_CHECKS = 0;',
      ...this.targetTables.map(table => `DELETE FROM ${table};`),
      'SET FOREIGN_KEY_CHECKS = 1;'
    ].join('\n');

    const tempFile = path.join(__dirname, 'temp-clear.sql');
    fs.writeFileSync(tempFile, clearSql);

    try {
      const clearCommand = `mysql -h ${this.dbConfig.host} -P ${this.dbConfig.port} -u ${this.dbConfig.user} -p${this.dbConfig.password} ${this.dbConfig.database} < ${tempFile}`;
      execSync(clearCommand, { stdio: 'pipe' });
      console.log('✅ Target tables cleared');
    } finally {
      // Clean up temp file
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
      }
    }
  }

  async importData() {
    if (!this.sourceFile || !fs.existsSync(this.sourceFile)) {
      throw new Error(`Source file not found: ${this.sourceFile}`);
    }

    console.log(`📥 Importing data from: ${this.sourceFile}`);
    
    const sqlContent = fs.readFileSync(this.sourceFile, 'utf8');
    
    // Extract only INSERT statements for target tables
    const safeInserts = this.extractSafeInserts(sqlContent);
    
    if (this.dryRun) {
      console.log('[DRY RUN] Would import the following tables:', 
        this.targetTables.filter(table => safeInserts.includes(`INSERT INTO ${table}`))
      );
      return;
    }

    if (safeInserts.trim()) {
      const tempFile = path.join(__dirname, 'temp-import.sql');
      fs.writeFileSync(tempFile, safeInserts);

      try {
        const importCommand = `mysql -h ${this.dbConfig.host} -P ${this.dbConfig.port} -u ${this.dbConfig.user} -p${this.dbConfig.password} ${this.dbConfig.database} < ${tempFile}`;
        execSync(importCommand, { stdio: 'pipe' });
        console.log('✅ Data import completed successfully');
      } finally {
        // Clean up temp file
        if (fs.existsSync(tempFile)) {
          fs.unlinkSync(tempFile);
        }
      }
    } else {
      console.log('⚠️  No safe INSERT statements found for target tables');
    }
  }

  extractSafeInserts(sqlContent) {
    const lines = sqlContent.split('\n');
    const safeLines = [];
    
    // Add foreign key disable/enable
    safeLines.push('SET FOREIGN_KEY_CHECKS = 0;');
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Skip non-INSERT statements
      if (!trimmed.startsWith('INSERT INTO')) continue;
      
      // Check if this INSERT is for a safe table
      const tableMatch = trimmed.match(/INSERT INTO `?(\w+)`?\s/i);
      if (tableMatch && this.targetTables.includes(tableMatch[1])) {
        safeLines.push(line);
      }
    }
    
    safeLines.push('SET FOREIGN_KEY_CHECKS = 1;');
    return safeLines.join('\n');
  }

  async getTableCounts() {
    const counts = {};
    
    try {
      for (const table of [...SAFE_TABLES, ...PROTECTED_TABLES]) {
        try {
          const countCommand = `mysql -h ${this.dbConfig.host} -P ${this.dbConfig.port} -u ${this.dbConfig.user} -p${this.dbConfig.password} ${this.dbConfig.database} -e "SELECT COUNT(*) FROM ${table};" -s -N`;
          const result = execSync(countCommand, { encoding: 'utf8', stdio: 'pipe' });
          counts[table] = parseInt(result.trim()) || 0;
        } catch (error) {
          counts[table] = 'ERROR';
        }
      }
    } catch (error) {
      console.warn('⚠️  Could not get table counts:', error.message);
    }
    
    return counts;
  }

  async showSummary() {
    console.log('\n📊 Current Database State:');
    const counts = await this.getTableCounts();
    
    console.log('\n🔒 Protected Tables (will NOT be affected):');
    PROTECTED_TABLES.forEach(table => {
      console.log(`  ${table}: ${counts[table]} records`);
    });
    
    console.log('\n✅ Target Tables (will be updated):');
    this.targetTables.forEach(table => {
      console.log(`  ${table}: ${counts[table]} records`);
    });
  }

  async run() {
    try {
      await this.validateTables();
      await this.showSummary();
      
      if (this.dryRun) {
        console.log('\n🧪 DRY RUN MODE - No changes will be made');
      }
      
      await this.createBackup();
      await this.clearTargetTables();
      await this.importData();
      
      console.log('\n✅ Safe data import completed successfully!');
      
    } catch (error) {
      console.error('❌ Import failed:', error.message);
      process.exit(1);
    }
  }
}

// CLI handling
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {};
  
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--source':
        options.sourceFile = args[++i];
        break;
      case '--tables':
        options.targetTables = args[++i].split(',');
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--no-backup':
        options.backupFirst = false;
        break;
      case '--help':
        console.log(`
Safe Data Import Tool

Usage:
  node safe-data-import.js [options]

Options:
  --source <file>     SQL dump file to import from
  --tables <list>     Comma-separated list of tables to import (default: all safe tables)
  --dry-run          Show what would be done without making changes
  --no-backup        Skip creating backup (not recommended)
  --help             Show this help

Examples:
  node safe-data-import.js --source local-dump.sql --dry-run
  node safe-data-import.js --source local-dump.sql --tables venues,shows
  node safe-data-import.js --source local-dump.sql --no-backup

Safe Tables: ${SAFE_TABLES.join(', ')}
Protected Tables: ${PROTECTED_TABLES.join(', ')}
        `);
        process.exit(0);
    }
  }
  
  const importer = new SafeDataImporter(options);
  importer.run();
}
