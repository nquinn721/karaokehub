#!/usr/bin/env node

/**
 * Test script for venue validation worker to ensure it doesn't block the main thread
 */

const { Worker } = require('worker_threads');
const path = require('path');
require('dotenv').config();

async function testVenueValidationWorker() {
  console.log('🧪 Testing Venue Validation Worker');
  console.log('====================================\n');

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('❌ GEMINI_API_KEY not found');
    return;
  }

  // Simulate some test venues
  const testVenues = [
    {
      id: 'test-1',
      name: 'Test Venue 1',
      address: '123 Main St',
      city: 'Los Angeles',
      state: 'CA',
      zip: null,
      phone: null,
      website: null,
      lat: null,
      lng: null,
      isActive: true,
    },
    {
      id: 'test-2',
      name: 'Test Venue 2',
      address: null,
      city: 'New York',
      state: 'NY',
      zip: null,
      phone: null,
      website: null,
      lat: null,
      lng: null,
      isActive: true,
    },
  ];

  console.log(`🔍 Testing worker with ${testVenues.length} test venues`);
  console.log('📊 Worker should process these without blocking main thread\n');

  // Test that main thread is not blocked
  const startTime = Date.now();
  let mainThreadCounter = 0;
  
  // Start a counter to prove main thread is not blocked
  const counterInterval = setInterval(() => {
    mainThreadCounter++;
    console.log(`⚡ Main thread counter: ${mainThreadCounter} (${Date.now() - startTime}ms)`);
  }, 1000);

  try {
    const workerPath = path.resolve(__dirname, 'dist/admin/venue-validation-worker.js');
    console.log(`🚀 Starting worker from: ${workerPath}\n`);

    const result = await new Promise((resolve, reject) => {
      const worker = new Worker(workerPath);

      worker.on('message', (message) => {
        if (message.type === 'progress') {
          console.log(`🔄 Worker: ${message.message}`);
        } else if (message.type === 'complete') {
          console.log('✅ Worker completed successfully');
          resolve(message.data);
        } else if (message.type === 'error') {
          console.error(`❌ Worker error: ${message.error}`);
          reject(new Error(message.error));
        }
      });

      worker.on('error', (error) => {
        console.error(`❌ Worker process error: ${error.message}`);
        reject(error);
      });

      worker.on('exit', (code) => {
        if (code !== 0) {
          console.error(`❌ Worker stopped with exit code ${code}`);
          reject(new Error(`Worker stopped with exit code ${code}`));
        }
      });

      // Send test data to worker
      worker.postMessage({
        venues: testVenues,
        geminiApiKey: apiKey,
      });
    });

    clearInterval(counterInterval);
    const endTime = Date.now();
    
    console.log('\n📊 Test Results:');
    console.log('================');
    console.log(`⏱️  Total time: ${endTime - startTime}ms`);
    console.log(`⚡ Main thread remained responsive (counter reached: ${mainThreadCounter})`);
    console.log(`✅ Worker processed ${result.summary.totalVenues} venues`);
    console.log(`🔍 Validated: ${result.summary.validatedCount}`);
    console.log(`⚠️  Conflicts: ${result.summary.conflictsFound}`);
    console.log(`🔄 Updated: ${result.summary.updatedCount}`);
    console.log(`❌ Errors: ${result.summary.errorsCount}`);
    
    if (mainThreadCounter > 0) {
      console.log('\n🎉 SUCCESS: Main thread was not blocked during worker execution!');
    } else {
      console.log('\n⚠️  WARNING: Main thread may have been blocked');
    }

  } catch (error) {
    clearInterval(counterInterval);
    console.error('\n❌ Test failed:', error.message);
  }
}

// Run the test
testVenueValidationWorker();