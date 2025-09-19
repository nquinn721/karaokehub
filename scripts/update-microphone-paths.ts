import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';

async function updateMicrophoneImageUrls() {
  console.log('🔧 Updating microphone image URLs to correct path...');

  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);

  try {
    // Update all microphone image URLs to the correct path
    await dataSource.query(`
      UPDATE microphones 
      SET imageUrl = CASE 
        WHEN id = 'mic_basic_1' THEN '/images/avatar/parts/microphones/mic_basic_1.png'
        WHEN id = 'mic_basic_2' THEN '/images/avatar/parts/microphones/mic_basic_2.png'
        WHEN id = 'mic_basic_3' THEN '/images/avatar/parts/microphones/mic_basic_3.png'
        WHEN id = 'mic_basic_4' THEN '/images/avatar/parts/microphones/mic_basic_4.png'
        ELSE imageUrl
      END
      WHERE id IN ('mic_basic_1', 'mic_basic_2', 'mic_basic_3', 'mic_basic_4')
    `);

    // Verify the updates
    const updatedMicrophones = await dataSource.query(
      'SELECT id, name, imageUrl FROM microphones ORDER BY id',
    );
    console.log('✅ Updated microphone image URLs:');
    updatedMicrophones.forEach((mic: any) => {
      console.log(`  - ${mic.id}: ${mic.name} → ${mic.imageUrl}`);
    });

    console.log('🎉 Successfully updated all microphone image URLs!');
  } catch (error) {
    console.error('❌ Update error:', error);
  } finally {
    await app.close();
  }
}

updateMicrophoneImageUrls();
