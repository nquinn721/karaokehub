import { MigrationInterface, QueryRunner } from 'typeorm';

export class PopulateUserAvatars1737450310000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create default avatar records for all existing users who don't have them
    await queryRunner.query(`
      INSERT INTO user_avatars (id, userId, avatarId, acquiredAt)
      SELECT
        UUID() as id,
        u.id as userId,
        'alex' as avatarId,
        NOW() as acquiredAt
      FROM users u
      LEFT JOIN user_avatars ua ON u.id = ua.userId
      WHERE ua.userId IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove the avatar records we created
    await queryRunner.query(`
      DELETE FROM user_avatars 
      WHERE avatarId = 'alex'
    `);
  }
}
