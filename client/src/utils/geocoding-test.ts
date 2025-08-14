/**
 * Test script for geocoding functionality
 * This can be run in the browser console to test the geocoding service
 */

import { geocodingService } from '../utils/geocoding';

async function testGeocoding() {
  console.log('🌍 Testing Geocoding Service...');

  // Set a test API key (you would use the real one from your config)
  geocodingService.setApiKey('YOUR_GOOGLE_MAPS_API_KEY');

  const testAddresses = [
    '123 Main St, New York, NY',
    'Times Square, New York, NY',
    'Empire State Building, New York, NY',
    '1600 Pennsylvania Avenue, Washington, DC',
    'Golden Gate Bridge, San Francisco, CA',
  ];

  console.log('📍 Testing individual geocoding...');

  for (const address of testAddresses) {
    try {
      console.log(`\nGeocoding: ${address}`);
      const result = await geocodingService.geocodeAddress(address);
      console.log(`Result:`, result);
    } catch (error) {
      console.error(`Error geocoding ${address}:`, error);
    }
  }

  console.log('\n📊 Cache statistics:', geocodingService.getCacheStats());

  console.log('\n🔄 Testing batch geocoding...');
  try {
    const batchResults = await geocodingService.geocodeMultipleAddresses(testAddresses);
    console.log('Batch results:', batchResults);
  } catch (error) {
    console.error('Error in batch geocoding:', error);
  }

  console.log('\n📊 Final cache statistics:', geocodingService.getCacheStats());

  console.log('✅ Geocoding test complete!');
}

// Export for use in browser console or testing
export { testGeocoding };
