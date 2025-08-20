#!/usr/bin/env node

/**
 * Check if parsed_schedule records were created for Facebook URLs
 */

const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('./dist/app.module');

async function checkParsedSchedules() {
  try {
    console.log('🔍 Checking parsed_schedule records...');

    const app = await NestFactory.createApplicationContext(AppModule);
    const parsedScheduleRepo = app.get('ParsedScheduleRepository');

    // Get recent parsed_schedules
    const recent = await parsedScheduleRepo.find({
      order: { createdAt: 'DESC' },
      take: 5,
    });

    console.log('\n📋 Recent parsed_schedules:');
    if (recent.length === 0) {
      console.log('  No parsed_schedules found');
    } else {
      recent.forEach((r) => {
        console.log(`  - ${r.id}: ${r.url} (${r.status}) - ${r.createdAt}`);
      });
    }

    // Check for Facebook URLs specifically
    const allSchedules = await parsedScheduleRepo.find({
      order: { createdAt: 'DESC' },
      take: 20,
    });

    const facebookSchedules = allSchedules.filter(
      (r) => r.url && (r.url.includes('facebook.com') || r.url.includes('fb.com')),
    );

    console.log('\n🔍 Facebook parsed_schedules:');
    if (facebookSchedules.length === 0) {
      console.log('  No Facebook parsed_schedules found');
    } else {
      facebookSchedules.forEach((r) => {
        console.log(`  - ${r.id}: ${r.url} (${r.status}) - ${r.createdAt}`);
        if (r.aiAnalysis && r.aiAnalysis.shows) {
          console.log(`    Shows found: ${r.aiAnalysis.shows.length}`);
        }
        if (r.aiAnalysis && r.aiAnalysis.djs) {
          console.log(`    DJs found: ${r.aiAnalysis.djs.length}`);
        }
      });
    }

    // Check for the specific URL that was just parsed
    const specificUrl = 'https://www.facebook.com/groups/194826524192177';
    const specificSchedule = await parsedScheduleRepo.findOne({
      where: { url: specificUrl },
      order: { createdAt: 'DESC' },
    });

    console.log(`\n🎯 Specific URL check: ${specificUrl}`);
    if (specificSchedule) {
      console.log(`  ✅ Found parsed_schedule: ${specificSchedule.id}`);
      console.log(`  Status: ${specificSchedule.status}`);
      console.log(`  Created: ${specificSchedule.createdAt}`);
      if (specificSchedule.aiAnalysis) {
        console.log(`  Shows: ${specificSchedule.aiAnalysis.shows?.length || 0}`);
        console.log(`  DJs: ${specificSchedule.aiAnalysis.djs?.length || 0}`);
      }
    } else {
      console.log('  ❌ No parsed_schedule found for this URL');
    }

    await app.close();
  } catch (error) {
    console.error('💥 Error checking parsed_schedules:', error.message);
    process.exit(1);
  }
}

// Only run if called directly
if (require.main === module) {
  checkParsedSchedules()
    .then(() => {
      console.log('\n✅ Check completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Check failed:', error.message);
      process.exit(1);
    });
}

module.exports = { checkParsedSchedules };
