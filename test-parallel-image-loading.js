/**
 * Test Parallel Image Loading Worker
 * Tests the new facebook-parallel-image-loading.ts worker functionality
 */

const { Worker } = require('worker_threads');
const path = require('path');

// Sample test URLs (mix of Facebook and other image URLs)
const testUrls = [
  'https://scontent.fdet1-2.fna.fbcdn.net/v/t39.30808-6/123456789_123456789_123456789_n.jpg?w=960&h=960',
  'https://scontent.fdet1-1.fna.fbcdn.net/v/t39.30808-6/987654321_987654321_987654321_n.jpg?w=720&h=720',
  'https://external-content.duckduckgo.com/iu/?u=https://tse1.mm.bing.net/th?id=OIP.test&pid=Api',
];

async function testParallelImageLoading() {
  console.log('🧪 [TEST] Testing Parallel Image Loading Worker...');
  console.log(`📊 [TEST] Test URLs: ${testUrls.length}`);

  const startTime = Date.now();

  return new Promise((resolve, reject) => {
    const workerPath = path.join(
      __dirname,
      'dist',
      'parser',
      'facebookParser',
      'facebook-parallel-image-loading.js',
    );

    console.log(`🔗 [TEST] Worker path: ${workerPath}`);

    const worker = new Worker(workerPath);

    worker.on('message', (message) => {
      if (message.type === 'progress') {
        console.log(`🔄 [WORKER] ${message.message}`);
      } else if (message.type === 'complete') {
        const duration = (Date.now() - startTime) / 1000;
        console.log(`✅ [TEST] Worker completed in ${duration.toFixed(2)}s`);

        if (message.data.success) {
          console.log(`🎉 [SUCCESS] Parallel image loading successful!`);
          console.log(`📊 [RESULTS] Summary:`);
          console.log(`   • Total URLs: ${testUrls.length}`);
          console.log(`   • Loaded Images: ${message.data.results.length}`);
          console.log(`   • Successful: ${message.data.stats.successful}`);
          console.log(`   • Failed: ${message.data.stats.failed}`);
          console.log(`   • Used Fallback: ${message.data.stats.usedFallback}`);
          console.log(`   • Processing Time: ${duration.toFixed(2)}s`);

          // Show details for each result
          message.data.results.forEach((result, index) => {
            const status = result.success ? '✅' : '❌';
            const fallback = result.usedFallback ? ' (fallback)' : '';
            const size = result.size ? ` (${(result.size / 1024).toFixed(1)}KB)` : '';
            console.log(
              `   ${status} Image ${index + 1}: ${result.originalUrl.substring(0, 50)}...${fallback}${size}`,
            );
          });

          resolve(message.data);
        } else {
          console.log(`❌ [FAILURE] Worker failed: ${message.data.error || 'Unknown error'}`);
          reject(new Error(message.data.error || 'Worker failed'));
        }
      } else if (message.type === 'error') {
        console.log(`❌ [ERROR] Worker error: ${message.error}`);
        reject(new Error(message.error));
      }
    });

    worker.on('error', (error) => {
      console.log(`❌ [ERROR] Worker thread error: ${error.message}`);
      reject(error);
    });

    worker.on('exit', (code) => {
      if (code !== 0) {
        console.log(`❌ [ERROR] Worker stopped with exit code ${code}`);
        reject(new Error(`Worker stopped with exit code ${code}`));
      }
    });

    // Send test data to worker
    worker.postMessage({
      imageUrls: testUrls,
      workerId: 1,
      maxRetries: 2,
      timeout: 15000, // Shorter timeout for test
    });
  });
}

async function main() {
  console.log('🏁 [START] Parallel Image Loading Worker Test');
  console.log('📋 [INFO] Tests the facebook-parallel-image-loading.ts worker');
  console.log('');

  try {
    await testParallelImageLoading();
    console.log('');
    console.log('🎉 [SUCCESS] All tests passed!');
  } catch (error) {
    console.log('');
    console.log(`❌ [FAILURE] Test failed: ${error.message}`);
    process.exit(1);
  }
}

main();
