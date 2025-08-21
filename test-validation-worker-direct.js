/**
 * Simple test to debug the validation worker by creating mock data
 */

const { Worker } = require('worker_threads');
const path = require('path');

async function testValidationWorkerDirectly() {
  console.log('🔧 Testing validation worker directly with mock data...');

  return new Promise((resolve, reject) => {
    const workerPath = path.join(__dirname, 'dist/parser/facebook-validation-worker.js');
    console.log('Worker path:', workerPath);

    const worker = new Worker(workerPath);

    const timeout = setTimeout(() => {
      worker.terminate();
      reject(new Error('Validation worker timeout'));
    }, 30000);

    worker.on('message', (message) => {
      console.log('📨 Validation worker message:', message);

      if (message.type === 'complete' || message.type === 'success') {
        console.log('✅ Final validation worker response:', message);
        clearTimeout(timeout);
        worker.terminate();
        resolve(message);
      } else if (message.type === 'error') {
        console.error('❌ Validation worker error:', message);
        clearTimeout(timeout);
        worker.terminate();
        reject(new Error(message.error));
      } else if (message.type === 'log') {
        console.log(`📋 Log: ${message.data.message}`);
        // Continue processing, don't terminate
      } else {
        console.log('🔍 Other message type:', message.type);
        // Continue processing for now
      }
    });

    worker.on('error', (error) => {
      console.error('❌ Validation worker error:', error);
      clearTimeout(timeout);
      worker.terminate();
      reject(error);
    });

    // Send mock data that matches the WorkerResult structure
    const mockData = {
      processedImages: [
        {
          vendor: 'Test Venue',
          dj: 'DJ Test',
          show: {
            venue: 'Test Karaoke Bar',
            address: '123 Main St',
            city: 'Test City',
            state: 'TS',
            zip: '12345',
            time: '8:00 PM',
            dayOfWeek: 'Friday',
            djName: 'DJ Test',
            description: 'Friday night karaoke',
          },
          source: 'facebook',
        },
        {
          vendor: 'Another Venue',
          show: {
            venue: 'Music Bar',
            time: '9:00 PM',
            description: 'Live karaoke night',
          },
          source: 'facebook',
        },
      ],
      originalUrl: 'https://www.facebook.com/groups/test',
      geminiApiKey: process.env.GEMINI_API_KEY || 'test-key',
    };

    console.log('📤 Sending mock data to validation worker...');
    console.log('Mock data structure:', {
      processedImages: `Array(${mockData.processedImages.length})`,
      originalUrl: mockData.originalUrl,
      geminiApiKey: mockData.geminiApiKey ? 'present' : 'missing',
    });

    worker.postMessage(mockData);
  });
}

// Load environment variables
require('dotenv').config();

testValidationWorkerDirectly()
  .then((result) => {
    console.log('🎉 Test completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Test failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  });
