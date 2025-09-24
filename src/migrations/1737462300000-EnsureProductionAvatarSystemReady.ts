import { MigrationInterface, QueryRunner } from 'typeorm';

export class EnsureProductionAvatarSystemReady1737462300000 implements MigrationInterface {
  name = 'EnsureProductionAvatarSystemReady1737462300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('🎭 Ensuring production avatar system is ready...');

    // Step 1: Fix user_avatars constraints if needed
    console.log('Checking user_avatars constraints...');
    
    // Check if the problematic constraint exists
    const badConstraints = await queryRunner.query(`
      SELECT CONSTRAINT_NAME 
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'user_avatars' 
      AND CONSTRAINT_NAME = 'IDX_8e1c8161ffe23571cc8e52fe7a'
      AND (SELECT COUNT(*) FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
           WHERE TABLE_SCHEMA = DATABASE() 
           AND TABLE_NAME = 'user_avatars' 
           AND CONSTRAINT_NAME = 'IDX_8e1c8161ffe23571cc8e52fe7a') = 1
    `);

    if (badConstraints.length > 0) {
      console.log('Dropping problematic unique constraint on userId only...');
      try {
        await queryRunner.query(`
          ALTER TABLE user_avatars DROP INDEX IDX_8e1c8161ffe23571cc8e52fe7a
        `);
      } catch (error) {
        console.log('Constraint might not exist or already dropped:', error.message);
      }
    }

    // Step 2: Ensure correct constraint exists
    const correctConstraintExists = await queryRunner.query(`
      SELECT COUNT(*) as count
      FROM INFORMATION_SCHEMA.STATISTICS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'user_avatars' 
      AND INDEX_NAME = 'unique_user_avatar_combo'
    `);

    if (correctConstraintExists[0].count === 0) {
      console.log('Adding correct unique constraint on (userId, avatarId)...');
      await queryRunner.query(`
        ALTER TABLE user_avatars 
        ADD CONSTRAINT unique_user_avatar_combo UNIQUE (userId, avatarId)
      `);
    }

    // Step 3: Fix any empty avatarId values
    const defaultAvatar = await queryRunner.query(`
      SELECT id FROM avatars WHERE name = 'Alex' LIMIT 1
    `);

    if (defaultAvatar.length > 0) {
      const updateResult = await queryRunner.query(`
        UPDATE user_avatars 
        SET avatarId = ? 
        WHERE avatarId IS NULL OR avatarId = ''
      `, [defaultAvatar[0].id]);
      
      if (updateResult.affectedRows > 0) {
        console.log(`Updated ${updateResult.affectedRows} user avatar records with default avatar`);
      }
    }

    // Step 4: Ensure all essential avatars exist
    const essentialAvatars = [
      // Basic avatars (free)
      {
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
        name: 'Joe',
        description: 'Friendly Joe avatar perfect for any occasion',
        type: 'character',
        rarity: 'common',
        imageUrl: '/images/avatar/avatars/joe.png',
        price: 0.0,
        coinPrice: 0,
        isAvailable: true,
        isFree: true,
      },
      // Rock theme avatars (premium)
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
      // Country theme avatars (premium)
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

    let insertedCount = 0;
    for (const avatar of essentialAvatars) {
      const result = await queryRunner.query(`
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

      if (result.affectedRows > 0) {
        insertedCount++;
      }
    }

    console.log(`✅ Ensured ${insertedCount} avatars are available in production`);

    // Step 5: Ensure all users have at least one avatar
    await queryRunner.query(`
      INSERT INTO user_avatars (id, userId, avatarId, acquiredAt)
      SELECT 
        UUID() as id,
        u.id as userId,
        (SELECT id FROM avatars WHERE name = 'Alex' LIMIT 1) as avatarId,
        NOW() as acquiredAt
      FROM users u
      LEFT JOIN user_avatars ua ON u.id = ua.userId
      WHERE ua.userId IS NULL
    `);

    const finalAvatarCount = await queryRunner.query(`
      SELECT COUNT(*) as count FROM avatars
    `);

    const finalUserAvatarCount = await queryRunner.query(`
      SELECT COUNT(*) as count FROM user_avatars
    `);

    console.log(`✅ Production avatar system ready!`);
    console.log(`   - Total avatars: ${finalAvatarCount[0].count}`);
    console.log(`   - User avatar assignments: ${finalUserAvatarCount[0].count}`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // This migration ensures production readiness, so we won't reverse it
    console.log('Production readiness migration - no rollback needed');
  }
}