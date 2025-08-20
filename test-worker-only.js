/**
 * Test just the worker thread functionality independently
 */

require('dotenv').config();
const { Worker } = require('worker_threads');
const path = require('path');

async function testWorkerOnly() {
  console.log('🧵 Testing worker thread independently...\n');

  // Sample image URLs from Facebook CDN (these are public test images)
  const testImageUrls = [
    'https://scontent-mia3-1.xx.fbcdn.net/v/t39.30808-6/472062031_122164518254229327_7338442649993068704_n.jpg?_nc_cat=109&ccb=1-7&_nc_sid=cc71e4&_nc_ohc=example',
    // Add the TOOLBOX image URL from our successful test
    'https://scontent-mia3-1.xx.fbcdn.net/v/t39.30808-6/472062031_122164518254229327_7338442649993068704_n.jpg?_nc_cat=109&ccb=1-7&_nc_sid=cc71e4&_nc_ohc=PLuaB7n6VBQQ7kNvgGRLqJi&_nc_zt=23&_nc_ht=scontent-mia3-1.xx&_nc_gid=A3rHgwqhLnGZIEKV0I-vK2D&oh=00_AYBT8dKEKpHQKKKZYUdgmEz8F5x_iVgN2NU08DcOhI_vRQ&oe=67957C3E',
  ];

  try {
    const workerPath = path.join(__dirname, 'src', 'parser', 'image-parsing-worker.js');
    console.log(`📂 Worker path: ${workerPath}`);

    const worker = new Worker(workerPath, {
      workerData: {
        images: testImageUrls,
        geminiApiKey: process.env.GEMINI_API_KEY,
        batchSize: 2,
      },
    });

    console.log('⚡ Worker started, waiting for results...\n');

    worker.on('message', (message) => {
      switch (message.type) {
        case 'progress':
          const { batchNum, totalBatches, processed, total } = message.data;
          console.log(
            `📊 Progress: Batch ${batchNum}/${totalBatches} (${processed}/${total} images)`,
          );
          break;

        case 'complete':
          console.log('\n🎉 Worker completed successfully!');
          console.log('================================');
          console.log(`🎪 Shows Found: ${message.data.shows.length}`);
          console.log(`🎤 DJs Found: ${message.data.djs.length}`);

          if (message.data.shows.length > 0) {
            console.log('\n📅 Shows:');
            message.data.shows.forEach((show, index) => {
              console.log(`  ${index + 1}. ${show.venue} - ${show.time}`);
              if (show.address) console.log(`     📍 ${show.address}`);
              if (show.djName) console.log(`     🎤 DJ: ${show.djName}`);
            });
          }

          if (message.data.djs.length > 0) {
            console.log('\n🎤 DJs:');
            message.data.djs.forEach((dj, index) => {
              console.log(`  ${index + 1}. ${dj.name} (confidence: ${dj.confidence})`);
            });
          }

          console.log('\n✅ Worker test completed!');
          process.exit(0);
          break;

        case 'error':
          console.error(`❌ Worker error: ${message.data.message}`);
          process.exit(1);
          break;
      }
    });

    worker.on('error', (error) => {
      console.error(`💥 Worker thread error: ${error.message}`);
      process.exit(1);
    });

    worker.on('exit', (code) => {
      if (code !== 0) {
        console.error(`🚫 Worker stopped with exit code ${code}`);
        process.exit(1);
      }
    });
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
testWorkerOnly();
