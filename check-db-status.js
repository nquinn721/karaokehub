/**
 * Quick script to check the database for parsed schedules and their status
 */

const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('./dist/app.module');

async function checkParsedSchedules() {
  console.log('🔍 Checking parsed schedules in database...');

  try {
    const app = await NestFactory.create(AppModule, { logger: false });

    // Get the repository directly
    const dataSource = app.get('DataSource');
    const repository = dataSource.getRepository('ParsedSchedule');

    // Get all parsed schedules
    const allSchedules = await repository.find({
      select: ['id', 'url', 'status', 'createdAt'],
      order: { createdAt: 'DESC' },
      take: 10,
    });

    console.log('📊 Found', allSchedules.length, 'parsed schedules:');
    console.log('');

    allSchedules.forEach((schedule, index) => {
      console.log(`${index + 1}. ID: ${schedule.id}`);
      console.log(`   URL: ${schedule.url}`);
      console.log(`   Status: "${schedule.status}"`);
      console.log(`   Created: ${schedule.createdAt}`);
      console.log('');
    });

    // Check specifically for PENDING_REVIEW status
    const pendingReviews = await repository.find({
      where: { status: 'pending_review' },
      select: ['id', 'url', 'status', 'createdAt'],
    });

    console.log('🔎 Specifically checking for PENDING_REVIEW status:');
    console.log('Found', pendingReviews.length, 'schedules with status = "pending_review"');

    if (pendingReviews.length > 0) {
      pendingReviews.forEach((schedule, index) => {
        console.log(`${index + 1}. ID: ${schedule.id}, Status: "${schedule.status}"`);
      });
    }

    await app.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

checkParsedSchedules();
