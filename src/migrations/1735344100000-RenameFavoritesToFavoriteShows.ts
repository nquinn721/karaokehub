import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameFavoritesToFavoriteShows1735344100000 implements MigrationInterface {
  name = 'RenameFavoritesToFavoriteShows1735344100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Rename the favorites table to favorite_shows
    await queryRunner.query(`ALTER TABLE "favorites" RENAME TO "favorite_shows"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Rename back to favorites
    await queryRunner.query(`ALTER TABLE "favorite_shows" RENAME TO "favorites"`);
  }
}
