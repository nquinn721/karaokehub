#!/usr/bin/env node

/**
 * Test script to verify the JWT auth fix
 * Run with: node test-jwt-fix.js
 */

const { default: fetch } = require('node-fetch');

const BASE_URL = 'http://localhost:8000';

async function testJWTAuth() {
  console.log('🔐 Testing JWT Authentication Fix\n');

  try {
    // Test 1: Try to create a test user and login
    console.log('1️⃣ Attempting to create test user...');
    const createResponse = await fetch(`${BASE_URL}/api/auth/create-test-user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (createResponse.ok) {
      const userData = await createResponse.json();
      console.log(`   ✅ Test user created: ${userData.user?.email}\n`);

      // Test 2: Login with the test user
      console.log('2️⃣ Attempting login...');
      const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: userData.user.email,
          password: 'password123',
        }),
      });

      if (loginResponse.ok) {
        const loginData = await loginResponse.json();
        console.log(`   ✅ Login successful, token received\n`);

        // Test 3: Use the token to access profile
        console.log('3️⃣ Testing profile access with token...');
        const profileResponse = await fetch(`${BASE_URL}/api/auth/profile`, {
          headers: {
            Authorization: `Bearer ${loginData.token}`,
          },
        });

        if (profileResponse.ok) {
          const profileData = await profileResponse.json();
          console.log(`   ✅ Profile access successful: ${profileData.user?.email}`);
          console.log(`   ✅ User has ${profileData.user?.userAvatars?.length || 0} avatars`);
          console.log(`   ✅ JWT validation is working correctly!\n`);
        } else {
          const errorText = await profileResponse.text();
          console.log(`   ❌ Profile access failed: ${profileResponse.status} - ${errorText}\n`);
        }
      } else {
        const errorText = await loginResponse.text();
        console.log(`   ❌ Login failed: ${loginResponse.status} - ${errorText}\n`);
      }
    } else {
      const errorText = await createResponse.text();
      console.log(`   ℹ️  Test user creation: ${createResponse.status} - ${errorText}\n`);
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}\n`);
  }

  console.log('🎯 The JWT userAvatar → userAvatars relation fix should resolve the logout issue!');
}

testJWTAuth().catch(console.error);
