import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class AddSongAndSongFavoriteEntities1734284400000 implements MigrationInterface {
  name = 'AddSongAndSongFavoriteEntities1734284400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create songs table
    await queryRunner.createTable(
      new Table({
        name: 'songs',
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
            name: 'title',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'artist',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'album',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'genre',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'duration',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'spotifyId',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'youtubeId',
            type: 'varchar',
            length: '255',
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
        indices: [
          new TableIndex({ name: 'IDX_SONGS_TITLE', columnNames: ['title'] }),
          new TableIndex({ name: 'IDX_SONGS_ARTIST', columnNames: ['artist'] }),
          new TableIndex({ name: 'IDX_SONGS_SPOTIFY_ID', columnNames: ['spotifyId'] }),
          new TableIndex({ name: 'IDX_SONGS_YOUTUBE_ID', columnNames: ['youtubeId'] }),
        ],
      }),
      true,
    );

    // Create song_favorites table
    await queryRunner.createTable(
      new Table({
        name: 'song_favorites',
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
            name: 'songId',
            type: 'varchar',
            length: '36',
            isNullable: false,
          },
          {
            name: 'createdAt',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
        indices: [
          new TableIndex({ name: 'IDX_SONG_FAVORITES_USER_ID', columnNames: ['userId'] }),
          new TableIndex({ name: 'IDX_SONG_FAVORITES_SONG_ID', columnNames: ['songId'] }),
          new TableIndex({
            name: 'IDX_SONG_FAVORITES_UNIQUE',
            columnNames: ['userId', 'songId'],
            isUnique: true,
          }),
        ],
      }),
      true,
    );

    // Add foreign key constraints
    await queryRunner.createForeignKey(
      'song_favorites',
      new TableForeignKey({
        columnNames: ['userId'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        name: 'FK_SONG_FAVORITES_USER',
      }),
    );

    await queryRunner.createForeignKey(
      'song_favorites',
      new TableForeignKey({
        columnNames: ['songId'],
        referencedTableName: 'songs',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        name: 'FK_SONG_FAVORITES_SONG',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key constraints
    await queryRunner.dropForeignKey('song_favorites', 'FK_SONG_FAVORITES_SONG');
    await queryRunner.dropForeignKey('song_favorites', 'FK_SONG_FAVORITES_USER');

    // Drop tables
    await queryRunner.dropTable('song_favorites');
    await queryRunner.dropTable('songs');
  }
}
