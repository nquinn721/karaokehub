import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIsValidToShows1724461874000 implements MigrationInterface {
  name = 'AddIsValidToShows1724461874000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`shows\` ADD \`isValid\` tinyint NOT NULL DEFAULT 1`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`shows\` DROP COLUMN \`isValid\``);
  }
}
