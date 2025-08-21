/**
 * Simple test script with hardcoded values to test worker logic
 */

const { Worker } = require('worker_threads');
const path = require('path');

console.log('🧪 Testing Facebook Worker with Mock Data');
console.log('=========================================');

const testUrl = 'https://www.facebook.com/groups/614994618559113';
const workerPath = path.join(__dirname, 'dist', 'parser', 'facebook-extraction-worker.js');

console.log(`📁 Worker path: ${workerPath}`);
console.log(`🎯 Test URL: ${testUrl}`);
console.log();

// Use mock/test credentials for this test
const mockWorkerData = {
  url: testUrl,
  geminiApiKey: 'test-gemini-key', // This will fail but we can see where it fails
  facebookCredentials: {
    email: 'test@example.com',
    password: 'test-password',
  },
};

console.log('🚀 Starting worker with mock data...');
console.log('Note: This will fail during actual browser operations, but should pass validation');
console.log();

const worker = new Worker(workerPath, {
  workerData: mockWorkerData,
});

let hasCompleted = false;

worker.on('message', (message) => {
  if (hasCompleted) return;

  const timestamp = new Date().toLocaleTimeString();

  switch (message.type) {
    case 'log':
      const level = message.data.level.toUpperCase();
      const emoji =
        {
          INFO: 'ℹ️',
          SUCCESS: '✅',
          WARNING: '⚠️',
          ERROR: '❌',
        }[level] || 'ℹ️';

      console.log(`[${timestamp}] ${emoji} ${message.data.message}`);
      break;

    case 'complete':
      console.log();
      console.log('✅ Worker completed successfully!');
      console.log(`  Name: ${message.data.name}`);
      console.log(`  URLs: ${message.data.urls?.length || 0}`);

      hasCompleted = true;
      worker.terminate();
      break;

    case 'error':
      console.log();
      console.log('❌ Worker error (expected with mock data):');
      console.log(`  Message: ${message.data.message}`);
      if (message.data.stack) {
        console.log(`  Stack (first 200 chars): ${message.data.stack.substring(0, 200)}...`);
      }

      hasCompleted = true;
      worker.terminate();
      break;
  }
});

worker.on('error', (error) => {
  if (hasCompleted) return;
  console.log();
  console.log('💥 Worker crashed!');
  console.log(`Error: ${error.message}`);

  hasCompleted = true;
});

worker.on('exit', (code) => {
  if (!hasCompleted) {
    console.log();
    console.log(`⚠️ Worker exited with code: ${code}`);
  }
});

// Short timeout since we expect it to fail quickly with mock data
setTimeout(() => {
  if (!hasCompleted) {
    console.log();
    console.log('⏰ Timeout reached');

    hasCompleted = true;
    worker.terminate();
  }
}, 10000);
