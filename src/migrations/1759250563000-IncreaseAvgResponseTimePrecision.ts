import { MigrationInterface, QueryRunner } from 'typeorm';

export class IncreaseAvgResponseTimePrecision1759250563000 implements MigrationInterface {
  name = 'IncreaseAvgResponseTimePrecision1759250563000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Increase precision of avgResponseTime column to handle larger values
    // From DECIMAL(10,2) to DECIMAL(15,4) to handle very large response times
    await queryRunner.query(`
      ALTER TABLE api_metrics_daily 
      MODIFY COLUMN avgResponseTime DECIMAL(15,4) NOT NULL DEFAULT 0
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert back to original precision (may cause data loss if values are too large)
    await queryRunner.query(`
      ALTER TABLE api_metrics_daily 
      MODIFY COLUMN avgResponseTime DECIMAL(10,2) NOT NULL DEFAULT 0
    `);
  }
}