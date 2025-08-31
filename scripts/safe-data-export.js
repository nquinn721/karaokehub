#!/usr/bin/env node

/**
 * Safe Data Export Script
 * 
 * This script exports only venue/show/vendor/DJ data without any user data,
 * creating a safe dump file that can be imported to production.
 * 
 * Usage:
 *   node scripts/safe-data-export.js --output safe-data-export.sql
 *   node scripts/safe-data-export.js --include venues,shows --exclude parsed_schedules
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Tables that are safe to export to production
const SAFE_TABLES = [
  'venues',
  'shows', 
  'djs',
  'vendors',
  'parsed_schedules'
];

// Tables that should NEVER be exported to production
const PROTECTED_TABLES = [
  'users',
  'user_sessions', 
  'user_feature_overrides',
  'favorite_shows',
  'feedback',
  'show_reviews'
];

class SafeDataExporter {
  constructor(options = {}) {
    this.outputFile = options.outputFile || `safe-data-export-${this.getTimestamp()}.sql`;
    this.includeTables = options.includeTables || SAFE_TABLES;
    this.excludeTables = options.excludeTables || [];
    this.dbConfig = {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'karaokehub'
    };
  }

  getTimestamp() {
    return new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
  }

  validateTables() {
    console.log('🔍 Validating table selection...');
    
    // Remove excluded tables
    this.targetTables = this.includeTables.filter(table => 
      !this.excludeTables.includes(table)
    );
    
    // Check for protected tables
    const protectedFound = this.targetTables.filter(table => 
      PROTECTED_TABLES.includes(table)
    );
    
    if (protectedFound.length > 0) {
      throw new Error(`❌ PROTECTED TABLES DETECTED: ${protectedFound.join(', ')}. Cannot export these tables.`);
    }

    console.log(`✅ Will export: ${this.targetTables.join(', ')}`);
    console.log(`🔒 Protected tables excluded: ${PROTECTED_TABLES.join(', ')}`);
  }

  async export() {
    console.log('📤 Starting safe data export...');
    
    const outputPath = path.resolve(this.outputFile);
    
    // Create mysqldump command for safe tables only
    const tablesList = this.targetTables.join(' ');
    const mysqldumpCmd = [
      'mysqldump',
      `--host=${this.dbConfig.host}`,
      `--port=${this.dbConfig.port}`,
      `--user=${this.dbConfig.user}`,
      this.dbConfig.password ? `--password=${this.dbConfig.password}` : '',
      '--single-transaction',
      '--routines',
      '--triggers',
      '--no-create-db',
      '--skip-add-locks',
      '--skip-disable-keys',
      '--skip-set-charset',
      '--default-character-set=utf8mb4',
      this.dbConfig.database,
      tablesList
    ].filter(Boolean).join(' ');

    try {
      console.log('🏃 Running mysqldump...');
      const output = execSync(mysqldumpCmd, { encoding: 'utf8', maxBuffer: 1024 * 1024 * 100 });
      
      // Add safety header to the export file
      const safetyHeader = this.generateSafetyHeader();
      const finalOutput = safetyHeader + '\n\n' + output;
      
      fs.writeFileSync(outputPath, finalOutput);
      
      console.log(`✅ Safe export completed: ${outputPath}`);
      console.log(`📊 File size: ${(fs.statSync(outputPath).size / 1024 / 1024).toFixed(2)} MB`);
      
      // Show export summary
      this.showExportSummary(output);
      
    } catch (error) {
      console.error('❌ Export failed:', error.message);
      process.exit(1);
    }
  }

  generateSafetyHeader() {
    return `-- =====================================================
-- SAFE DATA EXPORT - NO USER DATA INCLUDED
-- =====================================================
-- 
-- Generated: ${new Date().toISOString()}
-- Tables included: ${this.targetTables.join(', ')}
-- Tables excluded: ${PROTECTED_TABLES.join(', ')}
-- 
-- This export contains ONLY:
-- - Venue data
-- - Show data  
-- - DJ data
-- - Vendor data
-- - Parsed schedule data
--
-- This export does NOT contain:
-- - User accounts
-- - User sessions
-- - User favorites
-- - Feedback
-- - Reviews
-- - Payment information
--
-- SAFE FOR PRODUCTION IMPORT
-- =====================================================

SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET AUTOCOMMIT = 0;
START TRANSACTION;`;
  }

  showExportSummary(sqlContent) {
    console.log('\n📊 Export Summary:');
    
    // Count INSERT statements per table
    const insertCounts = {};
    const lines = sqlContent.split('\n');
    
    for (const line of lines) {
      const match = line.match(/^INSERT INTO `?(\w+)`?/);
      if (match) {
        const table = match[1];
        insertCounts[table] = (insertCounts[table] || 0) + 1;
      }
    }
    
    Object.entries(insertCounts).forEach(([table, count]) => {
      console.log(`  ${table}: ~${count} INSERT statements`);
    });
  }

  async run() {
    try {
      this.validateTables();
      await this.export();
      
      console.log('\n🎉 Safe data export completed successfully!');
      console.log(`\nTo import to production, use:`);
      console.log(`  node scripts/safe-data-import.js --source ${this.outputFile} --dry-run`);
      console.log(`  node scripts/safe-data-import.js --source ${this.outputFile}`);
      
    } catch (error) {
      console.error('❌ Export failed:', error.message);
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
      case '--output':
        options.outputFile = args[++i];
        break;
      case '--include':
        options.includeTables = args[++i].split(',');
        break;
      case '--exclude':
        options.excludeTables = args[++i].split(',');
        break;
      case '--help':
        console.log(`
Safe Data Export Tool

Usage:
  node safe-data-export.js [options]

Options:
  --output <file>     Output SQL file name (default: safe-data-export-YYYY-MM-DD.sql)
  --include <list>    Comma-separated list of tables to include (default: all safe tables)
  --exclude <list>    Comma-separated list of tables to exclude from export
  --help             Show this help

Examples:
  node safe-data-export.js
  node safe-data-export.js --output production-update.sql
  node safe-data-export.js --include venues,shows --exclude parsed_schedules
  
Safe Tables: ${SAFE_TABLES.join(', ')}
Protected Tables (never exported): ${PROTECTED_TABLES.join(', ')}

Environment Variables:
  DB_HOST        Database host (default: localhost)
  DB_PORT        Database port (default: 3306)  
  DB_USER        Database user (default: root)
  DB_PASSWORD    Database password
  DB_NAME        Database name (default: karaokehub)
`);
        process.exit(0);
    }
  }
  
  const exporter = new SafeDataExporter(options);
  exporter.run();
}

module.exports = SafeDataExporter;
