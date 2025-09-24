import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLocationToShowReviews1737454500000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('Adding location column to show_reviews table...');

    await queryRunner.query(`
      ALTER TABLE show_reviews 
      ADD COLUMN location TEXT NULL AFTER venueWebsite
    `);

    console.log('✅ Location column added to show_reviews table successfully!');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('Removing location column from show_reviews table...');

    await queryRunner.query(`
      ALTER TABLE show_reviews 
      DROP COLUMN location
    `);

    console.log('✅ Location column removed from show_reviews table successfully!');
  }
}
