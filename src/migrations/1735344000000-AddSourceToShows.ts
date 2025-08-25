import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSourceToShows1735344000000 implements MigrationInterface {
  name = 'AddSourceToShows1735344000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "shows" ADD "source" character varying`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "shows" DROP COLUMN "source"`);
  }
}
