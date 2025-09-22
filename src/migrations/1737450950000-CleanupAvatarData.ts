import { MigrationInterface, QueryRunner } from 'typeorm';

export class CleanupAvatarData1737450950000 implements MigrationInterface {
  name = 'CleanupAvatarData1737450950000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('🧹 Cleaning up avatar data...');

    // Step 1: Clear all existing avatars (this will cascade delete user_avatars if FK exists)
    await queryRunner.query(`DELETE FROM \`avatars\``);

    // Step 2: Insert the 8 real avatars with proper UUIDs
    const realAvatars = [
      {
        id: 'a1234567-89ab-cdef-0123-456789abcdef',
        name: 'Alex',
        imageUrl: '/images/avatar/avatars/alex.png',
        rarity: 'common',
        isFree: true,
        coinPrice: 0,
      },
      {
        id: 'b2345678-9abc-def0-1234-56789abcdef0',
        name: 'Blake',
        imageUrl: '/images/avatar/avatars/blake.png',
        rarity: 'common',
        isFree: true,
        coinPrice: 0,
      },
      {
        id: 'c3456789-abcd-ef01-2345-6789abcdef01',
        name: 'Cameron',
        imageUrl: '/images/avatar/avatars/cameron.png',
        rarity: 'common',
        isFree: true,
        coinPrice: 0,
      },
      {
        id: 'd4567890-bcde-f012-3456-789abcdef012',
        name: 'Joe',
        imageUrl: '/images/avatar/avatars/joe.png',
        rarity: 'common',
        isFree: true,
        coinPrice: 0,
      },
      {
        id: 'e5678901-cdef-0123-4567-89abcdef0123',
        name: 'Juan',
        imageUrl: '/images/avatar/avatars/juan.png',
        rarity: 'common',
        isFree: true,
        coinPrice: 0,
      },
      {
        id: 'f6789012-def0-1234-5678-9abcdef01234',
        name: 'Kai',
        imageUrl: '/images/avatar/avatars/kai.png',
        rarity: 'common',
        isFree: true,
        coinPrice: 0,
      },
      {
        id: 'a7890123-ef01-2345-6789-abcdef012345',
        name: 'Onyx',
        imageUrl: '/images/avatar/avatars/onyx.png',
        rarity: 'uncommon',
        isFree: false,
        coinPrice: 100,
      },
      {
        id: 'b8901234-f012-3456-789a-bcdef0123456',
        name: 'Tyler',
        imageUrl: '/images/avatar/avatars/tyler.png',
        rarity: 'uncommon',
        isFree: false,
        coinPrice: 100,
      },
    ];

    for (const avatar of realAvatars) {
      await queryRunner.query(`
        INSERT INTO \`avatars\` (
          \`id\`, \`name\`, \`description\`, \`type\`, \`rarity\`, 
          \`imageUrl\`, \`price\`, \`coinPrice\`, \`isAvailable\`, 
          \`isFree\`, \`unlockLevel\`, \`createdAt\`, \`updatedAt\`
        ) VALUES (
          '${avatar.id}', 
          '${avatar.name}', 
          'A ${avatar.rarity} avatar', 
          'basic', 
          '${avatar.rarity}',
          '${avatar.imageUrl}', 
          0.00, 
          ${avatar.coinPrice}, 
          1, 
          ${avatar.isFree ? 1 : 0}, 
          1, 
          NOW(), 
          NOW()
        )
      `);
      console.log(`✅ Added ${avatar.name} (${avatar.rarity})`);
    }

    console.log('🎉 Avatar cleanup completed successfully!');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Just clear the avatars table
    await queryRunner.query(`DELETE FROM \`avatars\``);
    console.log('🗑️ Cleared avatars table');
  }
}
