/**
 * Test Facebook Worker Integration
 * Tests the new Worker-based architecture where facebook-parser.service uses facebook-group-parser.ts
 */

const { Worker } = require('worker_threads');
const path = require('path');

async function testWorkerIntegration() {
  console.log('🧪 [TEST] Testing Facebook Worker Integration...');
  console.log('🚀 [TEST] Starting worker-based group parsing test');

  const testUrl = 'https://www.facebook.com/groups/stevesdj/media';

  return new Promise((resolve, reject) => {
    const workerPath = path.join(
      __dirname,
      'dist',
      'parser',
      'facebookParser',
      'facebook-group-parser.js',
    );

    console.log(`🔗 [TEST] Worker path: ${workerPath}`);
    console.log(`📄 [TEST] Test URL: ${testUrl}`);

    const worker = new Worker(workerPath);

    let progressCount = 0;
    const startTime = Date.now();

    // Set up message handling
    worker.on('message', (message) => {
      if (message.type === 'progress') {
        progressCount++;
        console.log(`🔄 [WORKER-${progressCount}] ${message.message}`);
      } else if (message.type === 'complete') {
        const duration = (Date.now() - startTime) / 1000;
        console.log(`✅ [TEST] Worker completed in ${duration.toFixed(2)}s`);

        if (message.data.success) {
          console.log(`🎉 [SUCCESS] Worker extraction successful!`);
          console.log(`📊 [RESULTS] Summary:`);
          console.log(`   • Group Name: "${message.data.pageName}"`);
          console.log(`   • Images Found: ${message.data.imageUrls.length}`);
          console.log(`   • Processing Time: ${duration.toFixed(2)}s`);

          if (message.data.metadata) {
            console.log(`   • Total Images: ${message.data.metadata.totalImages}`);
            console.log(`   • Worker Processing Time: ${message.data.metadata.processingTime}ms`);
          }

          // Log sample URLs
          if (message.data.imageUrls.length > 0) {
            console.log(`🔗 [SAMPLE URLS]:`);
            message.data.imageUrls.slice(0, 3).forEach((url, index) => {
              console.log(`   ${index + 1}. ${url.substring(0, 80)}...`);
            });
          }

          resolve(message.data);
        } else {
          console.log(`❌ [FAILURE] Worker failed: ${message.data.error}`);
          reject(new Error(message.data.error || 'Worker failed'));
        }
      } else if (message.type === 'error') {
        const duration = (Date.now() - startTime) / 1000;
        console.log(`❌ [ERROR] Worker error after ${duration.toFixed(2)}s: ${message.error}`);
        reject(new Error(message.error));
      }
    });

    worker.on('error', (error) => {
      const duration = (Date.now() - startTime) / 1000;
      console.log(`💥 [FATAL] Worker thread error after ${duration.toFixed(2)}s: ${error.message}`);
      reject(error);
    });

    worker.on('exit', (code) => {
      const duration = (Date.now() - startTime) / 1000;
      if (code !== 0) {
        console.log(
          `🚪 [EXIT] Worker stopped with exit code ${code} after ${duration.toFixed(2)}s`,
        );
        reject(new Error(`Worker stopped with exit code ${code}`));
      }
    });

    // Send work data to worker (matching the interface expected)
    const workerData = {
      url: testUrl,
      tempDir: path.join(__dirname, 'temp'),
      cookiesFilePath: path.join(__dirname, 'facebook-cookies.json'),
      geminiApiKey: process.env.GEMINI_API_KEY || '',
    };

    console.log(`📤 [TEST] Sending work data to worker...`);
    console.log(`🔑 [TEST] Gemini API Key available: ${workerData.geminiApiKey ? 'Yes' : 'No'}`);
    worker.postMessage(workerData);

    // Set timeout for worker execution
    setTimeout(() => {
      console.log(`⏰ [TIMEOUT] Worker test timed out after 60 seconds`);
      worker.terminate();
      reject(new Error('Worker test timeout'));
    }, 60000);
  });
}

// Run the test
async function main() {
  try {
    console.log('🏁 [START] Facebook Worker Integration Test');
    console.log('📋 [INFO] This test verifies the new Worker-based architecture');
    console.log('🔧 [INFO] Worker handles all Puppeteer logic + Gemini group name parsing');
    console.log('');

    const result = await testWorkerIntegration();

    console.log('');
    console.log('🎊 [COMPLETE] Worker Integration Test Successful!');
    console.log('✨ [VALIDATED] Worker-based architecture is functioning correctly');
  } catch (error) {
    console.log('');
    console.log('💀 [FAILED] Worker Integration Test Failed');
    console.log(`🔍 [ERROR] ${error.message}`);
    console.log('');
    console.log('🛠️ [TROUBLESHOOTING]');
    console.log('   1. Ensure project is built: npm run build');
    console.log(
      '   2. Check worker file exists: dist/parser/facebookParser/facebook-group-parser.js',
    );
    console.log('   3. Verify Gemini API key is set: GEMINI_API_KEY environment variable');
    console.log('   4. Check facebook-cookies.json exists or login required');

    process.exit(1);
  }
}

main();
