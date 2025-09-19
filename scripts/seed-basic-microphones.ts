import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';

async function seedBasicMicrophones() {
  console.log('🚀 Starting basic microphones seeding...');

  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);

  try {
    // First, create the 4 basic microphones
    console.log('📦 Creating basic microphones...');
    await dataSource.query(`
      INSERT IGNORE INTO microphones (id, name, description, rarity, coinPrice, imageUrl)
      VALUES 
        ('mic_basic_1', 'Basic Mic Silver', 'A reliable silver microphone for beginners', 'common', 0, '/microphones/mic_basic_1.png'),
        ('mic_basic_2', 'Basic Mic Black', 'A sleek black microphone with good sound quality', 'common', 0, '/microphones/mic_basic_2.png'),
        ('mic_basic_3', 'Basic Mic Blue', 'A vibrant blue microphone for those who like color', 'common', 0, '/microphones/mic_basic_3.png'),
        ('mic_basic_4', 'Basic Mic Red', 'A bold red microphone that stands out', 'common', 0, '/microphones/mic_basic_4.png')
    `);

    // Check how many microphones were created
    const micCount = await dataSource.query(
      'SELECT COUNT(*) as count FROM microphones WHERE id LIKE "mic_basic_%"',
    );
    console.log(`✅ Basic microphones in database: ${micCount[0].count}`);

    // Get all existing users
    const users = await dataSource.query('SELECT id FROM users');
    console.log(`👥 Found ${users.length} users to assign microphones to`);

    let successCount = 0;
    // For each user, assign all 4 basic microphones
    for (const user of users) {
      try {
        await dataSource.query(`
          INSERT IGNORE INTO user_microphones (userId, microphoneId, isEquipped, acquiredAt)
          VALUES 
            ('${user.id}', 'mic_basic_1', true, NOW()),
            ('${user.id}', 'mic_basic_2', false, NOW()),
            ('${user.id}', 'mic_basic_3', false, NOW()),
            ('${user.id}', 'mic_basic_4', false, NOW())
        `);
        successCount++;
      } catch (error: any) {
        console.error(`❌ Failed to assign microphones to user ${user.id}:`, error.message);
      }
    }

    // Check final counts
    const userMicCount = await dataSource.query('SELECT COUNT(*) as count FROM user_microphones');
    console.log(`✅ Successfully assigned microphones to ${successCount}/${users.length} users`);
    console.log(`📊 Total user_microphone records: ${userMicCount[0].count}`);

    // Check equipped microphones
    const equippedCount = await dataSource.query(
      'SELECT COUNT(*) as count FROM user_microphones WHERE isEquipped = true',
    );
    console.log(`🎤 Users with equipped microphones: ${equippedCount[0].count}`);
  } catch (error) {
    console.error('❌ Seeding error:', error);
  } finally {
    await app.close();
  }
}

seedBasicMicrophones();
