// Test script to check for invalid shows before implementing the fix
const checkInvalidShows = async () => {
  console.log('Checking for invalid shows...');

  try {
    // Get all active shows with their relationships
    const response = await fetch('http://localhost:8000/api/admin/shows?page=1&limit=1000', {
      headers: {
        Authorization: 'Bearer test-token',
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    console.log(`Total shows found: ${data.total}`);

    if (data.items && data.items.length > 0) {
      let noVenueCount = 0;
      let noDjCount = 0;
      let noVendorCount = 0;

      data.items.forEach((show) => {
        if (!show.venue || !show.venueId) {
          noVenueCount++;
          console.log(`Show ${show.id}: No venue`);
        }

        if (!show.dj || !show.djId) {
          noDjCount++;
          console.log(`Show ${show.id}: No DJ`);
        }

        if (show.dj && (!show.dj.vendor || !show.dj.vendorId)) {
          noVendorCount++;
          console.log(`Show ${show.id}: DJ has no vendor (DJ: ${show.dj.name})`);
        }
      });

      console.log(`\nSummary:`);
      console.log(`Shows without venue: ${noVenueCount}`);
      console.log(`Shows without DJ: ${noDjCount}`);
      console.log(`Shows with DJ but no vendor: ${noVendorCount}`);
      console.log(`Total invalid shows: ${Math.max(noVenueCount, noDjCount, noVendorCount)}`);
    } else {
      console.log('No shows found');
    }
  } catch (error) {
    console.error('Test failed:', error);
  }
};

checkInvalidShows();
