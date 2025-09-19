import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedBasicMicrophones1737450400000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // First, create the 4 basic microphones
    await queryRunner.query(`
      INSERT IGNORE INTO microphones (id, name, description, rarity, cost, imagePath)
      VALUES 
        ('mic_basic_1', 'Basic Mic Silver', 'A reliable silver microphone for beginners', 'common', 0, '/microphones/mic_basic_1.png'),
        ('mic_basic_2', 'Basic Mic Black', 'A sleek black microphone with good sound quality', 'common', 0, '/microphones/mic_basic_2.png'),
        ('mic_basic_3', 'Basic Mic Blue', 'A vibrant blue microphone for those who like color', 'common', 0, '/microphones/mic_basic_3.png'),
        ('mic_basic_4', 'Basic Mic Red', 'A bold red microphone that stands out', 'common', 0, '/microphones/mic_basic_4.png')
    `);

    // Get all existing users
    const users = await queryRunner.query('SELECT id FROM users');

    // For each user, assign all 4 basic microphones
    for (const user of users) {
      await queryRunner.query(`
        INSERT IGNORE INTO user_microphones (userId, microphoneId, isEquipped, acquired_at)
        VALUES 
          ('${user.id}', 'mic_basic_1', true, NOW()),
          ('${user.id}', 'mic_basic_2', false, NOW()),
          ('${user.id}', 'mic_basic_3', false, NOW()),
          ('${user.id}', 'mic_basic_4', false, NOW())
      `);
    }

    console.log(`✅ Seeded 4 basic microphones and assigned them to ${users.length} users`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove basic microphones from all users
    await queryRunner.query(`
      DELETE FROM user_microphones 
      WHERE microphoneId IN ('mic_basic_1', 'mic_basic_2', 'mic_basic_3', 'mic_basic_4')
    `);

    // Remove basic microphones
    await queryRunner.query(`
      DELETE FROM microphones 
      WHERE id IN ('mic_basic_1', 'mic_basic_2', 'mic_basic_3', 'mic_basic_4')
    `);
  }
}
