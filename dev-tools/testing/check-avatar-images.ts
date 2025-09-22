import * as mysql from 'mysql2/promise';

async function checkAvatarImageUrls() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      port: 3306,
      user: 'admin',
      password: 'password',
      database: 'karaoke-hub',
    });

    console.log('🖼️ Current Avatar Image URLs\n');

    const [avatars] = await connection.execute(`
      SELECT id, name, imageUrl 
      FROM avatars 
      ORDER BY name
    `) as any[];

    console.log(`Found ${avatars.length} avatars:`);
    avatars.forEach((avatar: any) => {
      console.log(`- ${avatar.name} (${avatar.id}): ${avatar.imageUrl}`);
    });

    // Check which ones are using DiceBear vs local images
    const diceBearCount = avatars.filter((a: any) => a.imageUrl.includes('dicebear')).length;
    const localImageCount = avatars.filter((a: any) => a.imageUrl.startsWith('/images')).length;
    
    console.log(`\n📊 Image URL Analysis:`);
    console.log(`- DiceBear URLs: ${diceBearCount}`);
    console.log(`- Local image URLs: ${localImageCount}`);
    console.log(`- Other URLs: ${avatars.length - diceBearCount - localImageCount}`);

    await connection.end();
  } catch (error) {
    console.error('Error checking avatar image URLs:', error);
  }
}

checkAvatarImageUrls();