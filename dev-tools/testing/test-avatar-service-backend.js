#!/usr/bin/env node

/**
 * Debug script to test avatar service directly
 * This will help us see what's happening in the backend
 */

const { createConnection } = require('typeorm');
require('dotenv').config();

async function testAvatarService() {
  console.log('🧪 Testing Avatar Service Backend');
  console.log('==================================\n');

  try {
    const connection = await createConnection({
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

    // Test the actual logic from getAvailableAvatarsForUser
    const userId = '3df4e787-e2df-450b-be9c-417b6887d9aa'; // From the logs
    console.log(`🎭 Testing for userId: ${userId}`);

    // 1. Get all free avatars (same query as backend)
    console.log('\n1️⃣ Testing free avatars query...');
    const freeAvatars = await connection.query(`
      SELECT id, name, imageUrl, price, coinPrice, isAvailable, isFree 
      FROM avatars 
      WHERE isAvailable = 1 AND isFree = 1 
      ORDER BY id ASC
    `);
    console.log(`   Found ${freeAvatars.length} free avatars`);

    if (freeAvatars.length > 0) {
      console.log('   Sample free avatar:', {
        id: freeAvatars[0].id,
        name: freeAvatars[0].name,
        imageUrl: freeAvatars[0].imageUrl,
        isFree: freeAvatars[0].isFree,
        isAvailable: freeAvatars[0].isAvailable,
      });
    }

    // 2. Get user's owned avatars (same query as backend)
    console.log('\n2️⃣ Testing owned avatars query...');
    const ownedAvatars = await connection.query(
      `
      SELECT ua.id, ua.userId, ua.avatarId, a.id as avatar_id, a.name, a.imageUrl
      FROM user_avatars ua
      LEFT JOIN avatars a ON ua.avatarId = a.id
      WHERE ua.userId = ?
    `,
      [userId],
    );
    console.log(`   Found ${ownedAvatars.length} owned avatars for user`);

    if (ownedAvatars.length > 0) {
      console.log('   Sample owned avatar:', {
        userAvatarId: ownedAvatars[0].id,
        avatarId: ownedAvatars[0].avatarId,
        avatarName: ownedAvatars[0].name,
      });
    }

    // 3. Check if user exists
    console.log('\n3️⃣ Testing user existence...');
    const user = await connection.query(
      `
      SELECT id, email, stageName, equippedAvatarId 
      FROM users 
      WHERE id = ?
    `,
      [userId],
    );

    if (user.length > 0) {
      console.log('   ✅ User found:', {
        id: user[0].id,
        stageName: user[0].stageName,
        equippedAvatarId: user[0].equippedAvatarId,
      });
    } else {
      console.log('   ❌ User NOT found - this might be the issue!');
    }

    // 4. Test if user_avatars table exists
    console.log('\n4️⃣ Testing user_avatars table...');
    try {
      const tableCheck = await connection.query(`SHOW TABLES LIKE 'user_avatars'`);
      if (tableCheck.length > 0) {
        console.log('   ✅ user_avatars table exists');

        // Check total records in user_avatars
        const totalUserAvatars = await connection.query(
          `SELECT COUNT(*) as count FROM user_avatars`,
        );
        console.log(`   📊 Total user_avatars records: ${totalUserAvatars[0].count}`);
      } else {
        console.log('   ❌ user_avatars table does NOT exist - this is the issue!');
      }
    } catch (error) {
      console.log('   ❌ Error checking user_avatars table:', error.message);
    }

    await connection.close();

    console.log('\n🎯 DIAGNOSIS:');
    console.log('==============');

    if (freeAvatars.length === 0) {
      console.log('❌ Issue: No free avatars found');
      console.log('💡 Solution: Check avatar database seeding');
    } else if (user.length === 0) {
      console.log('❌ Issue: User not found in database');
      console.log('💡 Solution: Check user authentication/session');
    } else {
      console.log('✅ Free avatars and user both exist');
      console.log('💡 Issue might be in TypeORM entity relations or service logic');
    }
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testAvatarService();
