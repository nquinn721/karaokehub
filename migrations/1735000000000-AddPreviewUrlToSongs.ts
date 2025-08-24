import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddPreviewUrlToSongs1735000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('songs');
    
    // Check if the previewUrl column already exists
    const previewUrlColumn = table?.findColumnByName('previewUrl');
    
    if (!previewUrlColumn) {
      await queryRunner.addColumn('songs', new TableColumn({
        name: 'previewUrl',
        type: 'varchar',
        length: '500',
        isNullable: true,
      }));
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('songs');
    const previewUrlColumn = table?.findColumnByName('previewUrl');
    
    if (previewUrlColumn) {
      await queryRunner.dropColumn('songs', 'previewUrl');
    }
  }
}
