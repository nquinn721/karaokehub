import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateVenuesTable1705123400000 implements MigrationInterface {
  name = 'CreateVenuesTable1705123400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
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
          new TableIndex({ name: 'IDX_venues_city_state', columnNames: ['city', 'state'] }),
          new TableIndex({ name: 'IDX_venues_location', columnNames: ['lat', 'lng'] }),
          new TableIndex({
            name: 'IDX_venues_address_unique',
            columnNames: ['address', 'city', 'state'],
            isUnique: false,
          }),
        ],
      }),
    );

    // 2. Populate venues table from existing show data (unique by address)
    await queryRunner.query(`
      WITH unique_venues AS (
        SELECT DISTINCT ON (COALESCE("address", ''), COALESCE("city", ''), COALESCE("state", ''))
          COALESCE("venue", 'Unknown Venue') as name,
          "address",
          "city",
          "state",
          "zip",
          "lat",
          "lng",
          "venuePhone" as phone,
          "venueWebsite" as website
        FROM shows 
        WHERE "isActive" = true
          AND "address" IS NOT NULL 
          AND "city" IS NOT NULL 
          AND "state" IS NOT NULL
        ORDER BY 
          COALESCE("address", ''), 
          COALESCE("city", ''), 
          COALESCE("state", ''),
          CASE WHEN "venue" IS NOT NULL THEN 0 ELSE 1 END,
          "venue" ASC,
          "createdAt" ASC
      )
      INSERT INTO venues (name, address, city, state, zip, lat, lng, phone, website)
      SELECT name, address, city, state, zip, lat, lng, phone, website
      FROM unique_venues
    `);

    console.log('✅ Venues table created and populated from existing show data');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop venues table
    await queryRunner.dropTable('venues');
  }
}
