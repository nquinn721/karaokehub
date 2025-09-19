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
    // Create avatars table
    console.log('\n🎭 Creating avatars table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS avatars (
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

    // Create user_avatars table
    console.log('\n👥 Creating user_avatars table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS user_avatars (
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
        ON DUPLICATE KEY UPDATE 
          name = VALUES(name),
          description = VALUES(description),
          imageUrl = VALUES(imageUrl)
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
        // Check if user already has this avatar
        const [existing] = await connection.execute(
          'SELECT id FROM user_avatars WHERE userId = ? AND avatarId = ?',
          [user.id, avatar.id],
        );

        if ((existing as any[]).length === 0) {
          await connection.execute(
            `
            INSERT INTO user_avatars (userId, avatarId, isEquipped, acquiredAt)
            VALUES (?, ?, FALSE, NOW())
          `,
            [user.id, avatar.id],
          );
        }
      }
      console.log(`✓ Assigned avatars to user: ${user.id}`);
    }

    // Set Jordan as the default equipped avatar for users who don't have any equipped
    console.log('\n🎭 Setting default equipped avatars...');
    await connection.execute(`
      UPDATE user_avatars 
      SET isEquipped = TRUE 
      WHERE avatarId = 'avatar_jordan' 
      AND userId IN (
        SELECT userId FROM (
          SELECT userId FROM user_avatars 
          GROUP BY userId 
          HAVING SUM(isEquipped) = 0
        ) AS users_without_equipped
      )
    `);
    console.log('✓ Set Jordan as default equipped avatar for users');

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

    console.log(`- Avatars in database: ${(avatarCount as any)[0].count}`);
    console.log(`- User-avatar relationships: ${(userAvatarCount as any)[0].count}`);
    console.log(`- Users with equipped avatars: ${(equippedCount as any)[0].count}`);
  } catch (error) {
    console.error('Error setting up avatar system:', error);
  } finally {
    await connection.end();
  }
};

main().catch(console.error);
