import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveAvatarFromUsers1737450200000 implements MigrationInterface {
  name = 'RemoveAvatarFromUsers1737450200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Remove the avatar column from users table
    await queryRunner.query(`ALTER TABLE \`users\` DROP COLUMN \`avatar\``);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Add the avatar column back if we need to rollback
    await queryRunner.query(`
      ALTER TABLE \`users\` 
      ADD COLUMN \`avatar\` varchar(255) DEFAULT 'avatar_1'
    `);
  }
}
