// Quick test to see what our updated workers return
const { Worker } = require('worker_threads');
const path = require('path');

async function testWorkerOutput() {
  console.log('Creating a test base64 image (1x1 pixel)...');

  // Create a tiny test image in base64 - this is a 1x1 red pixel PNG
  const testImageData = {
    data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=',
    mimeType: 'image/png',
    index: 0,
    alt: 'Test karaoke event image',
    context: 'Karaoke Night at The Blue Moon Bar',
    originalUrl: 'https://test.com/image.png',
  };

  const workerPath = path.join(__dirname, 'dist/parser/facebook-image-worker.js');
  const worker = new Worker(workerPath);

  return new Promise((resolve, reject) => {
    worker.on('message', (message) => {
      if (message.type === 'success') {
        console.log('✅ Worker returned result:');
        console.log(JSON.stringify(message.result, null, 2));
        resolve(message.result);
      } else if (message.type === 'error') {
        console.error('❌ Worker error:', message.error);
        reject(new Error(message.error));
      }
      worker.terminate();
    });

    worker.on('error', (error) => {
      console.error('Worker thread error:', error);
      reject(error);
    });

    // Send test data to worker
    worker.postMessage({
      imageData: testImageData,
      geminiApiKey: process.env.GEMINI_API_KEY || 'test-key',
    });
  });
}

testWorkerOutput().catch(console.error);
