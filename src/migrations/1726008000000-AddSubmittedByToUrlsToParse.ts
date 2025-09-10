import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSubmittedByToUrlsToParse1726008000000 implements MigrationInterface {
  name = 'AddSubmittedByToUrlsToParse1726008000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add submittedBy column to urls_to_parse table
    await queryRunner.query(
      `ALTER TABLE "urls_to_parse" ADD "submittedBy" integer`,
    );
    
    // Add foreign key constraint to users table
    await queryRunner.query(
      `ALTER TABLE "urls_to_parse" ADD CONSTRAINT "FK_urls_to_parse_submittedBy" FOREIGN KEY ("submittedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove foreign key constraint
    await queryRunner.query(
      `ALTER TABLE "urls_to_parse" DROP CONSTRAINT "FK_urls_to_parse_submittedBy"`,
    );
    
    // Remove submittedBy column
    await queryRunner.query(`ALTER TABLE "urls_to_parse" DROP COLUMN "submittedBy"`);
  }
}
