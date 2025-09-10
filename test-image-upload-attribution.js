// Test script to validate image upload user attribution
const axios = require('axios');
const fs = require('fs');

const BASE_URL = 'http://localhost:8000/api';

async function testImageUploadUserAttribution() {
  console.log('🧪 Testing Image Upload User Attribution');

  try {
    // Login first to get JWT token
    console.log('1. Logging in...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'jeffers@test.com',
      password: 'password123',
    });

    const token = loginResponse.data.access_token;
    console.log('✅ Login successful, token obtained');

    // Mock image analysis data similar to what would come from the frontend
    const mockAnalysisData = {
      data: {
        vendor: {
          name: 'Test Vendor Upload',
          owner: 'Test Owner',
          website: 'https://testvendor.com',
        },
        venues: [
          {
            name: 'Test Venue Upload',
            address: '123 Test St',
            city: 'Test City',
            state: 'CT',
            zip: '06101',
          },
        ],
        djs: [
          {
            name: 'Test DJ Upload',
          },
        ],
        shows: [
          {
            day: 'Monday',
            time: '8:00 PM',
            venue: 'Test Venue Upload',
            dj: 'Test DJ Upload',
            description: 'Test Show from Image Upload',
          },
        ],
        rawData: {
          content: 'Mock image analysis for testing user attribution',
        },
      },
    };

    // Submit the analysis with authentication headers
    console.log('2. Submitting image analysis with user authentication...');
    const analysisResponse = await axios.post(
      `${BASE_URL}/parser/approve-admin-analysis`,
      mockAnalysisData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      },
    );

    console.log('✅ Analysis submitted successfully');
    console.log('Response:', analysisResponse.data);

    // Query the database to check if submittedBy fields are populated
    console.log('3. Checking database for user attribution...');

    // Check vendors
    const vendorResponse = await axios.get(`${BASE_URL}/vendors/search?name=Test Vendor Upload`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (vendorResponse.data.length > 0) {
      const vendor = vendorResponse.data[0];
      console.log(`📋 Vendor submittedBy: ${vendor.submittedBy || 'NULL'}`);
    }

    // Check venues
    const venueResponse = await axios.get(`${BASE_URL}/venues?search=Test Venue Upload`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (venueResponse.data.length > 0) {
      const venue = venueResponse.data[0];
      console.log(`🏢 Venue submittedBy: ${venue.submittedBy || 'NULL'}`);
    }

    // Check DJs
    const djResponse = await axios.get(`${BASE_URL}/djs?search=Test DJ Upload`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (djResponse.data.length > 0) {
      const dj = djResponse.data[0];
      console.log(`🎵 DJ submittedBy: ${dj.submittedBy || 'NULL'}`);
    }

    // Check shows
    const showResponse = await axios.get(`${BASE_URL}/shows?venue=Test Venue Upload&day=Monday`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (showResponse.data.length > 0) {
      const show = showResponse.data[0];
      console.log(`🎤 Show submittedBy: ${show.submittedBy || 'NULL'}`);
    }

    console.log('✅ Image upload user attribution test completed');
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testImageUploadUserAttribution();
