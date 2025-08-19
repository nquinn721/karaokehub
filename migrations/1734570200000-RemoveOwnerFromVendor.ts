import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveOwnerFromVendor1734570200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('vendor', 'owner');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE vendor 
      ADD COLUMN owner varchar(255) NOT NULL DEFAULT ''
    `);
  }
}
