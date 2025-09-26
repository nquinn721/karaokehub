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

    // 2. Add profileImageUrl column to users table if it doesn't exist
    console.log('Adding profileImageUrl column to users table...');
    const usersTableExists = await queryRunner.hasTable('users');
    if (usersTableExists) {
      const profileImageUrlColumnExists = await queryRunner.hasColumn('users', 'profileImageUrl');
      if (!profileImageUrlColumnExists) {
        await queryRunner.query(`
          ALTER TABLE users 
          ADD COLUMN profileImageUrl VARCHAR(500) NULL AFTER providerId
        `);
      }
    }

    // 3. Add coinAmount column to transactions table if it doesn't exist
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

    // 4. Add acquiredAt column to user_avatars table if it doesn't exist
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

    // 5. Add acquiredAt column to user_microphones table if it doesn't exist
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

    // 6. Initialize API rate limit status for both providers
    console.log('Initializing API rate limit status...');

    // Check if the table has any data before inserting
    const existingRecords = await queryRunner.query(
      `SELECT COUNT(*) as count FROM api_rate_limit_status`,
    );
    const recordCount = existingRecords[0]?.count || 0;

    if (recordCount === 0) {
      await queryRunner.query(`
        INSERT INTO api_rate_limit_status (provider, requestsToday, dailyLimit, lastResetDate, isLimitExceeded)
        VALUES 
          ('google', 0, 1000, CURDATE(), FALSE),
          ('facebook', 0, 1000, CURDATE(), FALSE)
      `);
    } else {
      console.log('API rate limit status already has data, skipping initialization...');
    }

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

    // Remove profileImageUrl column from users
    const usersTableExists = await queryRunner.hasTable('users');
    if (usersTableExists) {
      const profileImageUrlColumnExists = await queryRunner.hasColumn('users', 'profileImageUrl');
      if (profileImageUrlColumnExists) {
        await queryRunner.query(`ALTER TABLE users DROP COLUMN profileImageUrl`);
      }
    }

    // Drop api_rate_limit_status table
    await queryRunner.query(`DROP TABLE IF EXISTS api_rate_limit_status`);

    console.log('✅ Migration rollback completed!');
  }
}
