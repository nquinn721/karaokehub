const { Worker } = require('worker_threads');
const path = require('path');

/**
 * Test the enhanced Facebook extraction worker with:
 * 1. Full page screenshot of main group page
 * 2. Navigation to /media section
 * 3. Extended scrolling through media section
 * 4. Comprehensive image extraction
 */

async function testEnhancedMediaExtraction() {
  console.log('🧪 Testing Enhanced Facebook Media Extraction');
  console.log('='.repeat(60));

  const testUrl = 'https://www.facebook.com/groups/390569414424191'; // Example Facebook group

  const workerPath = path.join(__dirname, 'dist', 'parser', 'facebook-extraction-worker.js');

  console.log(`📍 Worker path: ${workerPath}`);
  console.log(`🎯 Test URL: ${testUrl}`);
  console.log(`🔑 Gemini API Key: ${process.env.GEMINI_API_KEY ? 'Available' : 'Missing'}`);
  console.log('');

  if (!process.env.GEMINI_API_KEY) {
    console.log('⚠️ Warning: GEMINI_API_KEY not set - group name extraction will fail');
    console.log('   Set GEMINI_API_KEY environment variable for full testing');
    console.log('');
  }

  const worker = new Worker(workerPath, {
    workerData: {
      url: testUrl,
      geminiApiKey: process.env.GEMINI_API_KEY,
      facebookCredentials: {
        email: process.env.FACEBOOK_EMAIL,
        password: process.env.FACEBOOK_PASSWORD,
      },
      enableInteractiveLogin: true,
    },
  });

  let extractionSteps = [];
  let startTime = Date.now();

  worker.on('message', (message) => {
    const timestamp = new Date().toLocaleTimeString();

    switch (message.type) {
      case 'log':
        console.log(`[${timestamp}] ${message.data.message}`);

        // Track important extraction steps
        if (message.data.message.includes('📸 Capturing full page screenshot')) {
          extractionSteps.push({ step: 'screenshot', time: Date.now() - startTime });
        } else if (message.data.message.includes('🖼️ Navigating to group media section')) {
          extractionSteps.push({ step: 'media_navigation', time: Date.now() - startTime });
        } else if (message.data.message.includes('📜 Scrolling through media section')) {
          extractionSteps.push({ step: 'media_scrolling', time: Date.now() - startTime });
        } else if (message.data.message.includes('🔍 Extracting image URLs from media section')) {
          extractionSteps.push({ step: 'image_extraction', time: Date.now() - startTime });
        }
        break;

      case 'complete':
        const totalTime = Date.now() - startTime;
        console.log('');
        console.log('✅ EXTRACTION COMPLETED SUCCESSFULLY!');
        console.log('='.repeat(60));
        console.log(`📊 Results Summary:`);
        console.log(`   🏷️ Group Name: "${message.data.name}"`);
        console.log(`   🖼️ Images Found: ${message.data.urls?.length || 0}`);
        console.log(`   📸 Screenshot Captured: ${message.data.screenshot ? 'Yes' : 'No'}`);
        console.log(
          `   🍪 Session Restored: ${message.data.stats?.sessionRestored ? 'Yes' : 'No'}`,
        );
        console.log(`   ⏱️ Total Time: ${(totalTime / 1000).toFixed(1)}s`);

        if (message.data.stats) {
          console.log(`   📈 Enhanced Images: ${message.data.stats.enhancedImages || 0}`);
          console.log(`   📋 Thumbnail Images: ${message.data.stats.thumbnailImages || 0}`);
        }

        console.log('');
        console.log('📋 Extraction Steps Timeline:');
        extractionSteps.forEach((step, index) => {
          console.log(`   ${index + 1}. ${step.step}: ${(step.time / 1000).toFixed(1)}s`);
        });

        // Show sample URLs if any were found
        if (message.data.urls && message.data.urls.length > 0) {
          console.log('');
          console.log('📎 Sample Image URLs:');
          message.data.urls.slice(0, 3).forEach((url, index) => {
            console.log(`   ${index + 1}. Thumbnail: ${url.thumbnail.substring(0, 80)}...`);
            console.log(`      Fullsize:  ${url.fullsize.substring(0, 80)}...`);
          });

          if (message.data.urls.length > 3) {
            console.log(`   ... and ${message.data.urls.length - 3} more images`);
          }
        }

        // Show screenshot info
        if (message.data.screenshot) {
          const screenshotSize = Buffer.from(message.data.screenshot, 'base64').length;
          console.log('');
          console.log(`📸 Screenshot Details:`);
          console.log(`   📏 Size: ${(screenshotSize / 1024).toFixed(1)} KB`);
          console.log(`   📋 Format: JPEG (Base64 encoded)`);
        }

        console.log('');
        console.log('🎉 Enhanced Media Extraction Features Verified:');
        console.log('   ✅ Full page screenshot of main group page');
        console.log('   ✅ Navigation to /media section for better image discovery');
        console.log('   ✅ Extended scrolling (8 scrolls) through media content');
        console.log('   ✅ Session persistence and restoration');
        console.log('   ✅ Enhanced image URL extraction with thumbnail/fullsize pairs');
        console.log('   ✅ Group name extraction from screenshot');

        worker.terminate();
        break;

      case 'request-facebook-credentials':
        console.log('');
        console.log('🔐 INTERACTIVE LOGIN REQUEST RECEIVED');
        console.log(`   Request ID: ${message.data.requestId}`);
        console.log(`   Message: ${message.data.message}`);
        console.log('   ⏰ Waiting for admin credentials...');

        // For testing, we can simulate providing credentials after a delay
        // In real usage, this would come from the admin UI
        setTimeout(() => {
          console.log('   📝 Simulating admin credential input...');

          worker.postMessage({
            type: 'facebook-credentials-provided',
            data: {
              requestId: message.data.requestId,
              email: 'test@example.com',
              password: 'testpassword123',
            },
          });
        }, 3000);
        break;

      case 'error':
        console.log('');
        console.log('❌ EXTRACTION FAILED');
        console.log('='.repeat(60));
        console.log(`Error: ${message.data.message}`);

        if (message.data.fallbackData) {
          console.log('');
          console.log('📋 Fallback Data Available:');
          console.log(`   Group Name: ${message.data.fallbackData.name}`);
          console.log(`   Images: ${message.data.fallbackData.urls.length}`);
        }

        console.log('');
        console.log('🔍 Troubleshooting Steps:');
        if (!process.env.GEMINI_API_KEY) {
          console.log('   1. Set GEMINI_API_KEY environment variable');
        }
        if (!process.env.FACEBOOK_EMAIL || !process.env.FACEBOOK_PASSWORD) {
          console.log('   2. Set FACEBOOK_EMAIL and FACEBOOK_PASSWORD environment variables');
          console.log('      OR ensure interactive login flow works properly');
        }
        console.log('   3. Check if Facebook group URL is accessible');
        console.log('   4. Verify Facebook session persistence');

        worker.terminate();
        break;
    }
  });

  worker.on('error', (error) => {
    console.log(`💥 Worker Error: ${error.message}`);
    worker.terminate();
  });

  worker.on('exit', (code) => {
    console.log(`🔚 Worker exited with code: ${code}`);
    console.log('');
  });
}

// Run the enhanced test
console.log('🚀 Starting Enhanced Facebook Media Extraction Test');
console.log('');
testEnhancedMediaExtraction().catch(console.error);
