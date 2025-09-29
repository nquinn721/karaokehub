import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixRockstarAlexNameData1737810000000 implements MigrationInterface {
  name = 'FixRockstarAlexNameData1737810000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('🎸 Fixing Rockstar Alex name discrepancy...');

    try {
      // Simple and bulletproof: Just fix the data
      const result = await queryRunner.query(`
        UPDATE avatars 
        SET 
          name = 'Rockstar Alex',
          description = 'Rock star Alex with edgy attitude and leather jacket',
          imageUrl = '/images/avatar/avatars/alex-rock.png'
        WHERE name = 'Rockstar Alexa' OR (name = 'Rockstar Alex' AND imageUrl != '/images/avatar/avatars/alex-rock.png')
      `);

      console.log(`✅ Fixed ${result.affectedRows || result.changedRows || 0} avatar records`);
      console.log('🎉 Rockstar Alex fix completed!');
    } catch (error) {
      console.error('❌ Migration failed:', error.message);
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('ℹ️ No revert needed - keeping correct "Rockstar Alex" data');
  }
}
