import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSocialFieldsToVenues1725177600000 implements MigrationInterface {
  name = 'AddSocialFieldsToVenues1725177600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add new columns to venues table
    await queryRunner.query(`
      ALTER TABLE \`venues\` 
      ADD COLUMN \`owner\` varchar(255) NULL AFTER \`website\`,
      ADD COLUMN \`instagram\` varchar(255) NULL AFTER \`owner\`,
      ADD COLUMN \`facebook\` varchar(255) NULL AFTER \`instagram\`
    `);

    console.log('✅ Added owner, instagram, and facebook columns to venues table');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove the added columns
    await queryRunner.query(`
      ALTER TABLE \`venues\` 
      DROP COLUMN \`facebook\`,
      DROP COLUMN \`instagram\`,
      DROP COLUMN \`owner\`
    `);

    console.log('✅ Removed owner, instagram, and facebook columns from venues table');
  }
}
