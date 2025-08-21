const { Worker } = require('worker_threads');
const path = require('path');

/**
 * Test Gemini API functionality in workers
 * This script helps diagnose Gemini API issues
 */

async function testGeminiInWorker() {
  console.log('🧪 Testing Gemini API in Workers');
  console.log('='.repeat(50));

  // Check environment variables
  console.log('📋 Environment Check:');
  console.log(`   GEMINI_API_KEY: ${process.env.GEMINI_API_KEY ? '✅ Set' : '❌ Not Set'}`);
  console.log(`   FACEBOOK_EMAIL: ${process.env.FACEBOOK_EMAIL ? '✅ Set' : '❌ Not Set'}`);
  console.log(`   FACEBOOK_PASSWORD: ${process.env.FACEBOOK_PASSWORD ? '✅ Set' : '❌ Not Set'}`);
  console.log('');

  if (!process.env.GEMINI_API_KEY) {
    console.log('❌ GEMINI_API_KEY is not set!');
    console.log('');
    console.log('🔧 To fix this:');
    console.log('');
    console.log('Option 1: Set environment variable');
    console.log('   export GEMINI_API_KEY="your-api-key-here"');
    console.log('');
    console.log('Option 2: Create .env file');
    console.log('   echo "GEMINI_API_KEY=your-api-key-here" > .env');
    console.log('');
    console.log('Option 3: Get API key from Google AI Studio');
    console.log('   1. Visit: https://makersuite.google.com/app/apikey');
    console.log('   2. Create new API key');
    console.log('   3. Copy the key and set it as environment variable');
    console.log('');
    console.log('🚫 Cannot test Gemini without API key - exiting');
    return;
  }

  console.log('✅ GEMINI_API_KEY is set - testing worker...');
  console.log('');

  // Test with a simple group URL
  const testUrl = 'https://www.facebook.com/groups/390569414424191';
  const workerPath = path.join(__dirname, 'dist', 'parser', 'facebook-extraction-worker.js');

  console.log(`🎯 Test URL: ${testUrl}`);
  console.log(`📍 Worker: ${workerPath}`);
  console.log('');

  const worker = new Worker(workerPath, {
    workerData: {
      url: testUrl,
      geminiApiKey: process.env.GEMINI_API_KEY,
      facebookCredentials: {
        email: process.env.FACEBOOK_EMAIL,
        password: process.env.FACEBOOK_PASSWORD,
      },
      enableInteractiveLogin: true,
    },
  });

  let geminiCalled = false;
  let geminiSuccess = false;
  let geminiError = null;
  let startTime = Date.now();

  worker.on('message', (message) => {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    switch (message.type) {
      case 'log':
        console.log(`[${elapsed}s] ${message.data.message}`);

        // Track Gemini-specific messages
        if (message.data.message.includes('🧠 Analyzing screenshot for group name')) {
          geminiCalled = true;
          console.log('   📊 Gemini API call initiated');
        } else if (message.data.message.includes('✅ Extracted group name')) {
          geminiSuccess = true;
          console.log('   📊 Gemini API call successful');
        } else if (message.data.message.includes('Group name extraction failed')) {
          geminiError = message.data.message;
          console.log('   📊 Gemini API call failed');
        }
        break;

      case 'request-facebook-credentials':
        console.log('');
        console.log('🔐 Interactive login required - providing test credentials...');

        // Provide test credentials for Gemini testing
        setTimeout(() => {
          worker.postMessage({
            type: 'facebook-credentials-provided',
            data: {
              requestId: message.data.requestId,
              email: 'test@example.com',
              password: 'testpassword123',
            },
          });
        }, 1000);
        break;

      case 'complete':
        console.log('');
        console.log('🎉 Worker completed successfully!');
        console.log('');
        console.log('📊 Gemini API Test Results:');
        console.log(`   Called: ${geminiCalled ? '✅ Yes' : '❌ No'}`);
        console.log(`   Success: ${geminiSuccess ? '✅ Yes' : '❌ No'}`);
        if (geminiError) {
          console.log(`   Error: ${geminiError}`);
        }
        console.log(`   Group Name: "${message.data.name}"`);
        console.log(`   Images Found: ${message.data.urls?.length || 0}`);

        worker.terminate();
        break;

      case 'error':
        console.log('');
        console.log('⚠️ Worker error occurred');
        console.log('');
        console.log('📊 Gemini API Test Results:');
        console.log(`   Called: ${geminiCalled ? '✅ Yes' : '❌ No'}`);
        console.log(`   Success: ${geminiSuccess ? '✅ Yes' : '❌ No'}`);
        if (geminiError) {
          console.log(`   Error: ${geminiError}`);
        }

        if (
          message.data.message.includes('GEMINI') ||
          message.data.message.includes('GoogleGenerativeAI')
        ) {
          console.log('');
          console.log('🔍 Gemini-specific error detected:');
          console.log(`   ${message.data.message}`);
          console.log('');
          console.log('💡 Common Gemini issues:');
          console.log('   1. Invalid API key');
          console.log('   2. API key permissions');
          console.log('   3. Rate limiting');
          console.log('   4. Network connectivity');
        }

        worker.terminate();
        break;
    }
  });

  worker.on('error', (error) => {
    console.log(`💥 Worker startup error: ${error.message}`);
  });

  worker.on('exit', (code) => {
    console.log('');
    console.log(`🔚 Worker exited with code: ${code}`);
    console.log('');
    console.log('📝 Summary:');
    if (geminiCalled && geminiSuccess) {
      console.log('   ✅ Gemini is working properly in workers');
    } else if (geminiCalled && !geminiSuccess) {
      console.log('   ⚠️ Gemini was called but failed');
      console.log('      Check API key validity and permissions');
    } else {
      console.log('   ❓ Gemini was not reached (authentication issue?)');
    }
  });
}

// Run the test
testGeminiInWorker().catch(console.error);
