/**
 * Test Enhanced Facebook Parser Workflow
 * Tests the complete flow: Group parser extracts photo URLs → Enhanced image parser gets high-res images
 */

// Load environment variables
require('dotenv').config();

const { Worker } = require('worker_threads');
const path = require('path');
const fs = require('fs');

/**
 * Test the group parser with enhanced photo URL extraction
 */
async function testGroupParserPhotoExtraction() {
  return new Promise((resolve, reject) => {
    console.log('🚀 Testing Facebook group parser with photo URL extraction...');

    const workerPath = path.join(
      __dirname,
      'dist',
      'parser',
      'facebookParser',
      'facebook-group-parser.js',
    );

    if (!fs.existsSync(workerPath)) {
      reject(new Error('Facebook group parser worker not found. Run npm run build first.'));
      return;
    }

    const worker = new Worker(workerPath);

    worker.on('message', (message) => {
      if (message.type === 'progress') {
        console.log(`📢 [GROUP] ${message.message}`);
      } else if (message.type === 'complete') {
        console.log('✅ Group parser extraction complete');
        resolve(message.data);
      } else if (message.type === 'error') {
        reject(new Error(message.error));
      }
    });

    worker.on('error', (error) => {
      reject(error);
    });

    worker.on('exit', (code) => {
      if (code !== 0) {
        reject(new Error(`Group parser worker stopped with exit code ${code}`));
      }
    });

    // Test with the Facebook group URL
    worker.postMessage({
      url: 'https://www.facebook.com/groups/194826524192177',
      extractImages: true,
    });
  });
}

/**
 * Test the enhanced image parser with a photo URL
 */
async function testEnhancedImageParser(photoUrl) {
  return new Promise((resolve, reject) => {
    console.log('🔧 Testing enhanced image parser...');
    console.log(`📷 Photo URL: ${photoUrl.substring(0, 80)}...`);

    const workerPath = path.join(
      __dirname,
      'dist',
      'parser',
      'facebookParser',
      'facebook-enhanced-image-parser.js',
    );

    if (!fs.existsSync(workerPath)) {
      reject(new Error('Enhanced image parser worker not found. Run npm run build first.'));
      return;
    }

    const worker = new Worker(workerPath);

    worker.on('message', (message) => {
      if (message.type === 'progress') {
        console.log(`📢 [IMAGE] ${message.message}`);
      } else if (message.type === 'complete') {
        console.log('✅ Enhanced image parser complete');
        resolve(message.data);
      } else if (message.type === 'error') {
        reject(new Error(message.error));
      }
    });

    worker.on('error', (error) => {
      reject(error);
    });

    worker.on('exit', (code) => {
      if (code !== 0) {
        reject(new Error(`Enhanced image parser worker stopped with exit code ${code}`));
      }
    });

    // Send photo URL to enhanced parser
    const cookiesPath = path.join(__dirname, 'data', 'facebook-cookies.json');

    worker.postMessage({
      photoUrl,
      geminiApiKey: process.env.GEMINI_API_KEY || '',
      workerId: 1,
      cookiesPath: fs.existsSync(cookiesPath) ? cookiesPath : undefined,
    });
  });
}

/**
 * Main test function
 */
async function testCompleteEnhancedWorkflow() {
  try {
    console.log('🎬 Starting Complete Enhanced Facebook Parser Workflow Test');
    console.log('='.repeat(80));

    // Step 1: Test group parser to extract photo URLs
    console.log('\n📂 STEP 1: Group Parser - Extract Photo URLs');
    console.log('-'.repeat(50));

    const groupResult = await testGroupParserPhotoExtraction();

    console.log('\n📊 Group Parser Results:');
    console.log(`📈 Photo URLs found: ${groupResult.imageUrls?.length || 0}`);
    console.log(`📝 Page name: ${groupResult.pageName || 'Unknown'}`);

    if (groupResult.imageUrls && groupResult.imageUrls.length > 0) {
      console.log('\n🔍 First 3 photo URLs:');
      groupResult.imageUrls.slice(0, 3).forEach((url, index) => {
        console.log(`   ${index + 1}. ${url.substring(0, 100)}...`);
      });

      // Step 2: Test enhanced image parser with first photo URL
      console.log('\n🖼️ STEP 2: Enhanced Image Parser - Extract High-Res Image');
      console.log('-'.repeat(50));

      const firstPhotoUrl = groupResult.imageUrls[0];
      const imageResult = await testEnhancedImageParser(firstPhotoUrl);

      console.log('\n📊 Enhanced Image Parser Results:');
      console.log(JSON.stringify(imageResult, null, 2));

      // Step 3: Compare URLs
      console.log('\n🔄 STEP 3: URL Comparison');
      console.log('-'.repeat(50));
      console.log(`📷 Original Photo URL: ${firstPhotoUrl}`);
      console.log(`🖼️ Extracted High-Res URL: ${imageResult.extractedImageUrl || 'None'}`);

      if (imageResult.extractedImageUrl) {
        const originalSize = firstPhotoUrl.length;
        const extractedSize = imageResult.extractedImageUrl.length;
        console.log(`📏 URL length comparison: ${originalSize} → ${extractedSize} chars`);

        // Check if we got a different (presumably higher resolution) URL
        if (imageResult.extractedImageUrl !== firstPhotoUrl) {
          console.log('✅ SUCCESS: Extracted different high-resolution URL!');
        } else {
          console.log('⚠️ WARNING: Extracted URL same as original');
        }
      }

      // Step 4: Show parsing results
      if (imageResult.success) {
        console.log('\n📝 STEP 4: Parsing Results');
        console.log('-'.repeat(50));
        console.log(`🏢 Venue: ${imageResult.show?.venue || 'Not found'}`);
        console.log(`📍 Address: ${imageResult.show?.address || 'Not found'}`);
        console.log(`🏙️ City: ${imageResult.show?.city || 'Not found'}`);
        console.log(`🗓️ Day: ${imageResult.show?.day || 'Not found'}`);
        console.log(`⏰ Time: ${imageResult.show?.time || 'Not found'}`);
        console.log(`🎤 DJ: ${imageResult.dj || 'Not found'}`);
      }
    } else {
      console.log('❌ No photo URLs found - cannot test enhanced image parser');
    }

    console.log('\n🎉 Complete Enhanced Workflow Test Finished!');
    console.log('='.repeat(80));
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Check requirements
if (!process.env.GEMINI_API_KEY) {
  console.error('❌ GEMINI_API_KEY not set');
  process.exit(1);
}

// Run the test
testCompleteEnhancedWorkflow();
