// Debug auth state - paste this in the browser console
console.log('=== AUTH DEBUG ===');
console.log('Auth token from localStorage:', localStorage.getItem('auth_token'));
console.log('Legacy token from localStorage:', localStorage.getItem('token'));
console.log(
  'AuthStore state:',
  window.authStore
    ? {
        isAuthenticated: window.authStore.isAuthenticated,
        user: window.authStore.user,
        token: window.authStore.token,
      }
    : 'AuthStore not available',
);

// Test a simple authenticated request
if (window.apiStore) {
  console.log('Testing authenticated request...');
  window.apiStore
    .get('/subscription/status')
    .then((result) => {
      console.log('✅ Subscription status request successful:', result);
    })
    .catch((error) => {
      console.log(
        '❌ Subscription status request failed:',
        error.response?.status,
        error.response?.data,
      );
    });
} else {
  console.log('ApiStore not available');
}
