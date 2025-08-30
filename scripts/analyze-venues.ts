import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { ShowService } from '../src/show/show.service';

async function analyzeVenueData() {
  console.log('📊 Analyzing Current Venue Data');
  console.log('===============================');

  const app = await NestFactory.createApplicationContext(AppModule);
  const showService = app.get(ShowService);

  try {
    // Get all shows
    const allShows = await showService.findAll();
    console.log(`📈 Total active shows: ${allShows.length}`);

    // Analyze venue data
    const showsWithVenue = allShows.filter((show) => show.venue);
    const showsWithAddress = allShows.filter((show) => show.address);
    const showsWithCoords = allShows.filter((show) => show.lat && show.lng);

    console.log(`🏢 Shows with venue names: ${showsWithVenue.length}`);
    console.log(`📍 Shows with addresses: ${showsWithAddress.length}`);
    console.log(`🗺️  Shows with coordinates: ${showsWithCoords.length}`);

    // Group by address to find unique venues
    const addressMap = new Map();

    allShows.forEach((show) => {
      if (show.address && show.city && show.state) {
        const addressKey = `${show.address}|${show.city}|${show.state}`;
        if (!addressMap.has(addressKey)) {
          addressMap.set(addressKey, {
            address: show.address,
            city: show.city,
            state: show.state,
            venueNames: new Set(),
            showCount: 0,
            shows: [],
          });
        }

        const entry = addressMap.get(addressKey);
        if (show.venue) entry.venueNames.add(show.venue);
        entry.showCount++;
        entry.shows.push(show);
      }
    });

    console.log(`\n🎯 Unique address combinations: ${addressMap.size}`);

    // Find addresses with multiple venue names
    const multipleVenueNames = Array.from(addressMap.values()).filter(
      (entry) => entry.venueNames.size > 1,
    );

    console.log(`⚠️  Addresses with multiple venue names: ${multipleVenueNames.length}`);

    // Show top 10 most problematic addresses
    console.log('\n🔍 Top addresses with multiple venue names:');
    multipleVenueNames
      .sort((a, b) => b.showCount - a.showCount)
      .slice(0, 10)
      .forEach((entry, index) => {
        console.log(`   ${index + 1}. ${entry.address}, ${entry.city}, ${entry.state}`);
        console.log(`      Shows: ${entry.showCount}, Venue names: ${entry.venueNames.size}`);
        console.log(`      Names: ${Array.from(entry.venueNames).join(', ')}`);
        console.log('');
      });

    // Shows without complete address data
    const incompleteData = allShows.filter((show) => !show.address || !show.city || !show.state);
    console.log(`📍 Shows with incomplete address data: ${incompleteData.length}`);

    // Shows without any venue identifier
    const noVenueData = allShows.filter(
      (show) => !show.venue && (!show.address || !show.city || !show.state),
    );
    console.log(`❌ Shows without any venue identifier: ${noVenueData.length}`);

    console.log('\n🎯 Migration Strategy:');
    console.log('   1. Create venues using unique address combinations');
    console.log('   2. Choose alphabetically first venue name for each address');
    console.log('   3. Preserve all original data in legacy columns');
    console.log('   4. Link shows to venues by address matching');
    console.log('   5. Handle incomplete data with "Unknown Venue" fallback');
  } catch (error) {
    console.error('❌ Analysis error:', error);
  } finally {
    await app.close();
  }
}

analyzeVenueData().catch(console.error);
