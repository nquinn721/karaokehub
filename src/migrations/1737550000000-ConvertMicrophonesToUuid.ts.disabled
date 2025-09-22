import { MigrationInterface, QueryRunner } from 'typeorm';

export class ConvertMicrophonesToUuid1737550000000 implements MigrationInterface {
  name = 'ConvertMicrophonesToUuid1737550000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // First, let's disable foreign key checks to avoid issues during the conversion
    await queryRunner.query('SET foreign_key_checks = 0');

    // Create a temporary table with UUID structure
    await queryRunner.query(`
      CREATE TABLE microphones_temp (
        id VARCHAR(36) NOT NULL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description VARCHAR(255) NULL,
        type ENUM('basic', 'vintage', 'modern', 'wireless', 'premium', 'golden') NOT NULL DEFAULT 'basic',
        rarity ENUM('common', 'uncommon', 'rare', 'epic', 'legendary') NOT NULL DEFAULT 'common',
        imageUrl VARCHAR(255) NOT NULL,
        price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        coinPrice INT NOT NULL DEFAULT 0,
        isAvailable TINYINT(1) NOT NULL DEFAULT 1,
        isFree TINYINT(1) NOT NULL DEFAULT 0,
        isUnlockable TINYINT(1) NOT NULL DEFAULT 0,
        unlockRequirement VARCHAR(255) NULL,
        createdAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updatedAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)
      )
    `);

    // Copy data from old table to new table with UUID generation
    await queryRunner.query(`
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
      FROM microphones
    `);

    // Create a mapping table to track old ID to new UUID mapping for foreign key updates
    await queryRunner.query(`
      CREATE TEMPORARY TABLE microphone_id_mapping AS
      SELECT 
        old_mic.id as old_id,
        new_mic.id as new_id,
        old_mic.name
      FROM microphones old_mic
      JOIN microphones_temp new_mic ON old_mic.name = new_mic.name
    `);

    // Update users table to reference new microphone UUIDs
    await queryRunner.query(`
      UPDATE users u
      JOIN microphone_id_mapping m ON u.equippedMicrophoneId = m.old_id
      SET u.equippedMicrophoneId = m.new_id
      WHERE u.equippedMicrophoneId IS NOT NULL
    `);

    // Update user_microphones table to reference new microphone UUIDs
    await queryRunner.query(`
      UPDATE user_microphones um
      JOIN microphone_id_mapping m ON um.microphoneId = m.old_id
      SET um.microphoneId = m.new_id
    `);

    // Update transactions table if it references microphones
    await queryRunner.query(`
      UPDATE transactions t
      JOIN microphone_id_mapping m ON t.microphoneId = m.old_id
      SET t.microphoneId = m.new_id
      WHERE t.microphoneId IS NOT NULL
    `);

    // Drop the old table
    await queryRunner.query('DROP TABLE microphones');

    // Rename the temporary table to the original name
    await queryRunner.query('RENAME TABLE microphones_temp TO microphones');

    // Re-enable foreign key checks
    await queryRunner.query('SET foreign_key_checks = 1');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // This migration is not easily reversible due to UUID generation
    // In a rollback scenario, you would need to recreate the integer-based table
    // and map the UUIDs back, but this would require careful handling
    throw new Error('This migration cannot be automatically reversed. Manual intervention required.');
  }
}