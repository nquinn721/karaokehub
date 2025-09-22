// Script to clear localStorage and test authentication
console.log('🧹 Clearing localStorage to fix authentication loop...\n');

// Check what's in localStorage first
console.log('Current localStorage contents:');
for (let i = 0; i < localStorage.length; i++) {
  const key = localStorage.key(i);
  if (key) {
    const value = localStorage.getItem(key);
    console.log(
      `  ${key}: ${value ? value.substring(0, 100) + (value.length > 100 ? '...' : '') : 'null'}`,
    );
  }
}

// Clear auth-related items
console.log('\n🗑️  Clearing auth-related localStorage items...');
const authKeys = ['AuthStore', 'token', 'user', 'isAuthenticated'];
authKeys.forEach((key) => {
  if (localStorage.getItem(key)) {
    localStorage.removeItem(key);
    console.log(`   Removed: ${key}`);
  }
});

// Also clear any JWT tokens
const allKeys = [];
for (let i = 0; i < localStorage.length; i++) {
  const key = localStorage.key(i);
  if (key) allKeys.push(key);
}

allKeys.forEach((key) => {
  const value = localStorage.getItem(key);
  if (value && (value.includes('eyJ') || value.includes('Bearer'))) {
    localStorage.removeItem(key);
    console.log(`   Removed JWT-like token: ${key}`);
  }
});

console.log('\n✅ localStorage cleared!');
console.log('Now reload the page and try logging in again.');
console.log('The login/dashboard loop should be resolved.');

// Save this script to be run in browser console
window.clearAuthState = function () {
  localStorage.clear();
  sessionStorage.clear();
  console.log('All storage cleared. Reload the page.');
};
