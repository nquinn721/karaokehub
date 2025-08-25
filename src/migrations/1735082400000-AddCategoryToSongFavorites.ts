import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddCategoryToSongFavorites1735082400000 implements MigrationInterface {
  name = 'AddCategoryToSongFavorites1735082400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add category column to song_favorites table
    await queryRunner.addColumn(
      'song_favorites',
      new TableColumn({
        name: 'category',
        type: 'varchar',
        length: '100',
        isNullable: true,
        comment: 'The category where this favorite was added (e.g., top-100, rock-hits, etc.)',
      }),
    );

    // Add index on category for better query performance
    await queryRunner.query(
      `CREATE INDEX IDX_SONG_FAVORITES_CATEGORY ON song_favorites (category)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop the index
    await queryRunner.query(`DROP INDEX IDX_SONG_FAVORITES_CATEGORY ON song_favorites`);

    // Drop the category column
    await queryRunner.dropColumn('song_favorites', 'category');
  }
}
