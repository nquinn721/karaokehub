import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixUserAvatarsConstraints1737462000000 implements MigrationInterface {
  name = 'FixUserAvatarsConstraints1737462000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('🔧 Fixing user_avatars table constraints...');

    // First, let's check if the problematic constraint exists
    const indexes = await queryRunner.query(`
      SELECT CONSTRAINT_NAME, COLUMN_NAME 
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'user_avatars' 
      AND CONSTRAINT_NAME = 'IDX_8e1c8161ffe23571cc8e52fe7a'
    `);

    // If the problematic constraint exists (unique on userId only), drop it
    if (indexes.length > 0) {
      console.log('Dropping problematic unique constraint on userId only...');
      await queryRunner.query(`
        ALTER TABLE user_avatars DROP INDEX IDX_8e1c8161ffe23571cc8e52fe7a
      `);
    }

    // Ensure we have the correct unique constraint on (userId, avatarId)
    const correctIndexExists = await queryRunner.query(`
      SELECT CONSTRAINT_NAME 
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'user_avatars' 
      AND CONSTRAINT_NAME = 'unique_user_avatar_combo'
    `);

    if (correctIndexExists.length === 0) {
      console.log('Adding correct unique constraint on (userId, avatarId)...');
      await queryRunner.query(`
        ALTER TABLE user_avatars 
        ADD CONSTRAINT unique_user_avatar_combo UNIQUE (userId, avatarId)
      `);
    }

    console.log('✅ User avatars constraints fixed!');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove the correct constraint and add back the problematic one
    await queryRunner.query(`
      ALTER TABLE user_avatars DROP INDEX unique_user_avatar_combo
    `);
    
    await queryRunner.query(`
      ALTER TABLE user_avatars ADD UNIQUE KEY IDX_8e1c8161ffe23571cc8e52fe7a (userId)
    `);
  }
}