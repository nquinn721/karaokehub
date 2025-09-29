import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIsAIValidatedToVenues1727814000000 implements MigrationInterface {
  name = 'AddIsAIValidatedToVenues1727814000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`venues\` 
      ADD COLUMN \`isAIValidated\` BOOLEAN NOT NULL DEFAULT FALSE 
      COMMENT 'Indicates if venue has been validated by AI/Google geocoding system'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`venues\` 
      DROP COLUMN \`isAIValidated\`
    `);
  }
}
