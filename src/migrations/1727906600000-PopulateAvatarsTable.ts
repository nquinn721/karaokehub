import { DataSource } from 'typeorm';

export class PopulateAvatarsTable1727906600000 {
  name = 'PopulateAvatarsTable1727906600000';

  public async up(dataSource: DataSource): Promise<void> {
    console.log('👤 Populating avatars table for production...');
    
    // Check if avatars already exist
    const existingCount = await dataSource.query(`SELECT COUNT(*) as count FROM avatars`);
    
    if (existingCount[0].count > 0) {
      console.log(`ℹ️  Avatars table already contains ${existingCount[0].count} records, skipping population`);
      return;
    }
    
    // Insert default avatars
    const avatarsData = [
      {
        id: 'b7424e58-97e3-11f0-a9d5-f8ce72240675',
        name: 'Alex',
        imageUrl: '/images/avatar/avatars/alex.png',
        rarity: 'common'
      },
      {
        id: 'b742520e-97e3-11f0-a9d5-f8ce72240675',
        name: 'Blake',
        imageUrl: '/images/avatar/avatars/blake.png',
        rarity: 'common'
      },
      {
        id: 'b742523a-97e3-11f0-a9d5-f8ce72240675',
        name: 'Cameron',
        imageUrl: '/images/avatar/avatars/cameron.png',
        rarity: 'common'
      },
      {
        id: 'b7425255-97e3-11f0-a9d5-f8ce72240675',
        name: 'Joe',
        imageUrl: '/images/avatar/avatars/joe.png',
        rarity: 'common'
      },
      {
        id: 'b742526c-97e3-11f0-a9d5-f8ce72240675',
        name: 'Juan',
        imageUrl: '/images/avatar/avatars/juan.png',
        rarity: 'common'
      },
      {
        id: 'b7425283-97e3-11f0-a9d5-f8ce72240675',
        name: 'Kai',
        imageUrl: '/images/avatar/avatars/kai.png',
        rarity: 'common'
      },
      {
        id: 'b742529b-97e3-11f0-a9d5-f8ce72240675',
        name: 'Onyx',
        imageUrl: '/images/avatar/avatars/onyx.png',
        rarity: 'common'
      },
      {
        id: 'b74252b0-97e3-11f0-a9d5-f8ce72240675',
        name: 'Tyler',
        imageUrl: '/images/avatar/avatars/tyler.png',
        rarity: 'common'
      }
    ];
    
    // Insert avatars one by one with proper timestamps
    for (const avatar of avatarsData) {
      await dataSource.query(`
        INSERT INTO avatars (id, name, imageUrl, rarity, type, description, price, coinPrice, isAvailable, isFree, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, 'basic', 'Default avatar', 0.00, 0, 1, 1, NOW(), NOW())
      `, [avatar.id, avatar.name, avatar.imageUrl, avatar.rarity]);
    }
    
    const finalCount = await dataSource.query(`SELECT COUNT(*) as count FROM avatars`);
    console.log(`✅ Successfully populated avatars table with ${finalCount[0].count} default avatars`);
    
    // List the inserted avatars
    const insertedAvatars = await dataSource.query(`
      SELECT name, rarity FROM avatars ORDER BY name
    `);
    
    console.log('📋 Inserted avatars:');
    insertedAvatars.forEach(avatar => {
      console.log(`  - ${avatar.name} (${avatar.rarity})`);
    });
    
    console.log('🎉 Avatar population completed successfully!');
  }

  public async down(dataSource: DataSource): Promise<void> {
    console.log('🗑️  Removing populated avatars...');
    
    // Remove the avatars we added (by their specific IDs)
    const avatarIds = [
      'b7424e58-97e3-11f0-a9d5-f8ce72240675',
      'b742520e-97e3-11f0-a9d5-f8ce72240675',
      'b742523a-97e3-11f0-a9d5-f8ce72240675',
      'b7425255-97e3-11f0-a9d5-f8ce72240675',
      'b742526c-97e3-11f0-a9d5-f8ce72240675',
      'b7425283-97e3-11f0-a9d5-f8ce72240675',
      'b742529b-97e3-11f0-a9d5-f8ce72240675',
      'b74252b0-97e3-11f0-a9d5-f8ce72240675'
    ];
    
    for (const id of avatarIds) {
      await dataSource.query(`DELETE FROM avatars WHERE id = ?`, [id]);
    }
    
    console.log('✅ Avatars removed successfully');
  }
}