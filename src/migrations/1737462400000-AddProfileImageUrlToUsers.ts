import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProfileImageUrlToUsers1737462400000 implements MigrationInterface {
  name = 'AddProfileImageUrlToUsers1737462400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('👤 Adding profileImageUrl column to users table...');

    // Check if the column already exists
    const columns = await queryRunner.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'users' 
      AND COLUMN_NAME = 'profileImageUrl'
    `);

    if (columns.length === 0) {
      console.log('Adding profileImageUrl column...');
      await queryRunner.query(`
        ALTER TABLE users 
        ADD COLUMN profileImageUrl VARCHAR(255) NULL AFTER email
      `);
      console.log('✅ Added profileImageUrl column to users table');
    } else {
      console.log('profileImageUrl column already exists');
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('Removing profileImageUrl column from users table...');
    await queryRunner.query(`
      ALTER TABLE users DROP COLUMN profileImageUrl
    `);
  }
}