import { MigrationInterface, QueryRunner, TableColumn, TableForeignKey, TableIndex } from 'typeorm';

export class LinkShowsToVenues1705123500000 implements MigrationInterface {
  name = 'LinkShowsToVenues1705123500000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Add venueId column to shows table
    await queryRunner.addColumn(
      'shows',
      new TableColumn({
        name: 'venueId',
        type: 'uuid',
        isNullable: true,
      }),
    );

    // 2. Link shows to venues based on address matching
    await queryRunner.query(`
      UPDATE shows 
      SET "venueId" = v.id
      FROM venues v
      WHERE shows."address" = v.address
        AND shows."city" = v.city
        AND shows."state" = v.state
        AND shows."isActive" = true
    `);

    // 3. Count how many shows were linked
    const linkedShows = await queryRunner.query(`
      SELECT COUNT(*) as count FROM shows WHERE "venueId" IS NOT NULL
    `);
    console.log(`✅ Linked ${linkedShows[0].count} shows to venues`);

    // 4. Create foreign key constraint
    await queryRunner.createForeignKey(
      'shows',
      new TableForeignKey({
        columnNames: ['venueId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'venues',
        onDelete: 'SET NULL',
        name: 'FK_shows_venue',
      }),
    );

    // 5. Create index on venueId
    await queryRunner.createIndex(
      'shows',
      new TableIndex({
        name: 'IDX_shows_venue_id',
        columnNames: ['venueId'],
      }),
    );

    console.log('✅ Shows linked to venues successfully');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 1. Drop foreign key constraint
    await queryRunner.dropForeignKey('shows', 'FK_shows_venue');

    // 2. Drop index
    await queryRunner.dropIndex('shows', 'IDX_shows_venue_id');

    // 3. Drop venueId column
    await queryRunner.dropColumn('shows', 'venueId');
  }
}
