import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserSubmittedFields1756601625926 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add userSubmitted column to vendors table
    await queryRunner.query(
      `ALTER TABLE \`vendors\` ADD \`userSubmitted\` tinyint NOT NULL DEFAULT 0`,
    );

    // Add userSubmitted column to djs table
    await queryRunner.query(`ALTER TABLE \`djs\` ADD \`userSubmitted\` tinyint NOT NULL DEFAULT 0`);

    // Add userSubmitted column to shows table
    await queryRunner.query(
      `ALTER TABLE \`shows\` ADD \`userSubmitted\` tinyint NOT NULL DEFAULT 0`,
    );

    // Add userSubmitted column to venues table
    await queryRunner.query(
      `ALTER TABLE \`venues\` ADD \`userSubmitted\` tinyint NOT NULL DEFAULT 0`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove userSubmitted column from venues table
    await queryRunner.query(`ALTER TABLE \`venues\` DROP COLUMN \`userSubmitted\``);

    // Remove userSubmitted column from shows table
    await queryRunner.query(`ALTER TABLE \`shows\` DROP COLUMN \`userSubmitted\``);

    // Remove userSubmitted column from djs table
    await queryRunner.query(`ALTER TABLE \`djs\` DROP COLUMN \`userSubmitted\``);

    // Remove userSubmitted column from vendors table
    await queryRunner.query(`ALTER TABLE \`vendors\` DROP COLUMN \`userSubmitted\``);
  }
}
