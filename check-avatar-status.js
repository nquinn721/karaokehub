#!/usr/bin/env node

/**
 * Quick script to check avatar status in production
 * Run this after deployment to verify the fix worked
 */

const { createConnection } = require('typeorm');

async function checkAvatarStatus() {
  console.log('🔍 Checking Rockstar Alex avatar status...');

  try {
    // Use Cloud SQL connection settings from environment
    const connection = await createConnection({
      type: 'mysql',
      host: process.env.DATABASE_HOST,
      port: process.env.DATABASE_PORT || 3306,
      username: process.env.DATABASE_USERNAME,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME,
      socketPath: process.env.DATABASE_SOCKET_PATH,
      synchronize: false,
      logging: false,
    });

    console.log('✅ Connected to database');

    // Check all Rockstar Alex avatars
    const avatars = await connection.query(`
      SELECT id, name, imageUrl, type, rarity, coinPrice, isAvailable, isFree 
      FROM avatars 
      WHERE name LIKE '%Rockstar%Alex%' OR name LIKE '%Rockstar%Alexa%'
      ORDER BY name
    `);

    console.log('\n📊 Rockstar Alex Avatar Status:');
    console.log('================================');

    if (avatars.length === 0) {
      console.log('❌ No Rockstar Alex avatars found!');
    } else {
      avatars.forEach((avatar, index) => {
        console.log(`\n${index + 1}. ${avatar.name}`);
        console.log(`   ID: ${avatar.id}`);
        console.log(`   Image: ${avatar.imageUrl}`);
        console.log(`   Type: ${avatar.type} | Rarity: ${avatar.rarity}`);
        console.log(`   Price: ${avatar.coinPrice} coins`);
        console.log(`   Available: ${avatar.isAvailable ? 'Yes' : 'No'}`);
        console.log(`   Free: ${avatar.isFree ? 'Yes' : 'No'}`);

        // Check if this is correct
        if (
          avatar.name === 'Rockstar Alex' &&
          avatar.imageUrl === '/images/avatar/avatars/alex-rock.png'
        ) {
          console.log('   ✅ Status: CORRECT');
        } else if (avatar.name === 'Rockstar Alexa') {
          console.log('   ❌ Status: NEEDS FIX (wrong name)');
        } else {
          console.log('   ⚠️  Status: CHECK NEEDED');
        }
      });
    }

    // Check user impact
    const usersEquipped = await connection.query(`
      SELECT COUNT(*) as count
      FROM users u 
      INNER JOIN avatars a ON u.equippedAvatarId = a.id 
      WHERE a.name LIKE '%Rockstar%Alex%'
    `);

    const usersOwning = await connection.query(`
      SELECT COUNT(*) as count
      FROM user_avatars ua
      INNER JOIN avatars a ON ua.avatarId = a.id 
      WHERE a.name LIKE '%Rockstar%Alex%'
    `);

    console.log('\n👥 User Impact:');
    console.log('================');
    console.log(`Users with Rockstar Alex equipped: ${usersEquipped[0]?.count || 0}`);
    console.log(`Users who own Rockstar Alex: ${usersOwning[0]?.count || 0}`);

    await connection.close();
    console.log('\n✅ Avatar status check completed');
  } catch (error) {
    console.error('❌ Error checking avatar status:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  checkAvatarStatus();
}

module.exports = { checkAvatarStatus };
