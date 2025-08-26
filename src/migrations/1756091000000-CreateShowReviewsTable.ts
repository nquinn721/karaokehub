import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateShowReviewsTable1756091000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'show_reviews',
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
            name: 'showId',
            type: 'varchar',
            length: '36',
          },
          {
            name: 'submittedByUserId',
            type: 'varchar',
            length: '36',
            isNullable: true,
          },
          {
            name: 'djName',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'vendorName',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'venueName',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'venuePhone',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'venueWebsite',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'comments',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['pending', 'approved', 'declined'],
            default: "'pending'",
          },
          {
            name: 'adminNotes',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'reviewedByUserId',
            type: 'varchar',
            length: '36',
            isNullable: true,
          },
          {
            name: 'reviewedAt',
            type: 'timestamp',
            isNullable: true,
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
            columnNames: ['showId'],
            referencedTableName: 'shows',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
        indices: [
          new TableIndex({
            name: 'IDX_SHOW_REVIEWS_SHOW_ID',
            columnNames: ['showId'],
          }),
          new TableIndex({
            name: 'IDX_SHOW_REVIEWS_STATUS',
            columnNames: ['status'],
          }),
          new TableIndex({
            name: 'IDX_SHOW_REVIEWS_SUBMITTED_BY',
            columnNames: ['submittedByUserId'],
          }),
        ],
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('show_reviews');
  }
}
