#!/usr/bin/env node

/**
 * Google One Tap Diagnosis Script
 * This script helps diagnose why Google One Tap is not appearing
 */

async function diagnoseGoogleOneTap() {
  console.log('🔍 Google One Tap Diagnosis');
  console.log('============================\n');

  console.log('📋 Current Configuration:');
  console.log('  Frontend URL: http://localhost:5173 (from .env)');
  console.log('  Backend URL: http://localhost:8000 (from .env)');
  console.log(
    '  Google Client ID: 203453576607-fjkvjl9f2sve5gsm4n94fdsgmphgcs8u.apps.googleusercontent.com',
  );
  console.log('');

  console.log('🚨 Most Likely Issues:');
  console.log('');

  console.log('1. 🌐 DOMAIN AUTHORIZATION MISSING');
  console.log('   Google One Tap requires specific domain authorization.');
  console.log('   You need to add these origins to Google Cloud Console:');
  console.log('   ✅ http://localhost:5173 (your frontend)');
  console.log('   ✅ http://127.0.0.1:5173 (alternative localhost)');
  console.log('');
  console.log('   🔧 How to fix:');
  console.log('   1. Go to: https://console.cloud.google.com/');
  console.log('   2. Select your project');
  console.log('   3. Go to APIs & Services → Credentials');
  console.log('   4. Edit your OAuth 2.0 Client ID');
  console.log('   5. Under "Authorized JavaScript origins", add:');
  console.log('      - http://localhost:5173');
  console.log('      - http://127.0.0.1:5173');
  console.log('   6. Save changes');
  console.log('   7. Wait 10-15 minutes for Google to propagate changes');
  console.log('');

  console.log('2. 🧑‍💻 USER NOT SIGNED INTO GOOGLE');
  console.log("   Google One Tap only appears if you're signed into Google in your browser.");
  console.log('   ✅ Sign into Google in your browser');
  console.log('   ✅ Visit: https://accounts.google.com to verify');
  console.log('');

  console.log('3. 📱 ONE TAP PREVIOUSLY DISMISSED');
  console.log("   If you previously dismissed One Tap, it won't show again for a while.");
  console.log('   ✅ Try incognito/private browsing mode');
  console.log('   ✅ Clear cookies for localhost');
  console.log('');

  console.log('4. 🚫 ALREADY AUTHENTICATED');
  console.log("   One Tap won't show if you're already logged into KaraokeHub.");
  console.log('   ✅ Log out of KaraokeHub');
  console.log('   ✅ Visit login page or homepage');
  console.log('');

  console.log('🧪 Testing Steps:');
  console.log('');
  console.log('1. Fix domain authorization (step 1 above)');
  console.log('2. Start your servers:');
  console.log('   Terminal 1: npm run start:dev');
  console.log('   Terminal 2: cd client && npm run dev');
  console.log('3. Open browser in incognito mode');
  console.log('4. Sign into Google in a separate tab');
  console.log('5. Visit: http://localhost:5173/login');
  console.log('6. Look for Google One Tap prompt in top-right corner');
  console.log('');

  console.log('🔍 Console Debugging:');
  console.log('Open browser developer tools (F12) and look for:');
  console.log('');
  console.log('✅ Success logs:');
  console.log('   🟢 [GOOGLE_ONE_TAP] Initialized successfully');
  console.log('   Google One Tap notification: {isDisplayed: function}');
  console.log('');
  console.log('❌ Error logs:');
  console.log('   🔴 [GOOGLE_ONE_TAP] One Tap not displayed: unregistered_origin');
  console.log('   🔴 [GOOGLE_ONE_TAP] DOMAIN ERROR: Add this origin to Google Cloud Console');
  console.log('   GET https://accounts.google.com/gsi/status 403 (Forbidden)');
  console.log('');

  console.log('📞 Quick Fix Summary:');
  console.log('Most likely you just need to add http://localhost:5173 to your');
  console.log('Google OAuth client\'s "Authorized JavaScript origins" in Google Cloud Console.');
  console.log('');
  console.log('After that, wait 15 minutes and test in incognito mode!');
}

diagnoseGoogleOneTap();
