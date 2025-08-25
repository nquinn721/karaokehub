import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveImageUrlFromShows1724414300000 implements MigrationInterface {
  name = 'RemoveImageUrlFromShows1724414300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Remove imageUrl column from shows table since we only use source for CDN URLs
    await queryRunner.query(`ALTER TABLE \`shows\` DROP COLUMN \`imageUrl\``);

    // Update source column to TEXT type to handle long CDN URLs
    await queryRunner.query(`ALTER TABLE \`shows\` MODIFY COLUMN \`source\` TEXT`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Add imageUrl column back as TEXT type
    await queryRunner.query(`ALTER TABLE \`shows\` ADD COLUMN \`imageUrl\` TEXT`);

    // Revert source column back to VARCHAR(255)
    await queryRunner.query(`ALTER TABLE \`shows\` MODIFY COLUMN \`source\` VARCHAR(255)`);
  }
}
