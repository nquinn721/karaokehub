import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableColumn,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class SeparateVenueFromShow1705123456789 implements MigrationInterface {
  name = 'SeparateVenueFromShow1705123456789';

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('🏢 Starting venue-show separation migration...');

    // 1. Create venues table
    await queryRunner.createTable(
      new Table({
        name: 'venues',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'name',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'address',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'city',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'state',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'zip',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'lat',
            type: 'decimal',
            precision: 10,
            scale: 8,
            isNullable: true,
          },
          {
            name: 'lng',
            type: 'decimal',
            precision: 11,
            scale: 8,
            isNullable: true,
          },
          {
            name: 'phone',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'website',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'isActive',
            type: 'boolean',
            default: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
        indices: [
          new TableIndex({ name: 'IDX_venues_name', columnNames: ['name'] }),
          new TableIndex({ name: 'IDX_venues_address', columnNames: ['address'] }),
          new TableIndex({ name: 'IDX_venues_city_state', columnNames: ['city', 'state'] }),
          new TableIndex({ name: 'IDX_venues_location', columnNames: ['lat', 'lng'] }),
        ],
      }),
    );

    console.log('✅ Created venues table with indexes');

    // 2. Add venueId column to shows table
    await queryRunner.addColumn(
      'shows',
      new TableColumn({
        name: 'venueId',
        type: 'uuid',
        isNullable: true,
      }),
    );

    console.log('✅ Added venueId column to shows table');

    // 3. Create venues from existing show data (group by address for uniqueness)
    console.log('📊 Creating venues from existing show data...');

    // First, create venues for shows with addresses (primary grouping)
    await queryRunner.query(`
      INSERT INTO venues (name, address, city, state, zip, lat, lng, phone, website)
      SELECT 
        COALESCE(
          (array_agg("venue" ORDER BY CASE WHEN "venue" IS NOT NULL THEN 0 ELSE 1 END, "venue"))[1],
          'Venue at ' || COALESCE("address", 'Unknown Location')
        ) as name,
        "address" as address,
        "city" as city,
        "state" as state,
        "zip" as zip,
        AVG("lat") as lat,
        AVG("lng") as lng,
        (array_agg("venuePhone" ORDER BY CASE WHEN "venuePhone" IS NOT NULL THEN 0 ELSE 1 END, "venuePhone"))[1] as phone,
        (array_agg("venueWebsite" ORDER BY CASE WHEN "venueWebsite" IS NOT NULL THEN 0 ELSE 1 END, "venueWebsite"))[1] as website
      FROM shows 
      WHERE "address" IS NOT NULL
        AND "address" != ''
        AND "isActive" = true
      GROUP BY "address", "city", "state", "zip"
    `);

    // Second, create venues for shows without addresses (group by venue name + location)
    await queryRunner.query(`
      INSERT INTO venues (name, address, city, state, zip, lat, lng, phone, website)
      SELECT 
        COALESCE("venue", 'Unknown Venue') as name,
        NULL as address,
        "city" as city,
        "state" as state,
        "zip" as zip,
        AVG("lat") as lat,
        AVG("lng") as lng,
        (array_agg("venuePhone" ORDER BY CASE WHEN "venuePhone" IS NOT NULL THEN 0 ELSE 1 END, "venuePhone"))[1] as phone,
        (array_agg("venueWebsite" ORDER BY CASE WHEN "venueWebsite" IS NOT NULL THEN 0 ELSE 1 END, "venueWebsite"))[1] as website
      FROM shows 
      WHERE ("address" IS NULL OR "address" = '')
        AND "venue" IS NOT NULL
        AND "venue" != ''
        AND "isActive" = true
      GROUP BY "venue", "city", "state", "zip"
    `);

    console.log('✅ Created venues from existing show data');

    // 4. Link shows to venues (by address first, then by venue name + location)
    console.log('🔗 Linking shows to venues...');

    // Link shows with addresses
    const addressLinked = await queryRunner.query(`
      UPDATE shows 
      SET "venueId" = venues.id
      FROM venues
      WHERE shows."address" IS NOT NULL 
        AND shows."address" != ''
        AND venues.address = shows."address"
        AND (venues.city = shows."city" OR (venues.city IS NULL AND shows."city" IS NULL))
        AND (venues.state = shows."state" OR (venues.state IS NULL AND shows."state" IS NULL))
    `);

    // Link remaining shows by venue name + location
    const nameLinked = await queryRunner.query(`
      UPDATE shows 
      SET "venueId" = venues.id
      FROM venues
      WHERE shows."venueId" IS NULL
        AND (shows."address" IS NULL OR shows."address" = '')
        AND shows."venue" IS NOT NULL
        AND shows."venue" != ''
        AND venues.name = shows."venue"
        AND (venues.city = shows."city" OR (venues.city IS NULL AND shows."city" IS NULL))
        AND (venues.state = shows."state" OR (venues.state IS NULL AND shows."state" IS NULL))
    `);

    console.log('✅ Linked shows to venues');

    // 5. Add foreign key constraint
    await queryRunner.createForeignKey(
      'shows',
      new TableForeignKey({
        columnNames: ['venueId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'venues',
        onDelete: 'SET NULL',
      }),
    );

    // 6. Create index on venueId
    await queryRunner.createIndex(
      'shows',
      new TableIndex({ name: 'IDX_shows_venue_id', columnNames: ['venueId'] }),
    );

    console.log('✅ Added foreign key constraint and index');

    // 7. Rename existing venue columns to legacy columns for safe transition
    console.log('🔄 Renaming columns to legacy format...');

    await queryRunner.renameColumn('shows', 'venue', 'legacyVenue');
    await queryRunner.renameColumn('shows', 'address', 'legacyAddress');
    await queryRunner.renameColumn('shows', 'city', 'legacyCity');
    await queryRunner.renameColumn('shows', 'state', 'legacyState');
    await queryRunner.renameColumn('shows', 'zip', 'legacyZip');
    await queryRunner.renameColumn('shows', 'venuePhone', 'legacyVenuePhone');
    await queryRunner.renameColumn('shows', 'venueWebsite', 'legacyVenueWebsite');
    await queryRunner.renameColumn('shows', 'lat', 'legacyLat');
    await queryRunner.renameColumn('shows', 'lng', 'legacyLng');

    console.log('✅ Renamed columns to legacy format');

    // 8. Generate migration summary
    const venueCount = await queryRunner.query('SELECT COUNT(*) as count FROM venues');
    const linkedShows = await queryRunner.query(
      'SELECT COUNT(*) as count FROM shows WHERE "venueId" IS NOT NULL',
    );
    const unlinkedShows = await queryRunner.query(
      'SELECT COUNT(*) as count FROM shows WHERE "venueId" IS NULL AND "isActive" = true',
    );

    console.log('\n🎉 Migration Summary:');
    console.log(`📊 Venues created: ${venueCount[0].count}`);
    console.log(`🔗 Shows linked to venues: ${linkedShows[0].count}`);
    console.log(`⚠️  Active shows without venues: ${unlinkedShows[0].count}`);
    console.log('✅ Venue-Show separation migration completed successfully!');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('🔄 Reverting venue-show separation migration...');

    // 1. Drop foreign key constraint
    const table = await queryRunner.getTable('shows');
    const foreignKey = table.foreignKeys.find((fk) => fk.columnNames.indexOf('venueId') !== -1);
    if (foreignKey) {
      await queryRunner.dropForeignKey('shows', foreignKey);
    }

    // 2. Drop index
    await queryRunner.dropIndex('shows', 'IDX_shows_venue_id');

    // 3. Rename legacy columns back
    await queryRunner.renameColumn('shows', 'legacyVenue', 'venue');
    await queryRunner.renameColumn('shows', 'legacyAddress', 'address');
    await queryRunner.renameColumn('shows', 'legacyCity', 'city');
    await queryRunner.renameColumn('shows', 'legacyState', 'state');
    await queryRunner.renameColumn('shows', 'legacyZip', 'zip');
    await queryRunner.renameColumn('shows', 'legacyVenuePhone', 'venuePhone');
    await queryRunner.renameColumn('shows', 'legacyVenueWebsite', 'venueWebsite');
    await queryRunner.renameColumn('shows', 'legacyLat', 'lat');
    await queryRunner.renameColumn('shows', 'legacyLng', 'lng');

    // 4. Drop venueId column
    await queryRunner.dropColumn('shows', 'venueId');

    // 5. Drop venues table
    await queryRunner.dropTable('venues');

    console.log('✅ Venue-show separation migration reverted successfully!');
  }
}
