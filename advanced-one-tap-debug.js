#!/usr/bin/env node

/**
 * Advanced Google One Tap Diagnostic
 * This script helps identify specific issues with Google One Tap
 */

async function runAdvancedDiagnostic() {
  console.log('🔍 Advanced Google One Tap Diagnostic');
  console.log('=====================================\n');

  console.log('📋 Step-by-Step Debugging Guide:');
  console.log('');

  console.log('1. 🌐 OPEN BROWSER DEVELOPER TOOLS');
  console.log('   - Press F12 to open developer tools');
  console.log('   - Go to Console tab');
  console.log('   - Clear console (Ctrl+L)');
  console.log('');

  console.log('2. 🔄 VISIT LOGIN PAGE');
  console.log('   - Go to: http://localhost:5173/login');
  console.log("   - Make sure you're logged OUT of KaraokeHub");
  console.log("   - Make sure you're logged IN to Google");
  console.log('');

  console.log('3. 👀 CHECK CONSOLE LOGS');
  console.log('   Look for these specific log patterns:');
  console.log('');

  console.log('   ✅ SCRIPT LOADING:');
  console.log('   - Should see Google script loading in Network tab');
  console.log('   - No 404 errors for accounts.google.com/gsi/client');
  console.log('');

  console.log('   ✅ INITIALIZATION:');
  console.log('   - 🟢 [GOOGLE_ONE_TAP] Initializing with: {clientId: "203...", ...}');
  console.log('   - 🟢 [GOOGLE_ONE_TAP] Initialized successfully');
  console.log('');

  console.log('   ✅ PROMPT ATTEMPT:');
  console.log('   - Google One Tap notification: {isDisplayed: function}');
  console.log('   - Should NOT see: One Tap not displayed');
  console.log('');

  console.log('   ❌ COMMON ERROR PATTERNS:');
  console.log('   - 🔴 [GOOGLE_ONE_TAP] One Tap not displayed: unregistered_origin');
  console.log('   - 🔴 [GOOGLE_ONE_TAP] One Tap not displayed: unknown_reason');
  console.log('   - 🔴 [GOOGLE_ONE_TAP] One Tap not displayed: suppressed_by_user');
  console.log('   - 🔴 [GOOGLE_ONE_TAP] One Tap not displayed: browser_not_supported');
  console.log('   - 🔴 [GOOGLE_ONE_TAP] One Tap not displayed: invalid_client');
  console.log('');

  console.log('4. 🧪 SPECIFIC TESTS TO RUN:');
  console.log('');

  console.log('   TEST A: Authentication Status');
  console.log('   - In console, type: localStorage.getItem("token")');
  console.log('   - Should return null (not authenticated)');
  console.log('   - If it returns a token, log out first');
  console.log('');

  console.log('   TEST B: Google Script Loading');
  console.log('   - In console, type: window.google');
  console.log('   - Should return: {accounts: {id: {...}}}');
  console.log('   - If undefined, Google script failed to load');
  console.log('');

  console.log('   TEST C: Google Account Status');
  console.log('   - Visit: https://accounts.google.com in another tab');
  console.log("   - Verify you're signed in to Google");
  console.log('   - Try signing out and back in');
  console.log('');

  console.log('   TEST D: Manual Prompt Test');
  console.log('   - In console, after page loads, type:');
  console.log('   - window.google.accounts.id.prompt((n) => console.log("Manual test:", n))');
  console.log("   - This will show you exactly why One Tap isn't appearing");
  console.log('');

  console.log('5. 🔧 ADVANCED TROUBLESHOOTING:');
  console.log('');

  console.log('   ISSUE: "suppressed_by_user"');
  console.log('   - User previously dismissed One Tap');
  console.log('   - Solution: Clear cookies for localhost');
  console.log('   - Or test in incognito mode');
  console.log('');

  console.log('   ISSUE: "browser_not_supported"');
  console.log('   - Try different browser (Chrome recommended)');
  console.log('   - Check if browser extensions are blocking it');
  console.log('');

  console.log('   ISSUE: "invalid_client"');
  console.log('   - Google Client ID is wrong or project is disabled');
  console.log('   - Check Google Cloud Console project status');
  console.log('');

  console.log('   ISSUE: No logs at all');
  console.log('   - GoogleOneTap component might not be rendering');
  console.log('   - Check if authStore.isAuthenticated is true');
  console.log('   - Look for React rendering errors');
  console.log('');

  console.log('6. 🏃‍♂️ QUICK INCOGNITO TEST:');
  console.log('   1. Open incognito/private window');
  console.log('   2. Sign into Google: https://accounts.google.com');
  console.log('   3. Visit: http://localhost:5173/login');
  console.log('   4. One Tap should appear immediately');
  console.log('   5. If not, check console for specific error reason');
  console.log('');

  console.log('📊 REPORT WHAT YOU SEE:');
  console.log('Please copy/paste any console errors or logs you see.');
  console.log('Most importantly, look for the specific "not displayed" reason!');
}

runAdvancedDiagnostic();
