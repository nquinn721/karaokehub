import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserLocation1696348800000 implements MigrationInterface {
  name = 'AddUserLocation1696348800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`users\` 
      ADD COLUMN \`city\` varchar(255) NULL AFTER \`profileImageUrl\`,
      ADD COLUMN \`state\` varchar(255) NULL AFTER \`city\`
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`users\` 
      DROP COLUMN \`city\`,
      DROP COLUMN \`state\`
    `);
  }
}
