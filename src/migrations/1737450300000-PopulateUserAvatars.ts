import { MigrationInterface, QueryRunner } from 'typeorm';

export class PopulateUserAvatars1737450300000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create default avatar records for all existing users who don't have them
    await queryRunner.query(`
      INSERT INTO user_avatars (id, userId, baseAvatarId, isActive, createdAt, updatedAt)
      SELECT 
        UUID() as id,
        u.id as userId,
        'avatar_1' as baseAvatarId,
        true as isActive,
        NOW() as createdAt,
        NOW() as updatedAt
      FROM users u
      LEFT JOIN user_avatars ua ON u.id = ua.userId
      WHERE ua.userId IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove the avatar records we created
    await queryRunner.query(`
      DELETE FROM user_avatars 
      WHERE baseAvatarId = 'avatar_1' 
      AND microphoneId IS NULL 
      AND outfitId IS NULL 
      AND shoesId IS NULL
    `);
  }
}
