import { DataSource } from 'typeorm';
import { Microphone, MicrophoneRarity, MicrophoneType } from '../entities/microphone.entity';
import { Outfit, OutfitRarity, OutfitType } from '../entities/outfit.entity';
import { Shoes, ShoesRarity, ShoesType } from '../entities/shoes.entity';

export class AvatarSeeder {
  static async run(dataSource: DataSource) {
    const microphoneRepository = dataSource.getRepository(Microphone);
    const outfitRepository = dataSource.getRepository(Outfit);
    const shoesRepository = dataSource.getRepository(Shoes);

    // Seed Microphones
    const microphones = [
      {
        name: 'Basic Microphone',
        description: 'A simple starter microphone for beginners',
        type: MicrophoneType.BASIC,
        rarity: MicrophoneRarity.COMMON,
        imageUrl: '/images/avatar/parts/microphones/mic_basic_1.png',
        price: 0,
        isAvailable: true,
        isUnlockable: false,
      },
      {
        name: 'Vintage Classic',
        description: 'A classic vintage microphone with retro style',
        type: MicrophoneType.VINTAGE,
        rarity: MicrophoneRarity.UNCOMMON,
        imageUrl: '/images/avatar/parts/microphones/mic_gold_2.png',
        price: 50,
        isAvailable: true,
        isUnlockable: false,
      },
      {
        name: 'Modern Pro',
        description: 'Professional grade modern microphone',
        type: MicrophoneType.MODERN,
        rarity: MicrophoneRarity.RARE,
        imageUrl: '/images/avatar/parts/microphones/mic_emerald_3.png',
        price: 150,
        isAvailable: true,
        isUnlockable: false,
      },
      {
        name: 'Wireless Freedom',
        description: 'High-quality wireless microphone for stage performance',
        type: MicrophoneType.WIRELESS,
        rarity: MicrophoneRarity.EPIC,
        imageUrl: '/images/avatar/parts/microphones/mic_ruby_1.png',
        price: 300,
        isAvailable: true,
        isUnlockable: false,
      },
      {
        name: 'Golden Voice',
        description: 'Legendary golden microphone for true performers',
        type: MicrophoneType.GOLDEN,
        rarity: MicrophoneRarity.LEGENDARY,
        imageUrl: '/images/avatar/parts/microphones/mic_diamond_4.png',
        price: 0,
        isAvailable: true,
        isUnlockable: true,
        unlockRequirement: 'Win 100 karaoke competitions',
      },
    ];

    // Seed Outfits
    const outfits = [
      {
        name: 'Casual Jeans',
        description: 'Comfortable everyday outfit',
        type: OutfitType.CASUAL,
        rarity: OutfitRarity.COMMON,
        imageUrl: '/assets/outfits/casual-jeans.png',
        price: 0,
        isAvailable: true,
        isUnlockable: false,
      },
      {
        name: 'Formal Suit',
        description: 'Elegant formal wear for special occasions',
        type: OutfitType.FORMAL,
        rarity: OutfitRarity.UNCOMMON,
        imageUrl: '/assets/outfits/formal-suit.png',
        price: 75,
        isAvailable: true,
        isUnlockable: false,
      },
      {
        name: 'Stage Performer',
        description: 'Flashy outfit perfect for stage performances',
        type: OutfitType.STAGE,
        rarity: OutfitRarity.RARE,
        imageUrl: '/assets/outfits/stage-performer.png',
        price: 200,
        isAvailable: true,
        isUnlockable: false,
      },
      {
        name: 'Vintage Rockstar',
        description: 'Classic rockstar outfit from the golden age',
        type: OutfitType.VINTAGE,
        rarity: OutfitRarity.EPIC,
        imageUrl: '/assets/outfits/vintage-rockstar.png',
        price: 400,
        isAvailable: true,
        isUnlockable: false,
      },
      {
        name: 'Legendary Performer',
        description: 'The ultimate outfit for legendary performers',
        type: OutfitType.STAGE,
        rarity: OutfitRarity.LEGENDARY,
        imageUrl: '/assets/outfits/legendary.png',
        price: 0,
        isAvailable: true,
        isUnlockable: true,
        unlockRequirement: 'Reach Level 50 and perform 500 songs',
      },
    ];

    // Seed Shoes
    const shoes = [
      {
        name: 'Basic Sneakers',
        description: 'Comfortable everyday sneakers',
        type: ShoesType.SNEAKERS,
        rarity: ShoesRarity.COMMON,
        imageUrl: '/assets/shoes/basic-sneakers.png',
        price: 0,
        isAvailable: true,
        isUnlockable: false,
      },
      {
        name: 'Dress Shoes',
        description: 'Polished dress shoes for formal occasions',
        type: ShoesType.DRESS,
        rarity: ShoesRarity.UNCOMMON,
        imageUrl: '/assets/shoes/dress-shoes.png',
        price: 40,
        isAvailable: true,
        isUnlockable: false,
      },
      {
        name: 'Stage Boots',
        description: 'Stylish boots perfect for stage performances',
        type: ShoesType.BOOTS,
        rarity: ShoesRarity.RARE,
        imageUrl: '/assets/shoes/stage-boots.png',
        price: 120,
        isAvailable: true,
        isUnlockable: false,
      },
      {
        name: 'Athletic Pro',
        description: 'High-performance athletic shoes',
        type: ShoesType.ATHLETIC,
        rarity: ShoesRarity.EPIC,
        imageUrl: '/assets/shoes/athletic-pro.png',
        price: 250,
        isAvailable: true,
        isUnlockable: false,
      },
      {
        name: 'Golden Steps',
        description: 'Legendary golden shoes that make every step shine',
        type: ShoesType.STAGE,
        rarity: ShoesRarity.LEGENDARY,
        imageUrl: '/assets/shoes/golden-steps.png',
        price: 0,
        isAvailable: true,
        isUnlockable: true,
        unlockRequirement: 'Perfect score on 50 different songs',
      },
    ];

    // Insert data
    for (const micData of microphones) {
      const existing = await microphoneRepository.findOne({ where: { name: micData.name } });
      if (!existing) {
        const microphone = microphoneRepository.create(micData);
        await microphoneRepository.save(microphone);
        console.log(`Created microphone: ${micData.name}`);
      }
    }

    for (const outfitData of outfits) {
      const existing = await outfitRepository.findOne({ where: { name: outfitData.name } });
      if (!existing) {
        const outfit = outfitRepository.create(outfitData);
        await outfitRepository.save(outfit);
        console.log(`Created outfit: ${outfitData.name}`);
      }
    }

    for (const shoeData of shoes) {
      const existing = await shoesRepository.findOne({ where: { name: shoeData.name } });
      if (!existing) {
        const shoe = shoesRepository.create(shoeData);
        await shoesRepository.save(shoe);
        console.log(`Created shoes: ${shoeData.name}`);
      }
    }

    console.log('Avatar seeding completed!');
  }
}
