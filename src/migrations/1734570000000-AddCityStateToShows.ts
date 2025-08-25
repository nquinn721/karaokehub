import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddCityStateToShows1734570000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'shows',
      new TableColumn({
        name: 'city',
        type: 'varchar',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'shows',
      new TableColumn({
        name: 'state',
        type: 'varchar',
        length: '2',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('shows', 'state');
    await queryRunner.dropColumn('shows', 'city');
  }
}
