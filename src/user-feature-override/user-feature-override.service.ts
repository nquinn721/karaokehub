import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FeatureType, UserFeatureOverride } from './user-feature-override.entity';

export interface CreateFeatureOverrideDto {
  userId: string;
  featureType: FeatureType;
  isEnabled: boolean;
  customLimit?: number | null;
  notes?: string;
  expiresAt?: Date | null;
}

export interface UpdateFeatureOverrideDto {
  isEnabled?: boolean;
  customLimit?: number | null;
  notes?: string;
  expiresAt?: Date | null;
}

@Injectable()
export class UserFeatureOverrideService {
  constructor(
    @InjectRepository(UserFeatureOverride)
    private overrideRepository: Repository<UserFeatureOverride>,
  ) {}

  async createOverride(dto: CreateFeatureOverrideDto): Promise<UserFeatureOverride> {
    // Check if override already exists for this user and feature
    const existing = await this.overrideRepository.findOne({
      where: {
        userId: dto.userId,
        featureType: dto.featureType,
      },
    });

    if (existing) {
      // Update existing override
      Object.assign(existing, dto);
      return await this.overrideRepository.save(existing);
    }

    // Create new override
    const override = this.overrideRepository.create(dto);
    return await this.overrideRepository.save(override);
  }

  async updateOverride(id: string, dto: UpdateFeatureOverrideDto): Promise<UserFeatureOverride> {
    await this.overrideRepository.update(id, dto);
    const updated = await this.overrideRepository.findOne({ where: { id } });
    if (!updated) {
      throw new Error('Override not found');
    }
    return updated;
  }

  async deleteOverride(id: string): Promise<void> {
    await this.overrideRepository.delete(id);
  }

  async getUserOverrides(userId: string): Promise<UserFeatureOverride[]> {
    return await this.overrideRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async getUserOverride(
    userId: string,
    featureType: FeatureType,
  ): Promise<UserFeatureOverride | null> {
    return await this.overrideRepository.findOne({
      where: {
        userId,
        featureType,
        isEnabled: true,
      },
    });
  }

  async getAllOverrides(
    page: number = 1,
    limit: number = 20,
    search?: string,
  ): Promise<{ items: UserFeatureOverride[]; total: number; page: number; limit: number; totalPages: number }> {
    const query = this.overrideRepository
      .createQueryBuilder('override')
      .leftJoinAndSelect('override.user', 'user')
      .orderBy('override.createdAt', 'DESC');

    if (search) {
      query.where(
        'user.name LIKE :search OR user.email LIKE :search OR user.stageName LIKE :search OR override.notes LIKE :search',
        { search: `%${search}%` },
      );
    }

    const total = await query.getCount();
    const items = await query
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // Helper methods for feature checking
  async hasUnlimitedSongPreviews(userId: string): Promise<boolean> {
    const override = await this.getUserOverride(userId, FeatureType.SONG_PREVIEWS);
    return override?.isEnabled && override.customLimit === null;
  }

  async getSongPreviewLimit(userId: string): Promise<number | null> {
    const override = await this.getUserOverride(userId, FeatureType.SONG_PREVIEWS);
    if (!override?.isEnabled) return null;
    return override.customLimit; // null = unlimited, number = custom limit
  }

  async hasUnlimitedSongFavorites(userId: string): Promise<boolean> {
    const override = await this.getUserOverride(userId, FeatureType.SONG_FAVORITES);
    return override?.isEnabled && override.customLimit === null;
  }

  async getSongFavoriteLimit(userId: string): Promise<number | null> {
    const override = await this.getUserOverride(userId, FeatureType.SONG_FAVORITES);
    if (!override?.isEnabled) return null;
    return override.customLimit; // null = unlimited, number = custom limit
  }

  async hasUnlimitedShowFavorites(userId: string): Promise<boolean> {
    const override = await this.getUserOverride(userId, FeatureType.SHOW_FAVORITES);
    return override?.isEnabled && override.customLimit === null;
  }

  async getShowFavoriteLimit(userId: string): Promise<number | null> {
    const override = await this.getUserOverride(userId, FeatureType.SHOW_FAVORITES);
    if (!override?.isEnabled) return null;
    return override.customLimit; // null = unlimited, number = custom limit
  }

  async hasAdFreeOverride(userId: string): Promise<boolean> {
    const override = await this.getUserOverride(userId, FeatureType.AD_FREE);
    return override?.isEnabled ?? false;
  }

  async hasPremiumOverride(userId: string): Promise<boolean> {
    const override = await this.getUserOverride(userId, FeatureType.PREMIUM_ACCESS);
    return override?.isEnabled ?? false;
  }

  // Check if override is expired
  private isExpired(override: UserFeatureOverride): boolean {
    if (!override.expiresAt) return false;
    return new Date() > override.expiresAt;
  }

  // Clean up expired overrides
  async cleanupExpiredOverrides(): Promise<void> {
    await this.overrideRepository
      .createQueryBuilder()
      .delete()
      .where('expiresAt IS NOT NULL AND expiresAt < :now', { now: new Date() })
      .execute();
  }
}
