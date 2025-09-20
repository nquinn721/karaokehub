import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAvatarSystem1737450100000 implements MigrationInterface {
  name = 'CreateAvatarSystem1737450100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create microphones table if it doesn't exist
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`microphones\` (
        \`id\` varchar(36) NOT NULL,
        \`name\` varchar(255) NOT NULL,
        \`description\` text,
        \`type\` enum('basic', 'vintage', 'modern', 'wireless', 'premium', 'golden') NOT NULL DEFAULT 'basic',
        \`rarity\` enum('common', 'uncommon', 'rare', 'epic', 'legendary') NOT NULL DEFAULT 'common',
        \`imageUrl\` varchar(255),
        \`unlockLevel\` int NOT NULL DEFAULT '1',
        \`cost\` int NOT NULL DEFAULT '0',
        \`isAvailable\` tinyint NOT NULL DEFAULT '1',
        \`stats\` json,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
    `);

    // Create outfits table if it doesn't exist
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`outfits\` (
        \`id\` varchar(36) NOT NULL,
        \`name\` varchar(255) NOT NULL,
        \`description\` text,
        \`type\` enum('casual', 'formal', 'stage', 'vintage', 'modern', 'fantasy') NOT NULL DEFAULT 'casual',
        \`rarity\` enum('common', 'uncommon', 'rare', 'epic', 'legendary') NOT NULL DEFAULT 'common',
        \`imageUrl\` varchar(255),
        \`unlockLevel\` int NOT NULL DEFAULT '1',
        \`cost\` int NOT NULL DEFAULT '0',
        \`isAvailable\` tinyint NOT NULL DEFAULT '1',
        \`stats\` json,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
    `);

    // Create shoes table if it doesn't exist
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`shoes\` (
        \`id\` varchar(36) NOT NULL,
        \`name\` varchar(255) NOT NULL,
        \`description\` text,
        \`type\` enum('sneakers', 'boots', 'dress', 'sandals', 'heels', 'platform') NOT NULL DEFAULT 'sneakers',
        \`rarity\` enum('common', 'uncommon', 'rare', 'epic', 'legendary') NOT NULL DEFAULT 'common',
        \`imageUrl\` varchar(255),
        \`unlockLevel\` int NOT NULL DEFAULT '1',
        \`cost\` int NOT NULL DEFAULT '0',
        \`isAvailable\` tinyint NOT NULL DEFAULT '1',
        \`stats\` json,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
    `);

    // Create user_avatars table if it doesn't exist
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`user_avatars\` (
        \`id\` varchar(36) NOT NULL,
        \`userId\` varchar(36) NOT NULL,
        \`baseAvatarId\` varchar(255) NOT NULL,
        \`microphoneId\` varchar(36),
        \`outfitId\` varchar(36),
        \`shoesId\` varchar(36),
        \`isActive\` tinyint NOT NULL DEFAULT '1',
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`REL_user_avatar_userId\` (\`userId\`),
        KEY \`FK_user_avatar_microphone\` (\`microphoneId\`),
        KEY \`FK_user_avatar_outfit\` (\`outfitId\`),
        KEY \`FK_user_avatar_shoes\` (\`shoesId\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
    `);

    // Create user_microphones table if it doesn't exist (user inventory)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`user_microphones\` (
        \`id\` varchar(36) NOT NULL,
        \`userId\` varchar(36) NOT NULL,
        \`microphoneId\` varchar(36) NOT NULL,
        \`isEquipped\` tinyint NOT NULL DEFAULT '0',
        \`acquiredAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`UQ_user_microphone\` (\`userId\`, \`microphoneId\`),
        KEY \`FK_user_microphones_userId\` (\`userId\`),
        KEY \`FK_user_microphones_microphoneId\` (\`microphoneId\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
    `);

    // Create user_outfits table if it doesn't exist (user inventory)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`user_outfits\` (
        \`id\` varchar(36) NOT NULL,
        \`userId\` varchar(36) NOT NULL,
        \`outfitId\` varchar(36) NOT NULL,
        \`isEquipped\` tinyint NOT NULL DEFAULT '0',
        \`acquiredAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`UQ_user_outfit\` (\`userId\`, \`outfitId\`),
        KEY \`FK_user_outfits_userId\` (\`userId\`),
        KEY \`FK_user_outfits_outfitId\` (\`outfitId\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
    `);

    // Create user_shoes table if it doesn't exist (user inventory)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`user_shoes\` (
        \`id\` varchar(36) NOT NULL,
        \`userId\` varchar(36) NOT NULL,
        \`shoesId\` varchar(36) NOT NULL,
        \`isEquipped\` tinyint NOT NULL DEFAULT '0',
        \`acquiredAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`UQ_user_shoes\` (\`userId\`, \`shoesId\`),
        KEY \`FK_user_shoes_userId\` (\`userId\`),
        KEY \`FK_user_shoes_shoesId\` (\`shoesId\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
    `);

    // Add foreign key constraints if they don't exist
    try {
      await queryRunner.query(`
        ALTER TABLE \`user_avatars\` 
        ADD CONSTRAINT \`FK_user_avatar_userId\` FOREIGN KEY (\`userId\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE
      `);
    } catch (error) {
      // Constraint might already exist
    }

    try {
      await queryRunner.query(`
        ALTER TABLE \`user_avatars\` 
        ADD CONSTRAINT \`FK_user_avatar_microphone\` FOREIGN KEY (\`microphoneId\`) REFERENCES \`microphones\` (\`id\`) ON DELETE SET NULL
      `);
    } catch (error) {
      // Constraint might already exist
    }

    try {
      await queryRunner.query(`
        ALTER TABLE \`user_avatars\` 
        ADD CONSTRAINT \`FK_user_avatar_outfit\` FOREIGN KEY (\`outfitId\`) REFERENCES \`outfits\` (\`id\`) ON DELETE SET NULL
      `);
    } catch (error) {
      // Constraint might already exist
    }

    try {
      await queryRunner.query(`
        ALTER TABLE \`user_avatars\` 
        ADD CONSTRAINT \`FK_user_avatar_shoes\` FOREIGN KEY (\`shoesId\`) REFERENCES \`shoes\` (\`id\`) ON DELETE SET NULL
      `);
    } catch (error) {
      // Constraint might already exist
    }

    try {
      await queryRunner.query(`
        ALTER TABLE \`user_microphones\` 
        ADD CONSTRAINT \`FK_user_microphones_userId\` FOREIGN KEY (\`userId\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE
      `);
    } catch (error) {
      // Constraint might already exist
    }

    try {
      await queryRunner.query(`
        ALTER TABLE \`user_microphones\` 
        ADD CONSTRAINT \`FK_user_microphones_microphoneId\` FOREIGN KEY (\`microphoneId\`) REFERENCES \`microphones\` (\`id\`) ON DELETE CASCADE
      `);
    } catch (error) {
      // Constraint might already exist
    }

    try {
      await queryRunner.query(`
        ALTER TABLE \`user_outfits\` 
        ADD CONSTRAINT \`FK_user_outfits_userId\` FOREIGN KEY (\`userId\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE
      `);
    } catch (error) {
      // Constraint might already exist
    }

    try {
      await queryRunner.query(`
        ALTER TABLE \`user_outfits\` 
        ADD CONSTRAINT \`FK_user_outfits_outfitId\` FOREIGN KEY (\`outfitId\`) REFERENCES \`outfits\` (\`id\`) ON DELETE CASCADE
      `);
    } catch (error) {
      // Constraint might already exist
    }

    try {
      await queryRunner.query(`
        ALTER TABLE \`user_shoes\` 
        ADD CONSTRAINT \`FK_user_shoes_userId\` FOREIGN KEY (\`userId\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE
      `);
    } catch (error) {
      // Constraint might already exist
    }

    try {
      await queryRunner.query(`
        ALTER TABLE \`user_shoes\` 
        ADD CONSTRAINT \`FK_user_shoes_shoesId\` FOREIGN KEY (\`shoesId\`) REFERENCES \`shoes\` (\`id\`) ON DELETE CASCADE
      `);
    } catch (error) {
      // Constraint might already exist
    }

    // Add avatar column to users table if it doesn't exist
    try {
      await queryRunner.query(`
        ALTER TABLE \`users\` 
        ADD COLUMN \`avatar\` varchar(255) DEFAULT 'avatar_1'
      `);
    } catch (error) {
      // Column might already exist
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove avatar column from users table
    await queryRunner.query(`ALTER TABLE \`users\` DROP COLUMN \`avatar\``);

    // Drop all avatar tables in reverse order due to foreign key constraints
    await queryRunner.query(`DROP TABLE \`user_shoes\``);
    await queryRunner.query(`DROP TABLE \`user_outfits\``);
    await queryRunner.query(`DROP TABLE \`user_microphones\``);
    await queryRunner.query(`DROP TABLE \`user_avatars\``);
    await queryRunner.query(`DROP TABLE \`shoes\``);
    await queryRunner.query(`DROP TABLE \`outfits\``);
    await queryRunner.query(`DROP TABLE \`microphones\``);
  }
}
