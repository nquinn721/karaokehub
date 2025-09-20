import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
import { Avatar } from '../entities/avatar.entity';
import { Microphone } from '../entities/microphone.entity';
import { Outfit } from '../entities/outfit.entity';
import { Shoes } from '../entities/shoes.entity';
import { UserAvatar } from '../entities/user-avatar.entity';
import { UserMicrophone } from '../entities/user-microphone.entity';

@Injectable()
export class AvatarService {
  constructor(
    @InjectRepository(Avatar)
    private avatarRepository: Repository<Avatar>,
    @InjectRepository(UserAvatar)
    private userAvatarRepository: Repository<UserAvatar>,
    @InjectRepository(Microphone)
    private microphoneRepository: Repository<Microphone>,
    @InjectRepository(Outfit)
    private outfitRepository: Repository<Outfit>,
    @InjectRepository(Shoes)
    private shoesRepository: Repository<Shoes>,
    @InjectRepository(UserMicrophone)
    private userMicrophoneRepository: Repository<UserMicrophone>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  // Get user's equipped avatar with microphone
  async getEquippedAvatar(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['equippedAvatar', 'equippedMicrophone'],
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (!user.equippedAvatar) {
      // If no avatar is equipped, equip the first free avatar (avatar_1)
      const defaultAvatar = await this.avatarRepository.findOne({
        where: { id: 'avatar_1' },
      });

      if (defaultAvatar) {
        await this.userRepository.update(userId, { equippedAvatarId: 'avatar_1' });
        return {
          avatar: defaultAvatar,
          microphone: user.equippedMicrophone,
          userId,
          avatarId: 'avatar_1',
          acquiredAt: new Date(),
        };
      }
    }

    return {
      avatar: user.equippedAvatar,
      microphone: user.equippedMicrophone,
      userId,
      avatarId: user.equippedAvatarId,
      acquiredAt: new Date(), // This would be from ownership table if owned
    };
  }

  // Get all avatars owned by user
  async getUserAvatars(userId: string) {
    return this.userAvatarRepository.find({
      where: { userId },
      relations: ['avatar', 'microphone'],
      order: { avatarId: 'ASC' },
    });
  }

  // Update equipped avatar
  async updateEquippedAvatar(userId: string, avatarId: string) {
    // Check if avatar exists
    const avatar = await this.avatarRepository.findOne({
      where: { id: avatarId },
    });

    if (!avatar) {
      throw new BadRequestException('Avatar not found');
    }

    // Check if avatar is free or user owns it
    if (!avatar.isFree) {
      const userAvatar = await this.userAvatarRepository.findOne({
        where: { userId, avatarId },
      });

      if (!userAvatar) {
        throw new BadRequestException('Avatar not owned by user');
      }
    }

    // Update user's equipped avatar
    await this.userRepository.update(userId, { equippedAvatarId: avatarId });

    // Return updated user with equipped avatar
    return this.userRepository.findOne({
      where: { id: userId },
      relations: ['equippedAvatar', 'equippedMicrophone'],
    });
  }

  // Update microphone for user
  async updateAvatarMicrophone(userId: string, microphoneId: string) {
    // Check if microphone exists
    const microphone = await this.microphoneRepository.findOne({
      where: { id: microphoneId },
    });

    if (!microphone) {
      throw new BadRequestException('Microphone not found');
    }

    // Check if microphone is free or user owns it
    if (!microphone.isFree) {
      const userMicrophone = await this.userMicrophoneRepository.findOne({
        where: { userId, microphoneId },
      });

      if (!userMicrophone) {
        throw new BadRequestException('Microphone not owned by user');
      }
    }

    // Update user's equipped microphone
    await this.userRepository.update(userId, { equippedMicrophoneId: microphoneId });

    // Return updated user
    return this.userRepository.findOne({
      where: { id: userId },
      relations: ['equippedAvatar', 'equippedMicrophone'],
    });
  }

  // Get all available avatars
  async getAllAvatars() {
    return this.avatarRepository.find({
      where: { isAvailable: true },
      order: { id: 'ASC' },
    });
  }

  // Get all available microphones
  async getAllMicrophones() {
    return this.microphoneRepository.find({
      where: { isAvailable: true },
      order: { id: 'ASC' },
    });
  }

  // Get all available outfits
  async getAllOutfits() {
    return this.outfitRepository.find({
      where: { isAvailable: true },
      order: { id: 'ASC' },
    });
  }

  // Get all available shoes
  async getAllShoes() {
    return this.shoesRepository.find({
      where: { isAvailable: true },
      order: { id: 'ASC' },
    });
  }

  // Get all accessories (combining outfits, shoes, and microphones)
  async getAllAccessories() {
    const [outfits, shoes, microphones] = await Promise.all([
      this.getAllOutfits(),
      this.getAllShoes(),
      this.getAllMicrophones(),
    ]);

    return {
      outfits,
      shoes,
      microphones,
    };
  }

  // Get user's microphones
  async getUserMicrophones(userId: string) {
    return this.userMicrophoneRepository.find({
      where: { userId },
      relations: ['microphone'],
      order: { microphoneId: 'ASC' },
    });
  }

  // Method for combined avatar and microphone update
  async updateAvatarCustomization(userId: string, avatarId: string, microphoneId?: string) {
    // Update equipped avatar
    await this.updateEquippedAvatar(userId, avatarId);

    // Update microphone if provided
    if (microphoneId) {
      await this.updateAvatarMicrophone(userId, microphoneId);
    }

    // Return user with equipped items
    return this.userRepository.findOne({
      where: { id: userId },
      relations: ['equippedAvatar', 'equippedMicrophone'],
    });
  }

  // Legacy method for backward compatibility - get single user avatar (equipped one)
  async getUserAvatar(userId: string) {
    return this.getEquippedAvatar(userId);
  }

  // Legacy method for backward compatibility - update user avatar
  async updateUserAvatar(userId: string, updateData: any) {
    // Handle legacy baseAvatarId (for OAuth provider URLs)
    if (updateData.baseAvatarId) {
      updateData.avatarId = updateData.baseAvatarId;
    }

    if (updateData.avatarId) {
      return this.updateEquippedAvatar(userId, updateData.avatarId);
    }
    if (updateData.microphoneId) {
      return this.updateAvatarMicrophone(userId, updateData.microphoneId);
    }
    throw new BadRequestException('No valid update data provided');
  }

  // Assign basic microphones to new user
  async assignBasicMicrophones(userId: string) {
    // Get first 3 basic microphones (or however many you want to give to new users)
    const basicMicrophones = await this.microphoneRepository.find({
      where: { isAvailable: true },
      take: 3,
      order: { id: 'ASC' },
    });

    // Create user microphone records for non-free microphones only
    const paidMicrophones = basicMicrophones.filter((mic) => !mic.isFree);
    if (paidMicrophones.length > 0) {
      const userMicrophones = paidMicrophones.map((microphone) =>
        this.userMicrophoneRepository.create({
          userId,
          microphoneId: microphone.id,
        }),
      );
      await this.userMicrophoneRepository.save(userMicrophones);
    }

    // Also assign basic avatars (first 3 non-free avatars)
    const basicAvatars = await this.avatarRepository.find({
      where: { isAvailable: true },
      take: 3,
      order: { id: 'ASC' },
    });

    const paidAvatars = basicAvatars.filter((avatar) => !avatar.isFree);
    if (paidAvatars.length > 0) {
      const userAvatars = paidAvatars.map((avatar) =>
        this.userAvatarRepository.create({
          userId,
          avatarId: avatar.id,
        }),
      );
      await this.userAvatarRepository.save(userAvatars);
    }

    // Equip the first free avatar by default
    const firstFreeAvatar = await this.avatarRepository.findOne({
      where: { isAvailable: true, isFree: true },
      order: { id: 'ASC' },
    });

    if (firstFreeAvatar) {
      await this.userRepository.update(userId, {
        equippedAvatarId: firstFreeAvatar.id,
      });
    }

    return { success: true };
  }

  // Get user inventory (items they own)
  async getUserInventory(userId: string) {
    const avatars = await this.getUserAvatars(userId);
    const microphones = await this.getUserMicrophones(userId);

    return {
      avatars,
      microphones,
    };
  }

  // Add item to user inventory
  async addItemToInventory(userId: string, itemType: 'avatar' | 'microphone', itemId: string) {
    if (itemType === 'avatar') {
      const userAvatar = this.userAvatarRepository.create({
        userId,
        avatarId: itemId,
      });
      return this.userAvatarRepository.save(userAvatar);
    }

    if (itemType === 'microphone') {
      const userMicrophone = this.userMicrophoneRepository.create({
        userId,
        microphoneId: itemId,
      });
      return this.userMicrophoneRepository.save(userMicrophone);
    }

    throw new BadRequestException('Invalid item type');
  }

  // Update equipped microphone
  async updateEquippedMicrophone(userId: string, microphoneId: string) {
    return this.updateAvatarMicrophone(userId, microphoneId);
  }

  // Get avatars available to user (free + owned)
  async getAvailableAvatarsForUser(userId: string) {
    // Get all free avatars
    const freeAvatars = await this.avatarRepository.find({
      where: { isAvailable: true, isFree: true },
      order: { id: 'ASC' },
    });

    // Get user's owned avatars
    const ownedAvatars = await this.userAvatarRepository.find({
      where: { userId },
      relations: ['avatar'],
      order: { avatarId: 'ASC' },
    });

    // Combine free avatars with owned avatars
    const allAvatars = [...freeAvatars];

    // Add owned avatars that aren't already in the free list
    for (const userAvatar of ownedAvatars) {
      if (userAvatar.avatar && !freeAvatars.find((a) => a.id === userAvatar.avatar.id)) {
        allAvatars.push(userAvatar.avatar);
      }
    }

    // Sort by ID for consistent ordering
    return allAvatars.sort((a, b) => a.id.localeCompare(b.id));
  }

  // Get microphones available to user (free + owned)
  async getAvailableMicrophonesForUser(userId: string) {
    // Get all free microphones
    const freeMicrophones = await this.microphoneRepository.find({
      where: { isAvailable: true, isFree: true },
      order: { id: 'ASC' },
    });

    // Get user's owned microphones
    const ownedMicrophones = await this.userMicrophoneRepository.find({
      where: { userId },
      relations: ['microphone'],
      order: { microphoneId: 'ASC' },
    });

    // Combine free microphones with owned microphones
    const allMicrophones = [...freeMicrophones];

    // Add owned microphones that aren't already in the free list
    for (const userMicrophone of ownedMicrophones) {
      if (
        userMicrophone.microphone &&
        !freeMicrophones.find((m) => m.id === userMicrophone.microphone.id)
      ) {
        allMicrophones.push(userMicrophone.microphone);
      }
    }

    // Sort by ID for consistent ordering
    return allMicrophones.sort((a, b) => a.id.localeCompare(b.id));
  }
}
