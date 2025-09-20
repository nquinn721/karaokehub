import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Avatar } from './src/avatar/entities/avatar.entity';
import { Outfit } from './src/avatar/entities/outfit.entity';
import { Shoes } from './src/avatar/entities/shoes.entity';
import { Microphone } from './src/avatar/entities/microphone.entity';

async function seedStoreItems() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const avatarRepo = app.get(getRepositoryToken(Avatar));
  const outfitRepo = app.get(getRepositoryToken(Outfit));
  const shoesRepo = app.get(getRepositoryToken(Shoes));
  const microphoneRepo = app.get(getRepositoryToken(Microphone));

  console.log('Seeding store items...');

  // Seed sample avatars
  const avatars = [
    {
      id: 'avatar_1',
      name: 'Classic Avatar',
      description: 'A classic default avatar',
      type: 'basic',
      rarity: 'common',
      imageUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=classic',
      price: 0,
      coinPrice: 0,
      isAvailable: true,
      isFree: true,
    },
    {
      id: 'avatar_2',
      name: 'Cool Avatar',
      description: 'A cool styled avatar',
      type: 'stylish',
      rarity: 'uncommon',
      imageUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=cool',
      price: 100,
      coinPrice: 50,
      isAvailable: true,
      isFree: false,
    },
    {
      id: 'avatar_3',
      name: 'Elegant Avatar',
      description: 'An elegant premium avatar',
      type: 'premium',
      rarity: 'rare',
      imageUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=elegant',
      price: 250,
      coinPrice: 125,
      isAvailable: true,
      isFree: false,
    },
  ];

  for (const avatarData of avatars) {
    const existingAvatar = await avatarRepo.findOne({ where: { id: avatarData.id } });
    if (!existingAvatar) {
      await avatarRepo.save(avatarData);
      console.log(`Created avatar: ${avatarData.name}`);
    }
  }

  // Seed sample outfits
  const outfits = [
    {
      name: 'Casual T-Shirt',
      description: 'A comfortable casual t-shirt',
      type: 'casual',
      rarity: 'common',
      imageUrl: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=200&h=200&fit=crop',
      price: 50,
      isAvailable: true,
    },
    {
      name: 'Formal Suit',
      description: 'A stylish formal suit',
      type: 'formal',
      rarity: 'uncommon',
      imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop',
      price: 200,
      isAvailable: true,
    },
    {
      name: 'Stage Performer',
      description: 'A dazzling stage performance outfit',
      type: 'stage',
      rarity: 'epic',
      imageUrl: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=200&h=200&fit=crop',
      price: 500,
      isAvailable: true,
    },
  ];

  for (const outfitData of outfits) {
    const existingOutfit = await outfitRepo.findOne({ where: { name: outfitData.name } });
    if (!existingOutfit) {
      await outfitRepo.save(outfitData);
      console.log(`Created outfit: ${outfitData.name}`);
    }
  }

  // Seed sample shoes
  const shoes = [
    {
      name: 'Casual Sneakers',
      description: 'Comfortable everyday sneakers',
      type: 'casual',
      rarity: 'common',
      imageUrl: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=200&h=200&fit=crop',
      price: 75,
      isAvailable: true,
    },
    {
      name: 'Formal Dress Shoes',
      description: 'Elegant formal dress shoes',
      type: 'formal',
      rarity: 'uncommon',
      imageUrl: 'https://images.unsplash.com/photo-1460353581641-37baddab0fa2?w=200&h=200&fit=crop',
      price: 150,
      isAvailable: true,
    },
    {
      name: 'Performance Boots',
      description: 'High-energy performance boots',
      type: 'stage',
      rarity: 'rare',
      imageUrl: 'https://images.unsplash.com/photo-1544966503-7cc5ac882d0f?w=200&h=200&fit=crop',
      price: 300,
      isAvailable: true,
    },
  ];

  for (const shoesData of shoes) {
    const existingShoes = await shoesRepo.findOne({ where: { name: shoesData.name } });
    if (!existingShoes) {
      await shoesRepo.save(shoesData);
      console.log(`Created shoes: ${shoesData.name}`);
    }
  }

  // Seed sample microphones
  const microphones = [
    {
      id: 'mic_basic',
      name: 'Basic Microphone',
      description: 'A standard microphone for beginners',
      type: 'basic',
      rarity: 'common',
      imageUrl: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=200&h=200&fit=crop',
      price: 0,
      coinPrice: 0,
      isAvailable: true,
      isFree: true,
    },
    {
      id: 'mic_gold',
      name: 'Golden Microphone',
      description: 'A luxurious golden microphone',
      type: 'premium',
      rarity: 'epic',
      imageUrl: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=200&h=200&fit=crop',
      price: 400,
      coinPrice: 200,
      isAvailable: true,
      isFree: false,
    },
    {
      id: 'mic_rainbow',
      name: 'Rainbow Microphone',
      description: 'A colorful rainbow-themed microphone',
      type: 'special',
      rarity: 'legendary',
      imageUrl: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=200&h=200&fit=crop',
      price: 1000,
      coinPrice: 500,
      isAvailable: true,
      isFree: false,
    },
  ];

  for (const micData of microphones) {
    const existingMic = await microphoneRepo.findOne({ where: { id: micData.id } });
    if (!existingMic) {
      await microphoneRepo.save(micData);
      console.log(`Created microphone: ${micData.name}`);
    }
  }

  console.log('Store items seeding complete!');
  await app.close();
}

seedStoreItems().catch(console.error);