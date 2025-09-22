import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { Repository } from 'typeorm';
import { User } from './src/entities/user.entity';
import { Avatar } from './src/avatar/entities/avatar.entity';
import { Microphone } from './src/avatar/entities/microphone.entity';
import { UserAvatar } from './src/avatar/entities/user-avatar.entity';
import { UserMicrophone } from './src/avatar/entities/user-microphone.entity';
import { getRepositoryToken } from '@nestjs/typeorm';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  
  const userRepository = app.get<Repository<User>>(getRepositoryToken(User));
  const avatarRepository = app.get<Repository<Avatar>>(getRepositoryToken(Avatar));
  const microphoneRepository = app.get<Repository<Microphone>>(getRepositoryToken(Microphone));
  const userAvatarRepository = app.get<Repository<UserAvatar>>(getRepositoryToken(UserAvatar));
  const userMicrophoneRepository = app.get<Repository<UserMicrophone>>(getRepositoryToken(UserMicrophone));

  console.log('🔍 Checking users for missing default avatars/microphones...');

  // Get all users
  const allUsers = await userRepository.find();
  console.log(`📊 Found ${allUsers.length} total users`);

  // Get default free avatar and microphone
  const defaultAvatar = await avatarRepository.findOne({
    where: { isAvailable: true, isFree: true },
    order: { id: 'ASC' },
  });

  const defaultMicrophone = await microphoneRepository.findOne({
    where: { isAvailable: true, isFree: true },
    order: { id: 'ASC' },
  });

  if (!defaultAvatar) {
    console.error('❌ No default free avatar found!');
    return;
  }

  if (!defaultMicrophone) {
    console.error('❌ No default free microphone found!');
    return;
  }

  console.log(`🎭 Default avatar: ${defaultAvatar.id} (${defaultAvatar.name})`);
  console.log(`🎤 Default microphone: ${defaultMicrophone.id} (${defaultMicrophone.name})`);

  let usersFixed = 0;
  let avatarsCreated = 0;
  let microphonesCreated = 0;
  let usersEquipped = 0;

  for (const user of allUsers) {
    let userNeedsUpdate = false;

    // Check if user has any avatar records
    const userHasAvatars = await userAvatarRepository.count({
      where: { userId: user.id }
    });

    // Check if user has any microphone records
    const userHasMicrophones = await userMicrophoneRepository.count({
      where: { userId: user.id }
    });

    // Ensure user has at least the default avatar
    if (userHasAvatars === 0) {
      console.log(`👤 User ${user.stageName || user.name} (${user.id}) has no avatars, adding default...`);
      
      const userAvatar = userAvatarRepository.create({
        userId: user.id,
        baseAvatarId: defaultAvatar.id,
        isActive: true,
      });
      
      await userAvatarRepository.save(userAvatar);
      avatarsCreated++;
      userNeedsUpdate = true;
    }

    // Ensure user has at least the default microphone
    if (userHasMicrophones === 0) {
      console.log(`👤 User ${user.stageName || user.name} (${user.id}) has no microphones, adding default...`);
      
      const userMicrophone = userMicrophoneRepository.create({
        userId: user.id,
        microphoneId: defaultMicrophone.id,
      });
      
      await userMicrophoneRepository.save(userMicrophone);
      microphonesCreated++;
      userNeedsUpdate = true;
    }

    // Check if user has equipped avatar/microphone set
    if (!user.equippedAvatarId || !user.equippedMicrophoneId) {
      console.log(`👤 User ${user.stageName || user.name} (${user.id}) missing equipped items, setting defaults...`);
      
      await userRepository.update(user.id, {
        equippedAvatarId: user.equippedAvatarId || defaultAvatar.id,
        equippedMicrophoneId: user.equippedMicrophoneId || defaultMicrophone.id,
      });
      
      usersEquipped++;
      userNeedsUpdate = true;
    }

    if (userNeedsUpdate) {
      usersFixed++;
    }
  }

  console.log('\n✅ Migration completed!');
  console.log(`📊 Summary:`);
  console.log(`   - Users processed: ${allUsers.length}`);
  console.log(`   - Users fixed: ${usersFixed}`);
  console.log(`   - Avatar records created: ${avatarsCreated}`);
  console.log(`   - Microphone records created: ${microphonesCreated}`);
  console.log(`   - Users equipped with defaults: ${usersEquipped}`);

  await app.close();
}

bootstrap().catch((error) => {
  console.error('❌ Error during migration:', error);
  process.exit(1);
});