import * as mysql from 'mysql2/promise';

async function checkAvatarData() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      port: 3306,
      user: 'admin',
      password: 'password',
      database: 'karaoke-hub',
    });

    console.log('🎭 Current Avatar Data Analysis\n');

    // Get all avatars
    const [allAvatars] = await connection.execute(`
      SELECT id, name, rarity, isFree, coinPrice, isAvailable 
      FROM avatars 
      ORDER BY rarity ASC, name ASC
    `) as any[];

    console.log('📊 All Avatars:');
    console.table(allAvatars);

    // Count by rarity
    const [rarityStats] = await connection.execute(`
      SELECT 
        rarity,
        COUNT(*) as total_count,
        SUM(CASE WHEN isAvailable = 1 THEN 1 ELSE 0 END) as available_count,
        SUM(CASE WHEN isFree = 1 THEN 1 ELSE 0 END) as free_count
      FROM avatars 
      GROUP BY rarity
      ORDER BY rarity
    `) as any[];

    console.log('\n📈 Avatar Count by Rarity:');
    console.table(rarityStats);

    // Show common avatars specifically
    const [commonAvatars] = await connection.execute(`
      SELECT id, name, isFree, coinPrice 
      FROM avatars 
      WHERE rarity = 'common'
      ORDER BY name
    `) as any[];

    console.log('\n🆓 Common Avatars (should be free):');
    commonAvatars.forEach((avatar: any) => {
      const status = avatar.isFree ? '✅ FREE' : '❌ PAID';
      console.log(`- ${avatar.name} (${avatar.id}): ${status}, coinPrice=${avatar.coinPrice}`);
    });

    // Show uncommon+ avatars
    const [paidAvatars] = await connection.execute(`
      SELECT id, name, rarity, isFree, coinPrice 
      FROM avatars 
      WHERE rarity != 'common'
      ORDER BY rarity, name
    `) as any[];

    console.log('\n💰 Uncommon+ Avatars (should be paid):');
    paidAvatars.forEach((avatar: any) => {
      const status = !avatar.isFree ? '✅ PAID' : '❌ FREE';
      console.log(`- ${avatar.name} (${avatar.id}): rarity=${avatar.rarity}, ${status}, coinPrice=${avatar.coinPrice}`);
    });

    // Summary analysis
    const totalCommon = commonAvatars.length;
    const freeCommon = commonAvatars.filter((a: any) => a.isFree).length;
    const totalUncommon = paidAvatars.length;
    const paidUncommon = paidAvatars.filter((a: any) => !a.isFree).length;

    console.log('\n📋 Summary Analysis:');
    console.log(`Common avatars: ${freeCommon}/${totalCommon} are correctly free`);
    console.log(`Uncommon+ avatars: ${paidUncommon}/${totalUncommon} are correctly paid`);
    
    if (freeCommon === totalCommon && paidUncommon === totalUncommon) {
      console.log('✅ Avatar pricing is correctly configured!');
    } else {
      console.log('❌ Avatar pricing needs to be fixed');
    }

    await connection.end();
  } catch (error) {
    console.error('Error checking avatar data:', error);
  }
}

checkAvatarData();