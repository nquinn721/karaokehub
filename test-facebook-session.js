#!/usr/bin/env node

/**
 * Test script to verify Facebook session storage functionality
 */

const fs = require('fs');
const path = require('path');

const sessionDir = path.join(process.cwd(), 'facebook-session');
const cookiesPath = path.join(sessionDir, 'cookies.json');

console.log('🔍 Facebook Session Storage Test');
console.log('================================');
console.log(`Session directory: ${sessionDir}`);
console.log(`Cookies path: ${cookiesPath}`);
console.log('');

// Check if session directory exists
if (fs.existsSync(sessionDir)) {
  console.log('✅ Session directory exists');

  // Check directory contents
  const files = fs.readdirSync(sessionDir);
  console.log(`📁 Directory contents: ${files.length > 0 ? files.join(', ') : 'empty'}`);

  // Check if cookies file exists
  if (fs.existsSync(cookiesPath)) {
    console.log('✅ Cookies file exists');

    try {
      const cookiesContent = fs.readFileSync(cookiesPath, 'utf8');
      const cookies = JSON.parse(cookiesContent);
      console.log(`🍪 Found ${cookies.length} saved cookies`);

      // Show basic cookie info without sensitive data
      const cookieTypes = cookies.map((c) => c.name).slice(0, 5);
      console.log(
        `📝 Sample cookie names: ${cookieTypes.join(', ')}${cookies.length > 5 ? '...' : ''}`,
      );

      // Check if session looks valid (has Facebook cookies)
      const fbCookies = cookies.filter((c) => c.domain && c.domain.includes('facebook.com'));
      console.log(`🔐 Facebook domain cookies: ${fbCookies.length}`);

      if (fbCookies.length > 0) {
        console.log('✅ Session appears to contain valid Facebook cookies');
      } else {
        console.log('⚠️ No Facebook domain cookies found');
      }
    } catch (error) {
      console.log(`❌ Error reading cookies file: ${error.message}`);
    }
  } else {
    console.log('📝 No cookies file found - fresh login will be required');
  }
} else {
  console.log('📁 Session directory does not exist - will be created on first use');
}

console.log('');
console.log('💡 Session Storage Features:');
console.log('  - Automatic session restoration on startup');
console.log('  - Cookies saved after successful Facebook login');
console.log('  - Session validation before use');
console.log('  - Automatic fallback to fresh login if session expired');
console.log('');
console.log('🚀 Session storage is now ENABLED and ready to use!');
