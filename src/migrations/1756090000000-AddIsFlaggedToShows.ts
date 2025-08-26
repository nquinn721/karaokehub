import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIsFlaggedToShows1756090000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE shows 
      ADD COLUMN isFlagged boolean NOT NULL DEFAULT false
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE shows 
      DROP COLUMN isFlagged
    `);
  }
}
