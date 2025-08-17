// Google One Tap Troubleshooting Script
// Run this in the browser console to diagnose why One Tap isn't showing

console.log('🔍 Google One Tap Troubleshooting');
console.log('=================================');

// Check if Google script is loaded
console.log('1. Google Script Status:');
if (window.google?.accounts?.id) {
  console.log('✅ Google Identity Services loaded');
} else {
  console.log('❌ Google Identity Services NOT loaded');
  console.log('💡 Solution: Ensure script tag is present: <script src="https://accounts.google.com/gsi/client" async defer></script>');
}

// Check current domain/origin
console.log('\n2. Domain/Origin Info:');
console.log('Current origin:', window.location.origin);
console.log('Current hostname:', window.location.hostname);
console.log('Current protocol:', window.location.protocol);

// Check if user is already signed in
console.log('\n3. Authentication Status:');
if (localStorage.getItem('token') || sessionStorage.getItem('token')) {
  console.log('⚠️ User appears to be already signed in');
  console.log('💡 Google One Tap usually doesn\'t show for already authenticated users');
} else {
  console.log('✅ No existing auth token found');
}

// Check cookies for Google
console.log('\n4. Google Cookies:');
const googleCookies = document.cookie.split(';').filter(cookie => 
  cookie.toLowerCase().includes('google') || 
  cookie.toLowerCase().includes('gsi') ||
  cookie.toLowerCase().includes('g_state')
);
if (googleCookies.length > 0) {
  console.log('🍪 Found Google-related cookies:');
  googleCookies.forEach(cookie => console.log('  -', cookie.trim()));
} else {
  console.log('✅ No Google-related cookies found');
}

// Check if in iframe
console.log('\n5. Context Check:');
if (window !== window.top) {
  console.log('⚠️ Running in iframe - One Tap may not work');
} else {
  console.log('✅ Running in main window');
}

// Check if HTTPS
console.log('\n6. Security Check:');
if (window.location.protocol === 'https:' || window.location.hostname === 'localhost') {
  console.log('✅ Using HTTPS or localhost');
} else {
  console.log('❌ HTTP detected - One Tap requires HTTPS');
}

// Test One Tap with detailed logging
console.log('\n7. Testing One Tap Prompt:');
if (window.google?.accounts?.id) {
  try {
    // Initialize first
    window.google.accounts.id.initialize({
      client_id: '203453576607-fjkvjl9f2sve5gsm4n94fdsgmphgcs8u.apps.googleusercontent.com',
      callback: (response) => {
        console.log('🎉 One Tap callback triggered!', response);
      },
      auto_select: false, // Disable auto-select for testing
      cancel_on_tap_outside: true,
      context: 'signin'
    });

    // Prompt with detailed notification logging
    window.google.accounts.id.prompt((notification) => {
      console.log('🔔 One Tap Notification:', notification);
      
      if (notification.isNotDisplayed()) {
        const reason = notification.getNotDisplayedReason();
        console.log('❌ One Tap NOT displayed. Reason:', reason);
        
        switch (reason) {
          case 'browser_not_supported':
            console.log('💡 Browser not supported for One Tap');
            break;
          case 'invalid_client':
            console.log('💡 Invalid client ID configuration');
            break;
          case 'missing_client_id':
            console.log('💡 Client ID missing');
            break;
          case 'opt_out_or_no_session':
            console.log('💡 User opted out or no Google session');
            break;
          case 'secure_http_required':
            console.log('💡 HTTPS required');
            break;
          case 'suppressed_by_user':
            console.log('💡 User previously dismissed One Tap');
            break;
          case 'unregistered_origin':
            console.log('💡 Origin not registered in Google Cloud Console');
            console.log('🔧 Add this origin:', window.location.origin);
            break;
          case 'unknown_reason':
            console.log('💡 Unknown reason - check browser console for errors');
            break;
          default:
            console.log('💡 Reason:', reason);
        }
      } else if (notification.isSkippedMoment()) {
        const reason = notification.getSkippedReason();
        console.log('⏭️ One Tap skipped. Reason:', reason);
      } else if (notification.isDismissedMoment()) {
        const reason = notification.getDismissedReason();
        console.log('👋 One Tap dismissed. Reason:', reason);
      } else {
        console.log('✅ One Tap should be displayed!');
      }
    });
    
    console.log('✅ Test initiated - check for notifications above');
  } catch (error) {
    console.log('❌ Error testing One Tap:', error);
  }
} else {
  console.log('❌ Cannot test - Google Identity Services not available');
}

console.log('\n8. Common Solutions:');
console.log('• Clear browser cache and cookies');
console.log('• Try incognito/private mode');
console.log('• Wait 10-15 minutes after domain changes');
console.log('• Check Google Cloud Console authorized origins');
console.log('• Ensure user is not already signed in');
console.log('• Check browser compatibility (Chrome, Firefox, Safari)');
