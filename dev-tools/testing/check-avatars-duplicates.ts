import { AppDataSource } from './src/data-source';
import { Avatar } from './src/entities/Avatar';

async function checkAvatarDuplicates() {
  try {
    await AppDataSource.initialize();
    
    const avatars = await AppDataSource.getRepository(Avatar).find({
      order: { id: 'ASC' }
    });
    
    console.log('\n=== ALL AVATARS ===');
    console.log(`Total count: ${avatars.length}`);
    
    avatars.forEach(avatar => {
      console.log(`ID: ${avatar.id}, Name: ${avatar.name}, Rarity: ${avatar.rarity}, Image: ${avatar.imageUrl}`);
    });
    
    // Check for duplicate names
    console.log('\n=== DUPLICATE NAME CHECK ===');
    const nameCount = new Map();
    avatars.forEach(avatar => {
      const count = nameCount.get(avatar.name) || 0;
      nameCount.set(avatar.name, count + 1);
    });
    
    const duplicates = Array.from(nameCount.entries()).filter(([name, count]) => count > 1);
    if (duplicates.length > 0) {
      console.log('Found duplicate names:');
      duplicates.forEach(([name, count]) => {
        console.log(`- ${name}: ${count} times`);
      });
    } else {
      console.log('No duplicate names found');
    }
    
    // Check for duplicate image URLs
    console.log('\n=== DUPLICATE IMAGE URL CHECK ===');
    const imageCount = new Map();
    avatars.forEach(avatar => {
      const count = imageCount.get(avatar.imageUrl) || 0;
      imageCount.set(avatar.imageUrl, count + 1);
    });
    
    const imageDuplicates = Array.from(imageCount.entries()).filter(([url, count]) => count > 1);
    if (imageDuplicates.length > 0) {
      console.log('Found duplicate image URLs:');
      imageDuplicates.forEach(([url, count]) => {
        console.log(`- ${url}: ${count} times`);
      });
    } else {
      console.log('No duplicate image URLs found');
    }
    
  } catch (error) {
    console.error('Error checking avatars:', error);
  } finally {
    await AppDataSource.destroy();
  }
}

checkAvatarDuplicates();