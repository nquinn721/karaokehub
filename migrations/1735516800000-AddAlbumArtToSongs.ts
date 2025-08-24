import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAlbumArtToSongs1735516800000 implements MigrationInterface {
  name = 'AddAlbumArtToSongs1735516800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`songs\` 
      ADD COLUMN \`albumArtSmall\` varchar(255) NULL AFTER \`youtubeId\`,
      ADD COLUMN \`albumArtMedium\` varchar(255) NULL AFTER \`albumArtSmall\`,
      ADD COLUMN \`albumArtLarge\` varchar(255) NULL AFTER \`albumArtMedium\`
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`songs\` 
      DROP COLUMN \`albumArtSmall\`,
      DROP COLUMN \`albumArtMedium\`,
      DROP COLUMN \`albumArtLarge\`
    `);
  }
}
