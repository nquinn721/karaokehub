import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUniqueConstraintsToUsers1756089664612 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add unique constraint to name column
    await queryRunner.query(
      `ALTER TABLE \`users\` ADD CONSTRAINT \`UQ_users_name\` UNIQUE (\`name\`)`,
    );

    // Add unique constraint to stageName column
    await queryRunner.query(
      `ALTER TABLE \`users\` ADD CONSTRAINT \`UQ_users_stageName\` UNIQUE (\`stageName\`)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove unique constraints
    await queryRunner.query(`ALTER TABLE \`users\` DROP CONSTRAINT \`UQ_users_stageName\``);
    await queryRunner.query(`ALTER TABLE \`users\` DROP CONSTRAINT \`UQ_users_name\``);
  }
}
