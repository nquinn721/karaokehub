import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCoordinatesToShows1755137000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add latitude column
    await queryRunner.query(
      `ALTER TABLE shows ADD COLUMN lat DECIMAL(10,8) NULL COMMENT 'Latitude coordinate'`,
    );

    // Add longitude column
    await queryRunner.query(
      `ALTER TABLE shows ADD COLUMN lng DECIMAL(11,8) NULL COMMENT 'Longitude coordinate'`,
    );

    // Add index for geospatial queries if needed in the future
    await queryRunner.query(`CREATE INDEX IDX_shows_coordinates ON shows (lat, lng)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop the index
    await queryRunner.query(`DROP INDEX IDX_shows_coordinates ON shows`);

    // Drop the longitude column
    await queryRunner.query(`ALTER TABLE shows DROP COLUMN lng`);

    // Drop the latitude column
    await queryRunner.query(`ALTER TABLE shows DROP COLUMN lat`);
  }
}
