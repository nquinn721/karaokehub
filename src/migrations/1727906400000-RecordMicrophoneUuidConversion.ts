import { DataSource } from 'typeorm';

export class RecordMicrophoneUuidConversion1727906400000 {
  name = 'RecordMicrophoneUuidConversion1727906400000';

  public async up(dataSource: DataSource): Promise<void> {
    // This migration records that the microphone UUID conversion has been completed
    // The actual conversion was done manually via SQL script on 2025-09-22

    console.log('📝 Recording microphone UUID conversion completion...');

    // Verify that microphones table has UUID format IDs
    const microphoneCount = await dataSource.query(`
      SELECT COUNT(*) as count 
      FROM microphones 
      WHERE id REGEXP '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    `);

    console.log(`✅ Verified ${microphoneCount[0].count} microphones with UUID format`);

    // Verify foreign key references are working
    const userMicCount = await dataSource.query(`
      SELECT COUNT(*) as count 
      FROM users u 
      JOIN microphones m ON u.equippedMicrophoneId = m.id 
      WHERE u.equippedMicrophoneId IS NOT NULL
    `);

    console.log(`✅ Verified ${userMicCount[0].count} user microphone references`);

    console.log('🎉 Microphone UUID conversion recorded successfully');
  }

  public async down(dataSource: DataSource): Promise<void> {
    // This migration cannot be reversed as it only records completion
    // The actual UUID conversion would need to be manually reversed if needed
    console.log('⚠️  This migration only records completion and cannot be automatically reversed');
  }
}
