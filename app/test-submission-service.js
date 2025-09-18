// Quick test script for SubmissionService
// Run with: node test-submission-service.js

const { submissionService } = require('./src/services/SubmissionService');

async function testSubmissionService() {
  console.log('🧪 Testing SubmissionService...');

  try {
    // Test connection
    console.log('\n1. Testing API connection...');
    const connectionResult = await submissionService.testConnection();
    console.log('Connection result:', connectionResult);

    // Test manual show submission
    console.log('\n2. Testing manual show submission...');
    const manualShowData = {
      venue: 'Test Karaoke Bar',
      address: '123 Test Street',
      city: 'Test City',
      state: 'CA',
      zip: '90210',
      djName: 'DJ Test',
      description: 'Great karaoke night',
      startTime: '8:00 PM',
      endTime: '2:00 AM',
      phone: '555-123-4567',
      website: 'https://testbar.com',
      days: ['friday', 'saturday'],
    };

    const manualResult = await submissionService.submitManualShow(manualShowData);
    console.log('Manual submission result:', manualResult);

    console.log('\n✅ SubmissionService tests complete!');
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Only run if this script is executed directly
if (require.main === module) {
  testSubmissionService();
}

module.exports = { testSubmissionService };
