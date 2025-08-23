import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateImageUrlSourceColumnTypes1724414218000 implements MigrationInterface {
  name = 'UpdateImageUrlSourceColumnTypes1724414218000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Update imageUrl column to TEXT type to handle long CDN URLs
    await queryRunner.query(`ALTER TABLE \`shows\` MODIFY COLUMN \`imageUrl\` TEXT`);

    // Update source column to TEXT type to handle long CDN URLs
    await queryRunner.query(`ALTER TABLE \`shows\` MODIFY COLUMN \`source\` TEXT`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert imageUrl column back to VARCHAR(255)
    await queryRunner.query(`ALTER TABLE \`shows\` MODIFY COLUMN \`imageUrl\` VARCHAR(255)`);

    // Revert source column back to VARCHAR(255)
    await queryRunner.query(`ALTER TABLE \`shows\` MODIFY COLUMN \`source\` VARCHAR(255)`);
  }
}
