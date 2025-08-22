// Diagnostic script to check the status of Central Ohio Karaoke URL
const mysql = require('mysql2/promise');

async function checkUrlStatus() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'admin',
    password: 'password',
    database: 'karaoke-hub',
  });

  try {
    const facebookGroupUrl = 'https://www.facebook.com/groups/194826524192177';

    console.log('Checking URL status for:', facebookGroupUrl);

    // Check all entries for this URL
    const [rows] = await connection.execute('SELECT * FROM urls_to_parse WHERE url LIKE ?', [
      `%194826524192177%`,
    ]);

    console.log('Found entries:', rows.length);

    rows.forEach((row, index) => {
      console.log(`\nEntry ${index + 1}:`);
      console.log('ID:', row.id);
      console.log('URL:', row.url);
      console.log('isApproved:', row.isApproved);
      console.log('hasBeenParsed:', row.hasBeenParsed);
      console.log('createdAt:', row.createdAt);
      console.log('updatedAt:', row.updatedAt);
    });

    // Check if there are parsed schedules for this URL
    const [parsedRows] = await connection.execute(
      'SELECT * FROM parsed_schedules WHERE url LIKE ?',
      [`%194826524192177%`],
    );

    console.log('\nParsed schedules found:', parsedRows.length);
    parsedRows.forEach((row, index) => {
      console.log(`\nParsed Schedule ${index + 1}:`);
      console.log('ID:', row.id);
      console.log('URL:', row.url);
      console.log('Status:', row.status);
      console.log('Created:', row.createdAt);
    });
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await connection.end();
  }
}

checkUrlStatus();
