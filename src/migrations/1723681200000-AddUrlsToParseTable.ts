import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUrlsToParseTable1723681200000 implements MigrationInterface {
  name = 'AddUrlsToParseTable1723681200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create the urls_to_parse table
    await queryRunner.query(`
      CREATE TABLE \`urls_to_parse\` (
        \`id\` varchar(36) NOT NULL,
        \`url\` varchar(500) NOT NULL,
        \`vendor\` enum('dj_steve', 'karafun', 'sound_choice', 'chartbuster', 'other') NOT NULL DEFAULT 'other',
        \`name\` varchar(200) NULL,
        \`description\` text NULL,
        \`status\` enum('pending', 'parsing', 'success', 'failed', 'disabled') NOT NULL DEFAULT 'pending',
        \`isActive\` tinyint NOT NULL DEFAULT 1,
        \`priority\` int NOT NULL DEFAULT 0,
        \`lastParsedAt\` timestamp NULL,
        \`nextParseAt\` timestamp NULL,
        \`parseAttempts\` int NOT NULL DEFAULT 0,
        \`maxParseAttempts\` int NOT NULL DEFAULT 0,
        \`lastError\` text NULL,
        \`songsFound\` int NOT NULL DEFAULT 0,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);

    // Insert the DJ Steve record
    await queryRunner.query(`
      INSERT INTO \`urls_to_parse\` (
        \`id\`, \`url\`, \`vendor\`, \`name\`, \`description\`, 
        \`status\`, \`isActive\`, \`priority\`, \`maxParseAttempts\`
      ) VALUES (
        UUID(), 
        'https://djstevekaraoke.com/master-song-list/', 
        'dj_steve',
        'DJ Steve Karaoke - Master Song List',
        'Complete karaoke song catalog from DJ Steve Karaoke, featuring thousands of popular songs with artist and title information.',
        'pending',
        1,
        100,
        3
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE \`urls_to_parse\``);
  }
}
