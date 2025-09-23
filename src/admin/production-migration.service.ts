import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class ProductionMigrationService {
  constructor(@InjectDataSource() private dataSource: DataSource) {}

  async recordMicrophoneConversion(): Promise<{ success: boolean; message: string }> {
    try {
      // Check if migration has already been run
      const existingRecords = await this.dataSource.query(`
        SELECT COUNT(*) as count FROM microphones WHERE id LIKE 'mic_%'
      `);

      if (existingRecords[0].count > 0) {
        return {
          success: false,
          message: `Found ${existingRecords[0].count} microphones with old string IDs. Migration needed.`,
        };
      }

      return {
        success: true,
        message: 'All microphones already have UUID format',
      };
    } catch (error) {
      return {
        success: false,
        message: `Error checking microphone conversion: ${error.message}`,
      };
    }
  }

  async convertMicrophonesToUuid(): Promise<{ success: boolean; message: string }> {
    try {
      // Start transaction for safety
      await this.dataSource.query('START TRANSACTION');

      // First, update user_avatars to reference the new UUID microphone IDs
      const updateUserAvatars = await this.dataSource.query(`
        UPDATE user_avatars ua
        JOIN microphones m ON ua.microphone_id = m.id
        SET ua.microphone_id = CASE 
          WHEN m.id = 'mic_basic_1' THEN UUID()
          WHEN m.id = 'mic_basic_2' THEN UUID()
          WHEN m.id = 'mic_basic_3' THEN UUID()
          WHEN m.id = 'mic_vintage_1' THEN UUID()
          WHEN m.id = 'mic_vintage_2' THEN UUID()
          WHEN m.id = 'mic_vintage_3' THEN UUID()
          WHEN m.id = 'mic_modern_1' THEN UUID()
          WHEN m.id = 'mic_modern_2' THEN UUID()
          WHEN m.id = 'mic_modern_3' THEN UUID()
          WHEN m.id = 'mic_wireless_1' THEN UUID()
          WHEN m.id = 'mic_wireless_2' THEN UUID()
          WHEN m.id = 'mic_wireless_3' THEN UUID()
          ELSE m.id
        END
        WHERE m.id LIKE 'mic_%'
      `);

      // Then update the microphones table with matching UUIDs
      const updateMicrophones = await this.dataSource.query(`
        UPDATE microphones 
        SET id = CASE 
          WHEN id = 'mic_basic_1' THEN (SELECT microphone_id FROM user_avatars WHERE microphone_id != id LIMIT 1)
          WHEN id = 'mic_basic_2' THEN UUID()
          WHEN id = 'mic_basic_3' THEN UUID()
          WHEN id = 'mic_vintage_1' THEN UUID()
          WHEN id = 'mic_vintage_2' THEN UUID()
          WHEN id = 'mic_vintage_3' THEN UUID()
          WHEN id = 'mic_modern_1' THEN UUID()
          WHEN id = 'mic_modern_2' THEN UUID()
          WHEN id = 'mic_modern_3' THEN UUID()
          WHEN id = 'mic_wireless_1' THEN UUID()
          WHEN id = 'mic_wireless_2' THEN UUID()
          WHEN id = 'mic_wireless_3' THEN UUID()
        END
        WHERE id LIKE 'mic_%'
      `);

      await this.dataSource.query('COMMIT');

      return {
        success: true,
        message: `Successfully converted microphones to UUID format. Updated ${updateMicrophones.affectedRows} microphones and ${updateUserAvatars.affectedRows} user avatar references.`,
      };
    } catch (error) {
      await this.dataSource.query('ROLLBACK');
      return {
        success: false,
        message: `Error converting microphones to UUID: ${error.message}`,
      };
    }
  }

  async populateAvatarsTable(): Promise<{ success: boolean; message: string }> {
    try {
      // Check if avatars already exist
      const existingAvatars = await this.dataSource.query(`
        SELECT COUNT(*) as count FROM avatars
      `);

      if (existingAvatars[0].count > 0) {
        return {
          success: false,
          message: `Avatars table already has ${existingAvatars[0].count} records. Skipping population.`,
        };
      }

      // Insert default avatars
      const insertResult = await this.dataSource.query(`
        INSERT INTO avatars (id, name, image_url, category, is_premium, coin_cost, created_at, updated_at) VALUES
        (UUID(), 'Classic Singer', '/avatars/classic-singer.png', 'classic', false, 0, NOW(), NOW()),
        (UUID(), 'Rock Star', '/avatars/rock-star.png', 'rock', false, 0, NOW(), NOW()),
        (UUID(), 'Jazz Musician', '/avatars/jazz-musician.png', 'jazz', false, 0, NOW(), NOW()),
        (UUID(), 'Pop Icon', '/avatars/pop-icon.png', 'pop', true, 50, NOW(), NOW()),
        (UUID(), 'Country Star', '/avatars/country-star.png', 'country', true, 50, NOW(), NOW()),
        (UUID(), 'Hip Hop Artist', '/avatars/hip-hop-artist.png', 'hip-hop', true, 75, NOW(), NOW()),
        (UUID(), 'Opera Singer', '/avatars/opera-singer.png', 'opera', true, 100, NOW(), NOW()),
        (UUID(), 'DJ Master', '/avatars/dj-master.png', 'electronic', true, 100, NOW(), NOW())
      `);

      return {
        success: true,
        message: `Successfully populated avatars table with ${insertResult.affectedRows} default avatars.`,
      };
    } catch (error) {
      return {
        success: false,
        message: `Error populating avatars table: ${error.message}`,
      };
    }
  }

  async populateMicrophonesTable(): Promise<{ success: boolean; message: string }> {
    try {
      // Check if microphones already exist
      const existingMicrophones = await this.dataSource.query(`
        SELECT COUNT(*) as count FROM microphones
      `);

      if (existingMicrophones[0].count > 0) {
        return {
          success: false,
          message: `Microphones table already has ${existingMicrophones[0].count} records. Skipping population.`,
        };
      }

      // Insert default microphones
      const insertResult = await this.dataSource.query(`
        INSERT INTO microphones (id, name, image_url, category, is_premium, coin_cost, created_at, updated_at) VALUES
        (UUID(), 'Basic Mic 1', '/microphones/basic-1.png', 'basic', false, 0, NOW(), NOW()),
        (UUID(), 'Basic Mic 2', '/microphones/basic-2.png', 'basic', false, 0, NOW(), NOW()),
        (UUID(), 'Basic Mic 3', '/microphones/basic-3.png', 'basic', false, 0, NOW(), NOW()),
        (UUID(), 'Vintage Mic 1', '/microphones/vintage-1.png', 'vintage', true, 25, NOW(), NOW()),
        (UUID(), 'Vintage Mic 2', '/microphones/vintage-2.png', 'vintage', true, 25, NOW(), NOW()),
        (UUID(), 'Vintage Mic 3', '/microphones/vintage-3.png', 'vintage', true, 30, NOW(), NOW()),
        (UUID(), 'Modern Mic 1', '/microphones/modern-1.png', 'modern', true, 40, NOW(), NOW()),
        (UUID(), 'Modern Mic 2', '/microphones/modern-2.png', 'modern', true, 45, NOW(), NOW()),
        (UUID(), 'Modern Mic 3', '/microphones/modern-3.png', 'modern', true, 50, NOW(), NOW()),
        (UUID(), 'Wireless Mic 1', '/microphones/wireless-1.png', 'wireless', true, 60, NOW(), NOW()),
        (UUID(), 'Wireless Mic 2', '/microphones/wireless-2.png', 'wireless', true, 70, NOW(), NOW()),
        (UUID(), 'Wireless Mic 3', '/microphones/wireless-3.png', 'wireless', true, 80, NOW(), NOW())
      `);

      return {
        success: true,
        message: `Successfully populated microphones table with ${insertResult.affectedRows} default microphones.`,
      };
    } catch (error) {
      return {
        success: false,
        message: `Error populating microphones table: ${error.message}`,
      };
    }
  }

  async runAllCriticalMigrations(): Promise<{ success: boolean; message: string; details: any[] }> {
    const results = [];

    // 1. Populate microphones table if empty
    const micResult = await this.populateMicrophonesTable();
    results.push({ step: 'populate_microphones', ...micResult });

    // 2. Populate avatars table if empty
    const avatarResult = await this.populateAvatarsTable();
    results.push({ step: 'populate_avatars', ...avatarResult });

    // 3. Convert microphones to UUID if needed
    const conversionResult = await this.convertMicrophonesToUuid();
    results.push({ step: 'convert_microphones_uuid', ...conversionResult });

    const allSuccessful = results.every((r) => r.success);

    return {
      success: allSuccessful,
      message: allSuccessful
        ? 'All critical migrations completed successfully'
        : 'Some migrations failed or were skipped',
      details: results,
    };
  }

  async getMigrationStatus(): Promise<any> {
    try {
      // Check avatars table
      const avatarCount = await this.dataSource.query(`SELECT COUNT(*) as count FROM avatars`);

      // Check microphones table
      const microphoneCount = await this.dataSource.query(
        `SELECT COUNT(*) as count FROM microphones`,
      );

      // Check for old string microphone IDs
      const stringMicCount = await this.dataSource.query(`
        SELECT COUNT(*) as count FROM microphones WHERE id LIKE 'mic_%'
      `);

      // Check user_avatars table
      const userAvatarCount = await this.dataSource.query(
        `SELECT COUNT(*) as count FROM user_avatars`,
      );

      return {
        avatars: {
          count: avatarCount[0].count,
          populated: avatarCount[0].count > 0,
        },
        microphones: {
          count: microphoneCount[0].count,
          populated: microphoneCount[0].count > 0,
          stringIds: stringMicCount[0].count,
          migrationNeeded: stringMicCount[0].count > 0,
        },
        userAvatars: {
          count: userAvatarCount[0].count,
        },
      };
    } catch (error) {
      return {
        error: `Failed to get migration status: ${error.message}`,
      };
    }
  }
}
