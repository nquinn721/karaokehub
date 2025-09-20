import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAvatarSystem1737450300000 implements MigrationInterface {
  name = 'CreateAvatarSystem1737450300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create avatars table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`avatars\` (
        \`id\` varchar(50) NOT NULL,
        \`name\` varchar(100) NOT NULL,
        \`description\` text,
        \`type\` varchar(50) NOT NULL DEFAULT 'basic',
        \`rarity\` varchar(50) NOT NULL DEFAULT 'common',
        \`imageUrl\` varchar(255) NOT NULL,
        \`price\` decimal(10,2) NOT NULL DEFAULT '0.00',
        \`coinPrice\` int NOT NULL DEFAULT '0',
        \`isAvailable\` tinyint NOT NULL DEFAULT '1',
        \`isFree\` tinyint NOT NULL DEFAULT '1',
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);

    // Create microphones table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`microphones\` (
        \`id\` varchar(36) NOT NULL,
        \`name\` varchar(255) NOT NULL,
        \`description\` varchar(255),
        \`type\` enum('basic','vintage','modern','wireless','premium','golden') NOT NULL DEFAULT 'basic',
        \`rarity\` enum('common','uncommon','rare','epic','legendary') NOT NULL DEFAULT 'common',
        \`imageUrl\` varchar(255) NOT NULL,
        \`price\` decimal(10,2) NOT NULL DEFAULT '0.00',
        \`coinPrice\` int NOT NULL DEFAULT '0',
        \`isAvailable\` tinyint NOT NULL DEFAULT '1',
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);

    // Create outfits table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`outfits\` (
        \`id\` varchar(50) NOT NULL,
        \`name\` varchar(255) NOT NULL,
        \`description\` text,
        \`rarity\` enum('common','uncommon','rare','epic','legendary') NOT NULL DEFAULT 'common',
        \`cost\` int NOT NULL DEFAULT '0',
        \`imagePath\` varchar(255) NOT NULL,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);

    // Create shoes table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`shoes\` (
        \`id\` varchar(50) NOT NULL,
        \`name\` varchar(255) NOT NULL,
        \`description\` text,
        \`rarity\` enum('common','uncommon','rare','epic','legendary') NOT NULL DEFAULT 'common',
        \`cost\` int NOT NULL DEFAULT '0',
        \`imagePath\` varchar(255) NOT NULL,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);

    // Add new columns to users table for equipped items
    await queryRunner.query(`
      ALTER TABLE \`users\` 
      ADD COLUMN \`coins\` int NOT NULL DEFAULT '0',
      ADD COLUMN \`equippedAvatarId\` varchar(50) NULL,
      ADD COLUMN \`equippedMicrophoneId\` varchar(50) NULL
    `);

    // Create user_avatars table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`user_avatars\` (
        \`id\` varchar(36) NOT NULL,
        \`userId\` varchar(36) NOT NULL,
        \`avatarId\` varchar(50) NOT NULL,
        \`acquiredAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`IDX_user_avatar\` (\`userId\`, \`avatarId\`),
        KEY \`FK_user_avatars_userId\` (\`userId\`),
        KEY \`FK_user_avatars_avatarId\` (\`avatarId\`),
        CONSTRAINT \`FK_user_avatars_userId\` FOREIGN KEY (\`userId\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`FK_user_avatars_avatarId\` FOREIGN KEY (\`avatarId\`) REFERENCES \`avatars\` (\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);

    // Create user_microphones table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`user_microphones\` (
        \`id\` varchar(36) NOT NULL,
        \`userId\` varchar(36) NOT NULL,
        \`microphoneId\` varchar(50) NOT NULL,
        \`acquiredAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        KEY \`FK_user_microphones_userId\` (\`userId\`),
        KEY \`FK_user_microphones_microphoneId\` (\`microphoneId\`),
        CONSTRAINT \`FK_user_microphones_userId\` FOREIGN KEY (\`userId\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`FK_user_microphones_microphoneId\` FOREIGN KEY (\`microphoneId\`) REFERENCES \`microphones\` (\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);

    // Create user_outfits table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`user_outfits\` (
        \`id\` varchar(36) NOT NULL,
        \`userId\` varchar(36) NOT NULL,
        \`outfitId\` varchar(50) NOT NULL,
        \`acquiredAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        KEY \`FK_user_outfits_userId\` (\`userId\`),
        KEY \`FK_user_outfits_outfitId\` (\`outfitId\`),
        CONSTRAINT \`FK_user_outfits_userId\` FOREIGN KEY (\`userId\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`FK_user_outfits_outfitId\` FOREIGN KEY (\`outfitId\`) REFERENCES \`outfits\` (\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);

    // Create user_shoes table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`user_shoes\` (
        \`id\` varchar(36) NOT NULL,
        \`userId\` varchar(36) NOT NULL,
        \`shoeId\` varchar(50) NOT NULL,
        \`acquiredAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        KEY \`FK_user_shoes_userId\` (\`userId\`),
        KEY \`FK_user_shoes_shoeId\` (\`shoeId\`),
        CONSTRAINT \`FK_user_shoes_userId\` FOREIGN KEY (\`userId\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`FK_user_shoes_shoeId\` FOREIGN KEY (\`shoeId\`) REFERENCES \`shoes\` (\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);

    // Add foreign key constraints for equipped items
    await queryRunner.query(`
      ALTER TABLE \`users\`
      ADD CONSTRAINT \`FK_users_equippedAvatarId\` FOREIGN KEY (\`equippedAvatarId\`) REFERENCES \`avatars\` (\`id\`) ON DELETE SET NULL,
      ADD CONSTRAINT \`FK_users_equippedMicrophoneId\` FOREIGN KEY (\`equippedMicrophoneId\`) REFERENCES \`microphones\` (\`id\`) ON DELETE SET NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove foreign key constraints from users table
    await queryRunner.query(`ALTER TABLE \`users\` DROP FOREIGN KEY \`FK_users_equippedAvatarId\``);
    await queryRunner.query(
      `ALTER TABLE \`users\` DROP FOREIGN KEY \`FK_users_equippedMicrophoneId\``,
    );

    // Drop user relationship tables
    await queryRunner.query(`DROP TABLE IF EXISTS \`user_shoes\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`user_outfits\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`user_microphones\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`user_avatars\``);

    // Remove columns from users table
    await queryRunner.query(`ALTER TABLE \`users\` DROP COLUMN \`equippedMicrophoneId\``);
    await queryRunner.query(`ALTER TABLE \`users\` DROP COLUMN \`equippedAvatarId\``);
    await queryRunner.query(`ALTER TABLE \`users\` DROP COLUMN \`coins\``);

    // Drop avatar system tables
    await queryRunner.query(`DROP TABLE IF EXISTS \`shoes\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`outfits\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`microphones\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`avatars\``);
  }
}
