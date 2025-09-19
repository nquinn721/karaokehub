import * as mysql from 'mysql2/promise';

const main = async () => {
  const connection = await mysql.createConnection({
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT) || 3306,
    user: process.env.DATABASE_USERNAME || 'root',
    password: process.env.DATABASE_PASSWORD || 'password',
    database: process.env.DATABASE_NAME || 'karaokehub',
  });

  console.log('✓ Database connected');

  try {
    console.log('\nChecking microphones table:');
    const [microphones] = await connection.execute('SELECT * FROM microphones');
    console.log(`Found ${(microphones as any[]).length} microphones:`);
    (microphones as any[]).forEach((mic) => {
      console.log(`- ID: ${mic.id}, Name: ${mic.name}, Type: ${mic.type}, Image: ${mic.imageUrl}`);
    });

    console.log('\nChecking user_microphones table:');
    const [userMicrophones] = await connection.execute(`
      SELECT um.*, m.name as microphone_name 
      FROM user_microphones um 
      LEFT JOIN microphones m ON um.microphoneId = m.id
    `);
    console.log(`Found ${(userMicrophones as any[]).length} user microphone records:`);
    (userMicrophones as any[]).forEach((userMic) => {
      console.log(
        `- User: ${userMic.userId}, Microphone: ${userMic.microphoneId} (${userMic.microphone_name}), Equipped: ${userMic.isEquipped}`,
      );
    });

    if ((userMicrophones as any[]).length === 0) {
      console.log('\n❌ NO USER MICROPHONES FOUND! This is why the modal is empty.');
      console.log(
        'Users need to have microphones in the user_microphones table to see them in the modal.',
      );

      console.log('\nChecking users table to see what users exist:');
      const [users] = await connection.execute('SELECT id, email FROM users LIMIT 5');
      console.log(`Found ${(users as any[]).length} users:`);
      (users as any[]).forEach((user) => {
        console.log(`- ID: ${user.id}, Email: ${user.email}`);
      });
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await connection.end();
  }
};

main().catch(console.error);
