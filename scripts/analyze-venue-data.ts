import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { ShowService } from '../src/show/show.service';

async function analyzeVenues() {
  console.log('🔍 Pre-Migration Venue Analysis');
  console.log('==============================\n');

  const app = await NestFactory.createApplicationContext(AppModule);
  const showService = app.get(ShowService);

  try {
    // Use the existing analysis method
    const venueStats = await showService.getVenueStatistics();
    const venueAnalysis = await showService.analyzeVenueData();

    console.log('📊 Current Show Data Analysis:');
    console.log('==============================');
    console.log(`📈 Total active shows: ${venueAnalysis.totalShows}`);
    console.log(`🏢 Unique venues: ${venueAnalysis.uniqueVenues}`);
    console.log(`🗺️  Venues with coordinates: ${venueAnalysis.venuesWithCoordinates}`);
    console.log(`❌ Shows without venues: ${venueStats.showsWithoutVenues}`);
    console.log(`📍 Shows without coordinates: ${venueStats.showsWithoutCoordinates}`);

    console.log('\n🏆 Most Popular Venues:');
    console.log('========================');
    venueAnalysis.mostPopularVenues.forEach((venue, index) => {
      console.log(
        `${index + 1}. ${venue.venue} (${venue.city}, ${venue.state}): ${venue.showCount} shows`,
      );
    });

    console.log('\n⚠️  Potential Duplicate Venues:');
    console.log('===============================');
    if (venueStats.duplicateVenues.length > 0) {
      venueStats.duplicateVenues.slice(0, 5).forEach((dup, index) => {
        console.log(`${index + 1}. ${dup.venue} (${dup.city}, ${dup.state})`);
        console.log(`   ${dup.count} different addresses: ${dup.addresses.join(', ')}\n`);
      });
    } else {
      console.log('✅ No duplicate venues detected');
    }

    console.log('\n🎯 Migration Strategy:');
    console.log('=====================');
    console.log('1. Group venues by address as primary key');
    console.log('2. Use venue name + city/state for venues without addresses');
    console.log('3. Average coordinates for venues with multiple entries');
    console.log('4. Preserve all venue contact information');
    console.log('5. Link shows to appropriate venue references\n');

    console.log(`📊 Estimated venues to be created: ~${venueAnalysis.uniqueVenues}`);
    console.log('Ready for migration? Run: npm run migration:run');
  } catch (error) {
    console.error('❌ Analysis error:', error);
  } finally {
    await app.close();
  }
}

analyzeVenues().catch(console.error);
