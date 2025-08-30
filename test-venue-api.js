const fetch = require('node-fetch');

async function testVenueAPI() {
  try {
    // Test basic shows endpoint
    console.log('Testing /shows endpoint...');
    const response = await fetch('http://localhost:3001/shows');

    if (!response.ok) {
      console.error(`HTTP error! status: ${response.status}`);
      const text = await response.text();
      console.error('Response:', text);
      return;
    }

    const shows = await response.json();
    console.log(`Found ${shows.length} shows`);

    if (shows.length > 0) {
      const firstShow = shows[0];
      console.log('First show structure:');
      console.log(JSON.stringify(firstShow, null, 2));

      // Check if venue data is properly populated
      if (firstShow.venue) {
        console.log('✅ Venue relationship working! Venue data:');
        console.log(`  Name: ${firstShow.venue.name}`);
        console.log(`  Address: ${firstShow.venue.address}`);
        console.log(`  City: ${firstShow.venue.city}, ${firstShow.venue.state}`);
        console.log(`  Coordinates: ${firstShow.venue.lat}, ${firstShow.venue.lng}`);
      } else {
        console.log('❌ Venue relationship not working - no venue data found');
      }
    }
  } catch (error) {
    console.error('Error testing API:', error);
  }
}

testVenueAPI();
