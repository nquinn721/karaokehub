import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixAvatarUuidData1737451000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('🔧 Starting Avatar UUID Data Fix Migration...');

    try {
      // 1. Check current avatar state and determine if we need UUID conversion
      console.log('📊 Checking avatars table structure...');
      const currentAvatars = await queryRunner.query(`
        SELECT id, name, type, rarity, price, coinPrice, isFree, isAvailable FROM avatars ORDER BY name
      `);
      console.log(`Found ${currentAvatars.length} avatars`);

      // Check if any avatar has non-UUID ID (shorter than UUID length or doesn't match UUID pattern)
      const needsUuidConversion = currentAvatars.some(avatar => 
        avatar.id.length < 36 || !avatar.id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
      );

      if (needsUuidConversion) {
        console.log('🔄 Converting avatar IDs to UUIDs and standardizing properties...');

        // Create temporary mapping table
        await queryRunner.query(`
          CREATE TEMPORARY TABLE avatar_id_mapping (
            old_id VARCHAR(255),
            new_uuid VARCHAR(36),
            avatar_name VARCHAR(255)
          )
        `);

        // Generate new UUIDs for each avatar
        for (const avatar of currentAvatars) {
          const newUuid = await queryRunner.query('SELECT UUID() as uuid');
          await queryRunner.query(
            'INSERT INTO avatar_id_mapping (old_id, new_uuid, avatar_name) VALUES (?, ?, ?)',
            [avatar.id, newUuid[0].uuid, avatar.name]
          );
        }

        // Show mapping
        const mapping = await queryRunner.query('SELECT * FROM avatar_id_mapping ORDER BY avatar_name');
        console.log('ID Mapping created:', mapping);

        // Update user_avatars table first (foreign key references)
        console.log('🔗 Updating user_avatars references...');
        await queryRunner.query(`
          UPDATE user_avatars ua
          JOIN avatar_id_mapping aim ON ua.avatarId = aim.old_id
          SET ua.avatarId = aim.new_uuid
        `);

        // Also update baseAvatarId if it exists
        await queryRunner.query(`
          UPDATE user_avatars ua
          JOIN avatar_id_mapping aim ON ua.baseAvatarId = aim.old_id
          SET ua.baseAvatarId = aim.new_uuid
          WHERE ua.baseAvatarId IS NOT NULL
        `);

        // Update users table equipped avatar references
        console.log('👤 Updating user equipped avatar references...');
        await queryRunner.query(`
          UPDATE users u
          JOIN avatar_id_mapping aim ON u.equippedAvatarId = aim.old_id
          SET u.equippedAvatarId = aim.new_uuid
        `);

        // Update avatars table with new UUIDs and standardize all properties
        console.log('🎭 Updating avatars table with UUIDs and standardizing properties...');
        await queryRunner.query(`
          UPDATE avatars a
          JOIN avatar_id_mapping aim ON a.id = aim.old_id
          SET 
            a.id = aim.new_uuid,
            a.type = 'basic',
            a.rarity = 'common', 
            a.price = 0.00,
            a.coinPrice = 0,
            a.isFree = 1,
            a.isAvailable = 1
        `);

        // Clean up mapping table
        await queryRunner.query('DROP TEMPORARY TABLE avatar_id_mapping');
        
        console.log('✅ Avatar UUID conversion and standardization completed');
      } else {
        console.log('✅ Avatar IDs are already UUIDs, standardizing properties only...');
        
        // Just standardize the properties for all avatars
        await queryRunner.query(`
          UPDATE avatars 
          SET 
            type = 'basic',
            rarity = 'common', 
            price = 0.00,
            coinPrice = 0,
            isFree = 1,
            isAvailable = 1
        `);
        console.log('✅ Avatar properties standardized');
      }

      // 2. Clean up any invalid user_avatars records
      console.log('🧹 Cleaning up invalid user_avatars records...');
      const deletedInvalid = await queryRunner.query(`
        DELETE ua FROM user_avatars ua
        LEFT JOIN avatars a ON ua.avatarId = a.id
        WHERE a.id IS NULL
      `);
      console.log(`Deleted ${deletedInvalid.affectedRows || 0} invalid user_avatars records`);

      // 3. Fix users with invalid equipped avatars
      console.log('👤 Fixing users with invalid equipped avatars...');
      const defaultAvatar = await queryRunner.query(`
        SELECT id FROM avatars 
        WHERE isAvailable = 1 AND isFree = 1 
        ORDER BY name ASC 
        LIMIT 1
      `);

      if (defaultAvatar.length > 0) {
        const defaultAvatarId = defaultAvatar[0].id;
        const fixedUsers = await queryRunner.query(
          `
          UPDATE users 
          SET equippedAvatarId = ? 
          WHERE equippedAvatarId IS NOT NULL 
          AND equippedAvatarId NOT IN (SELECT id FROM avatars)
        `,
          [defaultAvatarId],
        );
        console.log(`Fixed ${fixedUsers.affectedRows || 0} users with invalid equipped avatars`);
      }

      // 4. Ensure all users have user_avatars records for their equipped avatar
      console.log('🎭 Ensuring user_avatars records exist...');
      const usersNeedingAvatarRecords = await queryRunner.query(`
        SELECT u.id, u.equippedAvatarId
        FROM users u
        LEFT JOIN user_avatars ua ON u.id = ua.userId AND u.equippedAvatarId = ua.avatarId
        WHERE u.equippedAvatarId IS NOT NULL
        AND ua.id IS NULL
        AND u.equippedAvatarId IN (SELECT id FROM avatars)
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

      // 5. Final verification
      console.log('🔍 Final verification...');

      // 5. Final verification
      console.log('🔍 Final verification...');

      const finalCheck = await queryRunner.query(`
        SELECT 
          (SELECT COUNT(*) FROM avatars WHERE isAvailable = 1) as available_avatars,
          (SELECT COUNT(*) FROM avatars WHERE type = 'basic' AND rarity = 'common' AND isFree = 1) as standardized_avatars,
          (SELECT COUNT(*) FROM users WHERE equippedAvatarId IS NOT NULL) as users_with_avatars,
          (SELECT COUNT(*) FROM user_avatars) as user_avatar_records,
          (SELECT COUNT(*) FROM users u LEFT JOIN avatars a ON u.equippedAvatarId = a.id WHERE u.equippedAvatarId IS NOT NULL AND a.id IS NULL) as invalid_references
      `);

      const stats = finalCheck[0];
      console.log('📊 Final Statistics:');
      console.log(`   - Available avatars: ${stats.available_avatars}`);
      console.log(`   - Standardized avatars: ${stats.standardized_avatars}`);
      console.log(`   - Users with avatars: ${stats.users_with_avatars}`);
      console.log(`   - User avatar records: ${stats.user_avatar_records}`);
      console.log(`   - Invalid references: ${stats.invalid_references}`);

      if (stats.invalid_references > 0) {
        throw new Error(`Still have ${stats.invalid_references} invalid avatar references`);
      }

      if (stats.standardized_avatars !== stats.available_avatars) {
        throw new Error(`Not all avatars are standardized: ${stats.standardized_avatars}/${stats.available_avatars}`);
      }

      // Show final avatar state
      const finalAvatars = await queryRunner.query(`
        SELECT id, name, type, rarity, price, coinPrice, isFree, isAvailable FROM avatars ORDER BY name
      `);
      console.log('🎭 Final Avatar State:');
      finalAvatars.forEach(avatar => {
        console.log(`   ${avatar.name}: ${avatar.type}/${avatar.rarity}/${avatar.isFree ? 'free' : 'paid'} (${avatar.id})`);
      });

      console.log('✅ Avatar UUID Data Fix Migration completed successfully!');
      console.log('   All avatars now have UUID IDs and are standardized as basic/common/free');
    } catch (error) {
      console.error('❌ Avatar UUID Data Fix Migration failed:', error);
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('⚠️ Avatar UUID Data Fix Migration rollback');
    console.log('   This migration cannot be safely rolled back as it converts IDs to UUIDs');
    console.log('   Manual intervention would be required to restore original state');
    // This migration cannot be safely rolled back due to UUID conversion
  }
}
