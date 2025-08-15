import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddStageNameToUsers1734567890000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if the stageName column already exists
    const table = await queryRunner.getTable('users');
    const stageNameColumn = table?.findColumnByName('stageName');

    if (!stageNameColumn) {
      await queryRunner.addColumn(
        'users',
        new TableColumn({
          name: 'stageName',
          type: 'varchar',
          isNullable: true,
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('users');
    const stageNameColumn = table?.findColumnByName('stageName');

    if (stageNameColumn) {
      await queryRunner.dropColumn('users', 'stageName');
    }
  }
}
