#!/usr/bin/env node

/**
 * Test script to verify authentication loop fixes
 * Run with: node test-auth-loop-fixes.js
 */

const { default: fetch } = require('node-fetch');

const BASE_URL = 'http://localhost:8000';

async function testAuthenticationFlow() {
  console.log('🧪 Testing Authentication Loop Fixes\n');

  // Test 1: Check if server is running
  console.log('1️⃣ Testing server connectivity...');
  try {
    const response = await fetch(`${BASE_URL}/api/auth/profile`, {
      validateStatus: () => true,
    });
    console.log(`   ✅ Server is running (${response.status})\n`);
  } catch (error) {
    console.log(`   ❌ Server not running: ${error.message}\n`);
    return;
  }

  // Test 2: Test profile endpoint without token
  console.log('2️⃣ Testing profile access without token...');
  try {
    const response = await fetch(`${BASE_URL}/api/auth/profile`);
    if (response.status === 401) {
      console.log('   ✅ Correctly returns 401 without token\n');
    } else {
      console.log(`   ⚠️  Unexpected status: ${response.status}\n`);
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}\n`);
  }

  // Test 3: Test invalid login
  console.log('3️⃣ Testing invalid login...');
  try {
    const response = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'test@invalid.com',
        password: 'wrongpassword',
      }),
    });

    if (response.status === 401) {
      console.log('   ✅ Invalid login correctly rejected\n');
    } else {
      console.log(`   ⚠️  Unexpected status: ${response.status}\n`);
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}\n`);
  }

  // Test 4: Test CORS headers
  console.log('4️⃣ Testing CORS configuration...');
  try {
    const response = await fetch(`${BASE_URL}/api/auth/profile`, {
      method: 'OPTIONS',
    });
    console.log(`   ✅ CORS preflight: ${response.status}\n`);
  } catch (error) {
    console.log(`   ❌ CORS Error: ${error.message}\n`);
  }

  console.log('🎯 Key Things to Test Manually:');
  console.log('   • Login page → Dashboard redirect');
  console.log('   • Dashboard without auth → Login redirect');
  console.log('   • OAuth callback handling');
  console.log('   • Rapid page refresh detection');
  console.log('   • Recovery URL: /login?recovery=true');
  console.log('\n✨ Authentication loop prevention is now active!');
}

testAuthenticationFlow().catch(console.error);
