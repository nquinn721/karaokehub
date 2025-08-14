import { MigrationInterface, QueryRunner } from "typeorm";

export class RenameKJsToDJs1755135477860 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Rename the kjs table to djs
        await queryRunner.query(`ALTER TABLE kjs RENAME TO djs`);
        
        // Add djId column to shows table (keeping kjId for backward compatibility during transition)
        await queryRunner.query(`ALTER TABLE shows ADD COLUMN djId VARCHAR(36) NULL`);
        
        // Copy kjId values to djId
        await queryRunner.query(`UPDATE shows SET djId = kjId WHERE kjId IS NOT NULL`);
        
        // Update foreign key constraints
        // First drop the existing constraint
        await queryRunner.query(`ALTER TABLE shows DROP FOREIGN KEY FK_shows_kj`);
        
        // Add new foreign key constraint for djId
        await queryRunner.query(`ALTER TABLE shows ADD CONSTRAINT FK_shows_dj FOREIGN KEY (djId) REFERENCES djs(id)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Reverse the migration
        // Drop the new constraint
        await queryRunner.query(`ALTER TABLE shows DROP FOREIGN KEY FK_shows_dj`);
        
        // Add back the old constraint  
        await queryRunner.query(`ALTER TABLE shows ADD CONSTRAINT FK_shows_kj FOREIGN KEY (kjId) REFERENCES djs(id)`);
        
        // Copy djId values back to kjId
        await queryRunner.query(`UPDATE shows SET kjId = djId WHERE djId IS NOT NULL`);
        
        // Drop djId column
        await queryRunner.query(`ALTER TABLE shows DROP COLUMN djId`);
        
        // Rename the djs table back to kjs
        await queryRunner.query(`ALTER TABLE djs RENAME TO kjs`);
    }

}
