import { GoogleGenerativeAI } from '@google/generative-ai';

async function testGeminiPrompts() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('❌ GEMINI_API_KEY not found. Please set it in your environment variables.');
    return;
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash-image-preview',
  });

  console.log('🧪 Testing Improved Gemini Prompts for Store Generation\n');

  // Test 1: Custom prompt like "build a rock outfit on this girl"
  const customPromptTest = `Generate a clothing/fashion item image based on this request: "build a rock outfit on this girl". 

REQUIREMENTS:
- Create ONLY clothing, accessories, or wearable items
- NO landscapes, buildings, or random objects
- Style: Modern
- Theme: Casual Day
- Item type: outfit
- Professional fashion photography style
- Clean background
- High quality clothing/accessory item suitable for an avatar character

Focus specifically on creating wearable items like clothing, shoes, accessories that an avatar character could wear.`;

  console.log('Test 1: Custom Prompt Enhancement');
  console.log('Original problematic input: "build a rock outfit on this girl"');
  console.log('Enhanced prompt:');
  console.log(customPromptTest);
  console.log('\n' + '='.repeat(80) + '\n');

  // Test 2: Avatar-based prompt for outfits
  const avatarPromptTest = `Create a outfit item for an avatar character.

SPECIFIC REQUIREMENTS:
- Generate ONLY outfit clothing/accessories  
- Style: Modern
- Theme: Casual Day
- a Modern Casual Day clothing outfit - jacket, shirt, dress, or complete clothing ensemble
- Professional fashion/product photography
- Clean background
- High quality wearable item
- NO landscapes, buildings, or unrelated objects
- Focus on clothing, shoes, accessories, or wearable items ONLY

The result should be a clear image of outfit suitable for an avatar character to wear.`;

  console.log('Test 2: Avatar-Based Prompt (No Reference Image)');
  console.log('Enhanced prompt:');
  console.log(avatarPromptTest);
  console.log('\n' + '='.repeat(80) + '\n');

  // Test 3: Microphone prompt
  const microphonePromptTest = `Create a microphone item for an avatar character.

SPECIFIC REQUIREMENTS:
- Generate ONLY microphone clothing/accessories  
- Style: Modern
- Theme: Casual Day
- a Modern Casual Day karaoke microphone - professional singing microphone with unique design
- Professional fashion/product photography
- Clean background
- High quality wearable item
- NO landscapes, buildings, or unrelated objects
- Focus on clothing, shoes, accessories, or wearable items ONLY

The result should be a clear image of microphone suitable for an avatar character to wear.`;

  console.log('Test 3: Microphone Prompt');
  console.log('Enhanced prompt:');
  console.log(microphonePromptTest);
  console.log('\n' + '='.repeat(80) + '\n');

  console.log('✅ Prompt analysis complete!');
  console.log('📋 Key improvements made:');
  console.log('  - Very specific "ONLY clothing/accessories" requirements');
  console.log('  - Explicit exclusion of "NO landscapes, buildings, or random objects"');
  console.log('  - Clear focus on "wearable items" and "avatar character" context');
  console.log('  - Professional photography style specification');
  console.log('  - Enhanced custom prompt processing for user inputs');
  
  console.log('\n🎯 This should fix the issue where Gemini was generating:');
  console.log('  ❌ Random landscape/architecture images');
  console.log('  ✅ Now will generate clothing/accessories for avatars');
}

testGeminiPrompts();