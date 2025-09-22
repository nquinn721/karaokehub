/**
 * Quick test to verify unlimited URL discovery is working
 * Tests the worker directly with the .env file
 */

require('dotenv').config(); // Load .env file
const { Worker } = require('worker_threads');
const path = require('path');

async function testUnlimitedWorkerDirectly() {
  console.log('🔓 TESTING UNLIMITED DISCOVERY DIRECTLY');
  console.log('='.repeat(60));
  console.log('✅ API Key loaded:', process.env.DEEPSEEK_API_KEY ? 'Yes' : 'No');
  console.log('✅ Expected: Find 50+ URLs from karaokeviewpoint.com');
  console.log('✅ No maxPages limit should be enforced');
  console.log('='.repeat(60));

  return new Promise((resolve, reject) => {
    const workerPath = path.join(
      __dirname,
      'dist',
      'parser',
      'websiteParser',
      'website-discovery-worker.js',
    );
    console.log('📁 Worker path:', workerPath);

    const worker = new Worker(workerPath);
    let completed = false;

    // Timeout after 2 minutes
    const timeout = setTimeout(() => {
      if (!completed) {
        console.log('⏰ Worker timed out after 2 minutes');
        worker.terminate();
        resolve({ timeout: true });
      }
    }, 120000);

    worker.on('message', (message) => {
      if (message.type === 'progress') {
        console.log('📝', message.message);
      } else if (message.type === 'complete') {
        console.log('\n✅ DISCOVERY COMPLETED!');
        console.log('='.repeat(60));

        const result = message.data;
        console.log('📊 Results:');
        console.log(`   ✅ Success: ${result.success}`);
        console.log(`   🏢 Site Name: ${result.siteName}`);
        console.log(`   🔍 URLs Found: ${result.urls.length}`);

        if (result.urls.length > 0) {
          console.log('\n📋 Sample URLs:');
          result.urls.slice(0, 10).forEach((url, index) => {
            console.log(`   ${index + 1}. ${url}`);
          });

          if (result.urls.length > 10) {
            console.log(`   ... and ${result.urls.length - 10} more URLs`);
          }
        }

        console.log('\n🎯 ANALYSIS:');
        if (result.urls.length >= 50) {
          console.log('🎉 EXCELLENT! Found comprehensive URL list');
          console.log('✅ Unlimited discovery is working perfectly!');
        } else if (result.urls.length >= 20) {
          console.log('👍 GOOD! Found substantial URL list');
          console.log('✅ Much better than previous 10-URL limit');
        } else if (result.urls.length >= 10) {
          console.log('⚠️ MODERATE! Found some URLs but could be more');
        } else if (result.urls.length > 0) {
          console.log('⚠️ LIMITED! Found few URLs - may need optimization');
        } else {
          console.log('❌ FAILED! No URLs found - check DeepSeek response');
        }

        completed = true;
        clearTimeout(timeout);
        worker.terminate();
        resolve(result);
      } else if (message.type === 'error') {
        console.log('\n❌ WORKER ERROR:');
        console.log('Error:', message.error);
        console.log('Data:', JSON.stringify(message.data, null, 2));

        completed = true;
        clearTimeout(timeout);
        worker.terminate();
        resolve(message.data);
      }
    });

    worker.on('error', (error) => {
      console.error('❌ Worker thread error:', error);
      completed = true;
      clearTimeout(timeout);
      reject(error);
    });

    worker.on('exit', (code) => {
      if (!completed) {
        console.log(`🏁 Worker exited with code: ${code}`);
        completed = true;
        clearTimeout(timeout);
        resolve({ exitCode: code });
      }
    });

    // Send the test data
    console.log('📤 Sending test request to worker...\n');
    worker.postMessage({
      url: 'https://karaokeviewpoint.com/karaoke-in-ohio/',
      deepSeekApiKey: process.env.DEEPSEEK_API_KEY,
      tempDir: '/tmp',
      includeSubdomains: false,
    });
  });
}

// Run the test
if (require.main === module) {
  testUnlimitedWorkerDirectly()
    .then((result) => {
      console.log('\n🏁 Test completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Test failed:', error);
      process.exit(1);
    });
}

module.exports = { testUnlimitedWorkerDirectly };
