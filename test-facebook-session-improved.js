/**
 * Test script to verify improved Facebook session handling in extraction worker
 */

const { Worker } = require('worker_threads');
const path = require('path');

console.log('🧪 Testing Improved Facebook Session Loading in Worker');
console.log('=====================================================');

// Test URL - using a real Facebook group URL
const testUrl = 'https://www.facebook.com/groups/614994618559113'; // Your test group

// Create worker to test session handling
const workerPath = path.join(__dirname, 'dist', 'parser', 'facebook-extraction-worker.js');

console.log(`📁 Worker path: ${workerPath}`);
console.log(`🎯 Test URL: ${testUrl}`);
console.log();

const worker = new Worker(workerPath, {
  workerData: {
    url: testUrl,
    geminiApiKey: process.env.GEMINI_API_KEY,
    facebookCredentials: {
      email: process.env.FACEBOOK_EMAIL,
      password: process.env.FACEBOOK_PASSWORD,
    },
  },
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
      console.log('🎉 Worker completed successfully!');
      console.log('================================');
      console.log(`📝 Group Name: "${message.data.name}"`);
      console.log(`📸 URLs Found: ${message.data.urls.length}`);
      console.log(`📊 Stats:`, message.data.stats);
      console.log();

      if (message.data.urls.length > 0) {
        console.log('🔍 Sample URLs:');
        message.data.urls.slice(0, 3).forEach((url, index) => {
          console.log(`   ${index + 1}. Thumbnail: ${url.thumbnail.substring(0, 60)}...`);
          console.log(`      Fullsize:  ${url.fullsize.substring(0, 60)}...`);
          console.log(`      Enhanced:  ${url.fullsize !== url.thumbnail ? 'Yes' : 'No'}`);
          console.log();
        });
      }

      hasCompleted = true;
      worker.terminate();
      break;

    case 'error':
      console.log();
      console.log('❌ Worker failed!');
      console.log('================');
      console.log(`Error: ${message.data.message}`);
      console.log('Fallback data:', message.data.fallbackData);

      hasCompleted = true;
      worker.terminate();
      break;
  }
});

worker.on('error', (error) => {
  if (hasCompleted) return;
  console.log();
  console.log('💥 Worker crashed!');
  console.log('==================');
  console.log('Error:', error.message);

  hasCompleted = true;
});

worker.on('exit', (code) => {
  if (!hasCompleted) {
    console.log();
    console.log(`⚠️ Worker exited with code: ${code}`);
  }
});

// Timeout after 3 minutes
setTimeout(() => {
  if (!hasCompleted) {
    console.log();
    console.log('⏰ Test timeout reached (3 minutes)');
    console.log('This might indicate login issues or slow network');

    hasCompleted = true;
    worker.terminate();
  }
}, 180000);

console.log('🚀 Starting Facebook extraction worker test...');
console.log('📱 The improved worker will:');
console.log('   1. Launch Puppeteer browser with persistent session');
console.log('   2. Check if already logged in to Facebook');
console.log('   3. Login if needed (with better handling)');
console.log('   4. Navigate to target Facebook group');
console.log('   5. Scroll to load more images');
console.log('   6. Extract images with enhanced URL processing');
console.log('   7. Analyze screenshot for group name with Gemini');
console.log();
console.log('⏳ Please wait... (this may take 2-3 minutes)');
console.log();
