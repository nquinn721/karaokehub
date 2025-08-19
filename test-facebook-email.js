#!/usr/bin/env node

/**
 * Test Facebook OAuth Email Integration
 * This script verifies that Facebook OAuth is requesting email permission properly
 */

const axios = require('axios');

async function testFacebookEmailOAuth() {
  console.log('🎤 Testing Facebook OAuth Email Integration...\n');

  const baseUrl = 'http://localhost:8000/api';

  try {
    // Test Facebook OAuth endpoint to see the OAuth URL parameters
    console.log('1. Testing Facebook OAuth endpoint with email scope...');
    try {
      const response = await axios.get(`${baseUrl}/auth/facebook`, {
        maxRedirects: 0,
        validateStatus: (status) => status === 302 || status === 200,
      });

      if (response.status === 302) {
        const redirectUrl = response.headers.location;
        console.log('✅ Facebook OAuth endpoint is accessible and redirecting');
        console.log(`🔗 Redirect URL: ${redirectUrl}`);

        // Check if the redirect includes email scope
        if (redirectUrl && redirectUrl.includes('scope=')) {
          const scopeMatch = redirectUrl.match(/scope=([^&]*)/);
          if (scopeMatch) {
            const scopes = decodeURIComponent(scopeMatch[1]);
            console.log(`📧 OAuth Scopes: ${scopes}`);

            if (scopes.includes('email')) {
              console.log('✅ Email permission is being requested');
            } else {
              console.log('❌ Email permission is NOT being requested');
            }

            if (scopes.includes('public_profile')) {
              console.log('✅ Public profile permission is being requested');
            } else {
              console.log('❌ Public profile permission is NOT being requested');
            }
          }
        }

        // Check if it's redirecting to Facebook
        if (redirectUrl && redirectUrl.includes('facebook.com')) {
          console.log('✅ Correctly redirecting to Facebook OAuth');
        } else {
          console.log('⚠️  Not redirecting to Facebook - check configuration');
        }
      } else {
        console.log("⚠️  Facebook OAuth endpoint responded but didn't redirect");
      }
    } catch (error) {
      if (error.response && error.response.status === 302) {
        console.log('✅ Facebook OAuth endpoint is working (302 redirect)');
        console.log(`   Redirect location: ${error.response.headers.location}`);
      } else {
        console.log('❌ Facebook OAuth endpoint failed:', error.message);
      }
    }

    console.log('\n🎯 Facebook OAuth Email Integration Summary:');
    console.log('📧 Email Handling:');
    console.log('   1. Facebook strategy now requests email permission');
    console.log('   2. Auth service matches users by email first');
    console.log('   3. Existing users (Google/email) can login with Facebook');
    console.log('   4. Profile data gets updated from Facebook if better');
    console.log('   5. Original provider info is preserved for continuity');

    console.log('\n🧪 Testing Steps:');
    console.log('   1. Start your backend server');
    console.log('   2. Go to http://localhost:5173/login');
    console.log('   3. Click "Continue with Facebook"');
    console.log('   4. Grant email permission when prompted');
    console.log('   5. Verify login works and email is captured');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testFacebookEmailOAuth().catch(console.error);
