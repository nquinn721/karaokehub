const { Worker } = require('worker_threads');
const path = require('path');

async function testImageWorker() {
  console.log('Testing image worker with a sample karaoke image...');

  // Test with a known karaoke image URL from the Facebook group
  const testImageUrl = {
    url: 'https://scontent-ort2-1.xx.fbcdn.net/v/t39.30808-6/462507065_894987649417007_2088509095139024456_n.jpg?_nc_cat=104&ccb=1-7&_nc_sid=833d8c&_nc_ohc=Kcd2KgRR-MAOAX9bVIwg&_nc_ht=scontent-ort2-1.xx&oh=00_AYDbFpCxnvO6CsqKX3uYCJUOJ0Dy6qsXeJJO3d6VbDa9QA&oe=66C57B0F',
    index: 0,
  };

  const workerPath = path.join(__dirname, 'dist/parser/facebook-image-worker.js');
  const worker = new Worker(workerPath);

  return new Promise((resolve, reject) => {
    worker.on('message', (message) => {
      if (message.type === 'success') {
        console.log('Worker success:', JSON.stringify(message.result, null, 2));
        resolve(message.result);
      } else if (message.type === 'error') {
        console.error('Worker error:', message.error);
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
      imageUrl: testImageUrl,
      geminiApiKey: process.env.GEMINI_API_KEY || 'your-api-key-here',
    });
  });
}

testImageWorker().catch(console.error);
