/**
 * Direct SQL query to check parsed schedules
 */

const mysql = require('mysql2/promise');

async function checkDatabaseDirectly() {
  console.log('🔍 Connecting to database directly...');

  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USERNAME || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_DATABASE || 'karaoke-hub',
    });

    console.log('✅ Connected to database');

    // Get all parsed schedules
    const [rows] = await connection.execute(
      'SELECT id, url, status, createdAt FROM parsed_schedules ORDER BY createdAt DESC LIMIT 10',
    );

    console.log('📊 Found', rows.length, 'parsed schedules:');
    console.log('');

    rows.forEach((row, index) => {
      console.log(`${index + 1}. ID: ${row.id}`);
      console.log(`   URL: ${row.url}`);
      console.log(`   Status: "${row.status}"`);
      console.log(`   Created: ${row.createdAt}`);
      console.log('');
    });

    // Check specifically for pending_review status
    const [pendingRows] = await connection.execute(
      'SELECT id, url, status FROM parsed_schedules WHERE status = "pending_review"',
    );

    console.log('🔎 Schedules with status = "pending_review":');
    console.log('Found', pendingRows.length, 'records');

    if (pendingRows.length > 0) {
      pendingRows.forEach((row, index) => {
        console.log(`${index + 1}. ID: ${row.id}, URL: ${row.url}, Status: "${row.status}"`);
      });
    }

    // If there are records with wrong status, let's update them
    if (rows.length > 0 && pendingRows.length === 0) {
      console.log('🔧 Found records but none with pending_review status');
      console.log('🔄 Updating the most recent record to pending_review...');

      const latestRecord = rows[0];
      await connection.execute(
        'UPDATE parsed_schedules SET status = "pending_review" WHERE id = ?',
        [latestRecord.id],
      );

      console.log(`✅ Updated record ${latestRecord.id} to pending_review status`);
    }

    await connection.end();
  } catch (error) {
    console.error('❌ Database error:', error.message);
    console.log('💡 Make sure your database is running and check your .env file');
  }
}

// Load environment variables
require('dotenv').config();

checkDatabaseDirectly();
