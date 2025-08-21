#!/usr/bin/env node

/**
 * Database monitoring script to check parsed_schedules table
 * This helps verify if aggregation is reducing database bloat
 */

const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('./dist/app.module');

async function checkDatabaseState() {
  console.log('📊 Checking parsed_schedules database state...\n');

  try {
    const app = await NestFactory.createApplicationContext(AppModule, {
      logger: ['error'],
    });

    // Get TypeORM connection
    const dataSource = app.get('DataSource');

    // Query database statistics
    const queries = [
      {
        name: 'Total Records',
        sql: 'SELECT COUNT(*) as count FROM parsed_schedules',
      },
      {
        name: 'Records by Status',
        sql: 'SELECT status, COUNT(*) as count FROM parsed_schedules GROUP BY status',
      },
      {
        name: 'Records by URL (Top 10)',
        sql: 'SELECT url, COUNT(*) as count FROM parsed_schedules GROUP BY url ORDER BY count DESC LIMIT 10',
      },
      {
        name: 'Recent Records (Last 24h)',
        sql: 'SELECT COUNT(*) as count FROM parsed_schedules WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)',
      },
      {
        name: 'Average Shows per Record',
        sql: 'SELECT AVG(JSON_LENGTH(COALESCE(ai_analysis->>"$.shows", "[]"))) as avg_shows FROM parsed_schedules WHERE ai_analysis IS NOT NULL',
      },
      {
        name: 'Average DJs per Record',
        sql: 'SELECT AVG(JSON_LENGTH(COALESCE(ai_analysis->>"$.djs", "[]"))) as avg_djs FROM parsed_schedules WHERE ai_analysis IS NOT NULL',
      },
    ];

    for (const query of queries) {
      try {
        console.log(`📈 ${query.name}:`);
        const result = await dataSource.query(query.sql);

        if (Array.isArray(result)) {
          if (result.length === 1 && typeof result[0] === 'object') {
            // Single result object
            const row = result[0];
            Object.keys(row).forEach((key) => {
              console.log(`   ${key}: ${row[key]}`);
            });
          } else {
            // Multiple rows
            result.forEach((row, index) => {
              console.log(`   Row ${index + 1}:`, JSON.stringify(row, null, 2));
            });
          }
        }
        console.log('');
      } catch (queryError) {
        console.log(`   ❌ Error: ${queryError.message}\n`);
      }
    }

    // Check for potential memory issues
    console.log('🚨 Memory Issue Indicators:');
    try {
      const duplicateUrlsResult = await dataSource.query(`
        SELECT url, COUNT(*) as duplicate_count 
        FROM parsed_schedules 
        WHERE status = 'PENDING_REVIEW'
        GROUP BY url 
        HAVING COUNT(*) > 1 
        ORDER BY duplicate_count DESC 
        LIMIT 5
      `);

      if (duplicateUrlsResult.length > 0) {
        console.log('   ⚠️ URLs with multiple PENDING_REVIEW records:');
        duplicateUrlsResult.forEach((row) => {
          console.log(`     ${row.url}: ${row.duplicate_count} records`);
        });
      } else {
        console.log('   ✅ No duplicate PENDING_REVIEW records found');
      }
    } catch (error) {
      console.log(`   ❌ Could not check duplicates: ${error.message}`);
    }

    console.log('');

    // Check table size
    try {
      const tableSizeResult = await dataSource.query(`
        SELECT 
          ROUND(((data_length + index_length) / 1024 / 1024), 2) AS 'size_mb',
          table_rows
        FROM information_schema.tables 
        WHERE table_schema = DATABASE() 
        AND table_name = 'parsed_schedules'
      `);

      if (tableSizeResult.length > 0) {
        const size = tableSizeResult[0];
        console.log('📏 Table Size Information:');
        console.log(`   Size: ${size.size_mb} MB`);
        console.log(`   Rows: ${size.table_rows}`);

        if (size.size_mb > 100) {
          console.log('   ⚠️ Large table detected - aggregation strategy recommended');
        }
      }
    } catch (error) {
      console.log(`❌ Could not get table size: ${error.message}`);
    }

    await app.close();
    console.log('\n✅ Database check completed!');
  } catch (error) {
    console.error('❌ Database check failed:', error.message);
    process.exit(1);
  }
}

// Run the check
if (require.main === module) {
  checkDatabaseState().catch(console.error);
}

module.exports = checkDatabaseState;
