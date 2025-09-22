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
    // Backup existing user_avatars data
    console.log('\n💾 Backing up existing user_avatars data...');
    await connection.execute('CREATE TABLE user_avatars_temp AS SELECT * FROM user_avatars');

    // Drop and recreate user_avatars table with proper structure
    console.log('\n🔧 Recreating user_avatars table...');
    await connection.execute('DROP TABLE user_avatars');

    await connection.execute(`
      CREATE TABLE user_avatars (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        userId VARCHAR(36) NOT NULL,
        avatarId VARCHAR(50) NOT NULL,
        microphoneId VARCHAR(50) NULL,
        isEquipped BOOLEAN NOT NULL DEFAULT FALSE,
        acquiredAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (avatarId) REFERENCES avatars(id) ON DELETE CASCADE,
        FOREIGN KEY (microphoneId) REFERENCES microphones(id) ON DELETE SET NULL,
        UNIQUE KEY unique_user_avatar (userId, avatarId),
        INDEX idx_user_avatars_user (userId),
        INDEX idx_user_avatars_equipped (userId, isEquipped)
      )
    `);
    console.log('✓ Recreated user_avatars table with microphoneId column');

    // Restore data (excluding the old id)
    console.log('\n📥 Restoring user_avatars data...');
    await connection.execute(`
      INSERT INTO user_avatars (userId, avatarId, isEquipped, acquiredAt)
      SELECT userId, avatarId, isEquipped, acquiredAt
      FROM user_avatars_temp
    `);

    // Clean up temp table
    await connection.execute('DROP TABLE user_avatars_temp');
    console.log('✓ Restored user_avatars data');

    // Assign missing avatars to users (for avatars 9-25)
    console.log('\n👥 Assigning new avatars to existing users...');
    const [users] = await connection.execute('SELECT id FROM users');
    const newAvatars = [
      'avatar_9',
      'avatar_10',
      'avatar_11',
      'avatar_12',
      'avatar_13',
      'avatar_14',
      'avatar_15',
      'avatar_16',
      'avatar_17',
      'avatar_18',
      'avatar_19',
      'avatar_20',
      'avatar_21',
      'avatar_22',
      'avatar_23',
      'avatar_24',
      'avatar_25',
    ];

    for (const user of users as any[]) {
      for (const avatarId of newAvatars) {
        // Check if user already has this avatar
        const [existing] = await connection.execute(
          'SELECT id FROM user_avatars WHERE userId = ? AND avatarId = ?',
          [user.id, avatarId],
        );

        if ((existing as any[]).length === 0) {
          await connection.execute(
            `
            INSERT INTO user_avatars (userId, avatarId, isEquipped, acquiredAt)
            VALUES (?, ?, FALSE, NOW())
          `,
            [user.id, avatarId],
          );
        }
      }
      console.log(`✓ Assigned new avatars to user: ${user.id}`);
    }

    console.log('\n🎉 Successfully updated user_avatars table structure!');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await connection.end();
  }
};

main().catch(console.error);
