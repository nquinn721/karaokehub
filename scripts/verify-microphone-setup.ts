import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';

async function verifyMicrophoneSetup() {
  console.log('🔍 Verifying microphone database setup...');

  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);

  try {
    // Check microphones
    const microphones = await dataSource.query(
      'SELECT id, name, rarity, coinPrice FROM microphones ORDER BY name',
    );
    console.log('🎤 Microphones in database:');
    microphones.forEach((mic: any) => {
      console.log(`  - ${mic.id}: ${mic.name} (${mic.rarity}, ${mic.coinPrice} coins)`);
    });

    // Check user microphones
    const userMicCounts = await dataSource.query(`
      SELECT microphoneId, COUNT(*) as userCount 
      FROM user_microphones 
      GROUP BY microphoneId 
      ORDER BY microphoneId
    `);
    console.log('\n👥 User microphone assignments:');
    userMicCounts.forEach((um: any) => {
      console.log(`  - ${um.microphoneId}: assigned to ${um.userCount} users`);
    });

    // Check equipped microphones
    const equippedMics = await dataSource.query(`
      SELECT microphoneId, COUNT(*) as equippedCount 
      FROM user_microphones 
      WHERE isEquipped = true
      GROUP BY microphoneId 
      ORDER BY microphoneId
    `);
    console.log('\n⚡ Equipped microphones:');
    equippedMics.forEach((em: any) => {
      console.log(`  - ${em.microphoneId}: equipped by ${em.equippedCount} users`);
    });

    // Summary
    const totalMics = await dataSource.query('SELECT COUNT(*) as count FROM microphones');
    const totalUsers = await dataSource.query('SELECT COUNT(*) as count FROM users');
    const totalUserMics = await dataSource.query('SELECT COUNT(*) as count FROM user_microphones');
    const totalEquipped = await dataSource.query(
      'SELECT COUNT(*) as count FROM user_microphones WHERE isEquipped = true',
    );

    console.log('\n📊 Summary:');
    console.log(`  - Total microphones: ${totalMics[0].count}`);
    console.log(`  - Total users: ${totalUsers[0].count}`);
    console.log(`  - Total user-microphone records: ${totalUserMics[0].count}`);
    console.log(`  - Total equipped microphones: ${totalEquipped[0].count}`);
    console.log(
      `  - Expected user-microphone records: ${totalUsers[0].count * 4} (${totalUsers[0].count} users × 4 mics)`,
    );

    if (Number(totalUserMics[0].count) === Number(totalUsers[0].count) * 4) {
      console.log('✅ All users have all 4 basic microphones assigned!');
    } else {
      console.log('❌ Microphone assignment incomplete');
    }

    if (Number(totalEquipped[0].count) === Number(totalUsers[0].count)) {
      console.log('✅ All users have exactly one equipped microphone!');
    } else {
      console.log('❌ Equipped microphone assignment incomplete');
    }
  } catch (error) {
    console.error('❌ Verification error:', error);
  } finally {
    await app.close();
  }
}

verifyMicrophoneSetup();
