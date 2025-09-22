import { MigrationInterface, QueryRunner } from 'typeorm';

export class ConvertUrlsToParseToUuid1737450850000 implements MigrationInterface {
  name = 'ConvertUrlsToParseToUuid1737450850000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Step 1: Create a temporary column for the new UUID
    await queryRunner.query(`ALTER TABLE \`urls_to_parse\` ADD \`new_id\` varchar(36) NULL`);

    // Step 2: Generate UUIDs for existing records
    await queryRunner.query(`UPDATE \`urls_to_parse\` SET \`new_id\` = UUID()`);

    // Step 3: Update any foreign key references (check if there are any tables referencing this)
    // Note: We'll need to check if any other tables reference urls_to_parse.id

    // Step 4: Drop the old primary key and auto_increment
    await queryRunner.query(`ALTER TABLE \`urls_to_parse\` MODIFY \`id\` int NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`urls_to_parse\` DROP PRIMARY KEY`);
    await queryRunner.query(`ALTER TABLE \`urls_to_parse\` DROP COLUMN \`id\``);

    // Step 5: Rename new_id to id and make it primary key
    await queryRunner.query(
      `ALTER TABLE \`urls_to_parse\` CHANGE \`new_id\` \`id\` varchar(36) NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE \`urls_to_parse\` ADD PRIMARY KEY (\`id\`)`);

    console.log('✅ Converted urls_to_parse table to use UUID');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // This is a destructive migration - we can't easily revert UUIDs back to auto-increment integers
    throw new Error('Cannot revert UUID migration - this would require manual data restoration');
  }
}
