import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';

async function runVenueMigrations() {
  console.log('🚀 Starting venue migration process...');

  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);

  try {
    // Check if venues table exists
    const venuesTableExists = await dataSource.query(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = 'karaoke-hub' 
      AND table_name = 'venues'
    `);

    if (venuesTableExists[0].count === 0) {
      console.log('📊 Creating venues table...');

      // Create venues table
      await dataSource.query(`
        CREATE TABLE venues (
          id varchar(36) NOT NULL PRIMARY KEY,
          name varchar(255) NOT NULL,
          address varchar(255) NULL,
          city varchar(255) NULL,
          state varchar(255) NULL,
          zip varchar(255) NULL,
          lat decimal(10,8) NULL,
          lng decimal(11,8) NULL,
          phone varchar(255) NULL,
          website varchar(255) NULL,
          description text NULL,
          isActive boolean DEFAULT 1,
          createdAt timestamp DEFAULT CURRENT_TIMESTAMP,
          updatedAt timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);

      // Create indexes
      await dataSource.query(`CREATE INDEX IDX_venues_name ON venues (name)`);
      await dataSource.query(`CREATE INDEX IDX_venues_address ON venues (address)`);
      await dataSource.query(`CREATE INDEX IDX_venues_city_state ON venues (city, state)`);
      await dataSource.query(`CREATE INDEX IDX_venues_location ON venues (lat, lng)`);

      console.log('✅ Venues table created successfully');
    } else {
      console.log('✅ Venues table already exists');
    }

    // Check if venueId column exists in shows table
    const venueIdExists = await dataSource.query(`
      SELECT COUNT(*) as count 
      FROM information_schema.columns 
      WHERE table_schema = 'karaoke-hub' 
      AND table_name = 'shows' 
      AND column_name = 'venueId'
    `);

    if (venueIdExists[0].count === 0) {
      console.log('📊 Adding venueId column to shows table...');
      await dataSource.query(`ALTER TABLE shows ADD COLUMN venueId varchar(36) NULL`);
      console.log('✅ venueId column added successfully');
    } else {
      console.log('✅ venueId column already exists');
    }

    // Check current show data
    const showCount = await dataSource.query(
      `SELECT COUNT(*) as count FROM shows WHERE isActive = 1`,
    );
    console.log(`📈 Found ${showCount[0].count} active shows`);

    // Create venues from show data if venues table is empty
    const venueCount = await dataSource.query(`SELECT COUNT(*) as count FROM venues`);

    if (venueCount[0].count === 0) {
      console.log('🏗️ Creating venues from existing show data...');

      // Create venues grouped by address (primary strategy)
      await dataSource.query(`
        INSERT INTO venues (id, name, address, city, state, zip, lat, lng, phone, website)
        SELECT 
          UUID() as id,
          COALESCE(
            (SELECT venue FROM shows s2 
             WHERE s2.address = s1.address AND s2.city = s1.city AND s1.state = s1.state 
             AND s2.venue IS NOT NULL AND s2.venue != '' 
             ORDER BY s2.venue LIMIT 1),
            CONCAT('Venue at ', s1.address)
          ) as name,
          s1.address,
          s1.city,
          s1.state,
          s1.zip,
          AVG(s1.lat) as lat,
          AVG(s1.lng) as lng,
          (SELECT venuePhone FROM shows s3 
           WHERE s3.address = s1.address AND s3.city = s1.city AND s3.state = s1.state 
           AND s3.venuePhone IS NOT NULL AND s3.venuePhone != '' 
           ORDER BY s3.venuePhone LIMIT 1) as phone,
          (SELECT venueWebsite FROM shows s4 
           WHERE s4.address = s1.address AND s4.city = s1.city AND s4.state = s1.state 
           AND s4.venueWebsite IS NOT NULL AND s4.venueWebsite != '' 
           ORDER BY s4.venueWebsite LIMIT 1) as website
        FROM shows s1
        WHERE s1.address IS NOT NULL 
          AND s1.address != '' 
          AND s1.isActive = 1
        GROUP BY s1.address, s1.city, s1.state, s1.zip
      `);

      // Create venues for shows without addresses (group by venue name + location)
      await dataSource.query(`
        INSERT INTO venues (id, name, address, city, state, zip, lat, lng, phone, website)
        SELECT 
          UUID() as id,
          s1.venue as name,
          NULL as address,
          s1.city,
          s1.state,
          s1.zip,
          AVG(s1.lat) as lat,
          AVG(s1.lng) as lng,
          (SELECT venuePhone FROM shows s2 
           WHERE s2.venue = s1.venue AND s2.city = s1.city AND s2.state = s1.state 
           AND s2.venuePhone IS NOT NULL AND s2.venuePhone != '' 
           ORDER BY s2.venuePhone LIMIT 1) as phone,
          (SELECT venueWebsite FROM shows s3 
           WHERE s3.venue = s1.venue AND s3.city = s1.city AND s3.state = s1.state 
           AND s3.venueWebsite IS NOT NULL AND s3.venueWebsite != '' 
           ORDER BY s3.venueWebsite LIMIT 1) as website
        FROM shows s1
        WHERE (s1.address IS NULL OR s1.address = '')
          AND s1.venue IS NOT NULL 
          AND s1.venue != ''
          AND s1.isActive = 1
          AND s1.venue NOT IN (SELECT name FROM venues WHERE address IS NULL)
        GROUP BY s1.venue, s1.city, s1.state, s1.zip
      `);

      const newVenueCount = await dataSource.query(`SELECT COUNT(*) as count FROM venues`);
      console.log(`✅ Created ${newVenueCount[0].count} venues`);
    } else {
      console.log(`✅ Found ${venueCount[0].count} existing venues`);
    }

    // Link shows to venues
    console.log('🔗 Linking shows to venues...');

    // Link by address first
    const linkedByAddress = await dataSource.query(`
      UPDATE shows s
      INNER JOIN venues v ON (
        s.address = v.address AND 
        s.city = v.city AND 
        s.state = v.state
      )
      SET s.venueId = v.id
      WHERE s.address IS NOT NULL 
        AND s.address != ''
        AND s.venueId IS NULL
    `);

    // Link by venue name for shows without addresses
    const linkedByName = await dataSource.query(`
      UPDATE shows s
      INNER JOIN venues v ON (
        s.venue = v.name AND 
        s.city = v.city AND 
        s.state = v.state AND
        v.address IS NULL
      )
      SET s.venueId = v.id
      WHERE (s.address IS NULL OR s.address = '')
        AND s.venue IS NOT NULL 
        AND s.venue != ''
        AND s.venueId IS NULL
    `);

    // Check results
    const linkedShows = await dataSource.query(
      `SELECT COUNT(*) as count FROM shows WHERE venueId IS NOT NULL`,
    );
    const unlinkedShows = await dataSource.query(
      `SELECT COUNT(*) as count FROM shows WHERE venueId IS NULL AND isActive = 1`,
    );
    const finalVenueCount = await dataSource.query(`SELECT COUNT(*) as count FROM venues`);

    console.log('🎉 Migration Summary:');
    console.log(`📊 Total venues: ${finalVenueCount[0].count}`);
    console.log(`🔗 Shows linked to venues: ${linkedShows[0].count}`);
    console.log(`⚠️  Active shows without venues: ${unlinkedShows[0].count}`);

    if (unlinkedShows[0].count > 0) {
      console.log('📋 Unlinked shows (for manual review):');
      const unlinked = await dataSource.query(`
        SELECT id, venue, address, city, state 
        FROM shows 
        WHERE venueId IS NULL AND isActive = 1 
        LIMIT 5
      `);
      unlinked.forEach((show) => {
        console.log(
          `   - ${show.venue || 'No venue'} at ${show.address || 'No address'}, ${show.city || 'No city'}, ${show.state || 'No state'}`,
        );
      });
    }

    console.log('✅ Venue migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await app.close();
  }
}

runVenueMigrations().catch(console.error);
