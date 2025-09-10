const { default: fetch } = require('node-fetch');

async function testCurrentAuthState() {
  console.log('🔐 Testing current authentication state...');

  try {
    // Test if there's a valid session by checking the profile endpoint
    const profileResponse = await fetch('http://localhost:8000/api/auth/profile', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (profileResponse.ok) {
      const profileData = await profileResponse.json();
      console.log('✅ Found active session:', profileData.name);
      return profileData;
    } else {
      console.log('❌ No active session found');
      return null;
    }
  } catch (error) {
    console.log('💥 Error checking auth state:', error.message);
    return null;
  }
}

async function testWithValidToken() {
  console.log('\n🧪 Testing URL submission with authentication...');

  try {
    // Let's try to find a way to get a valid token
    // First, let's see if we can create a test user or login
    console.log('🔐 Attempting to create/login test user...');

    const loginResponse = await fetch('http://localhost:8000/api/auth/create-test-user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'testuser@example.com',
        password: 'password123',
        name: 'Test User',
      }),
    });

    if (loginResponse.ok) {
      const loginData = await loginResponse.json();
      console.log('✅ Test user created/found:', loginData.user?.name);

      if (loginData.token) {
        // Now test URL submission with this token
        const testUrl = `https://example.com/auth-test-${Date.now()}`;
        console.log('📝 Submitting URL with token:', testUrl);

        const submitResponse = await fetch('http://localhost:8000/api/parser/urls', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${loginData.token}`,
          },
          body: JSON.stringify({
            url: testUrl,
          }),
        });

        if (submitResponse.ok) {
          const submitData = await submitResponse.json();
          console.log('✅ Authenticated URL submission successful!');
          console.log('📊 Response:', JSON.stringify(submitData, null, 2));
        } else {
          console.log('❌ Authenticated URL submission failed:', await submitResponse.text());
        }
      }
    } else {
      console.log('❌ Test user creation failed:', await loginResponse.text());
    }
  } catch (error) {
    console.error('💥 Test failed:', error.message);
  }
}

async function main() {
  await testCurrentAuthState();
  await testWithValidToken();
}

main();
