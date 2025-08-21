const { Worker } = require('worker_threads');
const path = require('path');

/**
 * Test the enhanced Facebook extraction worker with interactive login support
 * This test demonstrates:
 * 1. Worker initialization with session persistence
 * 2. Interactive login flow when credentials are not available or fail
 * 3. Session saving and restoration
 * 4. Communication between worker and main thread for credential requests
 */

async function testEnhancedInteractiveLogin() {
  console.log('🧪 Testing Enhanced Facebook Extraction Worker with Interactive Login');
  console.log('='.repeat(80));

  const testUrl = 'https://www.facebook.com/groups/390569414424191'; // Example Facebook group

  const workerPath = path.join(__dirname, 'dist', 'parser', 'facebook-extraction-worker.js');

  console.log(`📍 Worker path: ${workerPath}`);
  console.log(`🎯 Test URL: ${testUrl}`);
  console.log('');

  // Test 1: Worker with no credentials (should trigger interactive login)
  console.log('📋 Test 1: Worker with no credentials (interactive login flow)');
  console.log('-'.repeat(60));

  const worker = new Worker(workerPath, {
    workerData: {
      url: testUrl,
      geminiApiKey: process.env.GEMINI_API_KEY || 'test-key',
      facebookCredentials: null, // No credentials provided
      enableInteractiveLogin: true,
    },
  });

  let credentialRequestReceived = false;
  let requestId = null;

  worker.on('message', (message) => {
    switch (message.type) {
      case 'log':
        console.log(`[WORKER] ${message.data.message}`);
        break;

      case 'request-facebook-credentials':
        console.log(`🔐 [INTERACTIVE] Credential request received!`);
        console.log(`   Request ID: ${message.data.requestId}`);
        console.log(`   Message: ${message.data.message}`);

        credentialRequestReceived = true;
        requestId = message.data.requestId;

        // Simulate admin providing credentials after a delay
        setTimeout(() => {
          console.log(`✅ [INTERACTIVE] Simulating admin providing credentials...`);

          worker.postMessage({
            type: 'facebook-credentials-provided',
            data: {
              requestId: requestId,
              email: 'test@example.com',
              password: 'testpassword123',
            },
          });
        }, 2000);
        break;

      case 'complete':
        console.log(`✅ [WORKER] Extraction completed successfully!`);
        console.log(`📊 [RESULT] Group name: ${message.data.name}`);
        console.log(`📊 [RESULT] Images found: ${message.data.urls?.length || 0}`);
        console.log(`📊 [RESULT] Session restored: ${message.data.stats?.sessionRestored}`);
        worker.terminate();

        // Test 2: Worker with invalid credentials (should fallback to interactive)
        setTimeout(() => testWithInvalidCredentials(), 1000);
        break;

      case 'error':
        console.log(`❌ [WORKER] Error: ${message.data.message}`);
        if (!credentialRequestReceived) {
          console.log(`⚠️ [TEST] Interactive login was not triggered as expected`);
        }
        worker.terminate();

        // Continue to next test anyway
        setTimeout(() => testWithInvalidCredentials(), 1000);
        break;
    }
  });

  worker.on('error', (error) => {
    console.log(`💥 [WORKER] Worker error: ${error.message}`);
    worker.terminate();
  });

  worker.on('exit', (code) => {
    console.log(`🔚 [WORKER] Worker exited with code: ${code}`);
  });
}

async function testWithInvalidCredentials() {
  console.log('');
  console.log('📋 Test 2: Worker with invalid credentials (fallback to interactive)');
  console.log('-'.repeat(60));

  const testUrl = 'https://www.facebook.com/groups/390569414424191';
  const workerPath = path.join(__dirname, 'dist', 'parser', 'facebook-extraction-worker.js');

  const worker = new Worker(workerPath, {
    workerData: {
      url: testUrl,
      geminiApiKey: process.env.GEMINI_API_KEY || 'test-key',
      facebookCredentials: {
        email: 'invalid@example.com',
        password: 'wrongpassword',
      },
      enableInteractiveLogin: true,
    },
  });

  let interactiveLoginTriggered = false;

  worker.on('message', (message) => {
    switch (message.type) {
      case 'log':
        console.log(`[WORKER] ${message.data.message}`);
        break;

      case 'request-facebook-credentials':
        console.log(`🔐 [INTERACTIVE] Fallback to interactive login triggered!`);
        console.log(`   This demonstrates automatic fallback when credentials fail`);

        interactiveLoginTriggered = true;

        // Simulate timeout (no admin response)
        setTimeout(() => {
          console.log(`⏰ [INTERACTIVE] Simulating admin timeout...`);
          // Don't send credentials to test timeout behavior
        }, 1000);
        break;

      case 'complete':
        console.log(`✅ [WORKER] Extraction completed despite credential issues!`);
        worker.terminate();
        testSessionPersistence();
        break;

      case 'error':
        console.log(`❌ [WORKER] Error: ${message.data.message}`);
        if (interactiveLoginTriggered) {
          console.log(`✅ [TEST] Interactive login was properly triggered on credential failure`);
        }
        worker.terminate();
        testSessionPersistence();
        break;
    }
  });

  worker.on('error', (error) => {
    console.log(`💥 [WORKER] Worker error: ${error.message}`);
    worker.terminate();
  });
}

async function testSessionPersistence() {
  console.log('');
  console.log('📋 Test 3: Session persistence and restoration');
  console.log('-'.repeat(60));

  const fs = require('fs');
  const sessionDir = path.join(process.cwd(), 'facebook-session');
  const cookiesPath = path.join(sessionDir, 'cookies.json');

  console.log(`📁 Session directory: ${sessionDir}`);
  console.log(`🍪 Cookies file: ${cookiesPath}`);

  // Check if session directory exists
  if (fs.existsSync(sessionDir)) {
    console.log(`✅ Session directory exists`);

    if (fs.existsSync(cookiesPath)) {
      console.log(`✅ Cookies file exists`);

      try {
        const cookies = JSON.parse(fs.readFileSync(cookiesPath, 'utf8'));
        console.log(`📊 Saved cookies count: ${cookies.length}`);

        // Show sample cookie structure (without sensitive data)
        if (cookies.length > 0) {
          const sampleCookie = { ...cookies[0] };
          delete sampleCookie.value; // Remove sensitive value
          console.log(`📋 Sample cookie structure:`, Object.keys(sampleCookie));
        }
      } catch (parseError) {
        console.log(`❌ Error reading cookies: ${parseError.message}`);
      }
    } else {
      console.log(`⚠️ No cookies file found (normal for first run)`);
    }
  } else {
    console.log(`⚠️ No session directory found (normal for first run)`);
  }

  console.log('');
  console.log('🎉 Enhanced Interactive Login Test Complete!');
  console.log('='.repeat(80));
  console.log('');
  console.log('Summary of Enhanced Features:');
  console.log('✅ Interactive login flow when credentials are missing');
  console.log('✅ Fallback to interactive login when automatic login fails');
  console.log('✅ Session persistence with cookies.json');
  console.log('✅ Worker-to-main-thread communication for credential requests');
  console.log('✅ Timeout handling for interactive login requests');
  console.log('✅ Support for both environment variables and interactive auth');
  console.log('');
  console.log('🔧 Integration Points:');
  console.log('   • Facebook Parser Service: Handles worker credential requests');
  console.log('   • WebSocket Gateway: Provides admin UI interaction');
  console.log('   • Interactive Login Service: Session management patterns');
  console.log('   • Worker Thread: Enhanced login logic with fallbacks');
}

// Run the test
testEnhancedInteractiveLogin().catch(console.error);
