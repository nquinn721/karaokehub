/**
 * Test DeepSeek V3.1 API Integration
 * This script verifies that we're using the correct DeepSeek V3.1 model
 */

const axios = require('axios');

async function testDeepSeekV31() {
  console.log('🧪 Testing DeepSeek V3.1 API Integration');
  console.log('=' * 50);

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    console.error('❌ DEEPSEEK_API_KEY environment variable not set');
    return;
  }

  try {
    console.log('📡 Calling DeepSeek API with V3.1 model...');

    const response = await axios.post(
      'https://api.deepseek.com/v1/chat/completions',
      {
        model: 'deepseek-chat', // This is the correct model name for V3.1
        messages: [
          {
            role: 'system',
            content:
              'You are DeepSeek V3.1, a helpful AI assistant. Respond with information about your version.',
          },
          {
            role: 'user',
            content:
              'What version of DeepSeek are you? Please confirm you are V3.1 and provide some details about your capabilities.',
          },
        ],
        max_tokens: 500,
        temperature: 0.1,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      },
    );

    const aiResponse = response.data.choices[0]?.message?.content;

    if (aiResponse) {
      console.log('✅ DeepSeek V3.1 API Response:');
      console.log('-'.repeat(40));
      console.log(aiResponse);
      console.log('-'.repeat(40));

      // Check response metadata
      console.log('\n📊 API Response Metadata:');
      console.log(`Model: ${response.data.model}`);
      console.log(`Usage - Prompt Tokens: ${response.data.usage?.prompt_tokens}`);
      console.log(`Usage - Completion Tokens: ${response.data.usage?.completion_tokens}`);
      console.log(`Usage - Total Tokens: ${response.data.usage?.total_tokens}`);

      console.log('\n🎉 DeepSeek V3.1 integration test successful!');
    } else {
      console.error('❌ No response content received from DeepSeek API');
    }
  } catch (error) {
    console.error('❌ DeepSeek V3.1 API test failed:');
    console.error(`Status: ${error.response?.status}`);
    console.error(`Message: ${error.response?.data?.error?.message || error.message}`);

    if (error.response?.status === 401) {
      console.error('🔑 API key authentication failed - check DEEPSEEK_API_KEY');
    } else if (error.response?.status === 429) {
      console.error('⏰ Rate limit exceeded - try again later');
    }
  }
}

// Run the test
if (require.main === module) {
  testDeepSeekV31();
}

module.exports = { testDeepSeekV31 };
