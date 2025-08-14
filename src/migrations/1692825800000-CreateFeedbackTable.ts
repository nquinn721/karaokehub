import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateFeedbackTable1692825800000 implements MigrationInterface {
  name = 'CreateFeedbackTable1692825800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "public"."feedback_type_enum" AS ENUM(
        'bug', 
        'feature', 
        'improvement', 
        'compliment', 
        'complaint', 
        'general'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "public"."feedback_status_enum" AS ENUM(
        'pending', 
        'reviewed', 
        'resolved'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "feedback" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "type" "public"."feedback_type_enum" NOT NULL DEFAULT 'general',
        "rating" integer NOT NULL DEFAULT 5,
        "subject" character varying(255),
        "message" text NOT NULL,
        "email" character varying(255),
        "name" character varying(255),
        "userId" uuid,
        "userAgent" text,
        "url" text,
        "status" "public"."feedback_status_enum" NOT NULL DEFAULT 'pending',
        "response" text,
        "responseDate" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_8389f9e087a57689cd5be8b2b13" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "feedback" 
      ADD CONSTRAINT "FK_4a39e6ac0cecdf18307a365cf3c" 
      FOREIGN KEY ("userId") 
      REFERENCES "users"("id") 
      ON DELETE CASCADE
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_feedback_userId" ON "feedback" ("userId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_feedback_status" ON "feedback" ("status")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_feedback_type" ON "feedback" ("type")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_feedback_createdAt" ON "feedback" ("createdAt")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_feedback_createdAt"`);
    await queryRunner.query(`DROP INDEX "IDX_feedback_type"`);
    await queryRunner.query(`DROP INDEX "IDX_feedback_status"`);
    await queryRunner.query(`DROP INDEX "IDX_feedback_userId"`);
    await queryRunner.query(
      `ALTER TABLE "feedback" DROP CONSTRAINT "FK_4a39e6ac0cecdf18307a365cf3c"`,
    );
    await queryRunner.query(`DROP TABLE "feedback"`);
    await queryRunner.query(`DROP TYPE "public"."feedback_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."feedback_type_enum"`);
  }
}
