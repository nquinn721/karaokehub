import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UpdateUserAvatarDto } from '../dto/update-user-avatar.dto';
import { UserAvatar } from '../entities/user-avatar.entity';
import { UserMicrophone } from '../entities/user-microphone.entity';
import { UserOutfit } from '../entities/user-outfit.entity';
import { UserShoes } from '../entities/user-shoes.entity';

@Injectable()
export class AvatarService {
  constructor(
    @InjectRepository(UserAvatar)
    private userAvatarRepository: Repository<UserAvatar>,
    @InjectRepository(UserMicrophone)
    private userMicrophoneRepository: Repository<UserMicrophone>,
    @InjectRepository(UserOutfit)
    private userOutfitRepository: Repository<UserOutfit>,
    @InjectRepository(UserShoes)
    private userShoesRepository: Repository<UserShoes>,
  ) {}

  async getUserAvatar(userId: string): Promise<UserAvatar> {
    const avatar = await this.userAvatarRepository.findOne({
      where: { userId, isActive: true },
      relations: ['microphone', 'outfit', 'shoes'],
    });

    if (!avatar) {
      // Create default avatar if none exists
      return this.createDefaultAvatar(userId);
    }

    return avatar;
  }

  async updateUserAvatar(userId: string, updateDto: UpdateUserAvatarDto): Promise<UserAvatar> {
    // Validate that user owns the items they're trying to equip
    if (updateDto.microphoneId) {
      await this.validateUserOwnsItem(userId, 'microphone', updateDto.microphoneId);
    }
    if (updateDto.outfitId) {
      await this.validateUserOwnsItem(userId, 'outfit', updateDto.outfitId);
    }
    if (updateDto.shoesId) {
      await this.validateUserOwnsItem(userId, 'shoes', updateDto.shoesId);
    }

    let avatar = await this.userAvatarRepository.findOne({
      where: { userId, isActive: true },
    });

    if (!avatar) {
      avatar = await this.createDefaultAvatar(userId);
    }

    // Update avatar
    Object.assign(avatar, updateDto);
    await this.userAvatarRepository.save(avatar);

    // Update equipped items
    await this.updateEquippedItems(userId, updateDto);

    return this.getUserAvatar(userId);
  }

  async getUserInventory(userId: string) {
    const [microphones, outfits, shoes] = await Promise.all([
      this.userMicrophoneRepository.find({
        where: { userId },
        relations: ['microphone'],
      }),
      this.userOutfitRepository.find({
        where: { userId },
        relations: ['outfit'],
      }),
      this.userShoesRepository.find({
        where: { userId },
        relations: ['shoes'],
      }),
    ]);

    return {
      microphones,
      outfits,
      shoes,
    };
  }

  async addItemToInventory(
    userId: string,
    itemType: 'microphone' | 'outfit' | 'shoes',
    itemId: string,
  ) {
    const existingItem = await this.checkUserOwnsItem(userId, itemType, itemId);
    if (existingItem) {
      throw new BadRequestException('User already owns this item');
    }

    switch (itemType) {
      case 'microphone':
        const userMicrophone = this.userMicrophoneRepository.create({
          userId,
          microphoneId: itemId,
        });
        return this.userMicrophoneRepository.save(userMicrophone);

      case 'outfit':
        const userOutfit = this.userOutfitRepository.create({
          userId,
          outfitId: itemId,
        });
        return this.userOutfitRepository.save(userOutfit);

      case 'shoes':
        const userShoes = this.userShoesRepository.create({
          userId,
          shoesId: itemId,
        });
        return this.userShoesRepository.save(userShoes);

      default:
        throw new BadRequestException('Invalid item type');
    }
  }

  private async createDefaultAvatar(userId: string): Promise<UserAvatar> {
    const defaultAvatar = this.userAvatarRepository.create({
      userId,
      baseAvatarId: 'avatar_1', // Default base avatar
      isActive: true,
    });

    return this.userAvatarRepository.save(defaultAvatar);
  }

  private async validateUserOwnsItem(
    userId: string,
    itemType: string,
    itemId: string,
  ): Promise<void> {
    const ownsItem = await this.checkUserOwnsItem(userId, itemType, itemId);
    if (!ownsItem) {
      throw new BadRequestException(`User does not own this ${itemType}`);
    }
  }

  private async checkUserOwnsItem(
    userId: string,
    itemType: string,
    itemId: string,
  ): Promise<boolean> {
    switch (itemType) {
      case 'microphone':
        const microphone = await this.userMicrophoneRepository.findOne({
          where: { userId, microphoneId: itemId },
        });
        return !!microphone;

      case 'outfit':
        const outfit = await this.userOutfitRepository.findOne({
          where: { userId, outfitId: itemId },
        });
        return !!outfit;

      case 'shoes':
        const shoes = await this.userShoesRepository.findOne({
          where: { userId, shoesId: itemId },
        });
        return !!shoes;

      default:
        return false;
    }
  }

  private async updateEquippedItems(userId: string, updateDto: UpdateUserAvatarDto): Promise<void> {
    // Unequip all items first
    await Promise.all([
      this.userMicrophoneRepository.update({ userId }, { isEquipped: false }),
      this.userOutfitRepository.update({ userId }, { isEquipped: false }),
      this.userShoesRepository.update({ userId }, { isEquipped: false }),
    ]);

    // Equip new items
    if (updateDto.microphoneId) {
      await this.userMicrophoneRepository.update(
        { userId, microphoneId: updateDto.microphoneId },
        { isEquipped: true },
      );
    }
    if (updateDto.outfitId) {
      await this.userOutfitRepository.update(
        { userId, outfitId: updateDto.outfitId },
        { isEquipped: true },
      );
    }
    if (updateDto.shoesId) {
      await this.userShoesRepository.update(
        { userId, shoesId: updateDto.shoesId },
        { isEquipped: true },
      );
    }
  }
}
