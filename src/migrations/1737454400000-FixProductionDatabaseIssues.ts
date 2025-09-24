import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixProductionDatabaseIssues1737454400000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('🔧 Fixing production database issues...');

    // 1. Create api_rate_limit_status table
    console.log('Creating api_rate_limit_status table...');
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS api_rate_limit_status (
        id INT AUTO_INCREMENT PRIMARY KEY,
        provider ENUM('google', 'facebook') NOT NULL,
        requestsToday INT NOT NULL DEFAULT 0,
        dailyLimit INT NOT NULL DEFAULT 1000,
        lastResetDate DATE NOT NULL,
        isLimitExceeded BOOLEAN NOT NULL DEFAULT FALSE,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_provider (provider)
      )
    `);

    // 2. Add coinAmount column to transactions table if it doesn't exist
    console.log('Adding coinAmount column to transactions table...');
    const transactionsTableExists = await queryRunner.hasTable('transactions');
    if (transactionsTableExists) {
      const coinAmountColumnExists = await queryRunner.hasColumn('transactions', 'coinAmount');
      if (!coinAmountColumnExists) {
        await queryRunner.query(`
          ALTER TABLE transactions 
          ADD COLUMN coinAmount INT NULL AFTER amount
        `);
      }
    }

    // 3. Add acquiredAt column to user_avatars table if it doesn't exist
    console.log('Adding acquiredAt column to user_avatars table...');
    const userAvatarsTableExists = await queryRunner.hasTable('user_avatars');
    if (userAvatarsTableExists) {
      const acquiredAtColumnExists = await queryRunner.hasColumn('user_avatars', 'acquiredAt');
      if (!acquiredAtColumnExists) {
        await queryRunner.query(`
          ALTER TABLE user_avatars 
          ADD COLUMN acquiredAt TIMESTAMP NULL AFTER avatarId
        `);
      }
    }

    // 4. Add acquiredAt column to user_microphones table if it doesn't exist
    console.log('Adding acquiredAt column to user_microphones table...');
    const userMicrophonesTableExists = await queryRunner.hasTable('user_microphones');
    if (userMicrophonesTableExists) {
      const acquiredAtColumnExists = await queryRunner.hasColumn('user_microphones', 'acquiredAt');
      if (!acquiredAtColumnExists) {
        await queryRunner.query(`
          ALTER TABLE user_microphones 
          ADD COLUMN acquiredAt TIMESTAMP NULL AFTER microphoneId
        `);
      }
    }

    // 5. Initialize API rate limit status for both providers
    console.log('Initializing API rate limit status...');
    await queryRunner.query(`
      INSERT IGNORE INTO api_rate_limit_status (provider, requestsToday, dailyLimit, lastResetDate, isLimitExceeded)
      VALUES 
        ('google', 0, 1000, CURDATE(), FALSE),
        ('facebook', 0, 1000, CURDATE(), FALSE)
    `);

    console.log('✅ Production database issues fixed successfully!');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('🔄 Rolling back production database fixes...');

    // Remove acquiredAt column from user_microphones
    const userMicrophonesTableExists = await queryRunner.hasTable('user_microphones');
    if (userMicrophonesTableExists) {
      const acquiredAtColumnExists = await queryRunner.hasColumn('user_microphones', 'acquiredAt');
      if (acquiredAtColumnExists) {
        await queryRunner.query(`ALTER TABLE user_microphones DROP COLUMN acquiredAt`);
      }
    }

    // Remove acquiredAt column from user_avatars
    const userAvatarsTableExists = await queryRunner.hasTable('user_avatars');
    if (userAvatarsTableExists) {
      const acquiredAtColumnExists = await queryRunner.hasColumn('user_avatars', 'acquiredAt');
      if (acquiredAtColumnExists) {
        await queryRunner.query(`ALTER TABLE user_avatars DROP COLUMN acquiredAt`);
      }
    }

    // Remove coinAmount column from transactions
    const transactionsTableExists = await queryRunner.hasTable('transactions');
    if (transactionsTableExists) {
      const coinAmountColumnExists = await queryRunner.hasColumn('transactions', 'coinAmount');
      if (coinAmountColumnExists) {
        await queryRunner.query(`ALTER TABLE transactions DROP COLUMN coinAmount`);
      }
    }

    // Drop api_rate_limit_status table
    await queryRunner.query(`DROP TABLE IF EXISTS api_rate_limit_status`);

    console.log('✅ Migration rollback completed!');
  }
}