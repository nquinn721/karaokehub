import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveOwnerFromVenues1725178000000 implements MigrationInterface {
  name = 'RemoveOwnerFromVenues1725178000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`venues\` DROP COLUMN \`owner\``);
    console.log('✅ Removed owner column from venues table');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`venues\` ADD \`owner\` varchar(255) NULL`);
    console.log('✅ Added back owner column to venues table');
  }
}
