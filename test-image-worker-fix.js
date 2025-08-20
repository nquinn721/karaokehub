#!/usr/bin/env node

/**
 * Test script to verify image parsing worker handles URLs correctly
 */

const { Worker } = require('worker_threads');
const path = require('path');

async function testImageWorker() {
  console.log('🧪 Testing Image Parsing Worker with URL handling...');

  // Test with sample Facebook image URLs
  const testImageUrls = [
    'https://scontent.fphx1-1.fna.fbcdn.net/v/t39.30808-6/example1.jpg?_nc_cat=111&ccb=1-7',
    'https://scontent.fphx1-2.fna.fbcdn.net/v/t39.30808-6/example2.jpg?_nc_cat=222&ccb=1-7',
    'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=', // Small test base64 image
  ];

  console.log(`📋 Testing with ${testImageUrls.length} test images`);

  try {
    const workerPath = path.join(process.cwd(), 'dist', 'parser', 'image-parsing-worker.js');
    console.log(`🚀 Starting worker: ${workerPath}`);

    const worker = new Worker(workerPath, {
      workerData: {
        images: testImageUrls,
        geminiApiKey: process.env.GEMINI_API_KEY || 'test-key',
        batchSize: 2,
      },
    });

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        worker.terminate();
        reject(new Error('Worker timeout after 30 seconds'));
      }, 30000);

      worker.on('message', (message) => {
        console.log(`📨 Worker message:`, message.type);

        switch (message.type) {
          case 'progress':
            console.log(`  📊 Progress: ${message.data.processed}/${message.data.total} images`);
            break;

          case 'complete':
            clearTimeout(timeout);
            console.log(`✅ Worker completed!`);
            console.log(`  🎯 Shows found: ${message.data.shows?.length || 0}`);
            console.log(`  🎤 DJs found: ${message.data.djs?.length || 0}`);
            worker.terminate();
            resolve(message.data);
            break;

          case 'error':
            clearTimeout(timeout);
            console.log(`❌ Worker error: ${message.error}`);
            worker.terminate();
            reject(new Error(message.error));
            break;
        }
      });

      worker.on('error', (error) => {
        clearTimeout(timeout);
        console.log(`💥 Worker thread error: ${error.message}`);
        reject(error);
      });

      worker.on('exit', (code) => {
        clearTimeout(timeout);
        if (code !== 0) {
          console.log(`⚠️ Worker exited with code: ${code}`);
        }
      });
    });
  } catch (error) {
    console.error(`💥 Test failed: ${error.message}`);
    throw error;
  }
}

// Only run if called directly
if (require.main === module) {
  testImageWorker()
    .then((result) => {
      console.log('\n🎉 Image worker test completed successfully!');
      console.log('✅ The empty inlineData issue should now be fixed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Image worker test failed:', error.message);
      process.exit(1);
    });
}

module.exports = { testImageWorker };
