import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class ProductionMigrationService {
  private readonly logger = new Logger(ProductionMigrationService.name);

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async runCriticalMigrations(): Promise<void> {
    this.logger.log('🚀 Starting critical migrations for avatar system...');

    try {
      // Clean up any leftover temporary tables from previous failed attempts
      await this.cleanupTemporaryTables();

      // Check if migrations table exists
      await this.ensureMigrationsTable();

      // Run each migration in sequence
      await this.recordMicrophoneConversion();
      await this.convertMicrophonesToUuid();
      await this.populateAvatarsTable();

      this.logger.log('✅ All critical migrations completed successfully!');
    } catch (error) {
      this.logger.error('❌ Migration failed:', error);
      throw error;
    }
  }

  private async ensureMigrationsTable(): Promise<void> {
    this.logger.log('📋 Ensuring migrations table exists...');

    const query = `
      CREATE TABLE IF NOT EXISTS migrations (
        id int NOT NULL AUTO_INCREMENT,
        timestamp bigint NOT NULL,
        name varchar(255) NOT NULL,
        PRIMARY KEY (id)
      )
    `;

    await this.dataSource.query(query);
    this.logger.log('✅ Migrations table ready');
  }

  private async checkMigrationRan(migrationName: string): Promise<boolean> {
    const result = await this.dataSource.query(
      'SELECT COUNT(*) as count FROM migrations WHERE name = ?',
      [migrationName],
    );
    return result[0].count > 0;
  }

  private async recordMigration(timestamp: number, name: string): Promise<void> {
    await this.dataSource.query('INSERT INTO migrations (timestamp, name) VALUES (?, ?)', [
      timestamp,
      name,
    ]);
  }

  private async recordMicrophoneConversion(): Promise<void> {
    const migrationName = 'RecordMicrophoneUuidConversion1727906400000';

    if (await this.checkMigrationRan(migrationName)) {
      this.logger.log('⏭️  Microphone conversion recording already completed');
      return;
    }

    this.logger.log('🔄 Recording existing microphone IDs...');

    // Clean up any leftover temporary tables first
    await this.cleanupTemporaryTables();

    // Create backup table for microphone ID mapping
    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS microphone_id_mapping (
        old_id VARCHAR(255) PRIMARY KEY,
        new_uuid VARCHAR(36) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Record existing microphone IDs and generate UUIDs for them
    const microphones = await this.dataSource.query('SELECT id, name FROM microphones');

    for (const mic of microphones) {
      const newUuid = this.generateUUID();
      await this.dataSource.query(
        'INSERT IGNORE INTO microphone_id_mapping (old_id, new_uuid) VALUES (?, ?)',
        [mic.id, newUuid],
      );
    }

    await this.recordMigration(1727906400000, migrationName);
    this.logger.log('✅ Microphone ID conversion recorded');
  }

  private async convertMicrophonesToUuid(): Promise<void> {
    const migrationName = 'ConvertMicrophonesToUuid1727906500000';

    if (await this.checkMigrationRan(migrationName)) {
      this.logger.log('⏭️  Microphone UUID conversion already completed');
      return;
    }

    this.logger.log('🔄 Converting microphone IDs to UUIDs...');

    // Clean up any leftover temporary tables first
    await this.cleanupTemporaryTables();

    // Get the mapping
    const mappings = await this.dataSource.query(
      'SELECT old_id, new_uuid FROM microphone_id_mapping',
    );

    if (mappings.length === 0) {
      this.logger.log('⚠️  No microphone mappings found, skipping UUID conversion');
      await this.recordMigration(1727906500000, migrationName);
      return;
    }

    // Start transaction
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Disable foreign key checks temporarily
      await queryRunner.query('SET foreign_key_checks = 0');

      // Update microphones table with new UUIDs
      for (const mapping of mappings) {
        await queryRunner.query('UPDATE microphones SET id = ? WHERE id = ?', [
          mapping.new_uuid,
          mapping.old_id,
        ]);
      }

      // Update user references to microphones
      for (const mapping of mappings) {
        await queryRunner.query(
          'UPDATE users SET equippedMicrophoneId = ? WHERE equippedMicrophoneId = ?',
          [mapping.new_uuid, mapping.old_id],
        );
      }

      // Re-enable foreign key checks
      await queryRunner.query('SET foreign_key_checks = 1');

      await queryRunner.commitTransaction();
      await this.recordMigration(1727906500000, migrationName);
      this.logger.log('✅ Microphone UUID conversion completed');
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private async populateAvatarsTable(): Promise<void> {
    const migrationName = 'PopulateAvatarsTable1727906600000';

    if (await this.checkMigrationRan(migrationName)) {
      this.logger.log('⏭️  Avatars table population already completed');
      return;
    }

    this.logger.log('🔄 Populating avatars table...');

    // Check if avatars table is empty
    const avatarCount = await this.dataSource.query('SELECT COUNT(*) as count FROM avatars');
    if (avatarCount[0].count > 0) {
      this.logger.log('⚠️  Avatars table already contains data, skipping population');
      await this.recordMigration(1727906600000, migrationName);
      return;
    }

    // Default avatars to create
    const defaultAvatars = [
      {
        id: this.generateUUID(),
        name: 'Default Avatar',
        description: 'A simple default avatar for all users',
        imageUrl: '/images/avatar/avatars/default.png',
        rarity: 'common',
        price: 0,
        isFree: true,
        isUnlockable: false,
        unlockRequirement: null,
        isAvailable: true,
        coinPrice: 0,
      },
      {
        id: this.generateUUID(),
        name: 'Classic Performer',
        description: 'A classic karaoke performer avatar',
        imageUrl: '/images/avatar/avatars/classic.png',
        rarity: 'common',
        price: 100,
        isFree: false,
        isUnlockable: true,
        unlockRequirement: 'Sing 5 songs',
        isAvailable: true,
        coinPrice: 100,
      },
    ];

    // Insert default avatars
    for (const avatar of defaultAvatars) {
      await this.dataSource.query(
        `
        INSERT INTO avatars (
          id, name, description, imageUrl, rarity, price, isFree, 
          isUnlockable, unlockRequirement, isAvailable, coinPrice, 
          createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `,
        [
          avatar.id,
          avatar.name,
          avatar.description,
          avatar.imageUrl,
          avatar.rarity,
          avatar.price,
          avatar.isFree,
          avatar.isUnlockable,
          avatar.unlockRequirement,
          avatar.isAvailable,
          avatar.coinPrice,
        ],
      );
    }

    await this.recordMigration(1727906600000, migrationName);
    this.logger.log('✅ Avatars table populated with default avatars');
  }

  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = (Math.random() * 16) | 0;
      const v = c == 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  async cleanupTemporaryTables(): Promise<void> {
    this.logger.log('🧹 Cleaning up any leftover temporary tables...');

    try {
      // Clean up any temporary tables that might exist from failed migrations
      await this.dataSource.query('DROP TABLE IF EXISTS microphones_temp');
      await this.dataSource.query('DROP TABLE IF EXISTS microphones_new');
      await this.dataSource.query('DROP TABLE IF EXISTS microphones_backup');
      await this.dataSource.query('DROP TEMPORARY TABLE IF EXISTS microphone_id_mapping_temp');

      this.logger.log('✅ Temporary tables cleaned up');
    } catch (error) {
      this.logger.warn('⚠️  Error during cleanup (this is usually safe to ignore):', error.message);
    }
  }

  async getLastMigration(): Promise<any> {
    try {
      const result = await this.dataSource.query(
        'SELECT * FROM migrations ORDER BY timestamp DESC LIMIT 1',
      );
      return result[0] || null;
    } catch (error) {
      return null;
    }
  }

  async getMigrationStatus(): Promise<any> {
    try {
      const migrations = await this.dataSource.query(
        'SELECT name, timestamp FROM migrations ORDER BY timestamp DESC',
      );

      const avatarCount = await this.dataSource.query('SELECT COUNT(*) as count FROM avatars');
      const microphoneCount = await this.dataSource.query(
        'SELECT COUNT(*) as count FROM microphones',
      );

      // Check if microphones have UUID format (contains hyphens)
      const uuidMicrophones = await this.dataSource.query(
        "SELECT COUNT(*) as count FROM microphones WHERE id LIKE '%-%'",
      );

      return {
        completedMigrations: migrations,
        avatarCount: avatarCount[0].count,
        microphoneCount: microphoneCount[0].count,
        microphonesWithUuid: uuidMicrophones[0].count,
        migrationSystemStatus: migrations.length > 0 ? 'active' : 'inactive',
      };
    } catch (error) {
      return {
        error: error.message,
        migrationSystemStatus: 'error',
      };
    }
  }
}
