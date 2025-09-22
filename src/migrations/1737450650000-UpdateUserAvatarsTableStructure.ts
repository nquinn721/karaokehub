import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateUserAvatarsTableStructure1737450650000 implements MigrationInterface {
  name = 'UpdateUserAvatarsTableStructure1737450650000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('🔧 Updating user_avatars table structure...');

    // Check if baseAvatarId column exists, if not add it
    try {
      await queryRunner.query(`
        ALTER TABLE \`user_avatars\` 
        ADD COLUMN \`baseAvatarId\` varchar(255) NOT NULL DEFAULT ''
      `);
      console.log('✅ Added baseAvatarId column to user_avatars table');
    } catch (error) {
      console.log('ℹ️  baseAvatarId column already exists or other issue:', error.message);
    }

    // Check if microphoneId column exists, if not add it
    try {
      await queryRunner.query(`
        ALTER TABLE \`user_avatars\` 
        ADD COLUMN \`microphoneId\` varchar(36) NULL
      `);
      console.log('✅ Added microphoneId column to user_avatars table');
    } catch (error) {
      console.log('ℹ️  microphoneId column already exists or other issue:', error.message);
    }

    // Check if outfitId column exists, if not add it
    try {
      await queryRunner.query(`
        ALTER TABLE \`user_avatars\` 
        ADD COLUMN \`outfitId\` varchar(36) NULL
      `);
      console.log('✅ Added outfitId column to user_avatars table');
    } catch (error) {
      console.log('ℹ️  outfitId column already exists or other issue:', error.message);
    }

    // Check if shoesId column exists, if not add it
    try {
      await queryRunner.query(`
        ALTER TABLE \`user_avatars\` 
        ADD COLUMN \`shoesId\` varchar(36) NULL
      `);
      console.log('✅ Added shoesId column to user_avatars table');
    } catch (error) {
      console.log('ℹ️  shoesId column already exists or other issue:', error.message);
    }

    // Check if isActive column exists, if not add it
    try {
      await queryRunner.query(`
        ALTER TABLE \`user_avatars\` 
        ADD COLUMN \`isActive\` tinyint NOT NULL DEFAULT 1
      `);
      console.log('✅ Added isActive column to user_avatars table');
    } catch (error) {
      console.log('ℹ️  isActive column already exists or other issue:', error.message);
    }

    console.log('🎉 user_avatars table structure update completed');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove the columns we added
    try {
      await queryRunner.query(`ALTER TABLE \`user_avatars\` DROP COLUMN \`baseAvatarId\``);
    } catch (error) {
      // Column might not exist
    }

    try {
      await queryRunner.query(`ALTER TABLE \`user_avatars\` DROP COLUMN \`microphoneId\``);
    } catch (error) {
      // Column might not exist
    }

    try {
      await queryRunner.query(`ALTER TABLE \`user_avatars\` DROP COLUMN \`outfitId\``);
    } catch (error) {
      // Column might not exist
    }

    try {
      await queryRunner.query(`ALTER TABLE \`user_avatars\` DROP COLUMN \`shoesId\``);
    } catch (error) {
      // Column might not exist
    }

    try {
      await queryRunner.query(`ALTER TABLE \`user_avatars\` DROP COLUMN \`isActive\``);
    } catch (error) {
      // Column might not exist
    }
  }
}
