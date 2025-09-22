import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixAvatarUuidData1737451000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('🔧 Starting Avatar UUID Data Fix Migration...');

    try {
      // 1. Check if avatars table has proper UUID structure
      console.log('📊 Checking avatars table structure...');
      const avatarsCount = await queryRunner.query(`
        SELECT COUNT(*) as count FROM avatars WHERE isAvailable = 1
      `);
      console.log(`Found ${avatarsCount[0].count} available avatars`);

      // 2. Fix any user_avatars records that might have wrong column mapping
      console.log('🔄 Fixing user_avatars data consistency...');

      // Update any records where avatarId is empty but baseAvatarId has data
      const fixedRecords = await queryRunner.query(`
        UPDATE user_avatars 
        SET avatarId = baseAvatarId 
        WHERE (avatarId IS NULL OR avatarId = '') 
        AND baseAvatarId IS NOT NULL 
        AND baseAvatarId != ''
      `);
      console.log(`Fixed ${fixedRecords.affectedRows || 0} user_avatars records`);

      // 3. Ensure all users have valid equipped avatars
      console.log('👤 Checking user equipped avatars...');

      // Get users with invalid equipped avatar references
      const usersWithInvalidAvatars = await queryRunner.query(`
        SELECT u.id, u.stageName, u.equippedAvatarId
        FROM users u
        LEFT JOIN avatars a ON u.equippedAvatarId = a.id
        WHERE u.equippedAvatarId IS NOT NULL 
        AND a.id IS NULL
      `);

      if (usersWithInvalidAvatars.length > 0) {
        console.log(`Found ${usersWithInvalidAvatars.length} users with invalid avatar references`);

        // Get the first available avatar to use as default
        const defaultAvatar = await queryRunner.query(`
          SELECT id FROM avatars 
          WHERE isAvailable = 1 AND isFree = 1 
          ORDER BY name ASC 
          LIMIT 1
        `);

        if (defaultAvatar.length > 0) {
          const defaultAvatarId = defaultAvatar[0].id;
          console.log(`Using default avatar: ${defaultAvatarId}`);

          // Fix users with invalid avatar references
          await queryRunner.query(
            `
            UPDATE users 
            SET equippedAvatarId = ? 
            WHERE equippedAvatarId IS NOT NULL 
            AND equippedAvatarId NOT IN (SELECT id FROM avatars)
          `,
            [defaultAvatarId],
          );

          console.log('✅ Fixed users with invalid avatar references');
        }
      } else {
        console.log('✅ All user avatar references are valid');
      }

      // 4. Ensure all users have at least one user_avatars record for their equipped avatar
      console.log('🎭 Ensuring user_avatars records exist...');

      const usersNeedingAvatarRecords = await queryRunner.query(`
        SELECT u.id, u.equippedAvatarId
        FROM users u
        LEFT JOIN user_avatars ua ON u.id = ua.userId AND u.equippedAvatarId = ua.avatarId
        WHERE u.equippedAvatarId IS NOT NULL
        AND ua.id IS NULL
      `);

      for (const user of usersNeedingAvatarRecords) {
        await queryRunner.query(
          `
          INSERT INTO user_avatars (id, userId, avatarId, acquiredAt)
          VALUES (UUID(), ?, ?, NOW())
        `,
          [user.id, user.equippedAvatarId],
        );
      }

      if (usersNeedingAvatarRecords.length > 0) {
        console.log(`✅ Created ${usersNeedingAvatarRecords.length} missing user_avatars records`);
      }

      // 5. Verify data integrity
      console.log('🔍 Verifying data integrity...');

      const finalCheck = await queryRunner.query(`
        SELECT 
          (SELECT COUNT(*) FROM avatars WHERE isAvailable = 1) as available_avatars,
          (SELECT COUNT(*) FROM users WHERE equippedAvatarId IS NOT NULL) as users_with_avatars,
          (SELECT COUNT(*) FROM user_avatars) as user_avatar_records,
          (SELECT COUNT(*) FROM users u LEFT JOIN avatars a ON u.equippedAvatarId = a.id WHERE u.equippedAvatarId IS NOT NULL AND a.id IS NULL) as invalid_references
      `);

      const stats = finalCheck[0];
      console.log('📊 Final Statistics:');
      console.log(`   - Available avatars: ${stats.available_avatars}`);
      console.log(`   - Users with avatars: ${stats.users_with_avatars}`);
      console.log(`   - User avatar records: ${stats.user_avatar_records}`);
      console.log(`   - Invalid references: ${stats.invalid_references}`);

      if (stats.invalid_references > 0) {
        throw new Error(`Still have ${stats.invalid_references} invalid avatar references`);
      }

      console.log('✅ Avatar UUID Data Fix Migration completed successfully!');
    } catch (error) {
      console.error('❌ Avatar UUID Data Fix Migration failed:', error);
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('⚠️ Avatar UUID Data Fix Migration rollback - no action needed');
    // This migration only fixes data consistency, no rollback needed
  }
}
