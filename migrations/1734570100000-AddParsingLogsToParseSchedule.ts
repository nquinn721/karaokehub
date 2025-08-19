import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddParsingLogsToParseSchedule1734570100000 implements MigrationInterface {
  name = 'AddParsingLogsToParseSchedule1734570100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'parsed_schedules',
      new TableColumn({
        name: 'parsingLogs',
        type: 'json',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('parsed_schedules', 'parsingLogs');
  }
}
