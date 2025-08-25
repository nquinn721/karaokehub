import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddHasBeenParsedToUrlsToParse1735344200000 implements MigrationInterface {
  name = 'AddHasBeenParsedToUrlsToParse1735344200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add hasBeenParsed column to urls_to_parse table
    await queryRunner.query(
      `ALTER TABLE "urls_to_parse" ADD "hasBeenParsed" boolean NOT NULL DEFAULT false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove hasBeenParsed column
    await queryRunner.query(`ALTER TABLE "urls_to_parse" DROP COLUMN "hasBeenParsed"`);
  }
}
