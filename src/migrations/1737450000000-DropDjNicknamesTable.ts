import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropDjNicknamesTable1737450000000 implements MigrationInterface {
  name = 'DropDjNicknamesTable1737450000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop the dj_nicknames table if it exists
    await queryRunner.query(`DROP TABLE IF EXISTS \`dj_nicknames\``);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Recreate the table if we need to rollback
    // Note: This is a destructive migration, data will be lost
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`dj_nicknames\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`nickname\` varchar(255) NOT NULL,
        \`realName\` varchar(255) DEFAULT NULL,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`IDX_nickname\` (\`nickname\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
    `);
  }
}
