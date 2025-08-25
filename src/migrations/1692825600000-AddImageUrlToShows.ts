import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddImageUrlToShows1692825600000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'shows',
      new TableColumn({
        name: 'imageUrl',
        type: 'varchar',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('shows', 'imageUrl');
  }
}
