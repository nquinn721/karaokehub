// Google One Tap Origins Verification
// Paste this in your browser console to verify your setup

console.log('🔍 Google One Tap Origins Verification');
console.log('====================================');

console.log('\n📍 Current page info:');
console.log('- Origin:', window.location.origin);
console.log('- Hostname:', window.location.hostname);
console.log('- Port:', window.location.port);
console.log('- Protocol:', window.location.protocol);

console.log('\n✅ Required origins for Google Cloud Console:');
console.log('Add ALL of these to "Authorized JavaScript origins":');

const requiredOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:8000',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:8000',
  'https://karaoke-hub.com',
  'https://www.karaoke-hub.com',
];

requiredOrigins.forEach((origin) => {
  const isCurrent = origin === window.location.origin;
  console.log(`${isCurrent ? '👉' : '  '} ${origin} ${isCurrent ? '(CURRENT)' : ''}`);
});

console.log('\n🚨 Missing origin causing 403 error:');
console.log('- Missing:', window.location.origin);
console.log('- Add this to Google Cloud Console ASAP!');

console.log('\n🔧 Google Cloud Console Steps:');
console.log('1. Go to: https://console.cloud.google.com/');
console.log('2. APIs & Services > Credentials');
console.log('3. Edit OAuth 2.0 Client ID');
console.log('4. Add missing origin to "Authorized JavaScript origins"');
console.log('5. Save and wait 2-3 minutes');

console.log('\n⚡ Quick test after fixing:');
console.log('- Refresh this page');
console.log('- Look for Google One Tap prompt');
console.log('- Check console for success messages');
