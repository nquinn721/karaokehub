/**
 * Debug test for URL discovery without limits
 */

const { Worker } = require('worker_threads');
const path = require('path');

async function testDiscoveryWorker() {
  console.log('🔍 Testing Discovery Worker Directly');
  console.log('='.repeat(50));

  const discoveryWorkerPath = path.join(
    __dirname,
    'src',
    'parser',
    'websiteParser',
    'website-discovery-worker.ts',
  );

  const workerData = {
    url: 'https://karaokeviewpoint.com/karaoke-in-ohio/',
    includeSubdomains: false,
    usePuppeteer: true,
    aiAnalysis: true,
  };

  console.log('🚀 Starting discovery worker...');
  console.log('📍 URL:', workerData.url);
  console.log('⚙️ Options:', {
    includeSubdomains: workerData.includeSubdomains,
    usePuppeteer: workerData.usePuppeteer,
    aiAnalysis: workerData.aiAnalysis,
  });

  return new Promise((resolve, reject) => {
    const worker = new Worker(discoveryWorkerPath, {
      workerData,
      execArgv: ['--loader', 'ts-node/esm', '--experimental-specifier-resolution=node'],
    });

    const timeout = setTimeout(() => {
      worker.terminate();
      reject(new Error('Worker timeout after 60 seconds'));
    }, 60000);

    worker.on('message', (result) => {
      clearTimeout(timeout);
      console.log('\n📊 Discovery Results:');
      console.log('Success:', result.success);

      if (result.success) {
        console.log('URLs Found:', result.urls?.length || 0);
        console.log('Discovery Time:', result.stats?.discoveryTime + 'ms');

        if (result.urls && result.urls.length > 0) {
          console.log('\n🔗 First 10 URLs:');
          result.urls.slice(0, 10).forEach((url, i) => {
            console.log(`   ${i + 1}. ${url}`);
          });

          if (result.urls.length > 10) {
            console.log(`   ... and ${result.urls.length - 10} more URLs`);
          }
        }
      } else {
        console.log('Error:', result.error);
      }

      resolve(result);
    });

    worker.on('error', (error) => {
      clearTimeout(timeout);
      console.error('❌ Worker error:', error);
      reject(error);
    });

    worker.on('exit', (code) => {
      clearTimeout(timeout);
      if (code !== 0) {
        console.error(`❌ Worker exited with code ${code}`);
        reject(new Error(`Worker exited with code ${code}`));
      }
    });
  });
}

// Run the test
if (require.main === module) {
  testDiscoveryWorker()
    .then(() => {
      console.log('\n✅ Discovery test complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Discovery test failed:', error.message);
      process.exit(1);
    });
}

module.exports = { testDiscoveryWorker };
