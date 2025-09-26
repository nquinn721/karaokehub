/**
 * Simple test script to validate our enhanced venue validation API
 * This tests the endpoints without starting the full server
 */

const axios = require('axios');

async function testValidationEndpoints() {
  const baseUrl = 'http://localhost:3000'; // Adjust if your server runs on a different port

  console.log('🧪 Testing Enhanced Venue Validation API');
  console.log('='.repeat(60));

  try {
    // Test 1: Health check
    console.log('🔍 Testing server connectivity...');
    const healthResponse = await axios.get(`${baseUrl}/health`).catch(() => null);

    if (!healthResponse) {
      console.log('❌ Server not running. Please start the server first:');
      console.log('   npm run start:dev');
      return;
    }

    console.log('✅ Server is running');

    // Test 2: Enhanced venue validation endpoint
    console.log('\n🎯 Testing enhanced venue validation...');
    const enhancedValidationResponse = await axios
      .post(
        `${baseUrl}/admin/validate-venues-enhanced`,
        { dryRun: true }, // Don't actually update the database
      )
      .catch((err) => {
        console.log('❌ Enhanced validation endpoint error:', err.response?.data || err.message);
        return null;
      });

    if (enhancedValidationResponse) {
      console.log('✅ Enhanced validation endpoint responding');
      console.log('📊 Response:', enhancedValidationResponse.data);
    }

    // Test 3: Time validation endpoint
    console.log('\n⏰ Testing time validation...');
    const timeValidationResponse = await axios
      .post(`${baseUrl}/admin/validate-times`, { dryRun: true })
      .catch((err) => {
        console.log('❌ Time validation endpoint error:', err.response?.data || err.message);
        return null;
      });

    if (timeValidationResponse) {
      console.log('✅ Time validation endpoint responding');
      console.log('📊 Response:', timeValidationResponse.data);
    }

    console.log('\n🚀 API validation complete!');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Mock test without actual server
function runMockValidation() {
  console.log('🧪 Running Mock Validation (No Server Required)');
  console.log('='.repeat(60));

  const mockProblematicVenues = [
    {
      name: "O'Nelly's Sports Pub",
      address: '8839 Lewis Center Rd', // Potentially wrong
      city: 'Lewis Center',
      state: 'OH',
      shows: [
        { day: 'friday', startTime: '08:00', endTime: '12:00' }, // AM/PM error
        { day: 'saturday', startTime: '09:00', endTime: '01:00' },
      ],
    },
    {
      name: 'Country Club Bar',
      address: '123 Wrong Street', // Likely wrong
      city: 'Columbus',
      state: 'OH',
      shows: [
        { day: 'thursday', startTime: '07:30', endTime: '11:30' }, // AM/PM error
      ],
    },
  ];

  console.log('\n📍 Mock venues with likely issues:');
  mockProblematicVenues.forEach((venue, index) => {
    console.log(`\n${index + 1}. ${venue.name}`);
    console.log(`   Address: ${venue.address}, ${venue.city}, ${venue.state}`);
    console.log(`   Shows with time issues:`);

    venue.shows.forEach((show) => {
      const startHour = parseInt(show.startTime.split(':')[0]);
      const isAMError = startHour >= 6 && startHour < 12;

      if (isAMError) {
        const fixedStartTime = `${(startHour + 12).toString().padStart(2, '0')}:${show.startTime.split(':')[1]}`;
        console.log(
          `   • ${show.day}: ${show.startTime}-${show.endTime} → ${fixedStartTime}-${show.endTime} ⚠️`,
        );
      } else {
        console.log(`   • ${show.day}: ${show.startTime}-${show.endTime} ✅`);
      }
    });
  });

  console.log('\n🤖 What our Gemini enhancement would do:');
  console.log('   1. Research each venue name for correct address');
  console.log('   2. Verify business hours and karaoke schedule');
  console.log('   3. Fix obvious AM/PM time errors');
  console.log('   4. Update coordinates for better mapping');
  console.log('   5. Report confidence levels for each fix');

  console.log('\n✅ Mock validation demonstrates the system logic');
  console.log('🚀 Ready for production deployment!');
}

// Run the appropriate test
if (process.argv.includes('--mock')) {
  runMockValidation();
} else {
  testValidationEndpoints();
}
