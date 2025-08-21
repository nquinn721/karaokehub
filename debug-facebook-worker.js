/**
 * Debug script to test Facebook extraction worker with detailed error reporting
 */

// Load environment variables
require('dotenv').config();

const { Worker } = require('worker_threads');
const path = require('path');

console.log('🔍 Facebook Worker Debug Test');
console.log('============================');

// Check environment variables
console.log('📋 Environment Check:');
console.log(`GEMINI_API_KEY: ${process.env.GEMINI_API_KEY ? 'SET' : 'NOT SET'}`);
console.log(`FACEBOOK_EMAIL: ${process.env.FACEBOOK_EMAIL ? 'SET' : 'NOT SET'}`);
console.log(`FACEBOOK_PASSWORD: ${process.env.FACEBOOK_PASSWORD ? 'SET' : 'NOT SET'}`);
console.log();

const testUrl = 'https://www.facebook.com/groups/614994618559113';
const workerPath = path.join(__dirname, 'dist', 'parser', 'facebook-extraction-worker.js');

console.log(`📁 Worker path: ${workerPath}`);
console.log(`🎯 Test URL: ${testUrl}`);
console.log();

// Test worker data structure
const workerData = {
  url: testUrl,
  geminiApiKey: process.env.GEMINI_API_KEY,
  facebookCredentials: {
    email: process.env.FACEBOOK_EMAIL,
    password: process.env.FACEBOOK_PASSWORD,
  },
};

console.log('📦 Worker Data Structure:');
console.log(`  url: ${workerData.url ? 'SET' : 'NOT SET'}`);
console.log(`  geminiApiKey: ${workerData.geminiApiKey ? 'SET' : 'NOT SET'}`);
console.log(
  `  facebookCredentials.email: ${workerData.facebookCredentials.email ? 'SET' : 'NOT SET'}`,
);
console.log(
  `  facebookCredentials.password: ${workerData.facebookCredentials.password ? 'SET' : 'NOT SET'}`,
);
console.log();

// Test path.join functionality
console.log('🔧 Path Testing:');
try {
  console.log(`process.cwd(): ${process.cwd()}`);
  console.log(`__dirname: ${__dirname}`);

  const testPath1 = path.join(process.cwd(), 'facebook-session');
  console.log(`path.join(process.cwd(), 'facebook-session'): ${testPath1}`);

  const testPath2 = path.join(__dirname, 'facebook-session');
  console.log(`path.join(__dirname, 'facebook-session'): ${testPath2}`);

  console.log('✅ Path functions working correctly');
} catch (pathError) {
  console.log(`❌ Path error: ${pathError.message}`);
}
console.log();

if (!process.env.GEMINI_API_KEY || !process.env.FACEBOOK_EMAIL || !process.env.FACEBOOK_PASSWORD) {
  console.log('❌ Missing required environment variables!');
  console.log('Please set the following in your .env file:');
  console.log('- GEMINI_API_KEY');
  console.log('- FACEBOOK_EMAIL');
  console.log('- FACEBOOK_PASSWORD');
  process.exit(1);
}

console.log('🚀 Starting worker test...');

const worker = new Worker(workerPath, {
  workerData: workerData,
});

let messageCount = 0;
let hasCompleted = false;

worker.on('message', (message) => {
  if (hasCompleted) return;

  messageCount++;
  const timestamp = new Date().toLocaleTimeString();

  console.log(`[${timestamp}] Message ${messageCount}: ${message.type}`);

  switch (message.type) {
    case 'log':
      const level = message.data.level.toUpperCase();
      console.log(`  ${level}: ${message.data.message}`);
      break;

    case 'complete':
      console.log();
      console.log('✅ Worker completed successfully!');
      console.log(`  Name: ${message.data.name}`);
      console.log(`  URLs: ${message.data.urls?.length || 0}`);
      console.log(`  Stats:`, message.data.stats);

      hasCompleted = true;
      worker.terminate();
      break;

    case 'error':
      console.log();
      console.log('❌ Worker error!');
      console.log(`  Message: ${message.data.message}`);
      if (message.data.stack) {
        console.log(`  Stack: ${message.data.stack}`);
      }
      console.log(`  Fallback data:`, message.data.fallbackData);

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
  console.log(`Stack: ${error.stack}`);

  hasCompleted = true;
});

worker.on('exit', (code) => {
  if (!hasCompleted) {
    console.log();
    console.log(`⚠️ Worker exited with code: ${code}`);
  }
});

// Timeout after 30 seconds for debugging
setTimeout(() => {
  if (!hasCompleted) {
    console.log();
    console.log('⏰ Debug timeout reached (30 seconds)');

    hasCompleted = true;
    worker.terminate();
  }
}, 30000);
