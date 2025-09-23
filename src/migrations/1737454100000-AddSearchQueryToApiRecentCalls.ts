import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSearchQueryToApiRecentCalls1737454100000 implements MigrationInterface {
  name = 'AddSearchQueryToApiRecentCalls1737454100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('🔄 Adding search_query and request_url columns to api_recent_calls...');
    
    // Check if table exists first
    const tableExists = await queryRunner.hasTable('api_recent_calls');
    if (!tableExists) {
      console.log('⚠️ Table api_recent_calls does not exist, skipping migration');
      return;
    }

    // Check if columns already exist to avoid duplicate column errors
    const searchQueryExists = await queryRunner.hasColumn('api_recent_calls', 'search_query');
    const requestUrlExists = await queryRunner.hasColumn('api_recent_calls', 'request_url');

    if (!searchQueryExists) {
      await queryRunner.query(`
        ALTER TABLE \`api_recent_calls\` 
        ADD COLUMN \`search_query\` varchar(500) NULL
      `);
      console.log('✅ Added search_query column');
    } else {
      console.log('ℹ️ search_query column already exists');
    }

    if (!requestUrlExists) {
      await queryRunner.query(`
        ALTER TABLE \`api_recent_calls\` 
        ADD COLUMN \`request_url\` varchar(1000) NULL
      `);
      console.log('✅ Added request_url column');
    } else {
      console.log('ℹ️ request_url column already exists');
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('🔄 Removing search_query and request_url columns from api_recent_calls...');
    
    const tableExists = await queryRunner.hasTable('api_recent_calls');
    if (!tableExists) {
      console.log('⚠️ Table api_recent_calls does not exist, skipping rollback');
      return;
    }

    const searchQueryExists = await queryRunner.hasColumn('api_recent_calls', 'search_query');
    const requestUrlExists = await queryRunner.hasColumn('api_recent_calls', 'request_url');

    if (requestUrlExists) {
      await queryRunner.query(`
        ALTER TABLE \`api_recent_calls\` 
        DROP COLUMN \`request_url\`
      `);
    }

    if (searchQueryExists) {
      await queryRunner.query(`
        ALTER TABLE \`api_recent_calls\` 
        DROP COLUMN \`search_query\`
      `);
    }
  }
}