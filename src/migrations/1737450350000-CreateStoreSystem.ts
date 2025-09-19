import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateStoreSystem1737450350000 implements MigrationInterface {
  name = 'CreateStoreSystem1737450350000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create coin_packages table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`coin_packages\` (
        \`id\` varchar(36) NOT NULL,
        \`name\` varchar(255) NOT NULL,
        \`description\` text,
        \`coinAmount\` int NOT NULL,
        \`priceInCents\` int NOT NULL,
        \`stripePriceId\` varchar(255) NULL,
        \`isActive\` tinyint NOT NULL DEFAULT '1',
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);

    // Create transactions table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`transactions\` (
        \`id\` varchar(36) NOT NULL,
        \`userId\` varchar(36) NOT NULL,
        \`type\` enum('purchase','earned','spent') NOT NULL,
        \`amount\` int NOT NULL,
        \`description\` varchar(255) NOT NULL,
        \`relatedEntityType\` varchar(100) NULL,
        \`relatedEntityId\` varchar(50) NULL,
        \`stripePaymentIntentId\` varchar(255) NULL,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        KEY \`FK_transactions_userId\` (\`userId\`),
        KEY \`IDX_transactions_type\` (\`type\`),
        KEY \`IDX_transactions_createdAt\` (\`createdAt\`),
        CONSTRAINT \`FK_transactions_userId\` FOREIGN KEY (\`userId\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);

    // Insert default coin packages
    await queryRunner.query(`
      INSERT IGNORE INTO \`coin_packages\` (\`id\`, \`name\`, \`description\`, \`coinAmount\`, \`priceInCents\`, \`isActive\`)
      VALUES 
        (UUID(), 'Starter Pack', '100 coins to get you started', 100, 99, 1),
        (UUID(), 'Value Pack', '500 coins - best value!', 500, 399, 1),
        (UUID(), 'Premium Pack', '1000 coins for serious karaoke fans', 1000, 699, 1),
        (UUID(), 'Mega Pack', '2500 coins - ultimate karaoke collection', 2500, 1499, 1)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables
    await queryRunner.query(`DROP TABLE IF EXISTS \`transactions\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`coin_packages\``);
  }
}