import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateFriendsSystem1735000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create friend_requests table
    await queryRunner.createTable(
      new Table({
        name: 'friend_requests',
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
            name: 'requesterId',
            type: 'varchar',
            length: '36',
            isNullable: false,
          },
          {
            name: 'recipientId',
            type: 'varchar',
            length: '36',
            isNullable: false,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['pending', 'accepted', 'declined', 'blocked'],
            default: "'pending'",
          },
          {
            name: 'message',
            type: 'text',
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
      }),
    );

    // Create friendships table
    await queryRunner.createTable(
      new Table({
        name: 'friendships',
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
            name: 'userId',
            type: 'varchar',
            length: '36',
            isNullable: false,
          },
          {
            name: 'friendId',
            type: 'varchar',
            length: '36',
            isNullable: false,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
    );

    // Create indexes
    await queryRunner.createIndex(
      'friend_requests',
      new TableIndex({
        name: 'idx_friend_requests_requester',
        columnNames: ['requesterId'],
      }),
    );

    await queryRunner.createIndex(
      'friend_requests',
      new TableIndex({
        name: 'idx_friend_requests_recipient',
        columnNames: ['recipientId'],
      }),
    );

    await queryRunner.createIndex(
      'friend_requests',
      new TableIndex({
        name: 'idx_friend_requests_status',
        columnNames: ['status'],
      }),
    );

    await queryRunner.createIndex(
      'friendships',
      new TableIndex({
        name: 'idx_friendships_user',
        columnNames: ['userId'],
      }),
    );

    await queryRunner.createIndex(
      'friendships',
      new TableIndex({
        name: 'idx_friendships_friend',
        columnNames: ['friendId'],
      }),
    );

    // Unique constraint to prevent duplicate requests
    await queryRunner.createIndex(
      'friend_requests',
      new TableIndex({
        name: 'idx_friend_requests_unique',
        columnNames: ['requesterId', 'recipientId'],
        isUnique: true,
      }),
    );

    // Unique constraint to prevent duplicate friendships
    await queryRunner.createIndex(
      'friendships',
      new TableIndex({
        name: 'idx_friendships_unique',
        columnNames: ['userId', 'friendId'],
        isUnique: true,
      }),
    );

    // Create foreign key constraints for friend_requests
    await queryRunner.createForeignKey(
      'friend_requests',
      new TableForeignKey({
        columnNames: ['requesterId'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        name: 'FK_friend_requests_requester',
      }),
    );

    await queryRunner.createForeignKey(
      'friend_requests',
      new TableForeignKey({
        columnNames: ['recipientId'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        name: 'FK_friend_requests_recipient',
      }),
    );

    // Create foreign key constraints for friendships
    await queryRunner.createForeignKey(
      'friendships',
      new TableForeignKey({
        columnNames: ['userId'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        name: 'FK_friendships_user',
      }),
    );

    await queryRunner.createForeignKey(
      'friendships',
      new TableForeignKey({
        columnNames: ['friendId'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        name: 'FK_friendships_friend',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys
    await queryRunner.dropForeignKey('friend_requests', 'FK_friend_requests_requester');
    await queryRunner.dropForeignKey('friend_requests', 'FK_friend_requests_recipient');
    await queryRunner.dropForeignKey('friendships', 'FK_friendships_user');
    await queryRunner.dropForeignKey('friendships', 'FK_friendships_friend');

    // Drop tables
    await queryRunner.dropTable('friend_requests');
    await queryRunner.dropTable('friendships');
  }
}
