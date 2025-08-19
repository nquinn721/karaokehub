import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIsApprovedToUrlsToParse1735075200000 implements MigrationInterface {
  name = 'AddIsApprovedToUrlsToParse1735075200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`urls_to_parse\` ADD \`isApproved\` tinyint NOT NULL DEFAULT 0`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`urls_to_parse\` DROP COLUMN \`isApproved\``);
  }
}
