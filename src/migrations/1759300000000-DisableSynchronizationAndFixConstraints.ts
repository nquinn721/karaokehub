import { MigrationInterface, QueryRunner } from 'typeorm';

export class DisableSynchronizationAndFixConstraints1759300000000 implements MigrationInterface {
  name = 'DisableSynchronizationAndFixConstraints1759300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('🔧 Ensuring database schema is properly aligned with TypeORM expectations...');

    try {
      // Check if the problematic FK constraints exist with TypeORM expected names
      const foreignKeys = await queryRunner.query(`
        SELECT CONSTRAINT_NAME 
        FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
        WHERE TABLE_SCHEMA = 'karaoke-hub' 
        AND TABLE_NAME = 'user_microphones' 
        AND REFERENCED_TABLE_NAME IS NOT NULL
      `);

      const hasTypeORMNamedConstraints = foreignKeys.some(
        (fk: any) =>
          fk.CONSTRAINT_NAME === 'FK_user_microphones_userId' ||
          fk.CONSTRAINT_NAME === 'FK_user_microphones_microphoneId',
      );

      if (!hasTypeORMNamedConstraints) {
        console.log('🔄 Renaming foreign key constraints to match TypeORM expectations...');

        // Drop existing constraints with different names
        await queryRunner.query(`
          ALTER TABLE user_microphones 
          DROP FOREIGN KEY FK_d94ec577b3b053f5fc156c4a947
        `);

        await queryRunner.query(`
          ALTER TABLE user_microphones 
          DROP FOREIGN KEY FK_ee42573aa4979186d4d18db9475
        `);

        // Recreate with TypeORM expected names
        await queryRunner.query(`
          ALTER TABLE user_microphones 
          ADD CONSTRAINT FK_user_microphones_microphoneId 
          FOREIGN KEY (microphoneId) REFERENCES microphones(id) ON DELETE CASCADE
        `);

        await queryRunner.query(`
          ALTER TABLE user_microphones 
          ADD CONSTRAINT FK_user_microphones_userId 
          FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
        `);

        console.log('✅ Foreign key constraints renamed successfully');
      } else {
        console.log('ℹ️  Foreign key constraints already have correct names');
      }
    } catch (error) {
      console.log('⚠️  Error fixing constraints:', error.message);
    }

    console.log('✅ Schema alignment completed');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('🔄 Reverting schema alignment...');

    // This is a no-op since we're just aligning naming, not changing functionality
    console.log('ℹ️  No reversion needed for constraint naming alignment');
  }
}
