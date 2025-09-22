import * as mysql from 'mysql2/promise';

async function fixAvatarImageUrls() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      port: 3306,
      user: 'admin',
      password: 'password',
      database: 'karaoke-hub',
    });

    console.log('🔧 Fixing Avatar Image URLs\n');

    // Fix numbered avatars (avatar_1, avatar_2, etc.) to use correct path
    console.log('Step 1: Fixing numbered avatar paths...');
    const [result1] = await connection.execute(`
      UPDATE avatars 
      SET imageUrl = CONCAT('/images/avatar/', id, '.png')
      WHERE id LIKE 'avatar_%' AND imageUrl NOT LIKE '/images/%'
    `) as any[];

    console.log(`✅ Fixed ${result1.affectedRows} numbered avatar paths`);

    // Ensure named avatars (alex, blake, etc.) have correct paths
    console.log('\nStep 2: Ensuring named avatar paths are correct...');
    const namedAvatars = ['alex', 'blake', 'cameron', 'joe', 'juan', 'kai', 'onyx', 'tyler'];
    
    for (const avatarId of namedAvatars) {
      const [result2] = await connection.execute(`
        UPDATE avatars 
        SET imageUrl = ?
        WHERE id = ?
      `, [`/images/avatar/avatars/${avatarId}.png`, avatarId]) as any[];
      
      if (result2.affectedRows > 0) {
        console.log(`✅ Updated ${avatarId} image path`);
      }
    }

    // Verify the changes
    console.log('\n📊 Verification - Updated Image URLs:');
    const [avatars] = await connection.execute(`
      SELECT id, name, imageUrl 
      FROM avatars 
      ORDER BY name
      LIMIT 10
    `) as any[];

    avatars.forEach((avatar: any) => {
      console.log(`- ${avatar.name} (${avatar.id}): ${avatar.imageUrl}`);
    });

    // Final check - count correct vs incorrect paths
    const [allAvatars] = await connection.execute(`
      SELECT id, imageUrl FROM avatars
    `) as any[];

    const correctPaths = allAvatars.filter((a: any) => a.imageUrl.startsWith('/images/')).length;
    const incorrectPaths = allAvatars.length - correctPaths;

    console.log(`\n📋 Final Summary:`);
    console.log(`✅ Correct image paths: ${correctPaths}/${allAvatars.length}`);
    
    if (incorrectPaths === 0) {
      console.log('🎉 All avatar image URLs are now correctly pointing to local images!');
      console.log('✅ Store Generator will now show actual avatar images instead of DiceBear placeholders');
    } else {
      console.log(`❌ Still have ${incorrectPaths} avatars with incorrect paths`);
    }

    await connection.end();
  } catch (error) {
    console.error('Error fixing avatar image URLs:', error);
  }
}

fixAvatarImageUrls();