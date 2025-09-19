import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { AvatarService } from '../src/avatar/services/avatar.service';

async function assignBasicMicrophonestoAllUsers() {
  console.log('🚀 Assigning basic microphones to all users...');

  const app = await NestFactory.createApplicationContext(AppModule);
  const avatarService = app.get(AvatarService);
  const dataSource = app.get(DataSource);

  try {
    // Use the existing service method to assign basic microphones to all users
    const users = await dataSource.query('SELECT id FROM users');
    console.log(`👥 Found ${users.length} users to assign microphones to`);

    let successCount = 0;
    for (const user of users) {
      try {
        await avatarService.assignBasicMicrophones(user.id);
        console.log(`✅ Assigned basic microphones to user ${user.id}`);
        successCount++;
      } catch (error: any) {
        console.error(`❌ Failed to assign microphones to user ${user.id}:`, error.message);
      }
    }

    console.log(
      `✅ Successfully assigned basic microphones to ${successCount}/${users.length} users`,
    );

    // Verify the results
    const userMicCount = await dataSource.query('SELECT COUNT(*) as count FROM user_microphones');
    const equippedCount = await dataSource.query(
      'SELECT COUNT(*) as count FROM user_microphones WHERE isEquipped = true',
    );

    console.log('📊 Final Statistics:');
    console.log(`  - Total user-microphone records: ${userMicCount[0].count}`);
    console.log(`  - Users with equipped microphones: ${equippedCount[0].count}`);
  } catch (error) {
    console.error('❌ Assignment error:', error);
  } finally {
    await app.close();
  }
}

assignBasicMicrophonestoAllUsers();
