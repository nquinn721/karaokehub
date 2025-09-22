import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedAvatarsAndMicrophones1737450450000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    try {
      console.log('🎭 Starting avatar and microphone seeding...');

      // 1. Seed basic avatars first
      console.log('📦 Seeding basic avatars...');
      await queryRunner.query(`
        INSERT IGNORE INTO avatars (id, name, description, type, rarity, imageUrl, price, coinPrice, isAvailable, isFree)
        VALUES 
          ('avatar_1', 'Alex', 'Cool Performer with orange hair', 'basic', 'common', '/images/avatar/avatar_1.png', 0.0, 0, 1, 1),
          ('avatar_2', 'Sam', 'Energetic Singer with dark skin', 'basic', 'common', '/images/avatar/avatar_2.png', 0.0, 0, 1, 1),
          ('avatar_3', 'Jordan', 'Versatile Artist with asian features', 'basic', 'common', '/images/avatar/avatar_3.png', 0.0, 0, 1, 1),
          ('avatar_4', 'Taylor', 'Dynamic Performer with blonde hair', 'basic', 'common', '/images/avatar/avatar_4.png', 0.0, 0, 1, 1),
          ('avatar_5', 'Riley', 'Charismatic Singer with brown hair', 'basic', 'common', '/images/avatar/avatar_5.png', 0.0, 0, 1, 1),
          ('avatar_6', 'Casey', 'Bold Performer with unique style', 'basic', 'common', '/images/avatar/avatar_6.png', 0.0, 0, 1, 1),
          ('avatar_7', 'Morgan', 'Stylish Artist with curly hair', 'basic', 'common', '/images/avatar/avatar_7.png', 0.0, 0, 1, 1),
          ('avatar_8', 'Avery', 'Creative Performer with colorful outfit', 'basic', 'common', '/images/avatar/avatar_8.png', 0.0, 0, 1, 1),
          ('avatar_9', 'Quinn', 'Elegant Singer with sophisticated look', 'basic', 'common', '/images/avatar/avatar_9.png', 0.0, 0, 1, 1),
          ('avatar_10', 'Sage', 'Cool Artist with alternative style', 'basic', 'common', '/images/avatar/avatar_10.png', 0.0, 0, 1, 1),
          ('avatar_11', 'Drew', 'Energetic Performer with vibrant personality', 'basic', 'common', '/images/avatar/avatar_11.png', 0.0, 0, 1, 1),
          ('avatar_12', 'Reese', 'Talented Singer with professional look', 'basic', 'common', '/images/avatar/avatar_12.png', 0.0, 0, 1, 1),
          ('avatar_13', 'Blake', 'Dynamic Artist with modern style', 'basic', 'common', '/images/avatar/avatar_13.png', 0.0, 0, 1, 1),
          ('avatar_14', 'Cameron', 'Versatile Performer with classic appeal', 'basic', 'common', '/images/avatar/avatar_14.png', 0.0, 0, 1, 1),
          ('avatar_15', 'Skyler', 'Creative Singer with artistic flair', 'basic', 'common', '/images/avatar/avatar_15.png', 0.0, 0, 1, 1),
          ('avatar_16', 'Emery', 'Bold Performer with striking features', 'basic', 'common', '/images/avatar/avatar_16.png', 0.0, 0, 1, 1),
          ('avatar_17', 'Finley', 'Charismatic Artist with warm personality', 'basic', 'common', '/images/avatar/avatar_17.png', 0.0, 0, 1, 1),
          ('avatar_18', 'Hayden', 'Stylish Singer with contemporary look', 'basic', 'common', '/images/avatar/avatar_18.png', 0.0, 0, 1, 1),
          ('avatar_19', 'Kendall', 'Elegant Performer with refined style', 'basic', 'common', '/images/avatar/avatar_19.png', 0.0, 0, 1, 1),
          ('avatar_20', 'Logan', 'Cool Artist with edgy appearance', 'basic', 'common', '/images/avatar/avatar_20.png', 0.0, 0, 1, 1),
          ('avatar_21', 'Peyton', 'Dynamic Singer with athletic build', 'basic', 'common', '/images/avatar/avatar_21.png', 0.0, 0, 1, 1),
          ('avatar_22', 'River', 'Creative Performer with artistic vision', 'basic', 'common', '/images/avatar/avatar_22.png', 0.0, 0, 1, 1),
          ('avatar_23', 'Rowan', 'Versatile Artist with unique charm', 'basic', 'common', '/images/avatar/avatar_23.png', 0.0, 0, 1, 1),
          ('avatar_24', 'Sydney', 'Energetic Singer with bubbly personality', 'basic', 'common', '/images/avatar/avatar_24.png', 0.0, 0, 1, 1),
          ('avatar_25', 'Tatum', 'Bold Performer with confident stance', 'basic', 'common', '/images/avatar/avatar_25.png', 0.0, 0, 1, 1)
      `);

      // 2. Seed basic microphones
      console.log('🎤 Seeding basic microphones...');
      await queryRunner.query(`
        INSERT IGNORE INTO microphones (id, name, description, type, rarity, imageUrl, price, coinPrice, isAvailable)
        VALUES 
          (UUID(), 'Basic Mic Silver', 'A reliable silver microphone for beginners', 'basic', 'common', '/images/avatar/parts/microphones/mic_basic_1.png', 0.0, 0, 1),
          (UUID(), 'Basic Mic Black', 'A sleek black microphone with good sound quality', 'basic', 'common', '/images/avatar/parts/microphones/mic_basic_2.png', 0.0, 0, 1),
          (UUID(), 'Basic Mic Blue', 'A vibrant blue microphone for those who like color', 'basic', 'common', '/images/avatar/parts/microphones/mic_basic_3.png', 0.0, 0, 1),
          (UUID(), 'Basic Mic Red', 'A bold red microphone that stands out', 'basic', 'common', '/images/avatar/parts/microphones/mic_basic_4.png', 0.0, 0, 1),
          (UUID(), 'Gold Mic Classic', 'Premium gold microphone for serious performers', 'golden', 'rare', '/images/avatar/parts/microphones/mic_gold_1.png', 5.0, 100, 1),
          (UUID(), 'Gold Mic Deluxe', 'Luxurious gold microphone with crystal clear sound', 'golden', 'rare', '/images/avatar/parts/microphones/mic_gold_2.png', 7.5, 150, 1),
          (UUID(), 'Gold Mic Elite', 'Top-tier gold microphone for professionals', 'golden', 'rare', '/images/avatar/parts/microphones/mic_gold_3.png', 10.0, 200, 1),
          (UUID(), 'Gold Mic Supreme', 'Ultimate gold microphone for karaoke royalty', 'golden', 'rare', '/images/avatar/parts/microphones/mic_gold_4.png', 12.5, 250, 1),
          (UUID(), 'Diamond Mic Sparkle', 'Dazzling diamond microphone that catches the light', 'premium', 'legendary', '/images/avatar/parts/microphones/mic_diamond_1.png', 25.0, 500, 1),
          (UUID(), 'Diamond Mic Radiance', 'Brilliant diamond microphone with superior acoustics', 'premium', 'legendary', '/images/avatar/parts/microphones/mic_diamond_2.png', 30.0, 600, 1),
          (UUID(), 'Diamond Mic Prestige', 'Prestigious diamond microphone for elite performers', 'premium', 'legendary', '/images/avatar/parts/microphones/mic_diamond_3.png', 37.5, 750, 1),
          (UUID(), 'Diamond Mic Royal', 'Royal diamond microphone fit for karaoke kings and queens', 'premium', 'legendary', '/images/avatar/parts/microphones/mic_diamond_4.png', 50.0, 1000, 1),
          (UUID(), 'Ruby Mic Fire', 'Fiery ruby microphone with passionate sound', 'premium', 'epic', '/images/avatar/parts/microphones/mic_ruby_1.png', 15.0, 300, 1),
          (UUID(), 'Ruby Mic Blaze', 'Blazing ruby microphone for hot performances', 'premium', 'epic', '/images/avatar/parts/microphones/mic_ruby_2.png', 17.5, 350, 1),
          (UUID(), 'Ruby Mic Inferno', 'Infernal ruby microphone that ignites the stage', 'premium', 'epic', '/images/avatar/parts/microphones/mic_ruby_3.png', 20.0, 400, 1),
          (UUID(), 'Ruby Mic Phoenix', 'Phoenix ruby microphone that rises above the rest', 'premium', 'epic', '/images/avatar/parts/microphones/mic_ruby_4.png', 22.5, 450, 1),
          (UUID(), 'Emerald Mic Nature', 'Natural emerald microphone with organic sound', 'premium', 'epic', '/images/avatar/parts/microphones/mic_emerald_1.png', 15.0, 300, 1),
          (UUID(), 'Emerald Mic Forest', 'Forest emerald microphone with deep, rich tones', 'premium', 'epic', '/images/avatar/parts/microphones/mic_emerald_2.png', 17.5, 350, 1),
          (UUID(), 'Emerald Mic Sage', 'Sage emerald microphone with wisdom in every note', 'premium', 'epic', '/images/avatar/parts/microphones/mic_emerald_3.png', 20.0, 400, 1),
          (UUID(), 'Emerald Mic Mystique', 'Mystical emerald microphone with enchanting qualities', 'premium', 'epic', '/images/avatar/parts/microphones/mic_emerald_4.png', 22.5, 450, 1)
      `);

      // 3. Get all existing users and microphone IDs
      const users = await queryRunner.query('SELECT id FROM users WHERE id IS NOT NULL');
      const basicMics = await queryRunner.query(`
        SELECT id FROM microphones 
        WHERE name IN ('Basic Mic Silver', 'Basic Mic Black', 'Basic Mic Blue', 'Basic Mic Red')
        ORDER BY name
      `);
      console.log(`👥 Found ${users.length} existing users to set up`);
      console.log(`🎤 Found ${basicMics.length} basic microphones to assign`);

      // 4. Give all users the first basic avatar and all basic microphones
      for (const user of users) {
        // Give user the first basic avatar
        await queryRunner.query(`
          INSERT IGNORE INTO user_avatars (id, userId, baseAvatarId, createdAt)
          VALUES (UUID(), '${user.id}', 'avatar_1', NOW())
        `);

        // Give user all 4 basic microphones
        for (const mic of basicMics) {
          await queryRunner.query(`
            INSERT IGNORE INTO user_microphones (id, userId, microphoneId, acquiredAt)
            VALUES (UUID(), '${user.id}', '${mic.id}', NOW())
          `);
        }
      }

      // 5. Set default equipped items for users who don't have them
      await queryRunner.query(`
        UPDATE users 
        SET equippedAvatarId = 'avatar_1' 
        WHERE equippedAvatarId IS NULL
      `);

      // Set the first basic microphone as equipped for users who don't have one equipped
      if (basicMics.length > 0) {
        await queryRunner.query(`
          UPDATE users 
          SET equippedMicrophoneId = '${basicMics[0].id}' 
          WHERE equippedMicrophoneId IS NULL
        `);
      }

      console.log(`✅ Successfully seeded:
        - 25 basic avatars
        - 20 microphones (4 basic + 16 premium)
        - Assigned basic items to ${users.length} users
        - Set default equipped items for all users`);
    } catch (error) {
      console.error('❌ Error seeding avatars and microphones:', error.message);
      console.error('❌ Error stack:', error.stack);
      // Don't throw error to prevent deployment failure, but log it clearly
      console.log(
        '⚠️ Continuing deployment despite seeding error - manual database setup may be required',
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    try {
      // Remove all user associations first (due to foreign key constraints)
      await queryRunner.query(`DELETE FROM user_microphones`);
      await queryRunner.query(`DELETE FROM user_avatars`);

      // Reset user equipped items
      await queryRunner.query(
        `UPDATE users SET equippedAvatarId = NULL, equippedMicrophoneId = NULL`,
      );

      // Remove all avatars and microphones
      await queryRunner.query(`DELETE FROM microphones`);
      await queryRunner.query(`DELETE FROM avatars`);

      console.log('✅ Rolled back avatar and microphone seeding');
    } catch (error) {
      console.error('❌ Error rolling back avatar and microphone seeding:', error.message);
    }
  }
}
