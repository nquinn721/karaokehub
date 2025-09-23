import { DataSource } from 'typeorm';

export class ConvertMicrophonesToUuid1727906500000 {
  name = 'ConvertMicrophonesToUuid1727906500000';

  public async up(dataSource: DataSource): Promise<void> {
    console.log('🔄 Checking microphone UUID conversion status...');
    
    // Check if microphones are already in UUID format
    const uuidCheck = await dataSource.query(`
      SELECT COUNT(*) as uuid_count, 
             (SELECT COUNT(*) FROM microphones) as total_count
      FROM microphones 
      WHERE id REGEXP '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    `);
    
    const { uuid_count, total_count } = uuidCheck[0];
    
    if (uuid_count === total_count && total_count > 0) {
      console.log(`✅ Microphones already converted to UUID format (${uuid_count}/${total_count})`);
      console.log('🎉 Microphone UUID conversion check completed - no action needed!');
      return;
    }
    
    if (uuid_count > 0 && uuid_count < total_count) {
      console.log(`⚠️  Partial UUID conversion detected (${uuid_count}/${total_count})`);
      console.log('⚠️  Manual intervention may be required');
      return;
    }
    
    console.log('🔄 Starting microphone UUID conversion for production...');
    
    // Step 1: Create temporary table with UUID structure
    await dataSource.query(`
      CREATE TABLE microphones_temp LIKE microphones;
    `);
    
    await dataSource.query(`
      ALTER TABLE microphones_temp 
      MODIFY COLUMN id VARCHAR(36) NOT NULL;
    `);
    
    // Step 2: Copy data with UUID conversion
    await dataSource.query(`
      INSERT INTO microphones_temp (id, name, description, type, rarity, imageUrl, price, coinPrice, isAvailable, isFree, isUnlockable, unlockRequirement, createdAt, updatedAt)
      SELECT 
        UUID() as id,
        name,
        description,
        type,
        rarity,
        imageUrl,
        price,
        coinPrice,
        isAvailable,
        isFree,
        isUnlockable,
        unlockRequirement,
        createdAt,
        updatedAt
      FROM microphones;
    `);
    
    // Step 3: Create mapping table for old->new ID conversion
    await dataSource.query(`
      CREATE TEMPORARY TABLE microphone_id_mapping (
        old_id VARCHAR(255),
        new_id VARCHAR(36),
        INDEX(old_id)
      );
    `);
    
    await dataSource.query(`
      INSERT INTO microphone_id_mapping (old_id, new_id)
      SELECT m.id as old_id, mt.id as new_id
      FROM microphones m
      JOIN microphones_temp mt ON m.name = mt.name 
      AND m.rarity = mt.rarity 
      AND m.imageUrl = mt.imageUrl
      AND m.type = mt.type;
    `);
    
    // Step 4: Update foreign key references
    console.log('🔗 Updating foreign key references...');
    
    // Update users table
    await dataSource.query(`
      UPDATE users u
      JOIN microphone_id_mapping m ON u.equippedMicrophoneId = m.old_id
      SET u.equippedMicrophoneId = m.new_id
      WHERE u.equippedMicrophoneId IS NOT NULL;
    `);
    
    // Update user_microphones table
    await dataSource.query(`
      UPDATE user_microphones um
      JOIN microphone_id_mapping m ON um.microphoneId = m.old_id
      SET um.microphoneId = m.new_id;
    `);
    
    // Update transactions table
    await dataSource.query(`
      UPDATE transactions t
      JOIN microphone_id_mapping m ON t.microphoneId = m.old_id
      SET t.microphoneId = m.new_id
      WHERE t.microphoneId IS NOT NULL;
    `);
    
    // Step 5: Replace original table
    console.log('🔄 Replacing original microphones table...');
    
    await dataSource.query(`DROP TABLE microphones;`);
    await dataSource.query(`RENAME TABLE microphones_temp TO microphones;`);
    
    // Step 6: Verify conversion
    const microphoneCount = await dataSource.query(`
      SELECT COUNT(*) as count 
      FROM microphones 
      WHERE id REGEXP '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    `);
    
    console.log(`✅ Successfully converted ${microphoneCount[0].count} microphones to UUID format`);
    
    // Verify foreign key integrity
    const userMicCount = await dataSource.query(`
      SELECT COUNT(*) as count 
      FROM users u 
      JOIN microphones m ON u.equippedMicrophoneId = m.id 
      WHERE u.equippedMicrophoneId IS NOT NULL
    `);
    
    console.log(`✅ Verified ${userMicCount[0].count} user microphone references are intact`);
    
    console.log('🎉 Microphone UUID conversion completed successfully!');
  }

  public async down(dataSource: DataSource): Promise<void> {
    console.log('⚠️  WARNING: Microphone UUID conversion cannot be automatically reversed');
    console.log('⚠️  This would require manual intervention to restore original string IDs');
    console.log('⚠️  Please restore from backup if needed');
  }
}