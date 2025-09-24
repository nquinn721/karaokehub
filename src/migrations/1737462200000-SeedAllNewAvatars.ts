import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedAllNewAvatars1737462200000 implements MigrationInterface {
  name = 'SeedAllNewAvatars1737462200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('🎭 Seeding all new avatars...');

    // Check if avatars are already populated
    const existingCount = await queryRunner.query(`
      SELECT COUNT(*) as count FROM avatars
    `);

    console.log(`Current avatar count: ${existingCount[0].count}`);

    // First, ensure we have the basic avatars
    const basicAvatars = [
      {
        id: 'b7424e58-97e3-11f0-a9d5-f8ce72240675',
        name: 'Alex',
        description: 'Classic and versatile Alex avatar',
        type: 'character',
        rarity: 'common',
        imageUrl: '/images/avatar/avatars/alex.png',
        price: 0.0,
        coinPrice: 0,
        isAvailable: true,
        isFree: true,
      },
      {
        id: 'b742520e-97e3-11f0-a9d5-f8ce72240675', 
        name: 'Blake',
        description: 'Cool and confident Blake avatar',
        type: 'character',
        rarity: 'common',
        imageUrl: '/images/avatar/avatars/blake.png',
        price: 0.0,
        coinPrice: 0,
        isAvailable: true,
        isFree: true,
      },
      {
        id: 'b742523a-97e3-11f0-a9d5-f8ce72240675',
        name: 'Cameron',
        description: 'Stylish Cameron avatar with great energy',
        type: 'character', 
        rarity: 'common',
        imageUrl: '/images/avatar/avatars/cameron.png',
        price: 0.0,
        coinPrice: 0,
        isAvailable: true,
        isFree: true,
      },
      {
        id: 'b7425255-97e3-11f0-a9d5-f8ce72240675',
        name: 'Joe',
        description: 'Friendly Joe avatar perfect for any occasion',
        type: 'character',
        rarity: 'common', 
        imageUrl: '/images/avatar/avatars/joe.png',
        price: 0.0,
        coinPrice: 0,
        isAvailable: true,
        isFree: true,
      }
    ];

    // Insert basic avatars (ignore if they already exist)
    for (const avatar of basicAvatars) {
      await queryRunner.query(`
        INSERT IGNORE INTO avatars (id, name, description, type, rarity, imageUrl, price, coinPrice, isAvailable, isFree, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `, [
        avatar.id,
        avatar.name,
        avatar.description,
        avatar.type,
        avatar.rarity,
        avatar.imageUrl,
        avatar.price,
        avatar.coinPrice,
        avatar.isAvailable,
        avatar.isFree
      ]);
    }

    // Now add the rock theme avatars
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
      }
    ];

    // Insert rock avatars (ignore if they already exist based on name)
    for (const avatar of rockAvatars) {
      await queryRunner.query(`
        INSERT INTO avatars (id, name, description, type, rarity, imageUrl, price, coinPrice, isAvailable, isFree, createdAt, updatedAt)
        SELECT UUID(), ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW()
        WHERE NOT EXISTS (
          SELECT 1 FROM avatars WHERE name = ?
        )
      `, [
        avatar.name,
        avatar.description,
        avatar.type,
        avatar.rarity,
        avatar.imageUrl,
        avatar.price,
        avatar.coinPrice,
        avatar.isAvailable,
        avatar.isFree,
        avatar.name // for the WHERE NOT EXISTS check
      ]);
    }

    // Country themed avatars (these seem to already exist based on earlier query)
    const countryAvatars = [
      {
        name: 'Country Alex',
        description: 'Country-style Alex with boots and hat',
        type: 'character',
        rarity: 'uncommon',
        imageUrl: '/images/avatar/avatars/alex-country.png',
        price: 0.0,
        coinPrice: 500,
        isAvailable: true,
        isFree: false,
      },
      {
        name: 'Country Blake',
        description: 'Country Blake ready for the rodeo',
        type: 'character',
        rarity: 'uncommon',
        imageUrl: '/images/avatar/avatars/blake-country.png',
        price: 0.0,
        coinPrice: 500,
        isAvailable: true,
        isFree: false,
      }
    ];

    // Insert country avatars (ignore if they already exist)
    for (const avatar of countryAvatars) {
      await queryRunner.query(`
        INSERT INTO avatars (id, name, description, type, rarity, imageUrl, price, coinPrice, isAvailable, isFree, createdAt, updatedAt)
        SELECT UUID(), ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW()
        WHERE NOT EXISTS (
          SELECT 1 FROM avatars WHERE name = ?
        )
      `, [
        avatar.name,
        avatar.description,
        avatar.type,
        avatar.rarity,
        avatar.imageUrl,
        avatar.price,
        avatar.coinPrice,
        avatar.isAvailable,
        avatar.isFree,
        avatar.name
      ]);
    }

    const finalCount = await queryRunner.query(`
      SELECT COUNT(*) as count FROM avatars
    `);

    console.log(`✅ Avatar seeding complete! Total avatars: ${finalCount[0].count}`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove the avatars we added (except the basic ones users might have)
    await queryRunner.query(`
      DELETE FROM avatars 
      WHERE name LIKE 'Rockstar %' 
      OR name LIKE 'Country %'
    `);
  }
}