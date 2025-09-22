import { MigrationInterface, QueryRunner } from 'typeorm';

export class ForceAvatarStandardization1737452000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('🔧 FORCE Avatar Standardization Migration Starting...');
    console.log('This migration will FORCE all avatars to be basic/common/free');

    try {
      // Show current state
      console.log('📊 Current avatar state BEFORE forced standardization:');
      const currentAvatars = await queryRunner.query(`
        SELECT id, name, type, rarity, price, coinPrice, isFree, isAvailable FROM avatars ORDER BY name
      `);
      
      currentAvatars.forEach(avatar => {
        console.log(`   ${avatar.name}: ${avatar.type}/${avatar.rarity}/${avatar.isFree ? 'free' : 'paid'} (${avatar.price}/${avatar.coinPrice})`);
      });

      // FORCE UPDATE all avatars to be basic/common/free
      console.log('🔄 FORCING all avatars to basic/common/free...');
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
      console.log('📊 Final avatar state AFTER forced standardization:');
      const finalAvatars = await queryRunner.query(`
        SELECT id, name, type, rarity, price, coinPrice, isFree, isAvailable FROM avatars ORDER BY name
      `);
      
      finalAvatars.forEach(avatar => {
        console.log(`   ${avatar.name}: ${avatar.type}/${avatar.rarity}/${avatar.isFree ? 'free' : 'paid'} (${avatar.price}/${avatar.coinPrice})`);
      });

      // Verify all avatars are now standardized
      const verificationResult = await queryRunner.query(`
        SELECT 
          COUNT(*) as total_avatars,
          COUNT(CASE WHEN type = 'basic' AND rarity = 'common' AND isFree = 1 AND price = 0.00 AND coinPrice = 0 THEN 1 END) as standardized_avatars
        FROM avatars
      `);

      const stats = verificationResult[0];
      console.log(`📈 Verification: ${stats.standardized_avatars}/${stats.total_avatars} avatars are now standardized`);

      if (stats.standardized_avatars !== stats.total_avatars) {
        throw new Error(`❌ FAILED: Only ${stats.standardized_avatars}/${stats.total_avatars} avatars were standardized`);
      }

      // Clean up any invalid user_avatars records
      console.log('🧹 Cleaning up invalid user_avatars...');
      const deletedInvalid = await queryRunner.query(`
        DELETE ua FROM user_avatars ua
        LEFT JOIN avatars a ON ua.avatarId = a.id
        WHERE a.id IS NULL
      `);
      console.log(`Deleted ${deletedInvalid.affectedRows || 0} invalid user_avatars records`);

      // Ensure users have valid equipped avatars
      console.log('👤 Ensuring users have valid equipped avatars...');
      const defaultAvatar = await queryRunner.query(`
        SELECT id, name FROM avatars 
        WHERE isAvailable = 1 AND isFree = 1 
        ORDER BY name ASC 
        LIMIT 1
      `);

      if (defaultAvatar.length > 0) {
        const defaultAvatarId = defaultAvatar[0].id;
        console.log(`Using default avatar: ${defaultAvatar[0].name} (${defaultAvatarId})`);

        const fixedUsers = await queryRunner.query(
          `UPDATE users 
           SET equippedAvatarId = ? 
           WHERE equippedAvatarId IS NOT NULL 
           AND equippedAvatarId NOT IN (SELECT id FROM avatars)`,
          [defaultAvatarId],
        );
        console.log(`Fixed ${fixedUsers.affectedRows || 0} users with invalid equipped avatars`);
      }

      console.log('🎉 FORCE Avatar Standardization Migration completed successfully!');
      console.log('   ALL avatars are now basic/common/free');
      console.log('   Onyx and Tyler are no longer premium');

    } catch (error) {
      console.error('❌ FORCE Avatar Standardization Migration failed:', error);
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('⚠️ FORCE Avatar Standardization Migration rollback');
    console.log('   This migration cannot be safely rolled back');
    console.log('   All avatars have been standardized as basic/common/free');
  }
}