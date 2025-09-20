import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedBasicMicrophones1737450400000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    try {
      console.log('⏭️ Skipping old microphone seeding - replaced by comprehensive avatar/microphone seeding');
      // This migration has been replaced by SeedAvatarsAndMicrophones1737450450000
      // Leaving empty to avoid conflicts
    } catch (error) {
      console.error('❌ Error in old microphone seeding migration:', error.message);
      console.log('⚠️ Continuing deployment');
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Empty - rollback handled by the comprehensive migration
  }
}
