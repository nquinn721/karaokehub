import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAvatarsTable1737450050000 implements MigrationInterface {
  name = 'CreateAvatarsTable1737450050000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create avatars table if it doesn't exist
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`avatars\` (
        \`id\` varchar(255) NOT NULL,
        \`name\` varchar(255) NOT NULL,
        \`description\` text,
        \`type\` enum('basic', 'premium', 'special', 'limited') NOT NULL DEFAULT 'basic',
        \`rarity\` enum('common', 'uncommon', 'rare', 'epic', 'legendary') NOT NULL DEFAULT 'common',
        \`imageUrl\` varchar(255),
        \`price\` decimal(10,2) NOT NULL DEFAULT '0.00',
        \`coinPrice\` int NOT NULL DEFAULT '0',
        \`isAvailable\` tinyint NOT NULL DEFAULT '1',
        \`isFree\` tinyint NOT NULL DEFAULT '1',
        \`unlockLevel\` int NOT NULL DEFAULT '1',
        \`stats\` json,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE \`avatars\``);
  }
}
