import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveLatLngFromShows1734290400000 implements MigrationInterface {
  name = 'RemoveLatLngFromShows1734290400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`shows\` DROP COLUMN \`lat\``);
    await queryRunner.query(`ALTER TABLE \`shows\` DROP COLUMN \`lng\``);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`shows\` ADD \`lat\` decimal(10,8) NULL`);
    await queryRunner.query(`ALTER TABLE \`shows\` ADD \`lng\` decimal(11,8) NULL`);
  }
}
