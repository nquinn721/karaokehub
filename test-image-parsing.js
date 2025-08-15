// 🧪 Test Image Parsing Functionality
// Node.js test script for the new image parsing endpoints

const BASE_URL = 'http://localhost:8000/api/parser';
const IMAGE_URL =
  'https://scontent-lga3-3.xx.fbcdn.net/v/t39.30808-6/479675883_610547821608741_5223623110230996688_n.jpg?stp=c0.394.1545.806a_cp6_dst-jpg_s1545x806_tt6&_nc_cat=110&ccb=1-7&_nc_sid=75d36f&_nc_ohc=FzGTzQ6Fzq8Q7kNvwHNqlb2&_nc_oc=AdmzuSIBaP3dF06vwKfCBgbNV4ae6oXDrQNQng_ND_2ax8Sxoy1OaUjnawuT8p3WIDE&_nc_zt=23&_nc_ht=scontent-lga3-3.xx&_nc_gid=BuspIiJkodJ484HWj3ceQQ&oh=00_AfW9TbWaeMfq8YQTQk3jIThY05ZdIeH--PFOcK-VzHnE2Q&oe=68A57C0C';

async function testImageParsing() {
  console.log('🖼️  Testing Image Parsing Functionality');
  console.log('========================================');
  console.log('');

  try {
    // Test 1: Parse Image (Preview Only)
    console.log('📋 Test 1: Parse Image Directly (Preview)');
    console.log(`URL: ${IMAGE_URL.substring(0, 100)}...`);
    console.log('');

    const start1 = Date.now();
    const response1 = await fetch(`${BASE_URL}/parse-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ imageUrl: IMAGE_URL }),
    });

    const result1 = await response1.json();
    const time1 = ((Date.now() - start1) / 1000).toFixed(2);

    console.log('Response:', JSON.stringify(result1, null, 2));
    console.log(`\nResponse Time: ${time1}s`);
    console.log(`HTTP Status: ${response1.status}`);
    console.log('');
    console.log('============================================');
    console.log('');

    // Test 2: Parse and Save Image (Admin Review)
    console.log('💾 Test 2: Parse and Save Image (Admin Review)');
    console.log(`URL: ${IMAGE_URL.substring(0, 100)}...`);
    console.log('');

    const start2 = Date.now();
    const response2 = await fetch(`${BASE_URL}/parse-and-save-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ imageUrl: IMAGE_URL }),
    });

    const result2 = await response2.json();
    const time2 = ((Date.now() - start2) / 1000).toFixed(2);

    console.log('Response:', JSON.stringify(result2, null, 2));
    console.log(`\nResponse Time: ${time2}s`);
    console.log(`HTTP Status: ${response2.status}`);
    console.log('');
    console.log('============================================');
    console.log('');

    // Expected Results Summary
    console.log('🎯 Expected Results:');
    console.log("- Venue: 'The Crescent Lounge'");
    console.log("- Address: '5240 Godown Road, Columbus, Ohio'");
    console.log("- DJ: 'DJ MAX614' or similar");
    console.log("- Time: '8PM-12AM' or '8:00 PM - 12:00 AM'");
    console.log("- Event: 'Karaoke Every Saturday'");
    console.log('- Features: Pizza, craft cocktails, free parking');
    console.log('');

    // Analyze results
    if (result1.shows && result1.shows.length > 0) {
      const show = result1.shows[0];
      console.log('✅ Analysis Results:');
      console.log(`- Venue Found: ${show.venue || 'Not detected'}`);
      console.log(`- Address Found: ${show.address || 'Not detected'}`);
      console.log(`- DJ Found: ${show.djName || 'Not detected'}`);
      console.log(`- Time Found: ${show.time || 'Not detected'}`);
      console.log(`- Confidence: ${((show.confidence || 0) * 100).toFixed(1)}%`);
    } else {
      console.log('❌ No shows detected in parsing results');
    }
  } catch (error) {
    console.error('❌ Error testing image parsing:', error.message);

    if (error.message.includes('fetch')) {
      console.log('\n💡 Make sure the server is running:');
      console.log('   npm run dev');
    }

    if (error.message.includes('GEMINI_API_KEY')) {
      console.log('\n💡 Make sure GEMINI_API_KEY is set in your .env file');
    }
  }

  console.log('');
  console.log('✅ Testing Complete!');
  console.log('');
  console.log('📊 Next Steps:');
  console.log('1. Check server logs for detailed processing info');
  console.log('2. Verify parsed data accuracy');
  console.log('3. Review admin dashboard for pending items');
  console.log('4. Test with different image URLs');
}

// Run the test
testImageParsing();
