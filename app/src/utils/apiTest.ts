import { baseApiService } from '../services/BaseApiService';

/**
 * Test API connection to production server
 * Run this to verify shows are loading from karaoke-hub.com
 */
export const testProductionAPI = async () => {
  console.log('🧪 Testing Production API Connection...');
  console.log('📡 Base URL:', baseApiService.environmentInfo.baseURL);
  console.log(
    '🏗️ Environment:',
    baseApiService.environmentInfo.isDevelopment ? 'Development' : 'Production',
  );

  try {
    // Test basic shows endpoint
    console.log('📍 Testing shows endpoint...');
    const startTime = Date.now();

    const response = await baseApiService.get(baseApiService.endpoints.shows.list);

    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log('✅ API Response successful!');
    console.log(`⏱️ Response time: ${duration}ms`);
    console.log(`📊 Shows loaded: ${response?.shows?.length || 0}`);

    if (response?.shows && response.shows.length > 0) {
      const firstShow = response.shows[0];
      console.log('🎤 Sample show:', {
        venue: firstShow.venue?.name,
        day: firstShow.day,
        time: firstShow.startTime,
        city: firstShow.venue?.city,
      });
    }

    return {
      success: true,
      showCount: response?.shows?.length || 0,
      responseTime: duration,
      baseURL: baseApiService.environmentInfo.baseURL,
    };
  } catch (error: any) {
    console.error('❌ API Test Failed:', error);
    console.error('🔍 Error details:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      baseURL: baseApiService.environmentInfo.baseURL,
    });

    return {
      success: false,
      error: error.message,
      status: error.response?.status,
      baseURL: baseApiService.environmentInfo.baseURL,
    };
  }
};

/**
 * Test nearby shows endpoint
 */
export const testNearbyShows = async (lat = 40.7128, lng = -74.006, radius = 25) => {
  console.log('🧪 Testing Nearby Shows API...');

  try {
    const response = await baseApiService.get(
      baseApiService.endpoints.shows.nearby(lat, lng, radius),
    );

    console.log('✅ Nearby shows response successful!');
    console.log(`📊 Nearby shows found: ${response?.shows?.length || 0}`);

    return {
      success: true,
      showCount: response?.shows?.length || 0,
    };
  } catch (error: any) {
    console.error('❌ Nearby Shows Test Failed:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Test all major endpoints
 */
export const runFullAPITest = async () => {
  console.log('🧪 Running Full API Test Suite...');

  const results = {
    shows: await testProductionAPI(),
    nearby: await testNearbyShows(),
  };

  console.log('📋 Test Results Summary:', results);
  return results;
};
