import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveVendorIdFromShows1724443600000 implements MigrationInterface {
  name = 'RemoveVendorIdFromShows1724443600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if vendorId column exists first
    const hasVendorIdColumn = await queryRunner.hasColumn('shows', 'vendorId');

    if (!hasVendorIdColumn) {
      console.log('vendorId column does not exist in shows table, skipping migration');
      return;
    }

    console.log('Starting migration to remove vendorId from shows table...');

    // First, find all foreign key constraints that reference vendorId
    const foreignKeys = await queryRunner.query(`
      SELECT 
        CONSTRAINT_NAME 
      FROM 
        INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
      WHERE 
        TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'shows' 
        AND COLUMN_NAME = 'vendorId'
        AND REFERENCED_TABLE_NAME IS NOT NULL
    `);

    // Drop all foreign key constraints for vendorId
    for (const fk of foreignKeys) {
      try {
        await queryRunner.query(`ALTER TABLE \`shows\` DROP FOREIGN KEY \`${fk.CONSTRAINT_NAME}\``);
        console.log(`Dropped foreign key constraint: ${fk.CONSTRAINT_NAME}`);
      } catch (error) {
        console.log(`Failed to drop foreign key ${fk.CONSTRAINT_NAME}:`, error.message);
      }
    }

    // Drop any indexes on vendorId
    try {
      const indexes = await queryRunner.query(`
        SELECT 
          INDEX_NAME 
        FROM 
          INFORMATION_SCHEMA.STATISTICS 
        WHERE 
          TABLE_SCHEMA = DATABASE() 
          AND TABLE_NAME = 'shows' 
          AND COLUMN_NAME = 'vendorId'
          AND INDEX_NAME != 'PRIMARY'
      `);

      for (const idx of indexes) {
        try {
          await queryRunner.query(`ALTER TABLE \`shows\` DROP INDEX \`${idx.INDEX_NAME}\``);
          console.log(`Dropped index: ${idx.INDEX_NAME}`);
        } catch (error) {
          console.log(`Failed to drop index ${idx.INDEX_NAME}:`, error.message);
        }
      }
    } catch (error) {
      console.log('No indexes to drop or error checking indexes:', error.message);
    }

    // Finally, drop the vendorId column
    try {
      await queryRunner.query(`ALTER TABLE \`shows\` DROP COLUMN \`vendorId\``);
      console.log('Successfully removed vendorId column from shows table');
    } catch (error) {
      console.error('Failed to remove vendorId column:', error.message);
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Add back the vendorId column
    await queryRunner.query(`ALTER TABLE \`shows\` ADD \`vendorId\` varchar(36) NULL`);

    // Add back the foreign key constraint
    await queryRunner.query(
      `ALTER TABLE \`shows\` ADD CONSTRAINT \`FK_shows_vendorId\` FOREIGN KEY (\`vendorId\`) REFERENCES \`vendors\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }
}
