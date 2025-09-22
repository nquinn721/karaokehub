/**
 * Enhanced debug version of avatar loading logic
 * Add this to browser console to debug avatar modal issues
 */

console.log('🐛 AVATAR MODAL DEBUG SCRIPT');
console.log('============================\n');

// Check if userStore is available
if (typeof userStore === 'undefined') {
  console.error('❌ userStore is not available in global scope');
  console.log('💡 Try running this script from the browser console when the app is loaded');
} else {
  console.log('✅ userStore found');

  // Check current user authentication
  console.log('👤 Current user:', userStore.currentUser);
  console.log('🔑 Is authenticated:', !!userStore.currentUser);

  if (!userStore.currentUser) {
    console.warn('⚠️ No current user - authentication might be the issue');
  }

  // Check loading states
  console.log('📊 UserStore states:');
  console.log('   - isLoading:', userStore.isLoading);
  console.log('   - isAvatarsLoading:', userStore.isAvatarsLoading);
  console.log('   - error:', userStore.error);

  // Test the API call directly
  console.log('\n🧪 Testing getAvailableAvatars()...');

  userStore
    .getAvailableAvatars()
    .then((avatars) => {
      console.log('✅ getAvailableAvatars() success:');
      console.log('   - Count:', avatars?.length || 0);
      console.log('   - Data:', avatars);

      if (!avatars || avatars.length === 0) {
        console.warn('⚠️ No avatars returned - this is the issue!');

        // Check if it's an authentication problem
        if (!userStore.currentUser) {
          console.log('💡 Likely cause: User not authenticated');
          console.log('   - Check if login is working');
          console.log('   - Check if JWT token is valid');
        } else {
          console.log('💡 Likely causes:');
          console.log('   - API endpoint returning empty array');
          console.log('   - Database has no available avatars');
          console.log('   - Backend service error');
        }
      } else {
        console.log('✅ Avatars are available - check component rendering');

        // Test first avatar image URL
        const firstAvatar = avatars[0];
        if (firstAvatar?.imageUrl) {
          console.log(`🖼️ Testing image URL: ${firstAvatar.imageUrl}`);

          const img = new Image();
          img.onload = () => console.log('✅ First avatar image loads successfully');
          img.onerror = () => console.error('❌ First avatar image failed to load');
          img.src = firstAvatar.imageUrl;
        }
      }
    })
    .catch((error) => {
      console.error('❌ getAvailableAvatars() failed:', error);
      console.log('💡 This is likely the issue! Check:');
      console.log('   - Network connectivity');
      console.log('   - API endpoint availability');
      console.log('   - Authentication token');
      console.log('   - Backend server status');
    });
}

// Check API store
if (typeof apiStore !== 'undefined') {
  console.log('\n🌐 API Store check:');
  console.log('   - baseURL:', apiStore.baseURL || 'not set');
  console.log('   - token:', !!apiStore.token);
} else {
  console.log('\n⚠️ apiStore not available');
}

// Check local storage for auth
const authToken = localStorage.getItem('authToken') || localStorage.getItem('token');
console.log('\n🔑 Local storage auth token:', !!authToken);

if (!authToken) {
  console.warn('⚠️ No auth token in localStorage - authentication issue!');
  console.log('💡 User needs to log in again');
}

console.log('\n📝 SUMMARY:');
console.log('==========');
console.log('1. Check the browser Network tab for failed API calls');
console.log('2. Look for 401 (Unauthorized) or 403 (Forbidden) responses');
console.log('3. Verify user is properly logged in');
console.log('4. Check if backend server is running');
console.log('5. Test API endpoint directly: GET /api/avatar/available-avatars');
