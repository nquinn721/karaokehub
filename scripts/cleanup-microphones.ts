import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';

async function cleanupMicrophones() {
  console.log('🚀 Starting microphone database cleanup...');

  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);

  try {
    // First, let's see what's currently in the database
    const allMicrophones = await dataSource.query(
      'SELECT id, name, rarity, coinPrice FROM microphones ORDER BY name',
    );
    console.log('📋 Current microphones in database:');
    allMicrophones.forEach((mic: any) => {
      console.log(`  - ${mic.id}: ${mic.name} (${mic.rarity}, ${mic.coinPrice} coins)`);
    });

    // Remove all user_microphones relationships
    console.log('🧹 Removing all user-microphone relationships...');
    await dataSource.query('DELETE FROM user_microphones');

    // Remove all microphones
    console.log('🧹 Removing all microphones...');
    await dataSource.query('DELETE FROM microphones');

    // Create only the 4 basic microphones we want
    console.log('📦 Creating 4 basic free microphones...');
    await dataSource.query(`
      INSERT INTO microphones (id, name, description, rarity, coinPrice, imageUrl, isAvailable)
      VALUES 
        ('mic_basic_1', 'Basic Mic Silver', 'A reliable silver microphone for beginners', 'common', 0, '/microphones/mic_basic_1.png', true),
        ('mic_basic_2', 'Basic Mic Black', 'A sleek black microphone with good sound quality', 'common', 0, '/microphones/mic_basic_2.png', true),
        ('mic_basic_3', 'Basic Mic Blue', 'A vibrant blue microphone for those who like color', 'common', 0, '/microphones/mic_basic_3.png', true),
        ('mic_basic_4', 'Basic Mic Red', 'A bold red microphone that stands out', 'common', 0, '/microphones/mic_basic_4.png', true)
    `);

    // Verify the new microphones
    const newMicrophones = await dataSource.query(
      'SELECT id, name, rarity, coinPrice FROM microphones ORDER BY name',
    );
    console.log('✅ New microphones in database:');
    newMicrophones.forEach((mic: any) => {
      console.log(`  - ${mic.id}: ${mic.name} (${mic.rarity}, ${mic.coinPrice} coins)`);
    });

    // Get all users and assign basic microphones to them
    const users = await dataSource.query('SELECT id FROM users');
    console.log(`👥 Assigning basic microphones to ${users.length} users...`);

    let successCount = 0;
    for (const user of users) {
      try {
        await dataSource.query(`
          INSERT INTO user_microphones (userId, microphoneId, isEquipped, acquiredAt)
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

    // Final verification
    const micCount = await dataSource.query('SELECT COUNT(*) as count FROM microphones');
    const userMicCount = await dataSource.query('SELECT COUNT(*) as count FROM user_microphones');
    const equippedCount = await dataSource.query(
      'SELECT COUNT(*) as count FROM user_microphones WHERE isEquipped = true',
    );

    console.log('📊 Final Statistics:');
    console.log(`  - Total microphones: ${micCount[0].count}`);
    console.log(`  - Users with microphones assigned: ${successCount}/${users.length}`);
    console.log(`  - Total user-microphone records: ${userMicCount[0].count}`);
    console.log(`  - Users with equipped microphones: ${equippedCount[0].count}`);

    console.log('✅ Database cleanup complete!');
  } catch (error) {
    console.error('❌ Cleanup error:', error);
  } finally {
    await app.close();
  }
}

cleanupMicrophones();
