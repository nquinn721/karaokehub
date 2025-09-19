import { DataSource } from 'typeorm';

// Database configuration
const dataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  username: process.env.DB_USERNAME || 'admin',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'karaoke-hub',
  entities: [], // No entities needed for raw queries
  synchronize: false,
});

async function backfillUserAvatars() {
  try {
    console.log('🔌 Connecting to database...');
    await dataSource.initialize();
    console.log('✅ Database connected successfully');

    const queryRunner = dataSource.createQueryRunner();

    // Find all users without avatars or with null/empty avatars
    const usersWithoutAvatars = await queryRunner.query(`
      SELECT id, name, email, avatar 
      FROM users 
      WHERE avatar IS NULL OR avatar = '' OR avatar = ""
    `);

    console.log(`📊 Found ${usersWithoutAvatars.length} users without avatars`);

    if (usersWithoutAvatars.length === 0) {
      console.log('🎉 All users already have avatars assigned!');
      return;
    }

    console.log('🔄 Updating users with default avatar...');

    // Update all users without avatars to have 'avatar_1' as default
    const updateResult = await queryRunner.query(`
      UPDATE users 
      SET avatar = 'avatar_1' 
      WHERE avatar IS NULL OR avatar = '' OR avatar = ""
    `);

    console.log(
      `✅ Successfully updated ${updateResult.affectedRows} users with default avatar 'avatar_1'`,
    );

    // Verify the update
    const updatedUsers = await queryRunner.query(`
      SELECT id, name, email, avatar 
      FROM users 
      WHERE avatar = 'avatar_1' 
      LIMIT 10
    `);

    console.log('📋 Sample of updated users:');
    updatedUsers.slice(0, 5).forEach((user: any) => {
      console.log(`  - ${user.name} (${user.email}): ${user.avatar}`);
    });

    if (updatedUsers.length > 5) {
      console.log(`  ... and ${updatedUsers.length - 5} more users`);
    }

    await queryRunner.release();
  } catch (error) {
    console.error('❌ Error during avatar backfill:', error);
    throw error;
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run the script
if (require.main === module) {
  backfillUserAvatars()
    .then(() => {
      console.log('🎉 Avatar backfill completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Avatar backfill failed:', error);
      process.exit(1);
    });
}

export { backfillUserAvatars };
