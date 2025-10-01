import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDjSubscriptionToUsers1737825000000 implements MigrationInterface {
  name = 'AddDjSubscriptionToUsers1737825000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add DJ subscription columns to users table
    await queryRunner.query(`
      ALTER TABLE users 
      ADD COLUMN djId CHAR(36) DEFAULT NULL,
      ADD COLUMN isDjSubscriptionActive BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN djStripeSubscriptionId VARCHAR(255) DEFAULT NULL
    `);

    // Add foreign key constraint to DJ table
    await queryRunner.query(`
      ALTER TABLE users 
      ADD CONSTRAINT FK_users_dj 
      FOREIGN KEY (djId) REFERENCES djs(id) 
      ON DELETE SET NULL
    `);

    // Add indexes for better query performance
    await queryRunner.query(`
      CREATE INDEX idx_users_dj_id ON users(djId)
    `);

    await queryRunner.query(`
      CREATE INDEX idx_users_dj_subscription_active ON users(isDjSubscriptionActive)
    `);

    await queryRunner.query(`
      CREATE INDEX idx_users_dj_stripe_subscription_id ON users(djStripeSubscriptionId)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove indexes first
    await queryRunner.query(`
      DROP INDEX idx_users_dj_stripe_subscription_id ON users
    `);

    await queryRunner.query(`
      DROP INDEX idx_users_dj_subscription_active ON users
    `);

    await queryRunner.query(`
      DROP INDEX idx_users_dj_id ON users
    `);

    // Remove foreign key constraint
    await queryRunner.query(`
      ALTER TABLE users 
      DROP CONSTRAINT FK_users_dj
    `);

    // Remove columns
    await queryRunner.query(`
      ALTER TABLE users 
      DROP COLUMN djStripeSubscriptionId,
      DROP COLUMN isDjSubscriptionActive,
      DROP COLUMN djId
    `);
  }
}
