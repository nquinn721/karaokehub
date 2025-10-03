import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AvatarService } from '../avatar/services/avatar.service';
import { User } from '../entities/user.entity';

export interface CreateUserDto {
  email: string;
  name: string;
  password?: string;
  stageName?: string;
  provider?: string;
  providerId?: string;
}

export interface UpdateUserDto {
  name?: string;
  stageName?: string;
  password?: string;
  profileImageUrl?: string;
  isActive?: boolean;
  isAdmin?: boolean;
}

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private avatarService: AvatarService,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    // Validate uniqueness before creating
    await this.validateUniqueness({
      name: createUserDto.name,
      stageName: createUserDto.stageName,
    });

    const user = this.userRepository.create(createUserDto);
    try {
      const savedUser = await this.userRepository.save(user);

      // Setup basic equipment for new user (avatar and microphone)
      try {
        await this.avatarService.assignBasicMicrophones(savedUser.id);
      } catch (equipmentError) {
        console.error('Failed to assign basic equipment to new user:', equipmentError);
        // Don't fail user creation if equipment assignment fails
      }

      return savedUser;
    } catch (error) {
      // Handle database constraint violations
      if (error.code === '23505' || error.code === 'ER_DUP_ENTRY') {
        if (error.detail?.includes('email') || error.message?.includes('email')) {
          throw new BadRequestException('This email is already registered.');
        } else if (error.detail?.includes('name') || error.message?.includes('name')) {
          throw new BadRequestException(
            'This name is already taken. Please choose a different name.',
          );
        } else if (error.detail?.includes('stageName') || error.message?.includes('stageName')) {
          throw new BadRequestException(
            'This stage name is already taken. Please choose a different stage name.',
          );
        }
      }
      throw error;
    }
  }

  async findAll(): Promise<User[]> {
    return await this.userRepository.find({
      where: { isActive: true },
      relations: ['favoriteShows'],
    });
  }

  async findOne(id: string): Promise<User> {
    return await this.userRepository.findOne({
      where: { id, isActive: true },
      relations: ['favoriteShows', 'favoriteShows.show', 'equippedAvatar', 'equippedMicrophone'],
    });
  }

  async findByEmail(email: string): Promise<User> {
    return await this.userRepository.findOne({
      where: { email, isActive: true },
    });
  }

  async findByProvider(provider: string, providerId: string): Promise<User> {
    return await this.userRepository.findOne({
      where: { provider, providerId, isActive: true },
    });
  }

  async findByName(name: string): Promise<User> {
    return await this.userRepository.findOne({
      where: { name, isActive: true },
    });
  }

  async findByStageName(stageName: string): Promise<User> {
    return await this.userRepository.findOne({
      where: { stageName, isActive: true },
    });
  }

  private async validateUniqueness(
    data: { name?: string; stageName?: string },
    excludeUserId?: string,
  ): Promise<void> {
    if (data.name) {
      const existingUserWithName = await this.userRepository.findOne({
        where: { name: data.name, isActive: true },
      });
      if (existingUserWithName && existingUserWithName.id !== excludeUserId) {
        throw new BadRequestException(
          'This name is already taken. Please choose a different name.',
        );
      }
    }

    if (data.stageName) {
      const existingUserWithStageName = await this.userRepository.findOne({
        where: { stageName: data.stageName, isActive: true },
      });
      if (existingUserWithStageName && existingUserWithStageName.id !== excludeUserId) {
        throw new BadRequestException(
          'This stage name is already taken. Please choose a different stage name.',
        );
      }
    }
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    // Validate uniqueness before updating (excluding the current user)
    await this.validateUniqueness(
      {
        name: updateUserDto.name,
        stageName: updateUserDto.stageName,
      },
      id,
    );

    try {
      await this.userRepository.update(id, updateUserDto);
      return await this.findOne(id);
    } catch (error) {
      // Handle database constraint violations
      if (error.code === '23505' || error.code === 'ER_DUP_ENTRY') {
        if (error.detail?.includes('email') || error.message?.includes('email')) {
          throw new BadRequestException('This email is already registered.');
        } else if (error.detail?.includes('name') || error.message?.includes('name')) {
          throw new BadRequestException(
            'This name is already taken. Please choose a different name.',
          );
        } else if (error.detail?.includes('stageName') || error.message?.includes('stageName')) {
          throw new BadRequestException(
            'This stage name is already taken. Please choose a different stage name.',
          );
        }
      }
      throw error;
    }
  }

  async updateAdminStatus(id: string, isAdmin: boolean): Promise<User> {
    await this.userRepository.update(id, { isAdmin });
    return await this.findOne(id);
  }

  // Equipment management methods
  async equipAvatar(userId: string, avatarId: string): Promise<User> {
    // TODO: Validate that user can equip this avatar (free or owned)
    await this.userRepository.update(userId, { equippedAvatarId: avatarId });
    return await this.findOne(userId);
  }

  async equipMicrophone(userId: string, microphoneId: string): Promise<User> {
    // TODO: Validate that user can equip this microphone (free or owned)
    await this.userRepository.update(userId, { equippedMicrophoneId: microphoneId });
    return await this.findOne(userId);
  }

  async unequipAvatar(userId: string): Promise<User> {
    await this.userRepository.update(userId, { equippedAvatarId: null });
    return await this.findOne(userId);
  }

  async unequipMicrophone(userId: string): Promise<User> {
    await this.userRepository.update(userId, { equippedMicrophoneId: null });
    return await this.findOne(userId);
  }

  // This method is deprecated - avatar updates should go through the equipment methods
  async updateAvatar(id: string, avatarId: string): Promise<User> {
    // This method is now deprecated since we use direct equipment references
    // Returning the user as-is for backward compatibility
    return await this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    await this.userRepository.update(id, { isActive: false });
  }

  // DJ-related methods
  async isDjWithActiveSubscription(userId: string): Promise<boolean> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['isDjSubscriptionActive', 'djId'],
    });

    return !!(user?.isDjSubscriptionActive && user?.djId);
  }

  async getDjInfo(
    userId: string,
  ): Promise<{ isDj: boolean; djId?: string; djName?: string; subscriptionActive?: boolean }> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['dj'],
      select: ['isDjSubscriptionActive', 'djId', 'djStripeSubscriptionId'],
    });

    if (!user) {
      return { isDj: false };
    }

    return {
      isDj: !!(user.djId && user.isDjSubscriptionActive),
      djId: user.djId,
      djName: user.dj?.name,
      subscriptionActive: user.isDjSubscriptionActive,
    };
  }

  /**
   * Update user's location (city/state)
   */
  async updateLocation(userId: string, city: string, state: string): Promise<User> {
    // Check if user exists
    const user = await this.findOne(userId);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Only update if city/state is not already set or is different
    if (!user.city || !user.state || user.city !== city || user.state !== state) {
      await this.userRepository.update(userId, {
        city: city.trim(),
        state: state.trim(),
      });
    }

    return await this.findOne(userId);
  }

  /**
   * Check if user needs location update (city/state not set)
   */
  async needsLocationUpdate(userId: string): Promise<boolean> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['city', 'state'],
    });

    return !user?.city || !user?.state;
  }
}
