import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateSubscriptionsTable1692825700000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // First add stripeCustomerId column to users table
    await queryRunner.query(`
      ALTER TABLE users 
      ADD COLUMN stripeCustomerId varchar(255) NULL
    `);

    // Create subscriptions table
    await queryRunner.createTable(
      new Table({
        name: 'subscriptions',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
          },
          {
            name: 'userId',
            type: 'varchar',
            length: '36',
            isNullable: false,
          },
          {
            name: 'stripeSubscriptionId',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'stripeCustomerId',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'plan',
            type: 'enum',
            enum: ['free', 'ad_free', 'premium'],
            default: "'free'",
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['active', 'canceled', 'past_due', 'unpaid', 'incomplete', 'incomplete_expired', 'trialing'],
            default: "'incomplete'",
          },
          {
            name: 'pricePerMonth',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: false,
          },
          {
            name: 'currentPeriodStart',
            type: 'datetime',
            isNullable: true,
          },
          {
            name: 'currentPeriodEnd',
            type: 'datetime',
            isNullable: true,
          },
          {
            name: 'cancelAtPeriodEnd',
            type: 'boolean',
            default: false,
          },
          {
            name: 'canceledAt',
            type: 'datetime',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
          },
        ],
      }),
    );

    // Create indices
    await queryRunner.createIndex(
      'subscriptions',
      new TableIndex({
        name: 'idx_subscriptions_user_id',
        columnNames: ['userId'],
      }),
    );

    await queryRunner.createIndex(
      'subscriptions',
      new TableIndex({
        name: 'idx_subscriptions_stripe_subscription_id',
        columnNames: ['stripeSubscriptionId'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      'subscriptions',
      new TableIndex({
        name: 'idx_subscriptions_status',
        columnNames: ['status'],
      }),
    );

    // Create foreign key constraint
    await queryRunner.createForeignKey(
      'subscriptions',
      new TableForeignKey({
        columnNames: ['userId'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        name: 'FK_subscriptions_user_id',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('subscriptions');
    await queryRunner.query(`
      ALTER TABLE users 
      DROP COLUMN stripeCustomerId
    `);
  }
}
