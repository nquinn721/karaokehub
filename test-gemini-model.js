// Quick test to verify current Gemini model is working
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

async function testGeminiModel() {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('GEMINI_API_KEY not found in environment variables');
      return;
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    // Test the current model from the config
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    console.log('Testing Gemini 2.0 Flash model...');
    const result = await model.generateContent('Say hello and confirm you are working correctly.');
    const response = await result.response;
    const text = response.text();

    console.log('✅ Gemini model test successful!');
    console.log('Response:', text);
  } catch (error) {
    console.error('❌ Gemini model test failed:', error.message);

    // If 2.0 fails, test 1.5 flash as fallback
    try {
      console.log('Trying fallback model: gemini-1.5-flash...');
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const fallbackModel = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const result = await fallbackModel.generateContent(
        'Say hello and confirm you are working correctly.',
      );
      const response = await result.response;
      const text = response.text();

      console.log('✅ Fallback model (1.5-flash) works!');
      console.log('Response:', text);
      console.log(
        '💡 Consider updating config to use gemini-1.5-flash instead of gemini-2.0-flash',
      );
    } catch (fallbackError) {
      console.error('❌ Fallback model also failed:', fallbackError.message);
    }
  }
}

testGeminiModel();
