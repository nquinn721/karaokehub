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

// Import TypeORM DataSource from your existing configuration
let DataSource;
try {
  const dataSourceModule = require('../data-source.ts');
  DataSource = dataSourceModule.default;
} catch (error) {
  console.error('❌ Could not load TypeORM DataSource. Make sure data-source.ts exists.');
  process.exit(1);
}

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
  }

  async connect() {
    if (!DataSource.isInitialized) {
      await DataSource.initialize();
    }
    this.connection = DataSource;
  }
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || 'karaokehub',
      multipleStatements: true
    });
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
    
    for (const table of this.targetTables) {
      try {
        const [rows] = await this.connection.execute(`SELECT * FROM ${table}`);
        if (rows.length > 0) {
          const tableBackup = this.generateInsertStatements(table, rows);
          fs.appendFileSync(backupFile, `-- Backup of ${table}\n${tableBackup}\n\n`);
        }
      } catch (error) {
        console.warn(`⚠️  Could not backup table ${table}: ${error.message}`);
      }
    }

    console.log(`✅ Backup created: ${backupFile}`);
    return backupFile;
  }

  generateInsertStatements(tableName, rows) {
    if (rows.length === 0) return '';
    
    const columns = Object.keys(rows[0]);
    const values = rows.map(row => {
      const valueList = columns.map(col => {
        const value = row[col];
        if (value === null) return 'NULL';
        if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
        if (value instanceof Date) return `'${value.toISOString().slice(0, 19).replace('T', ' ')}'`;
        return value;
      });
      return `(${valueList.join(', ')})`;
    });

    return `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES\n${values.join(',\n')};`;
  }

  async clearTargetTables() {
    console.log('🗑️  Clearing target tables...');
    
    // Disable foreign key checks temporarily
    await this.connection.execute('SET FOREIGN_KEY_CHECKS = 0');
    
    try {
      for (const table of this.targetTables) {
        if (this.dryRun) {
          console.log(`[DRY RUN] Would execute: DELETE FROM ${table}`);
        } else {
          await this.connection.execute(`DELETE FROM ${table}`);
          console.log(`✅ Cleared table: ${table}`);
        }
      }
    } finally {
      // Re-enable foreign key checks
      await this.connection.execute('SET FOREIGN_KEY_CHECKS = 1');
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
      console.log('[DRY RUN] Would execute the following INSERT statements:');
      console.log(safeInserts.substring(0, 500) + '...');
      return;
    }

    if (safeInserts.trim()) {
      await this.connection.execute(safeInserts);
      console.log('✅ Data import completed successfully');
    } else {
      console.log('⚠️  No safe INSERT statements found for target tables');
    }
  }

  extractSafeInserts(sqlContent) {
    const lines = sqlContent.split('\n');
    const safeLines = [];
    
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
    
    return safeLines.join('\n');
  }

  async getTableCounts() {
    const counts = {};
    for (const table of [...SAFE_TABLES, ...PROTECTED_TABLES]) {
      try {
        const [result] = await this.connection.execute(`SELECT COUNT(*) as count FROM ${table}`);
        counts[table] = result[0].count;
      } catch (error) {
        counts[table] = 'ERROR';
      }
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
      await this.connect();
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
    } finally {
      if (this.connection) {
        await this.connection.end();
      }
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

module.exports = SafeDataImporter;
