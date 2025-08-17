// Google One Tap Domain Diagnostic Script
// Run this in your browser console to diagnose the 403 error

console.log('🔍 Google One Tap Domain Diagnostic');
console.log('=====================================');

console.log('Current Domain Info:');
console.log('- hostname:', window.location.hostname);
console.log('- origin:', window.location.origin);
console.log('- protocol:', window.location.protocol);
console.log('- port:', window.location.port);
console.log('- full URL:', window.location.href);

console.log('\n📋 Domains to Add to Google Cloud Console:');
console.log('Go to: https://console.cloud.google.com/');
console.log('Navigate to: APIs & Services > Credentials');
console.log('Edit your OAuth 2.0 Client ID');

console.log('\n✅ Add these to "Authorized JavaScript origins":');
if (window.location.hostname === 'localhost') {
    console.log('- http://localhost:3000');
    console.log('- http://localhost:5173');
    console.log('- http://127.0.0.1:3000');
    console.log('- http://127.0.0.1:5173');
} else if (window.location.hostname.includes('karaoke-hub.com')) {
    console.log('- https://karaoke-hub.com');
    console.log('- https://www.karaoke-hub.com');
} else {
    console.log(`- ${window.location.origin}`);
}

console.log('\n✅ Add these to "Authorized redirect URIs":');
if (window.location.hostname === 'localhost') {
    console.log('- http://localhost:3000/auth/success');
    console.log('- http://localhost:3000/auth/error');
} else {
    console.log(`- ${window.location.origin}/auth/success`);
    console.log(`- ${window.location.origin}/auth/error`);
}

console.log('\n🔧 Google Cloud Console Steps:');
console.log('1. Go to https://console.cloud.google.com/');
console.log('2. Select your project');
console.log('3. Go to APIs & Services > Credentials');
console.log('4. Find your OAuth 2.0 Client ID');
console.log('5. Click the edit (pencil) icon');
console.log('6. Add the domains listed above');
console.log('7. Save changes');
console.log('8. Wait 5-10 minutes for changes to propagate');

console.log('\n⚠️ Current Error:');
console.log('403 Forbidden - Domain not authorized for Google One Tap');
console.log('Your client ID: 203453576607-fjkvjl9f2sve5gsm4n94fdsgmphgcs8u.apps.googleusercontent.com');

// Check if Google GSI is loaded
if (window.google?.accounts?.id) {
    console.log('\n✅ Google Identity Services loaded successfully');
} else {
    console.log('\n❌ Google Identity Services not loaded');
}
