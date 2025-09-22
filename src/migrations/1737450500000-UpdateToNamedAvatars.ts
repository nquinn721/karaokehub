import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateToNamedAvatars1737450500000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    try {
      console.log('🎭 Starting avatar system update to named avatars...');

      // 1. Clean out existing user_avatars relationships
      console.log('🧹 Cleaning up existing user avatar relationships...');
      await queryRunner.query('DELETE FROM user_avatars WHERE 1=1');

      // 2. Remove old numbered avatars (avatar_1 through avatar_25)
      console.log('🗑️  Removing old numbered avatars...');
      await queryRunner.query(`
        DELETE FROM avatars 
        WHERE id LIKE 'avatar_%' 
        AND id REGEXP '^avatar_[0-9]+$'
      `);

      // 3. Insert new named avatars using images from /images/avatar/avatars/
      console.log('✨ Adding new named avatars...');
      await queryRunner.query(`
        INSERT IGNORE INTO avatars (id, name, description, type, rarity, imageUrl, price, coinPrice, isAvailable, isFree)
        VALUES 
          ('alex', 'Alex', 'A friendly and versatile performer with a warm personality', 'basic', 'common', '/images/avatar/avatars/alex.png', 0.0, 0, 1, 1),
          ('blake', 'Blake', 'A confident artist with modern style and great stage presence', 'basic', 'common', '/images/avatar/avatars/blake.png', 0.0, 0, 1, 1),
          ('cameron', 'Cameron', 'A dynamic performer with classic appeal and natural charisma', 'basic', 'common', '/images/avatar/avatars/cameron.png', 0.0, 0, 1, 1),
          ('joe', 'Joe', 'A reliable and steady performer with authentic charm', 'basic', 'common', '/images/avatar/avatars/joe.png', 0.0, 0, 1, 1),
          ('juan', 'Juan', 'A passionate singer with vibrant energy and cultural flair', 'basic', 'common', '/images/avatar/avatars/juan.png', 0.0, 0, 1, 1),
          ('kai', 'Kai', 'A creative artist with unique style and artistic vision', 'basic', 'common', '/images/avatar/avatars/kai.png', 0.0, 0, 1, 1),
          ('onyx', 'Onyx', 'A bold performer with striking features and commanding presence', 'premium', 'uncommon', '/images/avatar/avatars/onyx.png', 5.0, 100, 1, 0),
          ('tyler', 'Tyler', 'A versatile entertainer with contemporary appeal and smooth vocals', 'premium', 'uncommon', '/images/avatar/avatars/tyler.png', 5.0, 100, 1, 0)
      `);

      // 4. Update all existing users to use 'alex' as default avatar
      console.log('👤 Updating user default avatars...');
      await queryRunner.query(`
        UPDATE users 
        SET equippedAvatarId = 'alex' 
        WHERE equippedAvatarId IS NULL 
        OR equippedAvatarId LIKE 'avatar_%'
        OR equippedAvatarId NOT IN ('alex', 'blake', 'cameron', 'joe', 'juan', 'kai', 'onyx', 'tyler')
      `);

      // 5. Give all users access to the 6 free avatars
      console.log('🎁 Granting access to free avatars for all users...');
      const users = await queryRunner.query('SELECT id FROM users WHERE id IS NOT NULL');
      const freeAvatars = ['alex', 'blake', 'cameron', 'joe', 'juan', 'kai'];

      for (const user of users) {
        for (const avatarId of freeAvatars) {
          await queryRunner.query(
            `
            INSERT IGNORE INTO user_avatars (userId, baseAvatarId, createdAt)
            VALUES (?, ?, NOW())
          `,
            [user.id, avatarId],
          );
        }
      }

      console.log('✅ Avatar system successfully updated!');
      console.log(`📊 Summary:`);
      console.log(`   • 6 free avatars: alex, blake, cameron, joe, juan, kai`);
      console.log(`   • 2 premium avatars: onyx, tyler`);
      console.log(`   • All users equipped with 'alex' as default`);
      console.log(`   • All users granted access to 6 free avatars`);
    } catch (error) {
      console.error('❌ Error updating avatar system:', error);
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    try {
      console.log('🔄 Reverting avatar system changes...');

      // Remove new named avatars
      await queryRunner.query(`
        DELETE FROM user_avatars 
        WHERE avatarId IN ('alex', 'blake', 'cameron', 'joe', 'juan', 'kai', 'onyx', 'tyler')
      `);

      await queryRunner.query(`
        DELETE FROM avatars 
        WHERE id IN ('alex', 'blake', 'cameron', 'joe', 'juan', 'kai', 'onyx', 'tyler')
      `);

      // Reset users to avatar_1
      await queryRunner.query(`
        UPDATE users 
        SET equippedAvatarId = 'avatar_1' 
        WHERE equippedAvatarId IN ('alex', 'blake', 'cameron', 'joe', 'juan', 'kai', 'onyx', 'tyler')
      `);

      console.log('✅ Avatar system reverted to previous state');
    } catch (error) {
      console.error('❌ Error reverting avatar changes:', error);
      throw error;
    }
  }
}
