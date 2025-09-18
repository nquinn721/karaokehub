import { DataSource } from 'typeorm';
import { User } from './src/entities/user.entity';
import { UserAvatar } from './src/avatar/entities/user-avatar.entity';
import { Microphone } from './src/avatar/entities/microphone.entity';
import { Outfit } from './src/avatar/entities/outfit.entity';
import { Shoes } from './src/avatar/entities/shoes.entity';

const AppDataSource = new DataSource({
  type: 'mysql',
  host: 'localhost',
  port: 3306,
  username: 'admin',
  password: 'password',
  database: 'karaoke-hub',
  entities: [User, UserAvatar, Microphone, Outfit, Shoes],
  synchronize: false,
  logging: true,
});

async function createUserAvatarRecords() {
  try {
    await AppDataSource.initialize();
    console.log('Database connected successfully');

    const userRepository = AppDataSource.getRepository(User);
    const userAvatarRepository = AppDataSource.getRepository(UserAvatar);
    const microphoneRepository = AppDataSource.getRepository(Microphone);
    const outfitRepository = AppDataSource.getRepository(Outfit);
    const shoesRepository = AppDataSource.getRepository(Shoes);

    // Get all users who have an avatar field set but no UserAvatar record
    const usersWithAvatars = await userRepository
      .createQueryBuilder('user')
      .leftJoin('user.userAvatar', 'userAvatar')
      .where('user.avatar IS NOT NULL')
      .andWhere('user.avatar != ""')
      .andWhere('userAvatar.id IS NULL')
      .getMany();

    console.log(`Found ${usersWithAvatars.length} users with avatar field but no UserAvatar record`);

    // Get default items (first available of each type)
    const defaultMicrophone = await microphoneRepository.findOne({ order: { createdAt: 'ASC' } });
    const defaultOutfit = await outfitRepository.findOne({ order: { createdAt: 'ASC' } });
    const defaultShoes = await shoesRepository.findOne({ order: { createdAt: 'ASC' } });

    if (!defaultMicrophone || !defaultOutfit || !defaultShoes) {
      console.error('Could not find default avatar items. Make sure microphones, outfits, and shoes tables have data.');
      return;
    }

    for (const user of usersWithAvatars) {
      try {
        // Extract avatar number from avatar field (e.g., "avatar_1" -> 1)
        const avatarMatch = user.avatar.match(/avatar_(\d+)/);
        const avatarNumber = avatarMatch ? parseInt(avatarMatch[1]) : 1;

        // Create UserAvatar record
        const userAvatar = new UserAvatar();
        userAvatar.userId = user.id;
        userAvatar.baseAvatarId = user.avatar; // Use the existing avatar field value
        userAvatar.microphoneId = defaultMicrophone?.id || null;
        userAvatar.outfitId = defaultOutfit?.id || null;
        userAvatar.shoesId = defaultShoes?.id || null;
        userAvatar.isActive = true;

        await userAvatarRepository.save(userAvatar);
        console.log(`Created UserAvatar record for user ${user.id} (${user.email}) with avatar ${user.avatar}`);

      } catch (error) {
        console.error(`Error creating UserAvatar for user ${user.id}:`, error);
      }
    }

    console.log('UserAvatar records creation completed');

    // Verify the results
    const totalUserAvatars = await userAvatarRepository.count();
    console.log(`Total UserAvatar records now: ${totalUserAvatars}`);

  } catch (error) {
    console.error('Error in createUserAvatarRecords:', error);
  } finally {
    await AppDataSource.destroy();
  }
}

createUserAvatarRecords();
