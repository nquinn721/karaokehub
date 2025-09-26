import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRockThemeAvatars1737454300000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('🎸 Adding rock-themed avatars to database...');

    const rockAvatars = [
      {
        name: 'Rockstar Alex',
        description: 'Rock star Alex with edgy attitude and leather jacket',
        type: 'character',
        rarity: 'rare',
        imageUrl: '/images/avatar/avatars/alex-rock.png',
        price: 0.0,
        coinPrice: 1000,
        isAvailable: true,
        isFree: false,
      },
      {
        name: 'Rockstar Blake',
        description: 'Rock legend Blake with signature guitar and stage presence',
        type: 'character',
        rarity: 'rare',
        imageUrl: '/images/avatar/avatars/blake-rock.png',
        price: 0.0,
        coinPrice: 1000,
        isAvailable: true,
        isFree: false,
      },
      {
        name: 'Rockstar Cameron',
        description: 'Rockstar Cameron with bold style and fierce energy',
        type: 'character',
        rarity: 'rare',
        imageUrl: '/images/avatar/avatars/cameron-rock.png',
        price: 0.0,
        coinPrice: 1000,
        isAvailable: true,
        isFree: false,
      },
      {
        name: 'Rockstar Joe',
        description: 'Classic rocker Joe with vintage vibes and rock spirit',
        type: 'character',
        rarity: 'rare',
        imageUrl: '/images/avatar/avatars/joe-rock.png',
        price: 0.0,
        coinPrice: 1000,
        isAvailable: true,
        isFree: false,
      },
      {
        name: 'Rockstar Juan',
        description: 'Rock icon Juan with rebellious style and attitude',
        type: 'character',
        rarity: 'rare',
        imageUrl: '/images/avatar/avatars/juan-rock.png',
        price: 0.0,
        coinPrice: 1000,
        isAvailable: true,
        isFree: false,
      },
      {
        name: 'Rockstar Kai',
        description: 'Rock sensation Kai with modern edge and stage charisma',
        type: 'character',
        rarity: 'rare',
        imageUrl: '/images/avatar/avatars/kai-rock.png',
        price: 0.0,
        coinPrice: 1000,
        isAvailable: true,
        isFree: false,
      },
      {
        name: 'Rockstar Onyx',
        description: 'Dark rock star Onyx with mysterious allure and power',
        type: 'character',
        rarity: 'rare',
        imageUrl: '/images/avatar/avatars/onyx-rock.png',
        price: 0.0,
        coinPrice: 1000,
        isAvailable: true,
        isFree: false,
      },
      {
        name: 'Rockstar Tyler',
        description: 'Rock performer Tyler with dynamic energy and stage presence',
        type: 'character',
        rarity: 'rare',
        imageUrl: '/images/avatar/avatars/tyler-rock.png',
        price: 0.0,
        coinPrice: 1000,
        isAvailable: true,
        isFree: false,
      },
    ];

    // Insert each rock avatar
    for (const avatar of rockAvatars) {
      const avatarId = await queryRunner.query(
        `INSERT INTO avatars (id, name, description, type, rarity, imageUrl, price, coinPrice, isAvailable, isFree) 
         VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          avatar.name,
          avatar.description,
          avatar.type,
          avatar.rarity,
          avatar.imageUrl,
          avatar.price,
          avatar.coinPrice,
          avatar.isAvailable,
          avatar.isFree,
        ],
      );

      console.log(`✅ Added ${avatar.name} avatar with ${avatar.coinPrice} coin price`);
    }

    console.log('🎸 Successfully added all 8 rock-themed avatars!');
    console.log('💰 All rock avatars cost 1000 coins and have rare rarity');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('🔄 Removing rock-themed avatars...');

    const rockAvatarNames = [
      'Rockstar Alex',
      'Rockstar Blake',
      'Rockstar Cameron',
      'Rockstar Joe',
      'Rockstar Juan',
      'Rockstar Kai',
      'Rockstar Onyx',
      'Rockstar Tyler',
    ];

    for (const name of rockAvatarNames) {
      await queryRunner.query('DELETE FROM avatars WHERE name = ?', [name]);
      console.log(`🗑️ Removed ${name} avatar`);
    }

    console.log('✅ Successfully removed all rock-themed avatars');
  }
}
