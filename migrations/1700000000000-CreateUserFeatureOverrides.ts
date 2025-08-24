import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateUserFeatureOverrides1700000000000 implements MigrationInterface {
  name = 'CreateUserFeatureOverrides1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'user_feature_overrides',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'UUID()',
          },
          {
            name: 'userId',
            type: 'varchar',
            length: '36',
          },
          {
            name: 'featureType',
            type: 'enum',
            enum: [
              'song_previews',
              'song_favorites',
              'show_favorites',
              'ad_free',
              'premium_access',
            ],
          },
          {
            name: 'isEnabled',
            type: 'boolean',
            default: true,
          },
          {
            name: 'customLimit',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'notes',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'expiresAt',
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
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
        foreignKeys: [
          {
            columnNames: ['userId'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
      }),
      true,
    );

    // Create index for efficient lookups
    await queryRunner.createIndex(
      'user_feature_overrides',
      new TableIndex({
        name: 'IDX_user_feature_type',
        columnNames: ['userId', 'featureType'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      'user_feature_overrides',
      new TableIndex({
        name: 'IDX_expires_at',
        columnNames: ['expiresAt'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('user_feature_overrides');
  }
}
