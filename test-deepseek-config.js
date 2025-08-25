/**
 * Test script to verify DeepSeek API configuration
 * Run this to check if your DeepSeek API key is working
 */

async function testDeepSeekConfig() {
  try {
    console.log('🧪 Testing DeepSeek API configuration...');
    
    // Test the status endpoint
    const statusResponse = await fetch('http://localhost:8000/api/parser/deepseek-status');
    const statusData = await statusResponse.json();
    
    console.log('📊 DeepSeek Status:', statusData);
    
    if (statusData.success && statusData.data.configured) {
      console.log('✅ DeepSeek is properly configured!');
      console.log(`🤖 Model: ${statusData.data.model}`);
      console.log(`🔗 API URL: ${statusData.data.apiUrl}`);
      
      if (statusData.data.connectionTest?.success) {
        console.log('🌐 API connection test: PASSED');
      } else {
        console.log('❌ API connection test: FAILED');
        console.log('Error:', statusData.data.connectionTest?.error);
      }
    } else {
      console.log('❌ DeepSeek not configured properly');
      console.log('Please check your DEEPSEEK_API_KEY in .env file');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('Make sure your server is running on http://localhost:8000');
  }
}

// Run the test
testDeepSeekConfig();
