import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveSpotifyIdFromSongs1736097600000 implements MigrationInterface {
  name = 'RemoveSpotifyIdFromSongs1736097600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop the index first
    await queryRunner.query(`DROP INDEX \`IDX_SONGS_SPOTIFY_ID\` ON \`songs\``);

    // Then drop the column
    await queryRunner.query(`ALTER TABLE \`songs\` DROP COLUMN \`spotifyId\``);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Add the column back
    await queryRunner.query(`ALTER TABLE \`songs\` ADD \`spotifyId\` varchar(255) NULL`);

    // Recreate the index
    await queryRunner.query(`CREATE INDEX \`IDX_SONGS_SPOTIFY_ID\` ON \`songs\` (\`spotifyId\`)`);
  }
}
