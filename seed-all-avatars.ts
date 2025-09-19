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
    // All 25 avatars from AvatarDisplay3D.tsx
    const allAvatars = [
      {
        id: 'avatar_1',
        name: 'Alex',
        description: 'Cool Performer',
        gender: 'male',
        ethnicity: 'Caucasian',
      },
      {
        id: 'avatar_2',
        name: 'Sam',
        description: 'Energetic Singer',
        gender: 'female',
        ethnicity: 'African American',
      },
      {
        id: 'avatar_3',
        name: 'Jordan',
        description: 'Versatile Artist',
        gender: 'male',
        ethnicity: 'Asian',
      },
      {
        id: 'avatar_4',
        name: 'Taylor',
        description: 'Dynamic Performer',
        gender: 'female',
        ethnicity: 'Hispanic',
      },
      {
        id: 'avatar_5',
        name: 'Casey',
        description: 'Mysterious Vocalist',
        gender: 'male',
        ethnicity: 'Caucasian',
      },
      {
        id: 'avatar_6',
        name: 'Robin',
        description: 'Charismatic Performer',
        gender: 'female',
        ethnicity: 'African American',
      },
      {
        id: 'avatar_7',
        name: 'Morgan',
        description: 'Soulful Singer',
        gender: 'male',
        ethnicity: 'Asian',
      },
      {
        id: 'avatar_8',
        name: 'Riley',
        description: 'Upbeat Artist',
        gender: 'female',
        ethnicity: 'Hispanic',
      },
      {
        id: 'avatar_9',
        name: 'Avery',
        description: 'Melodic Voice',
        gender: 'male',
        ethnicity: 'Caucasian',
      },
      {
        id: 'avatar_10',
        name: 'Blake',
        description: 'Powerful Vocalist',
        gender: 'female',
        ethnicity: 'African American',
      },
      {
        id: 'avatar_11',
        name: 'Cameron',
        description: 'Smooth Performer',
        gender: 'male',
        ethnicity: 'Asian',
      },
      {
        id: 'avatar_12',
        name: 'Drew',
        description: 'Rhythmic Artist',
        gender: 'female',
        ethnicity: 'Hispanic',
      },
      {
        id: 'avatar_13',
        name: 'Emery',
        description: 'Passionate Singer',
        gender: 'male',
        ethnicity: 'Caucasian',
      },
      {
        id: 'avatar_14',
        name: 'Finley',
        description: 'Versatile Performer',
        gender: 'female',
        ethnicity: 'African American',
      },
      {
        id: 'avatar_15',
        name: 'Gray',
        description: 'Dynamic Artist',
        gender: 'male',
        ethnicity: 'Asian',
      },
      {
        id: 'avatar_16',
        name: 'Hayden',
        description: 'Expressive Vocalist',
        gender: 'female',
        ethnicity: 'Hispanic',
      },
      {
        id: 'avatar_17',
        name: 'Indigo',
        description: 'Unique Style',
        gender: 'male',
        ethnicity: 'Caucasian',
      },
      {
        id: 'avatar_18',
        name: 'Jazz',
        description: 'Smooth Voice',
        gender: 'female',
        ethnicity: 'African American',
      },
      {
        id: 'avatar_19',
        name: 'Kai',
        description: 'Energetic Performer',
        gender: 'male',
        ethnicity: 'Asian',
      },
      {
        id: 'avatar_20',
        name: 'Luna',
        description: 'Dreamy Vocalist',
        gender: 'female',
        ethnicity: 'Hispanic',
      },
      {
        id: 'avatar_21',
        name: 'Max',
        description: 'Musical Genius',
        gender: 'male',
        ethnicity: 'Caucasian',
      },
      {
        id: 'avatar_22',
        name: 'Neo',
        description: 'Futuristic Artist',
        gender: 'female',
        ethnicity: 'African American',
      },
      {
        id: 'avatar_23',
        name: 'Onyx',
        description: 'Dark Mystique',
        gender: 'male',
        ethnicity: 'Asian',
      },
      {
        id: 'avatar_24',
        name: 'Phoenix',
        description: 'Rising Star',
        gender: 'female',
        ethnicity: 'Hispanic',
      },
      {
        id: 'avatar_25',
        name: 'Quest',
        description: 'Legendary Performer',
        gender: 'male',
        ethnicity: 'Caucasian',
      },
    ];

    console.log('\n🎭 Inserting all 25 avatars...');
    for (const avatar of allAvatars) {
      await connection.execute(
        `
        INSERT INTO avatars (id, name, description, type, rarity, imageUrl, price, coinPrice, isAvailable)
        VALUES (?, ?, ?, 'basic', 'common', ?, 0.00, 0, TRUE)
        ON DUPLICATE KEY UPDATE 
          name = VALUES(name),
          description = VALUES(description),
          imageUrl = VALUES(imageUrl)
      `,
        [avatar.id, avatar.name, avatar.description, `/avatar/${avatar.id}.png`],
      );
      console.log(`✓ Inserted avatar: ${avatar.name} (${avatar.id})`);
    }

    // Clean up old tables
    console.log('\n🗑️ Cleaning up unnecessary tables...');
    await connection.execute('DROP TABLE IF EXISTS user_avatar_customizations');
    await connection.execute('DROP TABLE IF EXISTS user_avatars_backup');
    console.log('✓ Dropped user_avatar_customizations and user_avatars_backup tables');

    // Update user_avatars table to include microphoneId
    console.log('\n🎤 Adding microphoneId column to user_avatars...');
    try {
      await connection.execute(`
        ALTER TABLE user_avatars 
        ADD COLUMN microphoneId VARCHAR(50) NULL,
        ADD FOREIGN KEY (microphoneId) REFERENCES microphones(id) ON DELETE SET NULL
      `);
      console.log('✓ Added microphoneId column to user_avatars');
    } catch (error) {
      console.log('ℹ️ microphoneId column might already exist:', (error as any).message);
    }

    // Give all existing users access to all avatars
    console.log('\n👥 Assigning all avatars to existing users...');
    const [users] = await connection.execute('SELECT id FROM users');

    for (const user of users as any[]) {
      for (const avatar of allAvatars) {
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
      console.log(`✓ Assigned all avatars to user: ${user.id}`);
    }

    // Set default equipped avatar for users who don't have any equipped
    console.log('\n🎭 Setting default equipped avatars...');
    await connection.execute(`
      UPDATE user_avatars 
      SET isEquipped = TRUE 
      WHERE avatarId = 'avatar_3' 
      AND userId IN (
        SELECT userId FROM (
          SELECT userId FROM user_avatars 
          GROUP BY userId 
          HAVING SUM(isEquipped) = 0
        ) AS temp
      )
    `);
    console.log('✓ Set avatar_3 (Jordan) as default for users without equipped avatars');

    console.log('\n🎉 Successfully seeded all 25 avatars and updated user_avatars structure!');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await connection.end();
  }
};

main().catch(console.error);
