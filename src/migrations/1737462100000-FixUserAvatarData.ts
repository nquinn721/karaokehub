import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixUserAvatarData1737462100000 implements MigrationInterface {
  name = 'FixUserAvatarData1737462100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('🔧 Fixing user avatar data...');

    // First, get the default avatar ID (Alex)
    const defaultAvatars = await queryRunner.query(`
      SELECT id FROM avatars WHERE name = 'Alex' LIMIT 1
    `);

    if (defaultAvatars.length === 0) {
      console.log('❌ No default avatar found! Skipping data fix.');
      return;
    }

    const defaultAvatarId = defaultAvatars[0].id;
    console.log(`Using default avatar ID: ${defaultAvatarId}`);

    // Update all user_avatars records that have empty/null avatarId
    const updateResult = await queryRunner.query(
      `
      UPDATE user_avatars 
      SET avatarId = ? 
      WHERE avatarId IS NULL OR avatarId = ''
    `,
      [defaultAvatarId],
    );

    console.log(`✅ Updated ${updateResult.affectedRows} user avatar records with default avatar`);

    // Clean up any duplicate records that might exist after the fix
    await queryRunner.query(`
      DELETE ua1 FROM user_avatars ua1
      INNER JOIN user_avatars ua2 
      WHERE ua1.id > ua2.id 
      AND ua1.userId = ua2.userId 
      AND ua1.avatarId = ua2.avatarId
    `);

    console.log('✅ Cleaned up duplicate user avatar records');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // This migration fixes data integrity, so we won't reverse it
    console.log('Data fix migration - no rollback needed');
  }
}
