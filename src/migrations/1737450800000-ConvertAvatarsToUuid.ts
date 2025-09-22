import { MigrationInterface, QueryRunner } from 'typeorm';

export class ConvertAvatarsToUuid1737450800000 implements MigrationInterface {
  name = 'ConvertAvatarsToUuid1737450800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Step 1: Create a temporary column for the new UUID
    await queryRunner.query(`ALTER TABLE \`avatars\` ADD \`new_id\` varchar(36) NULL`);

    // Step 2: Generate UUIDs for existing records
    await queryRunner.query(`UPDATE \`avatars\` SET \`new_id\` = UUID()`);

    // Step 3: Update all foreign key references in user_avatars table
    await queryRunner.query(`
      UPDATE \`user_avatars\` ua 
      INNER JOIN \`avatars\` a ON ua.\`avatarId\` = a.\`id\` 
      SET ua.\`avatarId\` = a.\`new_id\`
    `);

    // Step 4: Update all foreign key references in transactions table (if exists)
    await queryRunner.query(`
      UPDATE \`transactions\` t 
      INNER JOIN \`avatars\` a ON t.\`avatarId\` = a.\`id\` 
      SET t.\`avatarId\` = a.\`new_id\`
      WHERE t.\`avatarId\` IS NOT NULL
    `);

    // Step 5: Drop the old primary key and id column
    await queryRunner.query(`ALTER TABLE \`avatars\` DROP PRIMARY KEY`);
    await queryRunner.query(`ALTER TABLE \`avatars\` DROP COLUMN \`id\``);

    // Step 6: Rename new_id to id and make it primary key
    await queryRunner.query(
      `ALTER TABLE \`avatars\` CHANGE \`new_id\` \`id\` varchar(36) NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE \`avatars\` ADD PRIMARY KEY (\`id\`)`);

    console.log('✅ Converted avatars table to use UUID');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // This is a destructive migration - we can't easily revert UUIDs back to varchar(50)
    // In a real scenario, you'd want to store the original IDs in a mapping table
    throw new Error('Cannot revert UUID migration - this would require manual data restoration');
  }
}
