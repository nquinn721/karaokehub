import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class AddDJNicknamesTable1734306000000 implements MigrationInterface {
  name = 'AddDJNicknamesTable1734306000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'dj_nicknames',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid()',
          },
          {
            name: 'djId',
            type: 'varchar',
            length: '36',
          },
          {
            name: 'nickname',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'type',
            type: 'enum',
            enum: ['stage_name', 'alias', 'social_handle', 'real_name'],
            default: "'alias'",
          },
          {
            name: 'platform',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'isActive',
            type: 'boolean',
            default: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
        foreignKeys: [
          {
            columnNames: ['djId'],
            referencedTableName: 'djs',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
        indices: [
          {
            name: 'IDX_dj_nicknames_djId',
            columnNames: ['djId'],
          },
          {
            name: 'IDX_dj_nicknames_nickname',
            columnNames: ['nickname'],
          },
          {
            name: 'IDX_dj_nicknames_type',
            columnNames: ['type'],
          },
        ],
      }),
      true,
    );

    // Insert some sample DJ nicknames for the example DJs
    await queryRunner.query(`
      INSERT INTO dj_nicknames (djId, nickname, type, platform) 
      SELECT 
        djs.id,
        'Max',
        'alias',
        NULL
      FROM djs 
      WHERE djs.name LIKE '%Max%' 
      LIMIT 1
    `);

    await queryRunner.query(`
      INSERT INTO dj_nicknames (djId, nickname, type, platform) 
      SELECT 
        djs.id,
        'Max Denney',
        'real_name',
        NULL
      FROM djs 
      WHERE djs.name LIKE '%Max%' 
      LIMIT 1
    `);

    await queryRunner.query(`
      INSERT INTO dj_nicknames (djId, nickname, type, platform) 
      SELECT 
        djs.id,
        '@djmax614',
        'social_handle',
        'facebook'
      FROM djs 
      WHERE djs.name LIKE '%Max%' 
      LIMIT 1
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('dj_nicknames');
  }
}
