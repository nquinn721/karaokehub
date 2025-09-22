#!/usr/bin/env node

/**
 * Production Avatar Data Fix Script
 * Run this after deployment to fix avatar data in production
 */

const { createConnection } = require('typeorm');

async function fixProductionAvatarData() {
  console.log('🚀 Production Avatar UUID Data Fix');
  console.log('===================================\n');

  const connectionConfig = {
    type: 'mysql',
    // Production connection via Cloud SQL Proxy
    socketPath: process.env.DATABASE_SOCKET_PATH || '/cloudsql/heroic-footing-460117-k8:us-central1:karaokehub-db',
    username: process.env.DATABASE_USERNAME || 'admin',
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME || 'karaoke-hub',
    synchronize: false,
    logging: false,
  };

  let connection;
  
  try {
    console.log('🔌 Connecting to production database...');
    connection = await createConnection(connectionConfig);
    console.log('✅ Production database connection established');

    // 1. Check current avatar state
    console.log('\n📊 Checking production avatar data...');
    const avatarsCount = await connection.query(`
      SELECT COUNT(*) as count FROM avatars WHERE isAvailable = 1
    `);
    console.log(`Found ${avatarsCount[0].count} available avatars`);

    // 2. Check users
    const usersCount = await connection.query(`
      SELECT COUNT(*) as count FROM users WHERE equippedAvatarId IS NOT NULL
    `);
    console.log(`Found ${usersCount[0].count} users with equipped avatars`);

    // 3. Fix any user_avatars data mapping issues
    console.log('\n🔄 Fixing user_avatars data consistency...');
    const fixResult = await connection.query(`
      UPDATE user_avatars 
      SET avatarId = baseAvatarId 
      WHERE (avatarId IS NULL OR avatarId = '') 
      AND baseAvatarId IS NOT NULL 
      AND baseAvatarId != ''
    `);
    console.log(`Fixed ${fixResult.affectedRows || 0} user_avatars records`);

    // 4. Check for users with invalid avatar references
    console.log('\n🔍 Checking for invalid avatar references...');
    const invalidUsers = await connection.query(`
      SELECT u.id, u.email, u.equippedAvatarId
      FROM users u
      LEFT JOIN avatars a ON u.equippedAvatarId = a.id
      WHERE u.equippedAvatarId IS NOT NULL 
      AND a.id IS NULL
      LIMIT 5
    `);

    if (invalidUsers.length > 0) {
      console.log(`⚠️  Found ${invalidUsers.length} users with invalid avatar references`);
      
      // Get default avatar for fixing
      const defaultAvatar = await connection.query(`
        SELECT id, name FROM avatars 
        WHERE isAvailable = 1 AND isFree = 1 
        ORDER BY name ASC 
        LIMIT 1
      `);

      if (defaultAvatar.length > 0) {
        const defaultAvatarId = defaultAvatar[0].id;
        console.log(`🔧 Using default avatar: ${defaultAvatar[0].name} (${defaultAvatarId})`);

        const updateResult = await connection.query(`
          UPDATE users 
          SET equippedAvatarId = ? 
          WHERE equippedAvatarId IS NOT NULL 
          AND equippedAvatarId NOT IN (SELECT id FROM avatars)
        `, [defaultAvatarId]);

        console.log(`✅ Fixed ${updateResult.affectedRows || 0} users with invalid avatar references`);
      }
    } else {
      console.log('✅ All user avatar references are valid');
    }

    // 5. Ensure user_avatars records exist for all equipped avatars
    console.log('\n🎭 Ensuring user_avatars records exist...');
    const usersNeedingRecords = await connection.query(`
      SELECT u.id, u.equippedAvatarId
      FROM users u
      LEFT JOIN user_avatars ua ON u.id = ua.userId AND u.equippedAvatarId = ua.avatarId
      WHERE u.equippedAvatarId IS NOT NULL
      AND ua.id IS NULL
      LIMIT 10
    `);

    if (usersNeedingRecords.length > 0) {
      console.log(`🔧 Creating ${usersNeedingRecords.length} missing user_avatars records...`);
      
      for (const user of usersNeedingRecords) {
        await connection.query(`
          INSERT INTO user_avatars (id, userId, avatarId, acquiredAt)
          VALUES (UUID(), ?, ?, NOW())
        `, [user.id, user.equippedAvatarId]);
      }
      console.log('✅ Created missing user_avatars records');
    } else {
      console.log('✅ All users have proper user_avatars records');
    }

    // 6. Final verification
    console.log('\n📊 Final production verification...');
    const finalStats = await connection.query(`
      SELECT 
        (SELECT COUNT(*) FROM avatars WHERE isAvailable = 1) as available_avatars,
        (SELECT COUNT(*) FROM users WHERE equippedAvatarId IS NOT NULL) as users_with_avatars,
        (SELECT COUNT(*) FROM user_avatars) as user_avatar_records,
        (SELECT COUNT(*) FROM users u LEFT JOIN avatars a ON u.equippedAvatarId = a.id WHERE u.equippedAvatarId IS NOT NULL AND a.id IS NULL) as invalid_refs
    `);

    const stats = finalStats[0];
    console.log('📈 Production Statistics:');
    console.log(`   ✅ Available avatars: ${stats.available_avatars}`);
    console.log(`   👥 Users with avatars: ${stats.users_with_avatars}`);
    console.log(`   🎭 User avatar records: ${stats.user_avatar_records}`);
    console.log(`   ⚠️  Invalid references: ${stats.invalid_refs}`);

    if (stats.invalid_refs > 0) {
      console.error(`❌ Still have ${stats.invalid_refs} invalid avatar references!`);
      process.exit(1);
    }

    console.log('\n🎉 Production avatar data fix completed successfully!');
    console.log('   The avatar system is now ready for UUID-based operations');

  } catch (error) {
    console.error('❌ Production avatar data fix failed:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      sqlState: error.sqlState
    });
    process.exit(1);
  } finally {
    if (connection) {
      await connection.close();
      console.log('🔌 Production database connection closed');
    }
  }
}

// Only run if called directly (not imported)
if (require.main === module) {
  fixProductionAvatarData();
}

module.exports = { fixProductionAvatarData };