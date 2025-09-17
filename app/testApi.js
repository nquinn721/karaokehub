// Simple API test for production connectivity
import axios from 'axios';

const testProductionAPI = async () => {
  try {
    console.log('Testing production API connectivity...');

    const response = await axios.get('https://karaoke-hub.com/api/shows', {
      timeout: 10000,
      headers: {
        'User-Agent': 'KaraokeHub-Mobile-App/1.0',
        Accept: 'application/json',
      },
    });

    console.log('✅ Production API Response:', {
      status: response.status,
      dataLength: response.data?.length || 0,
      sampleData: response.data?.slice(0, 2),
    });

    return true;
  } catch (error) {
    console.error('❌ Production API Error:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
    });
    return false;
  }
};

testProductionAPI();
