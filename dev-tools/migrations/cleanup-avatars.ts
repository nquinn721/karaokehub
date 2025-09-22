import AppDataSource from './data-source';
import { Avatar } from './src/avatar/entities/avatar.entity';

async function cleanupAvatars() {
  try {
    await AppDataSource.initialize();
    
    const avatarRepo = AppDataSource.getRepository(Avatar);
    
    // First, let's see what we currently have
    console.log('\n=== CURRENT AVATARS IN DATABASE ===');
    const currentAvatars = await avatarRepo.find({ order: { id: 'ASC' } });
    console.log(`Total avatars: ${currentAvatars.length}`);
    currentAvatars.forEach(avatar => {
      console.log(`ID: ${avatar.id}, Name: ${avatar.name}, Image: ${avatar.imageUrl}, Rarity: ${avatar.rarity}`);
    });
    
    // Define the 8 real avatars that should exist
    const realAvatars = [
      { name: 'Alex', imageUrl: '/images/avatar/avatars/alex.png', rarity: 'common' },
      { name: 'Blake', imageUrl: '/images/avatar/avatars/blake.png', rarity: 'common' },
      { name: 'Cameron', imageUrl: '/images/avatar/avatars/cameron.png', rarity: 'common' },
      { name: 'Joe', imageUrl: '/images/avatar/avatars/joe.png', rarity: 'common' },
      { name: 'Juan', imageUrl: '/images/avatar/avatars/juan.png', rarity: 'common' },
      { name: 'Kai', imageUrl: '/images/avatar/avatars/kai.png', rarity: 'common' },
      { name: 'Onyx', imageUrl: '/images/avatar/avatars/onyx.png', rarity: 'uncommon' },
      { name: 'Tyler', imageUrl: '/images/avatar/avatars/tyler.png', rarity: 'uncommon' }
    ];
    
    console.log('\n=== CLEANING UP DATABASE ===');
    
    // Delete all existing avatars
    await avatarRepo.clear();
    console.log('Cleared all existing avatars');
    
    // Insert the 8 real avatars
    for (let i = 0; i < realAvatars.length; i++) {
      const avatarData = realAvatars[i];
      const avatar = new Avatar();
      avatar.name = avatarData.name;
      avatar.imageUrl = avatarData.imageUrl;
      avatar.rarity = avatarData.rarity as 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
      avatar.isFree = avatarData.rarity === 'common';
      avatar.coinPrice = avatarData.rarity === 'common' ? 0 : 100;
      
      await avatarRepo.save(avatar);
      console.log(`✓ Added ${avatar.name} (${avatar.rarity})`);
    }
    
    // Verify the final state
    console.log('\n=== FINAL AVATAR LIST ===');
    const finalAvatars = await avatarRepo.find({ order: { id: 'ASC' } });
    console.log(`Total avatars: ${finalAvatars.length}`);
    finalAvatars.forEach(avatar => {
      console.log(`ID: ${avatar.id}, Name: ${avatar.name}, Image: ${avatar.imageUrl}, Rarity: ${avatar.rarity}, Free: ${avatar.isFree}, Price: ${avatar.coinPrice}`);
    });
    
    console.log('\n🎉 Avatar cleanup completed successfully!');
    
  } catch (error) {
    console.error('Error cleaning up avatars:', error);
  } finally {
    await AppDataSource.destroy();
  }
}

cleanupAvatars();