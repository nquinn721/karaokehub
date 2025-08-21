const { Worker } = require('worker_threads');
const path = require('path');
require('dotenv').config(); // Load environment variables from .env file

// Test the enhanced data flow tracking
async function testEnhancedDataFlow() {
  console.log('🔍 Testing enhanced data flow tracking...');
  console.log('🔑 Gemini API Key loaded:', !!process.env.GEMINI_API_KEY);

  const workerPath = path.join(__dirname, 'dist', 'parser', 'facebook-extraction-worker.js');

  const workerData = {
    url: 'https://www.facebook.com/groups/austinkaraokeconnection',
    geminiApiKey: process.env.GEMINI_API_KEY,
    enableInteractiveLogin: false, // Disable for automated testing
  };

  return new Promise((resolve, reject) => {
    const worker = new Worker(workerPath, { workerData });

    const messages = [];

    worker.on('message', (message) => {
      messages.push(message);
      console.log(
        `📨 Worker message [${message.type}]:`,
        message.type === 'log'
          ? message.data.message
          : message.type === 'complete'
            ? `Data with ${message.data?.urls?.length || 0} images`
            : message.type,
      );

      if (message.type === 'complete') {
        console.log('\n🎯 WORKER COMPLETION DATA:');
        console.log('- Name:', message.data?.name || 'NOT_PROVIDED');
        console.log('- URLs count:', message.data?.urls?.length || 0);
        console.log('- Screenshot size:', message.data?.screenshot?.length || 0, 'chars');
        console.log('- Stats:', JSON.stringify(message.data?.stats || {}, null, 2));
        console.log(
          '- ExtractionDetails:',
          message.data?.extractionDetails ? 'PROVIDED' : 'NOT_PROVIDED',
        );
        resolve({ success: true, data: message.data, allMessages: messages });
      }

      if (message.type === 'credentials_required') {
        console.log('🔐 Interactive login required - skipping for automated test');
        worker.terminate();
        resolve({ success: false, reason: 'credentials_required', allMessages: messages });
      }
    });

    worker.on('error', (error) => {
      console.error('❌ Worker error:', error);
      reject({ success: false, error, allMessages: messages });
    });

    worker.on('exit', (code) => {
      if (code !== 0) {
        console.error(`💥 Worker stopped with exit code ${code}`);
        reject({ success: false, exitCode: code, allMessages: messages });
      }
    });

    // Timeout after 2 minutes
    setTimeout(() => {
      worker.terminate();
      reject({ success: false, reason: 'timeout', allMessages: messages });
    }, 120000);
  });
}

// Run the test
if (require.main === module) {
  testEnhancedDataFlow()
    .then((result) => {
      console.log('\n✅ Test completed:', result.success ? 'SUCCESS' : 'FAILED');
      if (result.allMessages) {
        console.log(`\n📊 Total messages: ${result.allMessages.length}`);
        const logMessages = result.allMessages.filter((m) => m.type === 'log');
        console.log(`📋 Log messages: ${logMessages.length}`);
      }
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Test failed:', error);
      process.exit(1);
    });
}
