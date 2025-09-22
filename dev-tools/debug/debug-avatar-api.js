/**
 * Debug script to test avatar API endpoint directly
 * This will help us see what's happening with the avatar API
 */

console.log('🔍 Debugging Avatar API Endpoint');
console.log('=================================\n');

// Test the avatar endpoint directly
async function testAvatarAPI() {
  console.log('📍 Testing avatar endpoint: /api/avatar/available-avatars');

  try {
    // Get the current origin
    const baseURL = window.location.origin;
    const apiURL = `${baseURL}/api/avatar/available-avatars`;

    console.log(`🌐 Making request to: ${apiURL}`);

    // Get auth token from localStorage (if exists)
    const token = localStorage.getItem('authToken') || localStorage.getItem('token');
    console.log(`🔑 Auth token exists: ${!!token}`);

    const headers = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    console.log('📤 Request headers:', headers);

    const response = await fetch(apiURL, {
      method: 'GET',
      headers,
    });

    console.log(`📥 Response status: ${response.status} ${response.statusText}`);
    console.log(`📥 Response headers:`, Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ API Error (${response.status}):`, errorText);
      return;
    }

    const data = await response.json();
    console.log('✅ API Response data:', data);
    console.log(`📊 Number of avatars returned: ${data?.length || 0}`);

    if (data && data.length > 0) {
      console.log('\n🎭 Sample avatars:');
      data.slice(0, 3).forEach((avatar, index) => {
        console.log(`${index + 1}. ${avatar.name || 'Unknown'}`);
        console.log(`   ID: ${avatar.id}`);
        console.log(`   Image: ${avatar.imageUrl}`);
        console.log(`   Free: ${avatar.isFree || avatar.price === 0}`);
        console.log('');
      });
    } else {
      console.warn('⚠️ No avatars returned from API');
    }
  } catch (error) {
    console.error('💥 Network error:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
    });
  }
}

// Also test the user store method
function testUserStore() {
  console.log('\n🏪 Testing UserStore.getAvailableAvatars()');

  if (typeof userStore !== 'undefined') {
    userStore
      .getAvailableAvatars()
      .then((avatars) => {
        console.log('✅ UserStore returned:', avatars);
        console.log(`📊 UserStore avatar count: ${avatars?.length || 0}`);
      })
      .catch((error) => {
        console.error('❌ UserStore error:', error);
      });
  } else {
    console.warn('⚠️ userStore not available in global scope');
  }
}

// Run tests
testAvatarAPI();
testUserStore();

console.log('\n💡 Instructions:');
console.log('1. Open browser developer tools (F12)');
console.log('2. Go to Console tab');
console.log('3. Copy and paste this entire script');
console.log('4. Press Enter to run');
console.log('5. Check the output for errors or issues');
