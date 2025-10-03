import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddCityStateToUsers1728000000000 implements MigrationInterface {
  name = 'AddCityStateToUsers1728000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if city column exists before adding it
    const hasCity = await queryRunner.hasColumn('users', 'city');
    if (!hasCity) {
      await queryRunner.addColumn(
        'users',
        new TableColumn({
          name: 'city',
          type: 'varchar',
          length: '255',
          isNullable: true,
        }),
      );
      console.log('✅ Added city column to users table');
    } else {
      console.log('ℹ️  City column already exists in users table');
    }

    // Check if state column exists before adding it
    const hasState = await queryRunner.hasColumn('users', 'state');
    if (!hasState) {
      await queryRunner.addColumn(
        'users',
        new TableColumn({
          name: 'state',
          type: 'varchar',
          length: '255',
          isNullable: true,
        }),
      );
      console.log('✅ Added state column to users table');
    } else {
      console.log('ℹ️  State column already exists in users table');
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Check if state column exists before dropping it
    const hasState = await queryRunner.hasColumn('users', 'state');
    if (hasState) {
      await queryRunner.dropColumn('users', 'state');
      console.log('✅ Dropped state column from users table');
    }

    // Check if city column exists before dropping it
    const hasCity = await queryRunner.hasColumn('users', 'city');
    if (hasCity) {
      await queryRunner.dropColumn('users', 'city');
      console.log('✅ Dropped city column from users table');
    }
  }
}