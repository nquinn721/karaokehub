// Debug script to test authentication loop issue
const axios = require('axios');

async function debugAuthFlow() {
  console.log('🔍 Debugging authentication loop issue...\n');

  const baseURL = 'http://localhost:8000';

  try {
    // 1. Test server availability
    console.log('1. Testing server availability...');
    const healthCheck = await axios.get(`${baseURL}/api/auth/profile`, {
      headers: { Authorization: 'Bearer invalid-token' },
      validateStatus: () => true, // Don't throw on 401
    });
    console.log(`   Server response: ${healthCheck.status} ${healthCheck.statusText}`);

    if (healthCheck.status === 401) {
      console.log('   ✅ Server is responding correctly to invalid tokens');
    } else {
      console.log(`   ⚠️  Unexpected response: ${healthCheck.status}`);
    }

    // 2. Test with a potentially valid token format but expired/invalid
    console.log('\n2. Testing with JWT-like token...');
    const fakeJWT =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

    const jwtTest = await axios.get(`${baseURL}/api/auth/profile`, {
      headers: { Authorization: `Bearer ${fakeJWT}` },
      validateStatus: () => true,
    });
    console.log(`   JWT test response: ${jwtTest.status} ${jwtTest.statusText}`);

    // 3. Check if there are any CORS issues
    console.log('\n3. Testing CORS...');
    const corsTest = await axios.options(`${baseURL}/api/auth/profile`, {
      validateStatus: () => true,
    });
    console.log(`   CORS response: ${corsTest.status}`);

    // 4. Test login endpoint
    console.log('\n4. Testing login endpoint with invalid credentials...');
    const loginTest = await axios.post(
      `${baseURL}/api/auth/login`,
      {
        email: 'test@test.com',
        password: 'invalid',
      },
      {
        validateStatus: () => true,
      },
    );
    console.log(`   Login test: ${loginTest.status} ${loginTest.statusText}`);
    console.log(`   Response: ${JSON.stringify(loginTest.data)}`);

    console.log('\n🔍 Debug complete. Check for:');
    console.log('   - Infinite redirects between /login and /dashboard');
    console.log('   - Token expiration issues');
    console.log('   - JWT validation failures');
    console.log('   - Server response inconsistencies');
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('❌ Server is not running on port 8000');
      console.log('   Start the server with: npm run start:dev');
    } else {
      console.error('❌ Error during debug:', error.message);
    }
  }
}

debugAuthFlow();
