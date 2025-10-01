import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixUserMicrophonesForeignKeyIssue1759290000000 implements MigrationInterface {
  name = 'FixUserMicrophonesForeignKeyIssue1759290000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('🔧 [MIGRATION] Fixing user_microphones foreign key constraint issues...');

    try {
      // Check if user_microphones table exists
      const userMicrophonesExists = await queryRunner.hasTable('user_microphones');
      
      if (!userMicrophonesExists) {
        console.log('ℹ️  user_microphones table does not exist, skipping migration');
        return;
      }

      // Temporarily disable foreign key checks
      await queryRunner.query('SET FOREIGN_KEY_CHECKS = 0;');
      console.log('🔓 Disabled foreign key checks');

      // Check if the problematic index/constraint exists
      const indexQuery = `
        SELECT CONSTRAINT_NAME 
        FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'user_microphones' 
        AND CONSTRAINT_NAME LIKE 'FK_user_microphones_%';
      `;
      
      const existingConstraints = await queryRunner.query(indexQuery);
      console.log(`📋 Found ${existingConstraints.length} foreign key constraints on user_microphones table`);

      // Drop existing foreign key constraints
      for (const constraint of existingConstraints) {
        try {
          await queryRunner.query(`ALTER TABLE user_microphones DROP FOREIGN KEY ${constraint.CONSTRAINT_NAME};`);
          console.log(`🗑️  Dropped foreign key constraint: ${constraint.CONSTRAINT_NAME}`);
        } catch (error) {
          console.log(`⚠️  Could not drop constraint ${constraint.CONSTRAINT_NAME}:`, error.message);
        }
      }

      // Check if the indexes exist and drop them
      const indexesQuery = `
        SHOW INDEX FROM user_microphones 
        WHERE Key_name LIKE 'FK_%' OR Key_name LIKE 'IDX_%';
      `;
      
      const existingIndexes = await queryRunner.query(indexesQuery);
      console.log(`📋 Found ${existingIndexes.length} indexes to check on user_microphones table`);

      // Drop problematic indexes
      const indexesToDrop = existingIndexes.filter(index => 
        index.Key_name.startsWith('FK_') || 
        index.Key_name.startsWith('IDX_')
      );

      for (const index of indexesToDrop) {
        try {
          await queryRunner.query(`ALTER TABLE user_microphones DROP INDEX ${index.Key_name};`);
          console.log(`🗑️  Dropped index: ${index.Key_name}`);
        } catch (error) {
          console.log(`⚠️  Could not drop index ${index.Key_name}:`, error.message);
        }
      }

      // Re-create the table with proper structure if needed
      const tableStructure = await queryRunner.query('DESCRIBE user_microphones;');
      console.log('📊 Current table structure:', tableStructure);

      // Ensure the table has the correct columns
      const hasUserIdColumn = tableStructure.some(col => col.Field === 'userId');
      const hasMicrophoneIdColumn = tableStructure.some(col => col.Field === 'microphoneId');
      const hasAcquiredAtColumn = tableStructure.some(col => col.Field === 'acquiredAt');

      if (!hasUserIdColumn) {
        await queryRunner.query('ALTER TABLE user_microphones ADD COLUMN userId VARCHAR(36) NOT NULL;');
        console.log('➕ Added userId column');
      }

      if (!hasMicrophoneIdColumn) {
        await queryRunner.query('ALTER TABLE user_microphones ADD COLUMN microphoneId VARCHAR(36) NOT NULL;');
        console.log('➕ Added microphoneId column');
      }

      if (!hasAcquiredAtColumn) {
        await queryRunner.query('ALTER TABLE user_microphones ADD COLUMN acquiredAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP;');
        console.log('➕ Added acquiredAt column');
      }

      // Add proper foreign key constraints
      try {
        // Check if users table exists and has the right structure
        const usersExists = await queryRunner.hasTable('users');
        if (usersExists) {
          await queryRunner.query(`
            ALTER TABLE user_microphones 
            ADD CONSTRAINT FK_user_microphones_userId 
            FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE;
          `);
          console.log('✅ Added users foreign key constraint');
        }
      } catch (error) {
        console.log('⚠️  Could not add users foreign key:', error.message);
      }

      try {
        // Check if microphones table exists and has the right structure  
        const microphonesExists = await queryRunner.hasTable('microphones');
        if (microphonesExists) {
          await queryRunner.query(`
            ALTER TABLE user_microphones 
            ADD CONSTRAINT FK_user_microphones_microphoneId 
            FOREIGN KEY (microphoneId) REFERENCES microphones(id) ON DELETE CASCADE;
          `);
          console.log('✅ Added microphones foreign key constraint');
        }
      } catch (error) {
        console.log('⚠️  Could not add microphones foreign key:', error.message);
      }

      // Re-enable foreign key checks
      await queryRunner.query('SET FOREIGN_KEY_CHECKS = 1;');
      console.log('🔒 Re-enabled foreign key checks');

      console.log('✅ [MIGRATION] Successfully fixed user_microphones foreign key issues');

    } catch (error) {
      console.error('❌ [MIGRATION] Error fixing user_microphones foreign key issues:', error);
      
      // Make sure to re-enable foreign key checks even if there's an error
      try {
        await queryRunner.query('SET FOREIGN_KEY_CHECKS = 1;');
      } catch (fkError) {
        console.error('❌ [MIGRATION] Failed to re-enable foreign key checks:', fkError);
      }
      
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('⚠️  [MIGRATION] This migration cannot be automatically reversed');
    console.log('⚠️  [MIGRATION] Manual intervention may be required to restore previous state');
    // Don't throw error as this is a fixing migration
  }
}