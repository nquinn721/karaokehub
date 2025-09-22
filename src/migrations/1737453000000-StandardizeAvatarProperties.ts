import { MigrationInterface, QueryRunner } from 'typeorm';

export class StandardizeAvatarProperties1737453000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('🎭 Starting Avatar Properties Standardization Migration...');

    try {
      // Show current state
      console.log('📊 Current avatar state before standardization:');
      const currentAvatars = await queryRunner.query(`
        SELECT id, name, type, rarity, price, coinPrice, isFree, isAvailable 
        FROM avatars 
        ORDER BY name
      `);

      for (const avatar of currentAvatars) {
        console.log(
          `   ${avatar.name}: ${avatar.type}/${avatar.rarity} (price: ${avatar.price}, coins: ${avatar.coinPrice}, free: ${avatar.isFree})`,
        );
      }

      // Simple update to standardize all avatars
      console.log('🔧 Standardizing all avatars to basic/common/free...');
      const updateResult = await queryRunner.query(`
        UPDATE avatars 
        SET 
          type = 'basic',
          rarity = 'common',
          price = 0.00,
          coinPrice = 0,
          isFree = 1,
          isAvailable = 1
      `);

      console.log(`✅ Updated ${updateResult.affectedRows || 'all'} avatar records`);

      // Show final state
      console.log('📊 Final avatar state after standardization:');
      const finalAvatars = await queryRunner.query(`
        SELECT id, name, type, rarity, price, coinPrice, isFree, isAvailable 
        FROM avatars 
        ORDER BY name
      `);

      for (const avatar of finalAvatars) {
        console.log(
          `   ${avatar.name}: ${avatar.type}/${avatar.rarity} (price: ${avatar.price}, coins: ${avatar.coinPrice}, free: ${avatar.isFree})`,
        );
      }

      // Verify all avatars are standardized
      const verificationResult = await queryRunner.query(`
        SELECT 
          COUNT(*) as total_avatars,
          COUNT(CASE WHEN type = 'basic' AND rarity = 'common' AND isFree = 1 AND price = 0.00 AND coinPrice = 0 THEN 1 END) as standardized_avatars
        FROM avatars
      `);

      const stats = verificationResult[0];
      console.log(
        `📈 Verification: ${stats.standardized_avatars}/${stats.total_avatars} avatars are now standardized`,
      );

      if (stats.standardized_avatars !== stats.total_avatars) {
        throw new Error(
          `❌ FAILED: Only ${stats.standardized_avatars}/${stats.total_avatars} avatars were standardized`,
        );
      }

      console.log('🎉 Avatar Properties Standardization Migration completed successfully!');
      console.log('   ✅ All avatars are now basic/common/free');
      console.log('   ✅ Onyx and Tyler are no longer premium');
    } catch (error) {
      console.error('❌ Avatar Properties Standardization Migration failed:', error);
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('⚠️ Avatar Properties Standardization Migration rollback');
    console.log('   This migration cannot be safely rolled back');
    console.log('   All avatars have been standardized as basic/common/free');
  }
}
