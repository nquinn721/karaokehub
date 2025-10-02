import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDjCancellationTracking1737830000000 implements MigrationInterface {
  name = 'AddDjCancellationTracking1737830000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if columns already exist before adding them
    const table = await queryRunner.getTable('users');

    if (!table.findColumnByName('djSubscriptionCancelledAt')) {
      await queryRunner.query(`
        ALTER TABLE \`users\` 
        ADD COLUMN \`djSubscriptionCancelledAt\` datetime(6) NULL
      `);
    }

    if (!table.findColumnByName('djSubscriptionExpiresAt')) {
      await queryRunner.query(`
        ALTER TABLE \`users\` 
        ADD COLUMN \`djSubscriptionExpiresAt\` datetime(6) NULL
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Check if columns exist before removing them
    const table = await queryRunner.getTable('users');

    if (table.findColumnByName('djSubscriptionExpiresAt')) {
      await queryRunner.query(`
        ALTER TABLE \`users\` 
        DROP COLUMN \`djSubscriptionExpiresAt\`
      `);
    }

    if (table.findColumnByName('djSubscriptionCancelledAt')) {
      await queryRunner.query(`
        ALTER TABLE \`users\` 
        DROP COLUMN \`djSubscriptionCancelledAt\`
      `);
    }
  }
}
