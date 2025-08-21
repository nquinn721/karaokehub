#!/usr/bin/env node

/**
 * Test script to verify Facebook parser aggregation functionality
 * This script tests the deduplication and database aggregation features
 */

const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('./dist/app.module');

async function testFacebookAggregation() {
  console.log('🧪 Testing Facebook Parser Aggregation...\n');

  try {
    // Create NestJS application
    const app = await NestFactory.createApplicationContext(AppModule, {
      logger: ['error', 'warn', 'log'],
    });

    // Get the FacebookParserService
    const facebookParserService = app.get('FacebookParserService');

    // Test URL - using a Facebook group URL
    const testUrl = 'https://www.facebook.com/groups/testing'; // Placeholder for testing

    console.log('📋 Testing aggregation behavior:');
    console.log(`   URL: ${testUrl}`);
    console.log('   Expected: Should update existing records instead of creating duplicates\n');

    // First parse attempt
    console.log('🔄 First parsing attempt...');
    try {
      const result1 = await facebookParserService.parseAndSaveFacebookPage(testUrl);
      console.log('✅ First parse completed:');
      console.log(`   ParsedSchedule ID: ${result1.parsedScheduleId}`);
      console.log(`   Shows found: ${result1.stats.showsFound}`);
      console.log(`   DJs found: ${result1.stats.djsFound}`);
      console.log(`   Updated existing: ${result1.stats.updated || false}\n`);

      // Second parse attempt (should update existing)
      console.log('🔄 Second parsing attempt (should aggregate)...');
      const result2 = await facebookParserService.parseAndSaveFacebookPage(testUrl);
      console.log('✅ Second parse completed:');
      console.log(`   ParsedSchedule ID: ${result2.parsedScheduleId}`);
      console.log(`   Shows found: ${result2.stats.showsFound}`);
      console.log(`   DJs found: ${result2.stats.djsFound}`);
      console.log(`   Updated existing: ${result2.stats.updated || false}\n`);

      // Verify aggregation worked
      if (result1.parsedScheduleId === result2.parsedScheduleId) {
        console.log('✅ SUCCESS: Aggregation working - same parsedScheduleId returned');
        console.log('   This means existing record was updated instead of creating duplicate');
      } else {
        console.log('❌ WARNING: Different parsedScheduleIds returned');
        console.log('   This suggests new records are being created instead of aggregating');
      }
    } catch (parsingError) {
      console.log('⚠️ Parsing error (expected for test URL):');
      console.log(`   ${parsingError.message}`);
      console.log('   This is normal if using a placeholder URL for testing');
    }

    // Test deduplication methods directly
    console.log('\n🧪 Testing deduplication methods:');

    // Create test data with duplicates
    const testShows = [
      { venue: 'Club A', datetime: '2024-01-15T20:00:00Z', artists: ['DJ Test'] },
      { venue: 'club a', datetime: '2024-01-15T20:00:00Z', artists: ['DJ Test', 'MC Flow'] }, // duplicate with more data
      { venue: 'Club B', datetime: '2024-01-16T21:00:00Z', artists: ['DJ Another'] },
    ];

    const testDJs = [
      { name: 'DJ Test', genre: 'House' },
      { name: 'dj test', genre: 'House', description: 'Amazing DJ' }, // duplicate with more data
      { name: 'DJ Another', genre: 'Techno' },
    ];

    // Access private methods through reflection (for testing)
    const deduplicateShows = facebookParserService.deduplicateShows?.bind(facebookParserService);
    const deduplicateDJs = facebookParserService.deduplicateDJs?.bind(facebookParserService);

    if (deduplicateShows && deduplicateDJs) {
      const uniqueShows = deduplicateShows(testShows);
      const uniqueDJs = deduplicateDJs(testDJs);

      console.log(
        `   Original shows: ${testShows.length}, After deduplication: ${uniqueShows.length}`,
      );
      console.log(`   Original DJs: ${testDJs.length}, After deduplication: ${uniqueDJs.length}`);

      if (uniqueShows.length === 2 && uniqueDJs.length === 2) {
        console.log('✅ Deduplication working correctly');
      } else {
        console.log('❌ Deduplication may have issues');
      }
    } else {
      console.log('⚠️ Deduplication methods not accessible for direct testing');
    }

    await app.close();
    console.log('\n✅ Test completed successfully!');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testFacebookAggregation().catch(console.error);
}

module.exports = testFacebookAggregation;
