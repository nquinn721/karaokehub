import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveRawDataFromParsedSchedules1755832468553 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Remove the rawData column from parsed_schedules table
    await queryRunner.query(`ALTER TABLE "parsed_schedules" DROP COLUMN "rawData"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Add back the rawData column if we need to rollback
    await queryRunner.query(`ALTER TABLE "parsed_schedules" ADD "rawData" json`);
  }
}
