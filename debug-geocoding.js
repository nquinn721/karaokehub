// Debug script to test reverse geocoding for Columbus area
const fetch = require('node-fetch');

async function testReverseGeocoding() {
  // Approximate Galloway coordinates (near Columbus)
  const lat = 39.9612;
  const lng = -83.2085;

  const apiKey = 'YOUR_API_KEY'; // We'll need to get this from the config

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`,
    );

    const data = await response.json();

    console.log('Reverse geocoding results:');
    console.log('Status:', data.status);

    if (data.results) {
      data.results.forEach((result, index) => {
        console.log(`\n--- Result ${index + 1} ---`);
        console.log('Formatted address:', result.formatted_address);
        console.log('Address components:');

        result.address_components?.forEach((component) => {
          console.log(
            `  ${component.long_name} (${component.short_name}) - Types: ${component.types.join(', ')}`,
          );
        });

        if (result.geometry?.location) {
          console.log(`Location: ${result.geometry.location.lat}, ${result.geometry.location.lng}`);
        }
      });
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

console.log(
  'This is a debug script to understand what reverse geocoding returns for the Columbus area.',
);
console.log('You would need to add your Google Maps API key to actually run this.');
