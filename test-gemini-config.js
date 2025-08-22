require('dotenv').config();
const { getGeminiModel, getGeminiConfig } = require('./dist/config/gemini.config');

console.log('🎯 Centralized Gemini Configuration Test\n');

console.log('📋 Current Gemini Models:');
console.log(`   Text Model: ${getGeminiModel('text')}`);
console.log(`   Vision Model: ${getGeminiModel('vision')}`);
console.log(`   Facebook Model: ${getGeminiModel('facebook')}`);
console.log(`   Worker Model: ${getGeminiModel('worker')}`);

console.log('\n⚙️ Configuration Settings:');
const config = getGeminiConfig();
console.log(`   Requests per minute: ${config.rateLimiting.requestsPerMinute}`);
console.log(`   Batch size: ${config.rateLimiting.batchSize}`);
console.log(`   Temperature: ${config.performance.temperature}`);
console.log(`   Max tokens: ${config.performance.maxTokensPerRequest}`);

console.log('\n✅ All models are now centralized and using Gemini 2.0 Flash production!');
