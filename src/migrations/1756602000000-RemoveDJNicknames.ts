import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveDJNicknames1756602000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop the dj_nicknames table if it exists
    await queryRunner.query(`DROP TABLE IF EXISTS \`dj_nicknames\``);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Recreate the dj_nicknames table if we need to rollback
    await queryRunner.query(`
      CREATE TABLE \`dj_nicknames\` (
        \`id\` varchar(36) NOT NULL,
        \`djId\` varchar(36) NOT NULL,
        \`nickname\` varchar(255) NOT NULL,
        \`type\` enum('stage_name','alias','social_handle','real_name') NOT NULL DEFAULT 'alias',
        \`platform\` varchar(100) DEFAULT NULL,
        \`isActive\` tinyint NOT NULL DEFAULT 1,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        KEY \`FK_dj_nicknames_djId\` (\`djId\`),
        CONSTRAINT \`FK_dj_nicknames_djId\` FOREIGN KEY (\`djId\`) REFERENCES \`djs\` (\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
    `);
  }
}
