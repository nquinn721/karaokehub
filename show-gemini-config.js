#!/usr/bin/env node

/**
 * Utility script to show current Gemini model configuration
 * Usage: node show-gemini-config.js
 */

const {
  getGeminiConfig,
  getGeminiModel,
  getGeminiRateLimiting,
  getGeminiPerformanceSettings,
} = require('./dist/config/gemini.config');

console.log('🤖 Current Gemini AI Configuration\n');

const config = getGeminiConfig();

console.log('📊 Models:');
console.log(`  Text Parsing:     ${getGeminiModel('text')}`);
console.log(`  Vision Parsing:   ${getGeminiModel('vision')}`);
console.log(`  Facebook Parsing: ${getGeminiModel('facebook')}`);
console.log(`  Worker Threads:   ${getGeminiModel('worker')}\n`);

const rateLimiting = getGeminiRateLimiting();
console.log('⚡ Rate Limiting:');
console.log(`  Requests/Minute:  ${rateLimiting.requestsPerMinute}`);
console.log(`  Batch Size:       ${rateLimiting.batchSize}`);
console.log(`  Max Retries:      ${rateLimiting.maxRetriesOnQuota}`);
console.log(`  Retry Delay:      ${rateLimiting.retryDelayMs}ms\n`);

const performance = getGeminiPerformanceSettings();
console.log('🚀 Performance Settings:');
console.log(`  Max Tokens:       ${performance.maxTokensPerRequest}`);
console.log(`  Temperature:      ${performance.temperature}`);
console.log(`  Top P:            ${performance.topP}`);
console.log(`  Top K:            ${performance.topK}\n`);

console.log('💡 Environment Variables:');
console.log(`  GEMINI_HIGH_ACCURACY: ${process.env.GEMINI_HIGH_ACCURACY || 'false'}`);
console.log(`  GEMINI_API_KEY:       ${process.env.GEMINI_API_KEY ? 'Set ✅' : 'Not Set ❌'}\n`);

if (process.env.GEMINI_HIGH_ACCURACY === 'true') {
  console.log('🎯 Using HIGH ACCURACY configuration (gemini-1.5-pro)');
} else {
  console.log('⚡ Using SPEED configuration (gemini-1.5-flash)');
}

console.log('\n📝 To switch to high accuracy mode:');
console.log('   export GEMINI_HIGH_ACCURACY=true');
console.log('\n⚡ To switch to speed mode:');
console.log('   export GEMINI_HIGH_ACCURACY=false');
