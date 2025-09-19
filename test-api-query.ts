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
    console.log('\nTesting the exact API query that the backend runs:');

    // Test with a specific user ID from our data
    const testUserId = 'c7bfda43-8e8a-11f0-afce-f8ce72240675';
    console.log(`Testing with user ID: ${testUserId}`);

    const [userMicrophones] = await connection.execute(
      `
      SELECT 
        um.id,
        um.userId,
        um.microphoneId,
        um.isEquipped,
        um.acquiredAt,
        m.id as microphone_id,
        m.name as microphone_name,
        m.description as microphone_description,
        m.type as microphone_type,
        m.rarity as microphone_rarity,
        m.imageUrl as microphone_imageUrl,
        m.price as microphone_price,
        m.coinPrice as microphone_coinPrice,
        m.isAvailable as microphone_isAvailable
      FROM user_microphones um 
      LEFT JOIN microphones m ON um.microphoneId = m.id
      WHERE um.userId = ?
      ORDER BY um.acquiredAt ASC
    `,
      [testUserId],
    );

    console.log(`\nFound ${(userMicrophones as any[]).length} microphones for user ${testUserId}:`);
    (userMicrophones as any[]).forEach((userMic) => {
      console.log(`- UserMic ID: ${userMic.id}`);
      console.log(`  Microphone: ${userMic.microphoneId} (${userMic.microphone_name})`);
      console.log(`  Equipped: ${userMic.isEquipped}`);
      console.log(`  Image: ${userMic.microphone_imageUrl}`);
      console.log(`  Type: ${userMic.microphone_type}, Rarity: ${userMic.microphone_rarity}`);
      console.log('');
    });

    if ((userMicrophones as any[]).length === 0) {
      console.log('❌ No microphones found for this user!');
    } else {
      console.log('✅ User has microphones - the API should return this data');

      // Show the structure that TypeORM would return
      console.log('\nExpected API response structure:');
      (userMicrophones as any[]).forEach((userMic) => {
        const expectedResponse = {
          id: userMic.id,
          userId: userMic.userId,
          microphoneId: userMic.microphoneId,
          isEquipped: userMic.isEquipped,
          acquiredAt: userMic.acquiredAt,
          microphone: {
            id: userMic.microphone_id,
            name: userMic.microphone_name,
            description: userMic.microphone_description,
            type: userMic.microphone_type,
            rarity: userMic.microphone_rarity,
            imageUrl: userMic.microphone_imageUrl,
            price: userMic.microphone_price,
            coinPrice: userMic.microphone_coinPrice,
            isAvailable: userMic.microphone_isAvailable,
          },
        };
        console.log(JSON.stringify(expectedResponse, null, 2));
        return; // Just show one example
      });
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await connection.end();
  }
};

main().catch(console.error);
