/**
 * Debug the discovery worker to see what's going wrong
 */

const { Worker } = require('worker_threads');
const path = require('path');

async function debugDiscoveryWorker() {
  console.log('🔍 DEBUGGING DISCOVERY WORKER');
  console.log('='.repeat(50));

  try {
    // Check if the worker file exists - test the exact path the service uses
    const workerPath = path.join(
      __dirname,
      'dist',
      'parser',
      'websiteParser',
      'website-discovery-worker.js',
    );
    console.log('📁 Worker Path (Service Uses):', workerPath);

    // Check if file exists
    const fs = require('fs');
    if (fs.existsSync(workerPath)) {
      console.log('✅ Worker file exists');
    } else {
      console.log('❌ Worker file does NOT exist');

      // Check alternative paths
      const altPaths = [
        path.join(__dirname, 'src', 'parser', 'websiteParser', 'website-discovery-worker.js'),
        path.join(__dirname, 'dist', 'parser', 'websiteParser', 'website-discovery-worker.js'),
        path.join(
          __dirname,
          'dist',
          'src',
          'parser',
          'websiteParser',
          'website-discovery-worker.ts',
        ),
      ];

      for (const altPath of altPaths) {
        if (fs.existsSync(altPath)) {
          console.log(`✅ Found alternative: ${altPath}`);
        } else {
          console.log(`❌ Not found: ${altPath}`);
        }
      }
      return;
    }

    console.log('\n🚀 Creating worker...');

    const worker = new Worker(workerPath);
    let completed = false;

    // Set up timeout
    const timeout = setTimeout(() => {
      if (!completed) {
        console.log('⏰ Worker timed out after 30 seconds');
        worker.terminate();
      }
    }, 30000);

    // Listen for messages
    worker.on('message', (message) => {
      console.log('📨 Message from worker:', message.type);

      if (message.type === 'progress') {
        console.log('   Progress:', message.message);
      } else if (message.type === 'complete') {
        console.log('✅ Worker completed successfully!');
        console.log('   Result:', JSON.stringify(message.data, null, 2));
        completed = true;
        clearTimeout(timeout);
        worker.terminate();
      } else if (message.type === 'error') {
        console.log('❌ Worker error:', message.error);
        console.log('   Data:', JSON.stringify(message.data, null, 2));
        completed = true;
        clearTimeout(timeout);
        worker.terminate();
      }
    });

    worker.on('error', (error) => {
      console.error('❌ Worker thread error:', error);
      completed = true;
      clearTimeout(timeout);
    });

    worker.on('exit', (code) => {
      console.log(`🏁 Worker exited with code: ${code}`);
      completed = true;
      clearTimeout(timeout);
    });

    // Send test data
    console.log('📤 Sending test data to worker...');
    worker.postMessage({
      url: 'https://karaokeviewpoint.com/karaoke-in-ohio/',
      deepSeekApiKey: process.env.DEEPSEEK_API_KEY || 'test-key',
      tempDir: '/tmp',
      includeSubdomains: false,
    });

    // Wait for completion
    await new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (completed) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
    });
  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
}

// Run the debug
if (require.main === module) {
  debugDiscoveryWorker()
    .then(() => {
      console.log('\n🏁 Debug complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Debug error:', error);
      process.exit(1);
    });
}

module.exports = { debugDiscoveryWorker };
