/**
 * Script to check and update parsed schedule status
 */

const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('./dist/app.module');

async function checkAndFixParsedSchedules() {
  console.log('🔍 Checking and fixing parsed schedules status...');

  try {
    const app = await NestFactory.create(AppModule, { logger: ['error'] });

    // Get the karaoke parser service that has the repository
    const karaokeParser = app.get('KaraokeParserService');

    // First, let's see if we can get pending reviews
    console.log('📋 Checking current pending reviews...');
    try {
      const pendingReviews = await karaokeParser.getPendingReviews();
      console.log(`Found ${pendingReviews.length} pending reviews`);

      if (pendingReviews.length > 0) {
        console.log('✅ Pending reviews are working!');
        pendingReviews.forEach((review, index) => {
          console.log(`${index + 1}. ${review.url} - Status: ${review.status}`);
        });
      } else {
        console.log('❌ No pending reviews found');
      }
    } catch (error) {
      console.error('❌ Error getting pending reviews:', error.message);
    }

    await app.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkAndFixParsedSchedules();
