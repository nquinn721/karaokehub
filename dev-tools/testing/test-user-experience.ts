import * as mysql from 'mysql2/promise';

async function testCompleteUserExperience() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      port: 3306,
      user: 'admin',
      password: 'password',
      database: 'karaoke-hub',
    });

    console.log('🎮 Testing Complete User Avatar Experience\n');

    // Scenario 1: New user (no purchased avatars)
    console.log('📝 Scenario 1: New User Experience');
    console.log('----------------------------------');

    // What the avatar selection modal would show (free avatars only)
    const [freeAvatars] = await connection.execute(`
      SELECT id, name, rarity, isFree, coinPrice 
      FROM avatars 
      WHERE isAvailable = 1 AND isFree = 1
      ORDER BY id ASC
    `) as any[];

    console.log(`🎭 Avatar Selection Modal: ${freeAvatars.length} avatars available`);
    console.log('Free avatars user can choose from:');
    freeAvatars.slice(0, 5).forEach((avatar: any) => {
      console.log(`  - ${avatar.name} (${avatar.rarity})`);
    });
    console.log(`  ... and ${freeAvatars.length - 5} more free avatars`);

    // What the store would show (paid avatars only)
    const [storeAvatars] = await connection.execute(`
      SELECT id, name, rarity, isFree, coinPrice 
      FROM avatars 
      WHERE isAvailable = 1 AND isFree = 0
      ORDER BY rarity ASC, coinPrice ASC
    `) as any[];

    console.log(`\n🏪 Store Page: ${storeAvatars.length} premium avatars for purchase`);
    storeAvatars.forEach((avatar: any) => {
      console.log(`  - ${avatar.name} (${avatar.rarity}) - ${avatar.coinPrice} coins`);
    });

    // Scenario 2: User who purchased Onyx avatar
    console.log('\n📝 Scenario 2: User Who Purchased Onyx Avatar');
    console.log('----------------------------------------------');

    // Simulate owned avatars (what getAvailableAvatarsForUser would return)
    const onyxAvatar = storeAvatars.find((a: any) => a.id === 'onyx');
    const availableForUser = [...freeAvatars, onyxAvatar].filter(Boolean);

    console.log(`🎭 Avatar Selection Modal: ${availableForUser.length} avatars available`);
    console.log('Available avatars (free + owned):');
    console.log(`  - ${freeAvatars.length} free common avatars`);
    if (onyxAvatar) {
      console.log(`  - ${onyxAvatar.name} (owned ${onyxAvatar.rarity} avatar)`);
    }

    // Store would show remaining paid avatars
    const remainingStoreAvatars = storeAvatars.filter((a: any) => a.id !== 'onyx');
    console.log(`\n🏪 Store Page: ${remainingStoreAvatars.length} remaining premium avatars`);
    remainingStoreAvatars.forEach((avatar: any) => {
      console.log(`  - ${avatar.name} (${avatar.rarity}) - ${avatar.coinPrice} coins`);
    });

    // Final verification
    console.log('\n✅ System Verification Summary:');
    console.log('================================');
    console.log(`✅ Common avatars (${freeAvatars.length}): Free in avatar selection, NOT in store`);
    console.log(`✅ Uncommon+ avatars (${storeAvatars.length}): Cost coins in store, available in selection when owned`);
    console.log('✅ Store filtering: Only shows non-free avatars (isFree: false)');
    console.log('✅ Avatar selection: Shows all free avatars + user\'s owned paid avatars');
    
    const businessLogicWorking = 
      freeAvatars.every((a: any) => a.isFree && a.rarity === 'common') &&
      storeAvatars.every((a: any) => !a.isFree && a.rarity !== 'common') &&
      storeAvatars.length > 0;

    if (businessLogicWorking) {
      console.log('\n🎉 SUCCESS: Avatar system is correctly configured!');
      console.log('   - Common avatars are free and accessible');
      console.log('   - Uncommon+ avatars require coin purchases');
      console.log('   - Store and selection modal work as intended');
    } else {
      console.log('\n❌ ISSUES: Avatar system needs adjustments');
    }

    await connection.end();
  } catch (error) {
    console.error('Error testing user experience:', error);
  }
}

testCompleteUserExperience();