import { MigrationInterface, QueryRunner } from 'typeorm';

export class ReplaceUserSubmittedWithSubmittedBy1726009200000 implements MigrationInterface {
  name = 'ReplaceUserSubmittedWithSubmittedBy1726009200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add submittedBy columns to all entities
    await queryRunner.query(`ALTER TABLE \`vendors\` ADD \`submittedBy\` varchar(36) NULL`);
    await queryRunner.query(`ALTER TABLE \`venues\` ADD \`submittedBy\` varchar(36) NULL`);
    await queryRunner.query(`ALTER TABLE \`shows\` ADD \`submittedBy\` varchar(36) NULL`);
    await queryRunner.query(`ALTER TABLE \`djs\` ADD \`submittedBy\` varchar(36) NULL`);

    // Add foreign key constraints
    await queryRunner.query(
      `ALTER TABLE \`vendors\` ADD CONSTRAINT \`FK_vendors_submittedBy\` FOREIGN KEY (\`submittedBy\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`venues\` ADD CONSTRAINT \`FK_venues_submittedBy\` FOREIGN KEY (\`submittedBy\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`shows\` ADD CONSTRAINT \`FK_shows_submittedBy\` FOREIGN KEY (\`submittedBy\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`djs\` ADD CONSTRAINT \`FK_djs_submittedBy\` FOREIGN KEY (\`submittedBy\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`,
    );

    // Remove old userSubmitted columns
    await queryRunner.query(`ALTER TABLE \`vendors\` DROP COLUMN \`userSubmitted\``);
    await queryRunner.query(`ALTER TABLE \`venues\` DROP COLUMN \`userSubmitted\``);
    await queryRunner.query(`ALTER TABLE \`shows\` DROP COLUMN \`userSubmitted\``);
    await queryRunner.query(`ALTER TABLE \`djs\` DROP COLUMN \`userSubmitted\``);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Add back userSubmitted columns
    await queryRunner.query(
      `ALTER TABLE \`vendors\` ADD \`userSubmitted\` tinyint NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE \`venues\` ADD \`userSubmitted\` tinyint NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE \`shows\` ADD \`userSubmitted\` tinyint NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(`ALTER TABLE \`djs\` ADD \`userSubmitted\` tinyint NOT NULL DEFAULT 0`);

    // Remove foreign key constraints
    await queryRunner.query(`ALTER TABLE \`vendors\` DROP FOREIGN KEY \`FK_vendors_submittedBy\``);
    await queryRunner.query(`ALTER TABLE \`venues\` DROP FOREIGN KEY \`FK_venues_submittedBy\``);
    await queryRunner.query(`ALTER TABLE \`shows\` DROP FOREIGN KEY \`FK_shows_submittedBy\``);
    await queryRunner.query(`ALTER TABLE \`djs\` DROP FOREIGN KEY \`FK_djs_submittedBy\``);

    // Remove submittedBy columns
    await queryRunner.query(`ALTER TABLE \`vendors\` DROP COLUMN \`submittedBy\``);
    await queryRunner.query(`ALTER TABLE \`venues\` DROP COLUMN \`submittedBy\``);
    await queryRunner.query(`ALTER TABLE \`shows\` DROP COLUMN \`submittedBy\``);
    await queryRunner.query(`ALTER TABLE \`djs\` DROP COLUMN \`submittedBy\``);
  }
}
