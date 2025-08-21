/**
 * Test Facebook Group Name Extraction
 * Tests the enhanced header screenshot capture and Gemini-based name extraction
 */

const { FacebookParserService } = require('./dist/src/parser/facebook-parser.service');
const { WebSocketGateway } = require('./dist/src/websocket/websocket.gateway');

async function testFacebookGroupNameExtraction() {
  console.log('🧪 Testing Facebook Group Name Extraction...\n');

  // Create a mock WebSocket gateway for logging
  const mockWebSocketGateway = {
    broadcastParserLog: (log) => {
      const timestamp = new Date().toLocaleTimeString();
      const emoji = log.level === 'error' ? '❌' : log.level === 'warning' ? '⚠️' : log.level === 'success' ? '✅' : 'ℹ️';
      console.log(`${timestamp} ${emoji} ${log.message}`);
    }
  };

  const facebookParser = new FacebookParserService(mockWebSocketGateway);

  // Test URL - the group you showed in the screenshot
  const testUrl = 'https://www.facebook.com/groups/194826524192177';

  try {
    console.log(`🎯 Testing group name extraction for: ${testUrl}\n`);
    
    // This will test the full flow including:
    // 1. Navigation to the group page
    // 2. Header screenshot capture (PNG format, 500px height)
    // 3. Gemini Vision analysis for group name
    // 4. Fallback to HTML extraction if needed
    const result = await facebookParser.parseAndSaveFacebookPage(testUrl);

    console.log('\n🎉 Group Name Extraction Test Results:');
    console.log('=====================================');
    console.log(`Vendor Name: ${result.data?.vendor?.name || 'Not extracted'}`);
    console.log(`Success: ${result.success ? '✅' : '❌'}`);
    
    if (result.data?.vendor?.name && result.data.vendor.name !== 'Facebook Group') {
      console.log('✅ SUCCESS: Group name was successfully extracted!');
    } else {
      console.log('❌ FAILURE: Group name extraction failed - still showing generic name');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    // Clean up
    try {
      await facebookParser.cleanup();
    } catch (cleanupError) {
      console.error('Cleanup error:', cleanupError.message);
    }
  }
}

// Run the test
testFacebookGroupNameExtraction()
  .then(() => {
    console.log('\n🏁 Test completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Test runner error:', error);
    process.exit(1);
  });
