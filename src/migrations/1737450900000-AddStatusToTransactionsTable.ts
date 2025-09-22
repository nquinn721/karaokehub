import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStatusToTransactionsTable1737450900000 implements MigrationInterface {
  name = 'AddStatusToTransactionsTable1737450900000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add status column to transactions table
    try {
      await queryRunner.query(`
        ALTER TABLE \`transactions\` 
        ADD COLUMN \`status\` enum('PENDING','COMPLETED','FAILED','REFUNDED') NOT NULL DEFAULT 'PENDING'
      `);
    } catch (error) {
      // Column might already exist, check if it's an 'already exists' error
      if (error.code !== 'ER_DUP_FIELDNAME') {
        throw error;
      }
    }

    // Add index for status column for better query performance
    try {
      await queryRunner.query(`
        CREATE INDEX \`IDX_transactions_status\` ON \`transactions\` (\`status\`)
      `);
    } catch (error) {
      // Index might already exist
      if (error.code !== 'ER_DUP_KEYNAME') {
        throw error;
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove index first
    try {
      await queryRunner.query(`
        DROP INDEX \`IDX_transactions_status\` ON \`transactions\`
      `);
    } catch (error) {
      // Index might not exist
      console.log('Index IDX_transactions_status not found, skipping removal');
    }

    // Remove status column
    try {
      await queryRunner.query(`
        ALTER TABLE \`transactions\` 
        DROP COLUMN \`status\`
      `);
    } catch (error) {
      // Column might not exist
      console.log('Column status not found in transactions table, skipping removal');
    }
  }
}
