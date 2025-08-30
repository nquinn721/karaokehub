import mysql from 'mysql2/promise';

async function checkVenueMigration() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'admin',
    password: 'password',
    database: 'karaoke-hub',
  });

  try {
    console.log('🔍 Checking venue migration results...\n');

    // Check if venues table exists
    const [tables] = await connection.execute(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = 'karaoke-hub' 
      AND table_name = 'venues'
    `);
    console.log(`📊 Venues table exists: ${tables[0].count > 0 ? 'YES' : 'NO'}`);

    if (tables[0].count > 0) {
      // Count venues
      const [venueCount] = await connection.execute('SELECT COUNT(*) as count FROM venues');
      console.log(`📊 Total venues: ${venueCount[0].count}`);

      // Count shows with venues
      const [linkedShows] = await connection.execute(
        'SELECT COUNT(*) as count FROM shows WHERE venueId IS NOT NULL',
      );
      console.log(`🔗 Shows linked to venues: ${linkedShows[0].count}`);

      // Count active shows without venues
      const [unlinkedShows] = await connection.execute(
        'SELECT COUNT(*) as count FROM shows WHERE venueId IS NULL AND isActive = 1',
      );
      console.log(`⚠️  Active shows without venues: ${unlinkedShows[0].count}`);

      // Show sample venues
      const [sampleVenues] = await connection.execute(`
        SELECT v.name, v.address, v.city, v.state, 
               (SELECT COUNT(*) FROM shows WHERE venueId = v.id) as show_count
        FROM venues v 
        ORDER BY v.createdAt DESC 
        LIMIT 5
      `);

      console.log('\n📋 Sample venues created:');
      sampleVenues.forEach((venue) => {
        console.log(`   - ${venue.name} (${venue.show_count} shows)`);
        console.log(`     ${venue.address || 'No address'}, ${venue.city}, ${venue.state}`);
      });

      // Show sample of unlinked shows if any
      if (unlinkedShows[0].count > 0) {
        const [unlinked] = await connection.execute(`
          SELECT venue, address, city, state 
          FROM shows 
          WHERE venueId IS NULL AND isActive = 1 
          LIMIT 3
        `);

        console.log('\n⚠️  Sample unlinked shows:');
        unlinked.forEach((show) => {
          console.log(
            `   - ${show.venue || 'No venue'} at ${show.address || 'No address'}, ${show.city}, ${show.state}`,
          );
        });
      }
    }

    console.log('\n✅ Migration check completed!');
  } catch (error) {
    console.error('❌ Error checking migration:', error);
  } finally {
    await connection.end();
  }
}

checkVenueMigration().catch(console.error);
