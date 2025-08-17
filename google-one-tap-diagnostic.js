// Enhanced Google One Tap Diagnostic and Force Test
console.log('🔍 Enhanced Google One Tap Diagnostic');
console.log('=====================================');

// Step 1: Clear all Google-related state
console.log('1. Clearing Google Identity state...');
try {
  // Cancel any existing One Tap
  if (window.google?.accounts?.id) {
    window.google.accounts.id.cancel();
    console.log('✅ Cancelled existing One Tap');
  }
  
  // Clear Google cookies
  const cookiesToClear = [
    'g_state',
    'g_csrf_token', 
    'google_auto_fc_cmp_setting',
    'google_adsense_settings',
    'google_experiment_mod',
    'google_pub_config'
  ];
  
  cookiesToClear.forEach(cookieName => {
    document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname};`;
    document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.${window.location.hostname};`;
    document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
  });
  
  console.log('✅ Cleared Google cookies');
} catch (error) {
  console.log('⚠️ Error clearing state:', error);
}

// Step 2: Wait and re-test
setTimeout(() => {
  console.log('\n2. Testing One Tap with aggressive settings...');
  
  if (!window.google?.accounts?.id) {
    console.log('❌ Google Identity Services not loaded');
    return;
  }
  
  try {
    // More aggressive configuration
    const config = {
      client_id: '203453576607-fjkvjl9f2sve5gsm4n94fdsgmphgcs8u.apps.googleusercontent.com',
      callback: (response) => {
        console.log('🎉 SUCCESS! One Tap worked:', response);
      },
      auto_select: false, // Disable auto-select to ensure visibility
      cancel_on_tap_outside: false, // Don't cancel on outside click
      context: 'signin',
      itp_support: true,
      use_fedcm_for_prompt: true // Try FedCM if available
    };
    
    console.log('🔧 Initializing with config:', config);
    window.google.accounts.id.initialize(config);
    
    // Force prompt with detailed logging
    window.google.accounts.id.prompt((notification) => {
      console.log('\n🔔 Notification received:', notification);
      
      if (notification.isNotDisplayed()) {
        const reason = notification.getNotDisplayedReason();
        console.log('❌ Not displayed. Reason:', reason);
        
        // Detailed reason explanations
        const reasonExplanations = {
          'browser_not_supported': 'Browser doesn\'t support One Tap',
          'invalid_client': 'Client ID is invalid or not properly configured',
          'missing_client_id': 'No client ID provided',
          'opt_out_or_no_session': 'User opted out or has no Google session',
          'secure_http_required': 'HTTPS is required (you\'re on HTTPS so this shouldn\'t be it)',
          'suppressed_by_user': 'User previously dismissed One Tap - this is likely the cause!',
          'unregistered_origin': 'Domain not registered in Google Cloud Console',
          'unknown_reason': 'Check browser console for additional errors'
        };
        
        console.log('💡 Explanation:', reasonExplanations[reason] || 'Unknown reason: ' + reason);
        
        if (reason === 'suppressed_by_user') {
          console.log('\n🔧 Solutions for suppressed_by_user:');
          console.log('1. Try incognito/private browsing mode');
          console.log('2. Clear all browser data for this site');
          console.log('3. Wait 24-48 hours (Google\'s suppression period)');
          console.log('4. Try a different browser or device');
          console.log('5. Use the regular Google Sign-In button instead');
        }
        
        if (reason === 'unregistered_origin') {
          console.log('\n🔧 Domain registration check:');
          console.log('Current origin:', window.location.origin);
          console.log('Make sure this exact origin is in Google Cloud Console');
          console.log('Authorized JavaScript origins section');
        }
        
      } else if (notification.isSkippedMoment()) {
        console.log('⏭️ Skipped:', notification.getSkippedReason());
      } else if (notification.isDismissedMoment()) {
        console.log('👋 Dismissed:', notification.getDismissedReason());
      } else {
        console.log('✅ One Tap should be showing now!');
      }
    });
    
  } catch (error) {
    console.log('❌ Error during test:', error);
  }
  
}, 1000);

// Step 3: Alternative button test
setTimeout(() => {
  console.log('\n3. Testing regular Google button as alternative...');
  
  // Create a test button
  const testButton = document.createElement('div');
  testButton.id = 'google-signin-test-button';
  testButton.style.cssText = 'position: fixed; top: 10px; right: 10px; z-index: 9999; background: white; padding: 10px; border: 1px solid #ccc;';
  document.body.appendChild(testButton);
  
  if (window.google?.accounts?.id) {
    try {
      window.google.accounts.id.renderButton(testButton, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: 'signin_with',
        shape: 'rectangular'
      });
      console.log('✅ Regular Google button rendered in top-right corner');
    } catch (error) {
      console.log('❌ Error rendering button:', error);
    }
  }
  
}, 2000);

console.log('\n4. Next steps:');
console.log('• Check the notifications above');
console.log('• If "suppressed_by_user", try incognito mode');
console.log('• If "unregistered_origin", check Google Cloud Console');
console.log('• Look for the test button in top-right corner');
console.log('• Consider using regular Google Sign-In button instead of One Tap');

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
console.log(
  'Your client ID: 203453576607-fjkvjl9f2sve5gsm4n94fdsgmphgcs8u.apps.googleusercontent.com',
);

// Check if Google GSI is loaded
if (window.google?.accounts?.id) {
  console.log('\n✅ Google Identity Services loaded successfully');
} else {
  console.log('\n❌ Google Identity Services not loaded');
}
