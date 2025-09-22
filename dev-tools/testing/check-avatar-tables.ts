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
    // Show tables
    console.log('\nExisting tables:');
    const [tables] = await connection.execute('SHOW TABLES');
    (tables as any[]).forEach((table) => {
      console.log('-', Object.values(table)[0]);
    });

    // Check if avatars table exists and its structure
    console.log('\nChecking avatars table structure:');
    try {
      const [avatarCols] = await connection.execute('DESCRIBE avatars');
      console.log('Avatars table columns:');
      (avatarCols as any[]).forEach((col) => {
        console.log(`- ${col.Field}: ${col.Type} ${col.Null} ${col.Key} ${col.Default}`);
      });
    } catch (e) {
      console.log('Avatars table does not exist');
    }

    // Check user_avatars table
    console.log('\nChecking user_avatars table structure:');
    try {
      const [userAvatarCols] = await connection.execute('DESCRIBE user_avatars');
      console.log('User_avatars table columns:');
      (userAvatarCols as any[]).forEach((col) => {
        console.log(`- ${col.Field}: ${col.Type} ${col.Null} ${col.Key} ${col.Default}`);
      });
    } catch (e) {
      console.log('User_avatars table does not exist');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await connection.end();
  }
};

main().catch(console.error);
