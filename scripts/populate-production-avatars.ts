import { config } from 'dotenv';
import { DataSource } from 'typeorm';

// Load environment variables
config();

const AppDataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  username: process.env.DB_USERNAME || 'admin',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'karaoke-hub',
  synchronize: false,
  logging: true,
});

async function populateProductionAvatars() {
  console.log('🎭 Setting up avatar data for production...');

  try {
    await AppDataSource.initialize();

    // Check current state
    const [userCount] = await AppDataSource.query('SELECT COUNT(*) as count FROM users');
    const [userAvatarCount] = await AppDataSource.query(
      'SELECT COUNT(*) as count FROM user_avatars',
    );

    console.log(`📊 Current state:`);
    console.log(`  Users: ${userCount.count}`);
    console.log(`  User Avatars: ${userAvatarCount.count}`);

    if (userAvatarCount.count < userCount.count) {
      console.log('🔧 Creating missing user avatar records...');

      // Create user avatar records for users without them
      await AppDataSource.query(`
        INSERT IGNORE INTO user_avatars (id, userId, baseAvatarId, isActive, createdAt, updatedAt)
        SELECT 
          UUID() as id,
          u.id as userId,
          'avatar_1' as baseAvatarId,
          true as isActive,
          NOW() as createdAt,
          NOW() as updatedAt
        FROM users u
        LEFT JOIN user_avatars ua ON u.id = ua.userId
        WHERE ua.userId IS NULL
      `);

      const [newCount] = await AppDataSource.query('SELECT COUNT(*) as count FROM user_avatars');
      console.log(`✅ User avatar records created. New count: ${newCount.count}`);
    } else {
      console.log('✅ All users already have avatar records');
    }

    console.log('🎭 Avatar data setup complete!');
  } catch (error) {
    console.error('❌ Error setting up avatar data:', error);
    process.exit(1);
  } finally {
    await AppDataSource.destroy();
  }
}

// Run if called directly
if (require.main === module) {
  populateProductionAvatars();
}

export { populateProductionAvatars };
