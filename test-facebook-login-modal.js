/**
 * Quick test script to trigger Facebook login modal
 */

async function testFacebookLoginModal() {
  try {
    const response = await fetch('http://localhost:8000/api/parser/parse-url', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: 'https://www.facebook.com/pg/stevesdj/posts/',
        method: 'facebook-clean',
      }),
    });

    const result = await response.json();
    console.log('Parser response:', result);
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
testFacebookLoginModal();
