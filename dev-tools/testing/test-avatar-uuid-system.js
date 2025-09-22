#!/usr/bin/env node

/**
 * Test script to verify avatar UUID functionality
 * Tests the avatar system to ensure UUIDs work correctly
 */

const { createConnection } = require('typeorm');
require('dotenv').config();

async function testAvatarSystem() {
  console.log('🧪 Testing Avatar UUID System');
  console.log('==============================\n');

  try {
    // Create a test database connection
    const connection = await createConnection({
      type: 'mysql',
      host: process.env.DATABASE_HOST || 'localhost',
      port: process.env.DATABASE_PORT || 3306,
      username: process.env.DATABASE_USERNAME || 'admin',
      password: process.env.DATABASE_PASSWORD || 'password',
      database: process.env.DATABASE_NAME || 'karaoke-hub',
      synchronize: false,
    });

    console.log('✅ Database connection established');

    // Test 1: Check avatar count
    const avatarCount = await connection.query('SELECT COUNT(*) as count FROM avatars');
    console.log(`📊 Total avatars in database: ${avatarCount[0].count}`);

    // Test 2: Check avatar UUIDs and image URLs
    const avatars = await connection.query(`
      SELECT id, name, imageUrl, isFree, isAvailable 
      FROM avatars 
      WHERE isAvailable = 1 
      ORDER BY name 
      LIMIT 5
    `);

    console.log('\n🎭 Sample avatars:');
    avatars.forEach((avatar, index) => {
      console.log(`${index + 1}. ${avatar.name}`);
      console.log(`   ID: ${avatar.id}`);
      console.log(`   Image: ${avatar.imageUrl}`);
      console.log(`   Free: ${avatar.isFree ? 'Yes' : 'No'}`);
      console.log('');
    });

    // Test 3: Check user avatar assignments
    const userAvatars = await connection.query(`
      SELECT u.id as userId, u.stageName, u.equippedAvatarId, a.name as avatarName, a.imageUrl
      FROM users u
      LEFT JOIN avatars a ON u.equippedAvatarId = a.id
      WHERE u.equippedAvatarId IS NOT NULL
      LIMIT 3
    `);

    console.log('👤 User avatar assignments:');
    userAvatars.forEach((user, index) => {
      console.log(`${index + 1}. ${user.stageName || 'Unknown'}`);
      console.log(`   Avatar: ${user.avatarName || 'Not found'}`);
      console.log(`   Avatar ID: ${user.equippedAvatarId}`);
      console.log(`   Image URL: ${user.imageUrl || 'N/A'}`);
      console.log('');
    });

    // Test 4: Check for any broken avatar references
    const brokenRefs = await connection.query(`
      SELECT COUNT(*) as count
      FROM users u
      LEFT JOIN avatars a ON u.equippedAvatarId = a.id
      WHERE u.equippedAvatarId IS NOT NULL AND a.id IS NULL
    `);

    if (brokenRefs[0].count > 0) {
      console.log(`⚠️  Found ${brokenRefs[0].count} users with broken avatar references`);
    } else {
      console.log('✅ All user avatar references are valid');
    }

    await connection.close();

    console.log('\n🎉 Avatar system test completed successfully!');
    console.log("\n💡 If avatars still don't show in the UI:");
    console.log('   1. Check if the development server is running');
    console.log('   2. Check browser console for any JavaScript errors');
    console.log('   3. Check network tab for failed API requests');
    console.log('   4. Verify the avatar API endpoint returns data');
  } catch (error) {
    console.error('❌ Avatar system test failed:', error.message);

    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.log('\n💡 Database connection failed. Please check:');
      console.log('   - DATABASE_HOST, DATABASE_USERNAME, DATABASE_PASSWORD in .env');
      console.log('   - MySQL server is running');
      console.log('   - Database user has proper permissions');
    }
  }
}

// Run the test
testAvatarSystem();
