import * as mysql from 'mysql2/promise';

async function fixAvatarPricing() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      port: 3306,
      user: 'admin',
      password: 'password',
      database: 'karaoke-hub',
    });

    console.log('🔧 Fixing Avatar Pricing Logic\n');

    // Step 1: Fix the 2 common avatars that are incorrectly marked as paid
    console.log('Step 1: Making all common avatars free...');
    const [result1] = await connection.execute(`
      UPDATE avatars 
      SET isFree = 1, coinPrice = 0 
      WHERE rarity = 'common' AND (isFree = 0 OR coinPrice > 0)
    `) as any[];

    console.log(`✅ Fixed ${result1.affectedRows} common avatars to be free`);

    // Step 2: Promote some avatars to uncommon+ rarity and set appropriate pricing
    // Based on the migration file, I'll make onyx and tyler uncommon with coin prices
    console.log('\nStep 2: Setting premium avatars as uncommon rarity...');
    
    const premiumAvatars = [
      { id: 'onyx', rarity: 'uncommon', coinPrice: 100 },
      { id: 'tyler', rarity: 'uncommon', coinPrice: 100 }
    ];

    for (const avatar of premiumAvatars) {
      const [result2] = await connection.execute(`
        UPDATE avatars 
        SET rarity = ?, isFree = 0, coinPrice = ? 
        WHERE id = ?
      `, [avatar.rarity, avatar.coinPrice, avatar.id]) as any[];

      console.log(`✅ Set ${avatar.id} as ${avatar.rarity} rarity with ${avatar.coinPrice} coins`);
    }

    // Step 3: Verify the changes
    console.log('\n📊 Verification - Updated Avatar Pricing:');
    
    const [commonAvatars] = await connection.execute(`
      SELECT id, name, rarity, isFree, coinPrice 
      FROM avatars 
      WHERE rarity = 'common'
      ORDER BY name
    `) as any[];

    const [uncommonAvatars] = await connection.execute(`
      SELECT id, name, rarity, isFree, coinPrice 
      FROM avatars 
      WHERE rarity != 'common'
      ORDER BY rarity, name
    `) as any[];

    console.log(`\n🆓 Common Avatars (${commonAvatars.length} total - all should be free):`);
    commonAvatars.forEach((avatar: any) => {
      const status = avatar.isFree ? '✅ FREE' : '❌ PAID';
      console.log(`- ${avatar.name} (${avatar.id}): ${status}`);
    });

    console.log(`\n💰 Uncommon+ Avatars (${uncommonAvatars.length} total - all should be paid):`);
    uncommonAvatars.forEach((avatar: any) => {
      const status = !avatar.isFree ? '✅ PAID' : '❌ FREE';
      console.log(`- ${avatar.name} (${avatar.id}): ${avatar.rarity}, ${status}, ${avatar.coinPrice} coins`);
    });

    // Final summary
    const freeCommon = commonAvatars.filter((a: any) => a.isFree).length;
    const paidUncommon = uncommonAvatars.filter((a: any) => !a.isFree).length;

    console.log('\n📋 Final Summary:');
    console.log(`✅ Common avatars: ${freeCommon}/${commonAvatars.length} are correctly free`);
    console.log(`✅ Uncommon+ avatars: ${paidUncommon}/${uncommonAvatars.length} are correctly paid`);
    
    if (freeCommon === commonAvatars.length && paidUncommon === uncommonAvatars.length) {
      console.log('\n🎉 Avatar pricing is now correctly configured!');
      console.log('✅ Common avatars are free and available in avatar selection modal');
      console.log('✅ Uncommon+ avatars cost coins and appear in the store');
    } else {
      console.log('\n❌ There are still pricing issues that need manual review');
    }

    await connection.end();
  } catch (error) {
    console.error('Error fixing avatar pricing:', error);
  }
}

fixAvatarPricing();