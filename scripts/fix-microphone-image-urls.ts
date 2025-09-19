import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';

async function fixMicrophoneImageUrls() {
  console.log('🔧 Fixing microphone image URLs...');

  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);

  try {
    // Check current image URLs
    const microphones = await dataSource.query(
      'SELECT id, name, imageUrl FROM microphones ORDER BY id',
    );
    console.log('📋 Current microphone image URLs:');
    microphones.forEach((mic: any) => {
      console.log(`  - ${mic.id}: ${mic.name} -> ${mic.imageUrl}`);
    });

    // Update image URLs to correct paths
    console.log('\n🔄 Updating image URLs...');

    await dataSource.query(`
      UPDATE microphones 
      SET imageUrl = '/images/avatar/parts/microphones/mic_basic_1.png' 
      WHERE id = 'mic_basic_1'
    `);

    await dataSource.query(`
      UPDATE microphones 
      SET imageUrl = '/images/avatar/parts/microphones/mic_basic_2.png' 
      WHERE id = 'mic_basic_2'
    `);

    await dataSource.query(`
      UPDATE microphones 
      SET imageUrl = '/images/avatar/parts/microphones/mic_basic_3.png' 
      WHERE id = 'mic_basic_3'
    `);

    await dataSource.query(`
      UPDATE microphones 
      SET imageUrl = '/images/avatar/parts/microphones/mic_basic_4.png' 
      WHERE id = 'mic_basic_4'
    `);

    // Verify the updates
    const updatedMicrophones = await dataSource.query(
      'SELECT id, name, imageUrl FROM microphones ORDER BY id',
    );
    console.log('\n✅ Updated microphone image URLs:');
    updatedMicrophones.forEach((mic: any) => {
      console.log(`  - ${mic.id}: ${mic.name} -> ${mic.imageUrl}`);
    });

    console.log('\n🎉 Image URLs updated successfully!');
    console.log('\n📁 Make sure you have microphone images in these locations:');
    console.log('  - client/public/images/microphones/mic_basic_1.png');
    console.log('  - client/public/images/microphones/mic_basic_2.png');
    console.log('  - client/public/images/microphones/mic_basic_3.png');
    console.log('  - client/public/images/microphones/mic_basic_4.png');
  } catch (error) {
    console.error('❌ Error fixing image URLs:', error);
  } finally {
    await app.close();
  }
}

fixMicrophoneImageUrls();
