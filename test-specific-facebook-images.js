#!/usr/bin/env node

/**
 * Test a few specific Facebook images to see what Gemini is actually returning
 */

const { Worker } = require('worker_threads');
const path = require('path');

async function testSpecificFacebookImages() {
  console.log('🔍 Testing specific Facebook images to debug Gemini responses...');

  // Test with the first few image URLs from the Facebook group
  const testImages = [
    'https://scontent-lga3-3.xx.fbcdn.net/v/t39.30808-6/531728618_25196274846628830_3797538359077498425_n.jpg?stp=dst-jpg_s851x315_tt6&_nc_cat=106&ccb=1-7&_nc_sid=aa7b47&_nc_ohc=7LiteQgqJ_4Q7kNvwFlqMPx&_nc_oc=AdmrYSgJF5aXyd3c-SW67HLbaQE4fCGs5mlu31C2YiAQMKCMbinMbgK1zp_JAFnlaDM&_nc_zt=23&_nc_ht=scontent-lga3-3.xx&_nc_gid=L37vvQfUeWxdDRIh1QZqzQ&oh=00_AfWUQNQXT2yX_DfaMJuqt7HYX4bf3A6cYuig-NARc4NATw&oe=68ABCA9D',
    // Add a couple more real Facebook image URLs here if available
  ];

  for (let i = 0; i < testImages.length; i++) {
    const imageUrl = testImages[i];
    console.log(`\n📸 Testing Image ${i + 1}: ${imageUrl.substring(0, 60)}...`);

    try {
      const result = await processImageWithWorker(imageUrl, i);

      console.log('📊 Worker Result:');
      console.log('  Success:', result.success);
      console.log('  Error:', result.error || 'None');

      if (result.success) {
        console.log('  Vendor:', result.vendor || 'None');
        console.log('  DJ:', result.dj || 'None');
        console.log('  Venue:', result.show?.venue || 'None');
        console.log('  Address:', result.show?.address || 'None');
        console.log('  Time:', result.show?.time || 'None');
      } else {
        console.log('  ❌ No karaoke data found');
      }
    } catch (error) {
      console.error(`❌ Error processing image ${i + 1}:`, error.message);
    }
  }
}

function processImageWithWorker(imageUrl, index) {
  return new Promise((resolve, reject) => {
    const workerPath = path.join(__dirname, 'dist/parser/facebookParser/facebook-image-parser.js');

    const worker = new Worker(workerPath, {
      workerData: {
        imageUrl: imageUrl,
        index: index,
        geminiApiKey: process.env.GEMINI_API_KEY,
      },
    });

    const timeout = setTimeout(() => {
      worker.terminate();
      reject(new Error('Worker timeout after 30 seconds'));
    }, 30000);

    worker.on('message', (result) => {
      clearTimeout(timeout);
      worker.terminate();
      resolve(result);
    });

    worker.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });

    worker.on('exit', (code) => {
      clearTimeout(timeout);
      if (code !== 0) {
        reject(new Error(`Worker stopped with exit code ${code}`));
      }
    });
  });
}

// Run the test
testSpecificFacebookImages().catch(console.error);
