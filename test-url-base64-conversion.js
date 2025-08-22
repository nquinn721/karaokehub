const { Worker } = require('worker_threads');
const path = require('path');

async function testUrlConversionAndBase64Download() {
  console.log('🧪 Testing URL conversion and base64 download...\n');

  const testUrls = [
    'https://scontent-lga3-3.xx.fbcdn.net/v/t39.30808-6/537887570_10239471219137488_5170534411219795979_n.jpg?stp=dst-jpg_s280x280_tt6&_nc_cat=108&ccb=1-7&_nc_sid=aa7b47&_nc_ohc=GxnC-plZBjEQ7kNvwEjNQk-&_nc_oc=AdnQ_z59RH8EGhaVi8qSsoaL35zl_eFiUVAvccPDwMPMacZGSMuAN4U1tvAzWf_f4lU&_nc_zt=23&_nc_ht=scontent-lga3-3.xx&_nc_gid=T4QOVZDEhW2qde_EYz-FyA&oh=00_AfXJLUco1sah2y6DQnmAzmIyF4EJG4S_5KmkOsIU6a7v9g&oe=68AD8ADB',
  ];

  for (let i = 0; i < testUrls.length; i++) {
    const originalUrl = testUrls[i];
    console.log(`📸 Testing URL ${i + 1}:`);
    console.log(`Original: ${originalUrl.substring(0, 100)}...`);

    try {
      const result = await loadImageWithWorker(originalUrl);

      console.log('📊 Results:');
      console.log('  Success:', result.success);
      console.log('  Used Fallback:', result.usedFallback);
      console.log('  Original URL:', result.originalUrl.substring(0, 80) + '...');
      console.log('  Large Scale URL:', result.largeScaleUrl.substring(0, 80) + '...');

      if (result.success) {
        console.log('  ✅ Base64 Length:', result.base64Data?.length || 0, 'characters');
        console.log('  📏 File Size:', Math.round((result.size || 0) / 1024), 'KB');
        console.log('  📄 MIME Type:', result.mimeType || 'unknown');

        // Compare URL differences
        const hasStpParam = result.originalUrl.includes('stp=');
        const largeHasStpParam = result.largeScaleUrl.includes('stp=');
        console.log('  🔄 URL Conversion:');
        console.log('    Original has stp param:', hasStpParam);
        console.log('    Converted has stp param:', largeHasStpParam);
        console.log('    Conversion working:', hasStpParam && !largeHasStpParam ? '✅' : '❌');
      } else {
        console.log('  ❌ Error:', result.error);
      }
    } catch (error) {
      console.log('  ❌ Test Error:', error.message);
    }

    console.log('\n' + '='.repeat(80) + '\n');
  }
}

function loadImageWithWorker(imageUrl) {
  return new Promise((resolve, reject) => {
    const workerPath = path.join(
      __dirname,
      'dist/parser/facebookParser/facebook-parallel-image-loading.js',
    );
    const worker = new Worker(workerPath);

    const timeout = setTimeout(() => {
      worker.terminate();
      reject(new Error('Worker timeout after 30 seconds'));
    }, 30000);

    worker.on('message', (message) => {
      if (message.type === 'complete') {
        clearTimeout(timeout);
        worker.terminate();

        const result = message.data.results[0]; // Get first result
        resolve(result);
      } else if (message.type === 'error') {
        clearTimeout(timeout);
        worker.terminate();
        reject(new Error(message.error));
      }
      // Ignore progress messages for now
    });

    worker.on('error', (error) => {
      clearTimeout(timeout);
      worker.terminate();
      reject(error);
    });

    worker.on('exit', (code) => {
      clearTimeout(timeout);
      if (code !== 0) {
        reject(new Error(`Worker stopped with exit code ${code}`));
      }
    });

    // Send work to worker
    worker.postMessage({
      imageUrls: [imageUrl],
      workerId: 1,
      maxRetries: 3,
      timeout: 15000,
    });
  });
}

// Run the test
testUrlConversionAndBase64Download().catch(console.error);
