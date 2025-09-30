import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSearchContextToApiRecentCalls1737820000000 implements MigrationInterface {
  name = 'AddSearchContextToApiRecentCalls1737820000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add search context columns to api_recent_calls table for enhanced search monitoring
    await queryRunner.query(`
      ALTER TABLE api_recent_calls 
      ADD COLUMN searchType VARCHAR(50) DEFAULT NULL COMMENT 'Type of search: featured_category, user_typed, etc.',
      ADD COLUMN searchContext VARCHAR(255) DEFAULT NULL COMMENT 'Additional context about the search origin'
    `);

    // Add index for better query performance on searchType
    await queryRunner.query(`
      CREATE INDEX idx_api_recent_calls_search_type ON api_recent_calls(searchType)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove the index first
    await queryRunner.query(`
      DROP INDEX idx_api_recent_calls_search_type ON api_recent_calls
    `);

    // Remove the columns
    await queryRunner.query(`
      ALTER TABLE api_recent_calls 
      DROP COLUMN searchType,
      DROP COLUMN searchContext
    `);
  }
}