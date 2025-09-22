import { DataSource } from 'typeorm';
import { Microphone } from './src/avatar/entities/microphone.entity';
import { UserMicrophone } from './src/avatar/entities/user-microphone.entity';
import { User } from './src/entities/user.entity';

const main = async () => {
  const dataSource = new DataSource({
    type: 'mysql',
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT) || 3306,
    username: process.env.DATABASE_USERNAME || 'root',
    password: process.env.DATABASE_PASSWORD || 'password',
    database: process.env.DATABASE_NAME || 'karaokehub',
    entities: [UserMicrophone, Microphone, User],
    synchronize: false,
  });

  await dataSource.initialize();
  console.log('✓ Database connected');

  try {
    const microphoneRepo = dataSource.getRepository(Microphone);
    const userMicrophoneRepo = dataSource.getRepository(UserMicrophone);

    console.log('\nChecking microphones table:');
    const allMicrophones = await microphoneRepo.find();
    console.log(`Found ${allMicrophones.length} microphones:`);
    allMicrophones.forEach((mic) => {
      console.log(`- ID: ${mic.id}, Name: ${mic.name}, Type: ${mic.type}, Image: ${mic.imageUrl}`);
    });

    console.log('\nChecking user_microphones table:');
    const allUserMicrophones = await userMicrophoneRepo.find({
      relations: ['microphone'],
    });
    console.log(`Found ${allUserMicrophones.length} user microphone records:`);
    allUserMicrophones.forEach((userMic) => {
      console.log(
        `- User: ${userMic.userId}, Microphone: ${userMic.microphoneId} (${userMic.microphone?.name}), Acquired: ${userMic.acquiredAt}`,
      );
    });

    if (allUserMicrophones.length === 0) {
      console.log('\n❌ NO USER MICROPHONES FOUND! This is why the modal is empty.');
      console.log(
        'Users need to have microphones in the user_microphones table to see them in the modal.',
      );
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await dataSource.destroy();
  }
};

main().catch(console.error);
