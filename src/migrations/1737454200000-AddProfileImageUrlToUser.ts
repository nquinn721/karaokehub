import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProfileImageUrlToUser1737454200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('🖼️  Adding profileImageUrl column to users table...');

    // Add profileImageUrl column to users table
    await queryRunner.query(`
      ALTER TABLE users 
      ADD COLUMN profileImageUrl VARCHAR(500) NULL
      COMMENT 'Profile image URL from OAuth providers (Google, Facebook, etc.)'
    `);

    console.log('✅ Successfully added profileImageUrl column to users table');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('🔄 Removing profileImageUrl column from users table...');

    await queryRunner.query(`
      ALTER TABLE users 
      DROP COLUMN profileImageUrl
    `);

    console.log('✅ Successfully removed profileImageUrl column from users table');
  }
}
