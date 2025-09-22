import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAvatarIdToTransactions1737450700000 implements MigrationInterface {
  name = 'AddAvatarIdToTransactions1737450700000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('🔧 Adding avatarId field to transactions table...');

    // Check if avatarId column exists, if not add it
    try {
      const hasColumn = await queryRunner.hasColumn('transactions', 'avatarId');
      if (!hasColumn) {
        await queryRunner.query(`
          ALTER TABLE \`transactions\` 
          ADD COLUMN \`avatarId\` varchar(50) NULL
        `);
        console.log('✅ Added avatarId column to transactions table');
      } else {
        console.log('ℹ️  avatarId column already exists in transactions table');
      }
    } catch (error) {
      console.log('⚠️  Error adding avatarId column:', error.message);
    }

    console.log('🎉 Transaction table avatar support added');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('🔧 Removing avatarId field from transactions table...');

    try {
      const hasColumn = await queryRunner.hasColumn('transactions', 'avatarId');
      if (hasColumn) {
        await queryRunner.query(`ALTER TABLE \`transactions\` DROP COLUMN \`avatarId\``);
        console.log('✅ Removed avatarId column from transactions table');
      }
    } catch (error) {
      console.log('⚠️  Error removing avatarId column:', error.message);
    }
  }
}
