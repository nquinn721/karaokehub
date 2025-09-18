import { DataSource } from 'typeorm';
import { Microphone, MicrophoneType, MicrophoneRarity } from '../src/avatar/entities/microphone.entity';
import { Outfit, OutfitType, OutfitRarity } from '../src/avatar/entities/outfit.entity';
import { Shoes, ShoesType, ShoesRarity } from '../src/avatar/entities/shoes.entity';
import { UserAvatar } from '../src/avatar/entities/user-avatar.entity';
import { User } from '../src/entities/user.entity';
import { FavoriteShow } from '../src/favorite/favorite.entity';
import { FriendRequest } from '../src/friends/friend-request.entity';
import { Friendship } from '../src/friends/friendship.entity';
import { SongFavorite } from '../src/music/song-favorite.entity';
import { Subscription } from '../src/subscription/subscription.entity';

async function seedAvatarData() {
  const dataSource = await new DataSource({
    type: 'mysql',
    host: 'localhost',
    port: 3306,
    username: 'admin',
    password: 'password',
    database: 'karaoke-hub',
    entities: [User, UserAvatar, Microphone, Outfit, Shoes, FavoriteShow, FriendRequest, Friendship, SongFavorite, Subscription],
    synchronize: false,
    logging: true,
  }).initialize();

  try {
    console.log('Starting avatar data seeding...');

    // Seed microphones
    const microphones = [
      { name: 'Classic Silver', description: 'A timeless silver microphone', type: MicrophoneType.BASIC, rarity: MicrophoneRarity.COMMON, imageUrl: '/microphones/classic_silver.png', price: 0 },
      { name: 'Golden Mic', description: 'Luxurious gold-plated microphone', type: MicrophoneType.GOLDEN, rarity: MicrophoneRarity.RARE, imageUrl: '/microphones/golden_mic.png', price: 100 },
      { name: 'Ruby Red', description: 'Modern red microphone', type: MicrophoneType.MODERN, rarity: MicrophoneRarity.UNCOMMON, imageUrl: '/microphones/ruby_red.png', price: 50 },
      { name: 'Ocean Blue', description: 'Cool blue modern microphone', type: MicrophoneType.MODERN, rarity: MicrophoneRarity.COMMON, imageUrl: '/microphones/ocean_blue.png', price: 25 },
      { name: 'Forest Green', description: 'Vintage green microphone', type: MicrophoneType.VINTAGE, rarity: MicrophoneRarity.UNCOMMON, imageUrl: '/microphones/forest_green.png', price: 75 },
      { name: 'Purple Haze', description: 'Modern purple microphone', type: MicrophoneType.MODERN, rarity: MicrophoneRarity.RARE, imageUrl: '/microphones/purple_haze.png', price: 125 },
      { name: 'Sunset Orange', description: 'Wireless orange microphone', type: MicrophoneType.WIRELESS, rarity: MicrophoneRarity.EPIC, imageUrl: '/microphones/sunset_orange.png', price: 200 },
      { name: 'Midnight Black', description: 'Sleek black modern microphone', type: MicrophoneType.MODERN, rarity: MicrophoneRarity.UNCOMMON, imageUrl: '/microphones/midnight_black.png', price: 60 },
      { name: 'Rose Gold', description: 'Premium rose gold microphone', type: MicrophoneType.PREMIUM, rarity: MicrophoneRarity.EPIC, imageUrl: '/microphones/rose_gold.png', price: 300 },
      { name: 'Electric Blue', description: 'Legendary electric blue microphone', type: MicrophoneType.WIRELESS, rarity: MicrophoneRarity.LEGENDARY, imageUrl: '/microphones/electric_blue.png', price: 500 },
    ];

    const microphoneEntities = microphones.map(mic => {
      const microphone = new Microphone();
      microphone.name = mic.name;
      microphone.description = mic.description;
      microphone.type = mic.type;
      microphone.rarity = mic.rarity;
      microphone.imageUrl = mic.imageUrl;
      microphone.price = mic.price;
      microphone.isAvailable = true;
      microphone.isUnlockable = mic.rarity !== MicrophoneRarity.COMMON;
      return microphone;
    });

    await dataSource.manager.save(Microphone, microphoneEntities);
    console.log('Microphones seeded');

    // Seed outfits
    const outfits = [
      { name: 'Classic Tux', description: 'Traditional black tuxedo', type: OutfitType.FORMAL, rarity: OutfitRarity.COMMON, imageUrl: '/outfits/classic_tux.png', price: 0 },
      { name: 'Casual Denim', description: 'Comfortable denim outfit', type: OutfitType.CASUAL, rarity: OutfitRarity.COMMON, imageUrl: '/outfits/casual_denim.png', price: 25 },
      { name: 'Rock Star Leather', description: 'Edgy leather stage outfit', type: OutfitType.STAGE, rarity: OutfitRarity.RARE, imageUrl: '/outfits/rock_star_leather.png', price: 150 },
      { name: 'Pop Star Sparkle', description: 'Glittery pop performance outfit', type: OutfitType.STAGE, rarity: OutfitRarity.EPIC, imageUrl: '/outfits/pop_star_sparkle.png', price: 250 },
      { name: 'Country Western', description: 'Classic western style', type: OutfitType.THEMED, rarity: OutfitRarity.UNCOMMON, imageUrl: '/outfits/country_western.png', price: 75 },
      { name: 'Hip Hop Style', description: 'Urban streetwear outfit', type: OutfitType.MODERN, rarity: OutfitRarity.UNCOMMON, imageUrl: '/outfits/hip_hop_style.png', price: 100 },
      { name: 'Vintage Vegas', description: 'Retro Las Vegas performer outfit', type: OutfitType.VINTAGE, rarity: OutfitRarity.RARE, imageUrl: '/outfits/vintage_vegas.png', price: 200 },
      { name: 'Modern Minimalist', description: 'Clean modern design', type: OutfitType.MODERN, rarity: OutfitRarity.COMMON, imageUrl: '/outfits/modern_minimalist.png', price: 50 },
      { name: 'Rainbow Pride', description: 'Colorful pride outfit', type: OutfitType.THEMED, rarity: OutfitRarity.RARE, imageUrl: '/outfits/rainbow_pride.png', price: 175 },
      { name: 'Elegant Evening', description: 'Sophisticated evening wear', type: OutfitType.FORMAL, rarity: OutfitRarity.LEGENDARY, imageUrl: '/outfits/elegant_evening.png', price: 500 },
    ];

    const outfitEntities = outfits.map(outfit => {
      const outfitEntity = new Outfit();
      outfitEntity.name = outfit.name;
      outfitEntity.description = outfit.description;
      outfitEntity.type = outfit.type;
      outfitEntity.rarity = outfit.rarity;
      outfitEntity.imageUrl = outfit.imageUrl;
      outfitEntity.price = outfit.price;
      outfitEntity.isAvailable = true;
      outfitEntity.isUnlockable = outfit.rarity !== OutfitRarity.COMMON;
      return outfitEntity;
    });

    await dataSource.manager.save(Outfit, outfitEntities);
    console.log('Outfits seeded');

    // Seed shoes
    const shoes = [
      { name: 'Classic Black', description: 'Traditional black dress shoes', type: ShoesType.DRESS, rarity: ShoesRarity.COMMON, imageUrl: '/shoes/classic_black.png', price: 0 },
      { name: 'White Sneakers', description: 'Comfortable white sneakers', type: ShoesType.SNEAKERS, rarity: ShoesRarity.COMMON, imageUrl: '/shoes/white_sneakers.png', price: 25 },
      { name: 'Red High Tops', description: 'Stylish red high-top sneakers', type: ShoesType.SNEAKERS, rarity: ShoesRarity.UNCOMMON, imageUrl: '/shoes/red_high_tops.png', price: 50 },
      { name: 'Brown Boots', description: 'Rugged brown leather boots', type: ShoesType.BOOTS, rarity: ShoesRarity.UNCOMMON, imageUrl: '/shoes/brown_boots.png', price: 75 },
      { name: 'Silver Dance', description: 'Professional dance shoes', type: ShoesType.STAGE, rarity: ShoesRarity.RARE, imageUrl: '/shoes/silver_dance.png', price: 125 },
      { name: 'Gold Glitter', description: 'Sparkling gold performance shoes', type: ShoesType.STAGE, rarity: ShoesRarity.EPIC, imageUrl: '/shoes/gold_glitter.png', price: 200 },
      { name: 'Blue Canvas', description: 'Casual blue canvas shoes', type: ShoesType.SNEAKERS, rarity: ShoesRarity.COMMON, imageUrl: '/shoes/blue_canvas.png', price: 30 },
      { name: 'Pink Platform', description: 'High platform performance shoes', type: ShoesType.HEELS, rarity: ShoesRarity.RARE, imageUrl: '/shoes/pink_platform.png', price: 150 },
      { name: 'Green Glow', description: 'Neon green athletic shoes', type: ShoesType.ATHLETIC, rarity: ShoesRarity.EPIC, imageUrl: '/shoes/green_glow.png', price: 250 },
      { name: 'Purple Velvet', description: 'Luxurious purple velvet shoes', type: ShoesType.DRESS, rarity: ShoesRarity.LEGENDARY, imageUrl: '/shoes/purple_velvet.png', price: 400 },
    ];

    const shoeEntities = shoes.map(shoe => {
      const shoeEntity = new Shoes();
      shoeEntity.name = shoe.name;
      shoeEntity.description = shoe.description;
      shoeEntity.type = shoe.type;
      shoeEntity.rarity = shoe.rarity;
      shoeEntity.imageUrl = shoe.imageUrl;
      shoeEntity.price = shoe.price;
      shoeEntity.isAvailable = true;
      shoeEntity.isUnlockable = shoe.rarity !== ShoesRarity.COMMON;
      return shoeEntity;
    });

    await dataSource.manager.save(Shoes, shoeEntities);
    console.log('Shoes seeded');

    // Get the first items for default avatar
    const defaultMicrophone = await dataSource.manager.findOne(Microphone, { where: {} });
    const defaultOutfit = await dataSource.manager.findOne(Outfit, { where: {} });
    const defaultShoes = await dataSource.manager.findOne(Shoes, { where: {} });

    if (!defaultMicrophone || !defaultOutfit || !defaultShoes) {
      throw new Error('Could not find default avatar items');
    }

    // Create UserAvatar records for all existing users
    const users = await dataSource.manager.find(User);
    console.log(`Found ${users.length} users, creating default avatars...`);

    for (const user of users) {
      const userAvatar = new UserAvatar();
      userAvatar.userId = user.id;
      userAvatar.baseAvatarId = 'avatar_1'; // Default avatar
      userAvatar.microphoneId = defaultMicrophone.id;
      userAvatar.outfitId = defaultOutfit.id;
      userAvatar.shoesId = defaultShoes.id;
      userAvatar.isActive = true;

      await dataSource.manager.save(UserAvatar, userAvatar);
      console.log(`Created avatar for user: ${user.name}`);
    }

    console.log('Avatar data seeding completed successfully!');
  } catch (error) {
    console.error('Error seeding avatar data:', error);
  } finally {
    await dataSource.destroy();
  }
}

if (require.main === module) {
  seedAvatarData().catch(console.error);
}
