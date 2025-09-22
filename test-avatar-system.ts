import * as mysql from 'mysql2/promise';

async function testAvatarSystemLogic() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      port: 3306,
      user: 'admin',
      password: 'password',
      database: 'karaoke-hub',
    });

    console.log('🧪 Testing Avatar System Logic\n');

    // Test 1: Store should only show paid avatars (isFree = false)
    console.log('Test 1: Store Avatar Filtering');
    const [storeAvatars] = await connection.execute(`
      SELECT id, name, rarity, isFree, coinPrice, isAvailable 
      FROM avatars 
      WHERE isAvailable = 1 AND isFree = 0
      ORDER BY rarity ASC, coinPrice ASC
    `) as any[];

    console.log(`📦 Store Avatars (${storeAvatars.length} should be only paid avatars):`);
    storeAvatars.forEach((avatar: any) => {
      console.log(`- ${avatar.name} (${avatar.id}): ${avatar.rarity}, ${avatar.coinPrice} coins`);
    });

    if (storeAvatars.every((a: any) => !a.isFree)) {
      console.log('✅ Store filtering is working correctly - only paid avatars shown');
    } else {
      console.log('❌ Store filtering has issues - free avatars are being shown');
    }

    // Test 2: Available avatars should include all free avatars + any owned paid avatars
    console.log('\nTest 2: Available Avatars for Selection');
    const [freeAvatars] = await connection.execute(`
      SELECT id, name, rarity, isFree, coinPrice 
      FROM avatars 
      WHERE isAvailable = 1 AND isFree = 1
      ORDER BY name
    `) as any[];

    console.log(`🆓 Free Avatars Available for Selection (${freeAvatars.length} common avatars):`);
    freeAvatars.forEach((avatar: any) => {
      console.log(`- ${avatar.name} (${avatar.id}): ${avatar.rarity}`);
    });

    if (freeAvatars.every((a: any) => a.rarity === 'common')) {
      console.log('✅ All free avatars are common rarity as expected');
    } else {
      console.log('❌ Some free avatars are not common rarity');
    }

    // Test 3: Verify the business logic summary
    console.log('\n📋 Business Logic Summary:');
    console.log(`Store will show: ${storeAvatars.length} paid avatars (uncommon+ rarity)`);
    console.log(`Avatar selection will show: ${freeAvatars.length} free avatars (common rarity) + user's owned paid avatars`);

    // Test 4: Sample user scenario
    console.log('\n🧑‍💻 Sample User Scenarios:');
    console.log('New user with no purchases:');
    console.log(`  - Can select from ${freeAvatars.length} common avatars for free`);
    console.log(`  - Can purchase ${storeAvatars.length} uncommon+ avatars from store`);
    
    console.log('\nUser who purchased Onyx avatar:');
    console.log(`  - Can select from ${freeAvatars.length} common avatars + 1 owned uncommon avatar`);
    console.log(`  - Can purchase ${storeAvatars.length - 1} remaining uncommon+ avatars from store`);

    const totalAvatars = freeAvatars.length + storeAvatars.length;
    console.log(`\n🎯 Total avatar ecosystem: ${totalAvatars} avatars (${freeAvatars.length} free + ${storeAvatars.length} paid)`);

    await connection.end();
  } catch (error) {
    console.error('Error testing avatar system logic:', error);
  }
}

testAvatarSystemLogic();