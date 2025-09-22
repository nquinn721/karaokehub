import * as mysql from 'mysql2/promise';

const main = async () => {
  const connection = await mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'admin',
    password: 'password',
    database: 'karaoke-hub',
  });

  console.log('✓ Database connected');

  try {
    // First, let's rename the existing user_avatars table to avoid conflicts
    console.log('\n⚠️ Backing up existing user_avatars table...');
    await connection.execute('DROP TABLE IF EXISTS user_avatars_backup');
    await connection.execute('CREATE TABLE user_avatars_backup AS SELECT * FROM user_avatars');
    console.log('✓ Backed up user_avatars to user_avatars_backup');

    // Drop the existing tables
    console.log('\n🗑️ Dropping existing tables...');
    await connection.execute('DROP TABLE IF EXISTS user_avatars');
    await connection.execute('DROP TABLE IF EXISTS avatars');
    console.log('✓ Dropped existing tables');

    // Create avatars table
    console.log('\n🎭 Creating avatars table...');
    await connection.execute(`
      CREATE TABLE avatars (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        type VARCHAR(50) NOT NULL DEFAULT 'basic',
        rarity VARCHAR(50) NOT NULL DEFAULT 'common',
        imageUrl VARCHAR(255) NOT NULL,
        price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        coinPrice INT NOT NULL DEFAULT 0,
        isAvailable BOOLEAN NOT NULL DEFAULT TRUE,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ avatars table created');

    // Create user_avatars table for ownership (different from the old customization table)
    console.log('\n👥 Creating user_avatars table...');
    await connection.execute(`
      CREATE TABLE user_avatars (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        userId VARCHAR(36) NOT NULL,
        avatarId VARCHAR(50) NOT NULL,
        isEquipped BOOLEAN NOT NULL DEFAULT FALSE,
        acquiredAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (avatarId) REFERENCES avatars(id) ON DELETE CASCADE,
        UNIQUE KEY unique_user_avatar (userId, avatarId),
        INDEX idx_user_equipped (userId, isEquipped)
      )
    `);
    console.log('✓ user_avatars table created');

    // Insert basic free avatars
    console.log('\n🎨 Inserting basic avatars...');
    const basicAvatars = [
      {
        id: 'avatar_alex',
        name: 'Alex',
        description: 'A friendly and approachable performer',
        imageUrl: '/images/avatar/base/alex.png',
      },
      {
        id: 'avatar_sam',
        name: 'Sam',
        description: 'Cool and confident on stage',
        imageUrl: '/images/avatar/base/sam.png',
      },
      {
        id: 'avatar_jordan',
        name: 'Jordan',
        description: 'Versatile artist with great energy',
        imageUrl: '/images/avatar/base/jordan.png',
      },
      {
        id: 'avatar_taylor',
        name: 'Taylor',
        description: 'Classic performer with style',
        imageUrl: '/images/avatar/base/taylor.png',
      },
      {
        id: 'avatar_casey',
        name: 'Casey',
        description: 'Bold and expressive singer',
        imageUrl: '/images/avatar/base/casey.png',
      },
      {
        id: 'avatar_robin',
        name: 'Robin',
        description: 'Charismatic and engaging performer',
        imageUrl: '/images/avatar/base/robin.png',
      },
      {
        id: 'avatar_morgan',
        name: 'Morgan',
        description: 'Smooth and sophisticated artist',
        imageUrl: '/images/avatar/base/morgan.png',
      },
      {
        id: 'avatar_riley',
        name: 'Riley',
        description: 'Dynamic and energetic performer',
        imageUrl: '/images/avatar/base/riley.png',
      },
    ];

    for (const avatar of basicAvatars) {
      await connection.execute(
        `
        INSERT INTO avatars (id, name, description, type, rarity, imageUrl, price, coinPrice, isAvailable)
        VALUES (?, ?, ?, 'basic', 'common', ?, 0.00, 0, TRUE)
      `,
        [avatar.id, avatar.name, avatar.description, avatar.imageUrl],
      );
      console.log(`✓ Inserted avatar: ${avatar.name}`);
    }

    // Give all existing users all basic avatars
    console.log('\n👥 Assigning basic avatars to all users...');
    const [users] = await connection.execute('SELECT id FROM users');

    for (const user of users as any[]) {
      for (const avatar of basicAvatars) {
        await connection.execute(
          `
          INSERT INTO user_avatars (userId, avatarId, isEquipped, acquiredAt)
          VALUES (?, ?, FALSE, NOW())
        `,
          [user.id, avatar.id],
        );
      }
      console.log(`✓ Assigned avatars to user: ${user.id}`);
    }

    // Set Jordan as the default equipped avatar for all users
    console.log('\n🎭 Setting Jordan as default equipped avatar...');
    await connection.execute(`
      UPDATE user_avatars 
      SET isEquipped = TRUE 
      WHERE avatarId = 'avatar_jordan'
    `);
    console.log('✓ Set Jordan as default equipped avatar for all users');

    // Create new user_avatar_customizations table to replace the old user_avatars functionality
    console.log('\n🎨 Creating user_avatar_customizations table...');
    await connection.execute(`
      CREATE TABLE user_avatar_customizations (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        userId VARCHAR(36) NOT NULL,
        baseAvatarId VARCHAR(50) NOT NULL,
        microphoneId VARCHAR(50),
        outfitId VARCHAR(50),
        shoesId VARCHAR(50),
        isActive BOOLEAN NOT NULL DEFAULT TRUE,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (baseAvatarId) REFERENCES avatars(id) ON DELETE CASCADE,
        FOREIGN KEY (microphoneId) REFERENCES microphones(id) ON DELETE SET NULL,
        FOREIGN KEY (outfitId) REFERENCES outfits(id) ON DELETE SET NULL,
        FOREIGN KEY (shoesId) REFERENCES shoes(id) ON DELETE SET NULL,
        UNIQUE KEY unique_active_user (userId, isActive),
        INDEX idx_user_active (userId, isActive)
      )
    `);
    console.log('✓ user_avatar_customizations table created');

    // Migrate data from backup to new customization table
    console.log('\n📦 Migrating old avatar customizations...');
    const [oldAvatars] = await connection.execute(
      'SELECT * FROM user_avatars_backup WHERE isActive = 1',
    );

    for (const oldAvatar of oldAvatars as any[]) {
      // Map old baseAvatarId to new avatar system
      let newAvatarId = 'avatar_jordan'; // default
      switch (oldAvatar.baseAvatarId) {
        case 'alex':
          newAvatarId = 'avatar_alex';
          break;
        case 'sam':
          newAvatarId = 'avatar_sam';
          break;
        case 'jordan':
          newAvatarId = 'avatar_jordan';
          break;
        case 'taylor':
          newAvatarId = 'avatar_taylor';
          break;
        case 'casey':
          newAvatarId = 'avatar_casey';
          break;
        case 'robin':
          newAvatarId = 'avatar_robin';
          break;
        case 'morgan':
          newAvatarId = 'avatar_morgan';
          break;
        case 'riley':
          newAvatarId = 'avatar_riley';
          break;
      }

      await connection.execute(
        `
        INSERT INTO user_avatar_customizations (userId, baseAvatarId, microphoneId, outfitId, shoesId, isActive, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, TRUE, ?, ?)
      `,
        [
          oldAvatar.userId,
          newAvatarId,
          oldAvatar.microphoneId,
          oldAvatar.outfitId,
          oldAvatar.shoesId,
          oldAvatar.createdAt,
          oldAvatar.updatedAt,
        ],
      );
      console.log(`✓ Migrated customization for user: ${oldAvatar.userId}`);
    }

    console.log('\n✅ Avatar system setup complete!');

    // Verify the setup
    console.log('\nVerification:');
    const [avatarCount] = await connection.execute('SELECT COUNT(*) as count FROM avatars');
    const [userAvatarCount] = await connection.execute(
      'SELECT COUNT(*) as count FROM user_avatars',
    );
    const [equippedCount] = await connection.execute(
      'SELECT COUNT(*) as count FROM user_avatars WHERE isEquipped = TRUE',
    );
    const [customizationCount] = await connection.execute(
      'SELECT COUNT(*) as count FROM user_avatar_customizations',
    );

    console.log(`- Avatars in database: ${(avatarCount as any)[0].count}`);
    console.log(`- User-avatar relationships: ${(userAvatarCount as any)[0].count}`);
    console.log(`- Users with equipped avatars: ${(equippedCount as any)[0].count}`);
    console.log(`- Avatar customizations: ${(customizationCount as any)[0].count}`);
  } catch (error) {
    console.error('Error setting up avatar system:', error);
  } finally {
    await connection.end();
  }
};

main().catch(console.error);
