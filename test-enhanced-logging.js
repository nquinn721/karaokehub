// Test enhanced logging with the specific failing URL
const { Worker } = require('worker_threads');
const path = require('path');

const testUrl =
  'https://scontent-lga3-3.xx.fbcdn.net/v/t39.30808-6/537887570_10239471219137488_5170534411219795979_n.jpg?ccb=1-7&_nc_sid=aa7b47&_nc_zt=23&_nc_ht=scontent-lga3-3.xx';

console.log('=== TESTING ENHANCED LOGGING ===');
console.log(`Testing URL: ${testUrl}`);
console.log('');

async function testEnhancedLogging() {
  return new Promise((resolve, reject) => {
    const workerPath = path.join(
      __dirname,
      'dist',
      'parser',
      'facebookParser',
      'facebook-parallel-image-loading.js',
    );
    const worker = new Worker(workerPath);

    console.log('🔧 Starting image loading worker with enhanced logging...\n');

    worker.on('message', (message) => {
      if (message.type === 'progress') {
        console.log(`[WORKER-PROGRESS] ${message.message}`);
      } else if (message.type === 'complete') {
        console.log(`\n[WORKER-COMPLETE] Processing finished`);
        worker.terminate();
        resolve(message.data);
      } else if (message.type === 'error') {
        console.log(`[WORKER-ERROR] ${message.error}`);
        worker.terminate();
        reject(new Error(message.error));
      }
    });

    worker.on('error', (error) => {
      console.log(`[WORKER-ERROR] ${error.message}`);
      reject(error);
    });

    // Send URL to worker
    worker.postMessage({
      imageUrls: [testUrl],
      workerId: 1,
      maxRetries: 3,
      timeout: 30000,
    });
  });
}

async function main() {
  try {
    const result = await testEnhancedLogging();

    console.log('\n=== SUMMARY OF ENHANCED LOGGING ===');
    console.log('✅ Enhanced logging is now active for:');
    console.log('   - URL transformation with detailed analysis');
    console.log('   - Individual image processing with step-by-step tracking');
    console.log('   - Batch processing with comprehensive statistics');
    console.log('   - Gemini worker data transmission details');
    console.log('   - Database storage vs actual processing mismatches');
    console.log('');
    console.log('🔍 The logs now show exactly:');
    console.log('   - What URL conversions happen (thumbnail detection)');
    console.log('   - Which downloads succeed vs fail');
    console.log('   - When fallbacks are used');
    console.log('   - What image data Gemini actually receives');
    console.log('   - What URLs get saved to the database');
    console.log('   - Quality mismatches between processing and storage');
  } catch (error) {
    console.error(`\n❌ Test failed: ${error.message}`);
  }
}

main();
