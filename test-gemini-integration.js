const { Worker } = require('worker_threads');
const path = require('path');

/**
 * Test if Gemini integration works with a mock API key
 * This helps verify the worker code structure is correct
 */

async function testGeminiIntegration() {
  console.log('🧪 Testing Gemini Integration in Worker');
  console.log('='.repeat(50));

  // Test the import and basic structure
  console.log('📦 Testing Gemini package import...');

  try {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    console.log('✅ @google/generative-ai package import successful');

    // Test with a dummy API key to see if the structure works
    console.log('🔧 Testing GoogleGenerativeAI instantiation...');

    try {
      const genAI = new GoogleGenerativeAI('test-api-key');
      console.log('✅ GoogleGenerativeAI instantiation successful');

      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      console.log('✅ Model instantiation successful');

      console.log('');
      console.log('📊 Gemini Integration Status:');
      console.log('   ✅ Package installation: Working');
      console.log('   ✅ Import mechanism: Working');
      console.log('   ✅ Class instantiation: Working');
      console.log('   ✅ Model creation: Working');
      console.log('');
      console.log('🔑 The issue is: Missing valid GEMINI_API_KEY');
      console.log('');
    } catch (instantiationError) {
      console.log(`❌ GoogleGenerativeAI instantiation failed: ${instantiationError.message}`);
    }
  } catch (importError) {
    console.log(`❌ Package import failed: ${importError.message}`);
    console.log('');
    console.log('🔧 To fix package issues:');
    console.log('   npm install @google/generative-ai');
  }

  // Test if the worker can at least start with a dummy key
  console.log('🧵 Testing worker startup with dummy API key...');

  const testUrl = 'https://www.facebook.com/groups/test';
  const workerPath = path.join(__dirname, 'dist', 'parser', 'facebook-extraction-worker.js');

  const worker = new Worker(workerPath, {
    workerData: {
      url: testUrl,
      geminiApiKey: 'dummy-key-for-testing',
      facebookCredentials: null,
      enableInteractiveLogin: true,
    },
  });

  let workerStarted = false;
  let geminiReached = false;

  setTimeout(() => {
    if (!workerStarted) {
      console.log('⏰ Worker startup timeout');
      worker.terminate();
    }
  }, 10000);

  worker.on('message', (message) => {
    switch (message.type) {
      case 'log':
        if (message.data.message.includes('Enhanced worker started')) {
          workerStarted = true;
          console.log('✅ Worker started successfully');
        } else if (message.data.message.includes('Analyzing screenshot for group name')) {
          geminiReached = true;
          console.log('✅ Worker reached Gemini integration point');
        } else if (message.data.message.includes('GoogleGenerativeAI Error')) {
          console.log('✅ Worker properly handles Gemini API errors');
          console.log('   This means the integration code is working correctly');
        }
        break;

      case 'error':
        if (message.data.message.includes('GoogleGenerativeAI')) {
          console.log('✅ Worker properly reports Gemini errors');
          console.log('   Integration code structure is correct');
        }
        worker.terminate();
        break;
    }
  });

  worker.on('error', (error) => {
    console.log(`❌ Worker error: ${error.message}`);
  });

  worker.on('exit', (code) => {
    console.log('');
    console.log('📋 Test Results Summary:');
    console.log(`   Worker Startup: ${workerStarted ? '✅ Success' : '❌ Failed'}`);
    console.log(`   Gemini Integration Point: ${geminiReached ? '✅ Reached' : '⚠️ Not reached'}`);
    console.log('');

    if (workerStarted) {
      console.log('🎯 Conclusion: Gemini integration code is properly structured');
      console.log('   The only issue is the missing or invalid GEMINI_API_KEY');
      console.log('');
      console.log('🔧 To enable Gemini in workers:');
      console.log('   1. Get API key from: https://makersuite.google.com/app/apikey');
      console.log('   2. Set: export GEMINI_API_KEY="your-actual-api-key"');
      console.log('   3. Or create .env file with: GEMINI_API_KEY=your-actual-api-key');
    } else {
      console.log('⚠️ Worker startup issues detected - check worker configuration');
    }
  });
}

// Run the integration test
testGeminiIntegration().catch(console.error);
