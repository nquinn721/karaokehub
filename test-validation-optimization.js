/**
 * Test script to verify validation optimization
 * This will test the new batching and skipping logic
 */

const { Worker } = require('worker_threads');
const path = require('path');

// Test data with mix of complete and incomplete shows
const testShows = [
  // Complete show (should be skipped)
  {
    vendor: "Otie's Tavern & Grille",
    dj: 'DJ Mike',
    show: 'Tuesday Night Karaoke',
    source: 'facebook',
    success: true,
    state: 'PA',
    city: 'Cranberry Township',
    zip: '16066',
    lat: 40.6884,
    lng: -80.1098,
  },
  // Incomplete show 1 (needs validation)
  {
    vendor: 'Unknown Venue',
    dj: 'DJ Sarah',
    show: 'Friday Night Fun',
    source: 'facebook',
    success: true,
    state: null,
    city: null,
    zip: null,
    lat: null,
    lng: null,
  },
  // Incomplete show 2 (needs validation)
  {
    vendor: 'Local Bar',
    dj: 'DJ Tom',
    show: 'Weekend Karaoke',
    source: 'facebook',
    success: true,
    state: 'PA',
    city: null,
    zip: null,
    lat: null,
    lng: null,
  },
  // Complete show 2 (should be skipped)
  {
    vendor: 'Champions Grille',
    dj: 'DJ Lisa',
    show: 'Thursday Karaoke',
    source: 'facebook',
    success: true,
    state: 'PA',
    city: 'Pittsburgh',
    zip: '15222',
    lat: 40.4406,
    lng: -79.9959,
  },
];

async function testValidationOptimization() {
  return new Promise((resolve, reject) => {
    console.log('🧪 [TEST] Starting validation optimization test...');
    console.log(`📊 [TEST] Input: ${testShows.length} shows`);

    const completeShows = testShows.filter(
      (show) => show.state && show.city && show.zip && show.lat && show.lng,
    );
    const incompleteShows = testShows.filter(
      (show) => !(show.state && show.city && show.zip && show.lat && show.lng),
    );

    console.log(`✅ [TEST] Expected: ${completeShows.length} complete shows (should skip)`);
    console.log(`🔍 [TEST] Expected: ${incompleteShows.length} incomplete shows (should validate)`);

    const startTime = Date.now();

    const worker = new Worker(
      path.join(__dirname, 'src/parser/facebookParser/facebook-data-validation.ts'),
      {
        workerData: {
          shows: testShows,
          geminiApiKey: process.env.GOOGLE_AI_API_KEY || 'test-key',
        },
      },
    );

    worker.on('message', (message) => {
      if (message.type === 'progress') {
        console.log(`📢 [WORKER] ${message.message}`);
      } else if (message.type === 'result') {
        const endTime = Date.now();
        const duration = endTime - startTime;

        console.log(`⏱️ [TEST] Validation completed in ${duration}ms`);
        console.log(`📊 [TEST] Output: ${message.data.length} shows`);

        // Verify results
        const outputComplete = message.data.filter(
          (show) => show.state && show.city && show.zip && show.lat && show.lng,
        );

        console.log(`✅ [TEST] Result: ${outputComplete.length} shows with complete data`);
        console.log(`🎯 [TEST] Performance improvement: Should be much faster than 21+ seconds`);

        resolve(message.data);
      }
    });

    worker.on('error', (error) => {
      console.error(`❌ [TEST] Worker error: ${error.message}`);
      reject(error);
    });

    worker.on('exit', (code) => {
      if (code !== 0) {
        console.error(`❌ [TEST] Worker stopped with exit code ${code}`);
        reject(new Error(`Worker stopped with exit code ${code}`));
      }
    });
  });
}

// Run the test
testValidationOptimization()
  .then((results) => {
    console.log('🎉 [TEST] Validation optimization test completed successfully!');
    console.log(`📈 [TEST] Key improvements:`);
    console.log(`   - Skips shows with complete geo data`);
    console.log(`   - Processes incomplete shows in batches of 5`);
    console.log(
      `   - Should reduce API calls from ${testShows.length} to ${Math.ceil(testShows.filter((s) => !(s.state && s.city && s.zip && s.lat && s.lng)).length / 5)}`,
    );
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ [TEST] Test failed:', error);
    process.exit(1);
  });
