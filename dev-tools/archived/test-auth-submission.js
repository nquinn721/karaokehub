const { default: fetch } = require('node-fetch');

async function testAuthenticatedSubmission() {
  console.log('🧪 Testing authenticated URL submission...');

  try {
    // First, login to get a JWT token
    console.log('🔐 Logging in as Jeff...');
    const loginResponse = await fetch('http://localhost:8000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'jeff@jeff.com',
        password: 'password123', // You may need to adjust this password
      }),
    });

    if (!loginResponse.ok) {
      console.log('❌ Login failed:', await loginResponse.text());
      return;
    }

    const loginData = await loginResponse.json();
    console.log('✅ Login successful, user:', loginData.user.name);
    console.log('🎫 Token obtained (length):', loginData.token.length);

    // Now submit a URL with the token
    const testUrl = `https://example.com/jeff-test-${Date.now()}`;
    console.log('📝 Submitting URL:', testUrl);

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

    if (!submitResponse.ok) {
      console.log('❌ URL submission failed:', await submitResponse.text());
      return;
    }

    const submitData = await submitResponse.json();
    console.log('✅ URL submitted successfully');
    console.log('📊 Response data:', JSON.stringify(submitData, null, 2));
  } catch (error) {
    console.error('💥 Test failed:', error.message);
  }
}

testAuthenticatedSubmission();
