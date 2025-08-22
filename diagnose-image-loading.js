// Diagnostic script to test image download and determine what gets passed to Gemini
const { Worker } = require('worker_threads');
const path = require('path');

// Test URLs from your data
const testUrls = [
  // Thumbnail URL that should be converted
  'https://scontent-lga3-1.xx.fbcdn.net/v/t39.30808-6/534379820_24892115083723656_5412770796137448556_n.jpg?stp=dst-jpg_s130x130_tt6&_nc_cat=102&ccb=1-7&_nc_sid=aa7b47&_nc_ohc=N8qE8u5L1hIQ7kNvwHiPih0&_nc_oc=Adk2-DRl-DsZ2tIO7lqfMEzat1R3StdZJFuGEe9NBpTfJ8dllMR7P6MKOoEJHrGvDfk&_nc_zt=23&_nc_ht=scontent-lga3-1.xx&_nc_gid=xWgRKPwJ5l0EC-7eZ7J1xg&oh=00_AfU1fh9cFXmppNpHzmpx_zIwF6jOUaUUAOwIBv0adv-_UA&oe=68AEA731',

  // Full-size URL that should remain unchanged
  'https://scontent-lga3-3.xx.fbcdn.net/v/t39.30808-6/537887570_10239471219137488_5170534411219795979_n.jpg?ccb=1-7&_nc_sid=aa7b47&_nc_zt=23&_nc_ht=scontent-lga3-3.xx',
];

async function testImageLoading() {
  console.log('=== DIAGNOSTIC: Testing Facebook Image Loading Process ===\n');

  return new Promise((resolve, reject) => {
    const workerPath = path.join(
      __dirname,
      'dist',
      'parser',
      'facebookParser',
      'facebook-parallel-image-loading.js',
    );

    console.log(`🔧 Worker path: ${workerPath}`);
    console.log(`📊 Testing ${testUrls.length} URLs\n`);

    const worker = new Worker(workerPath);

    worker.on('message', (message) => {
      if (message.type === 'progress') {
        console.log(`🔄 [PROGRESS] ${message.message}`);
      } else if (message.type === 'complete') {
        console.log(`\n✅ [COMPLETE] Processing finished`);

        const results = message.data.results;
        console.log(
          `📊 [STATS] Total: ${results.length}, Success: ${message.data.stats.successful}, Failed: ${message.data.stats.failed}, Fallback Used: ${message.data.stats.usedFallback}\n`,
        );

        // Analyze each result
        results.forEach((result, index) => {
          console.log(`--- RESULT ${index + 1} ---`);
          console.log(`Original URL: ${result.originalUrl.substring(0, 80)}...`);
          console.log(`Large Scale URL: ${result.largeScaleUrl.substring(0, 80)}...`);
          console.log(`Success: ${result.success}`);
          console.log(`Used Fallback: ${result.usedFallback}`);
          console.log(`Size: ${result.size ? (result.size / 1024).toFixed(1) + 'KB' : 'N/A'}`);
          console.log(`MIME Type: ${result.mimeType || 'N/A'}`);
          console.log(
            `Base64 Data Length: ${result.base64Data ? result.base64Data.length : 0} chars`,
          );

          if (result.error) {
            console.log(`❌ Error: ${result.error}`);
          }

          if (result.success) {
            console.log(`✅ IMAGE SUCCESSFULLY DOWNLOADED`);

            // Check what type of image we got
            if (result.usedFallback) {
              console.log(`⚠️  FALLBACK USED: Large URL failed, using original thumbnail`);
              console.log(
                `📊 GEMINI WILL RECEIVE: THUMBNAIL IMAGE (${(result.size / 1024).toFixed(1)}KB)`,
              );
            } else {
              console.log(`🎯 LARGE URL SUCCESS: Downloaded enhanced image`);
              console.log(
                `📊 GEMINI WILL RECEIVE: LARGE IMAGE (${(result.size / 1024).toFixed(1)}KB)`,
              );
            }

            // Determine what URL would be saved
            console.log(`💾 URL SAVED TO DB: ${result.largeScaleUrl.substring(0, 80)}...`);
          } else {
            console.log(`❌ COMPLETE FAILURE: Neither large nor fallback worked`);
            console.log(`📊 GEMINI WILL RECEIVE: NOTHING (image skipped)`);
          }

          console.log('');
        });

        worker.terminate();
        resolve(results);
      } else if (message.type === 'error') {
        console.log(`❌ [ERROR] ${message.error}`);
        worker.terminate();
        reject(new Error(message.error));
      }
    });

    worker.on('error', (error) => {
      console.log(`❌ [WORKER ERROR] ${error.message}`);
      reject(error);
    });

    worker.on('exit', (code) => {
      if (code !== 0) {
        console.log(`❌ [WORKER EXIT] Worker stopped with exit code ${code}`);
      }
    });

    // Send URLs to worker
    worker.postMessage({
      imageUrls: testUrls,
      workerId: 1,
      maxRetries: 3,
      timeout: 30000,
    });
  });
}

// Additional function to test what happens with "bad url hash"
function simulateBadUrlHash() {
  console.log('\n=== SIMULATING BAD URL HASH SCENARIO ===');
  console.log("When Facebook returns 'bad url hash' error:");
  console.log('1. Large scale URL request fails with hash validation error');
  console.log('2. System falls back to original thumbnail URL');
  console.log('3. Original thumbnail usually works (it has valid hash)');
  console.log('4. Result: usedFallback=true, success=true');
  console.log('5. Gemini receives: THUMBNAIL image data');
  console.log('6. Database saves: LARGE scale URL (even though fallback was used)');
  console.log("\nThis explains the inconsistency you're seeing!\n");
}

async function main() {
  try {
    await testImageLoading();
    simulateBadUrlHash();

    console.log('=== SUMMARY ===');
    console.log('✅ The system IS trying to download large images');
    console.log("⚠️  When 'bad url hash' occurs, it falls back to thumbnails");
    console.log('🤔 Gemini gets thumbnail data, but DB saves large URL');
    console.log('💡 This creates a mismatch between processed image and saved URL');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

main();
