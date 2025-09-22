#!/usr/bin/env node

/**
 * Avatar UUID Data Fix - Direct Implementation
 * Runs the avatar data consistency fixes directly
 */

const { createConnection } = require('typeorm');
require('dotenv').config();

async function fixAvatarData() {
  console.log('🔧 Avatar UUID Data Fix');
  console.log('=======================\n');

  let connection;

  try {
    connection = await createConnection({
      type: 'mysql',
      host: process.env.DATABASE_HOST || 'localhost',
      port: process.env.DATABASE_PORT || 3306,
      username: process.env.DATABASE_USERNAME || 'admin',
      password: process.env.DATABASE_PASSWORD || 'password',
      database: process.env.DATABASE_NAME || 'karaoke-hub',
      synchronize: false,
      logging: false,
    });

    console.log('✅ Database connection established');

    // 1. Check avatars table
    console.log('\n📊 Checking avatars table...');
    const avatarsCount = await connection.query(`
      SELECT COUNT(*) as count FROM avatars WHERE isAvailable = 1
    `);
    console.log(`Found ${avatarsCount[0].count} available avatars`);

    // 2. Fix user_avatars data mapping
    console.log('\n🔄 Fixing user_avatars data consistency...');
    const fixResult = await connection.query(`
      UPDATE user_avatars 
      SET avatarId = baseAvatarId 
      WHERE (avatarId IS NULL OR avatarId = '') 
      AND baseAvatarId IS NOT NULL 
      AND baseAvatarId != ''
    `);
    console.log(`Fixed ${fixResult.affectedRows || 0} user_avatars records`);

    // 3. Check for users with invalid avatar references
    console.log('\n👤 Checking user equipped avatars...');
    const usersWithInvalidAvatars = await connection.query(`
      SELECT u.id, u.stageName, u.equippedAvatarId
      FROM users u
      LEFT JOIN avatars a ON u.equippedAvatarId = a.id
      WHERE u.equippedAvatarId IS NOT NULL 
      AND a.id IS NULL
    `);

    if (usersWithInvalidAvatars.length > 0) {
      console.log(`Found ${usersWithInvalidAvatars.length} users with invalid avatar references`);

      // Get default avatar
      const defaultAvatar = await connection.query(`
        SELECT id FROM avatars 
        WHERE isAvailable = 1 AND isFree = 1 
        ORDER BY name ASC 
        LIMIT 1
      `);

      if (defaultAvatar.length > 0) {
        const defaultAvatarId = defaultAvatar[0].id;
        console.log(`Using default avatar: ${defaultAvatarId}`);

        const updateResult = await connection.query(
          `
          UPDATE users 
          SET equippedAvatarId = ? 
          WHERE equippedAvatarId IS NOT NULL 
          AND equippedAvatarId NOT IN (SELECT id FROM avatars)
        `,
          [defaultAvatarId],
        );

        console.log(
          `✅ Fixed ${updateResult.affectedRows || 0} users with invalid avatar references`,
        );
      }
    } else {
      console.log('✅ All user avatar references are valid');
    }

    // 4. Ensure user_avatars records exist
    console.log('\n🎭 Ensuring user_avatars records exist...');
    const usersNeedingRecords = await connection.query(`
      SELECT u.id, u.equippedAvatarId
      FROM users u
      LEFT JOIN user_avatars ua ON u.id = ua.userId AND u.equippedAvatarId = ua.avatarId
      WHERE u.equippedAvatarId IS NOT NULL
      AND ua.id IS NULL
    `);

    if (usersNeedingRecords.length > 0) {
      console.log(`Creating ${usersNeedingRecords.length} missing user_avatars records...`);

      for (const user of usersNeedingRecords) {
        await connection.query(
          `
          INSERT INTO user_avatars (id, userId, avatarId, acquiredAt)
          VALUES (UUID(), ?, ?, NOW())
        `,
          [user.id, user.equippedAvatarId],
        );
      }
      console.log('✅ Created missing user_avatars records');
    } else {
      console.log('✅ All users have proper user_avatars records');
    }

    // 5. Final verification
    console.log('\n🔍 Final verification...');
    const stats = await connection.query(`
      SELECT 
        (SELECT COUNT(*) FROM avatars WHERE isAvailable = 1) as available_avatars,
        (SELECT COUNT(*) FROM users WHERE equippedAvatarId IS NOT NULL) as users_with_avatars,
        (SELECT COUNT(*) FROM user_avatars) as user_avatar_records,
        (SELECT COUNT(*) FROM users u LEFT JOIN avatars a ON u.equippedAvatarId = a.id WHERE u.equippedAvatarId IS NOT NULL AND a.id IS NULL) as invalid_references
    `);

    const result = stats[0];
    console.log('📊 Final Statistics:');
    console.log(`   - Available avatars: ${result.available_avatars}`);
    console.log(`   - Users with avatars: ${result.users_with_avatars}`);
    console.log(`   - User avatar records: ${result.user_avatar_records}`);
    console.log(`   - Invalid references: ${result.invalid_references}`);

    if (result.invalid_references > 0) {
      console.error(`❌ Still have ${result.invalid_references} invalid avatar references`);
      process.exit(1);
    }

    console.log('\n🎉 Avatar data fix completed successfully!');
  } catch (error) {
    console.error('❌ Avatar data fix failed:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.close();
      console.log('🔌 Database connection closed');
    }
  }
}

fixAvatarData();
