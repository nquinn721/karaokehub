import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DayOfWeek } from '../show/show.entity';
import { SubscriptionService } from '../subscription/subscription.service';
import { Favorite } from './favorite.entity';

export interface CreateFavoriteDto {
  userId: string;
  showId: string;
  day: DayOfWeek;
}

@Injectable()
export class FavoriteService {
  constructor(
    @InjectRepository(Favorite)
    private favoriteRepository: Repository<Favorite>,
    private subscriptionService: SubscriptionService,
  ) {}

  async create(createFavoriteDto: CreateFavoriteDto): Promise<Favorite> {
    // Check if user has ad-free access (required for favorites)
    const hasAdFreeAccess = await this.subscriptionService.hasAdFreeAccess(
      createFavoriteDto.userId,
    );

    if (!hasAdFreeAccess) {
      throw new ForbiddenException(
        'Ad-Free subscription required to add favorites. Upgrade to access this feature.',
      );
    }

    const favorite = this.favoriteRepository.create(createFavoriteDto);
    return await this.favoriteRepository.save(favorite);
  }

  async findAll(): Promise<Favorite[]> {
    return await this.favoriteRepository.find({
      relations: ['user', 'show', 'show.vendor', 'show.dj'],
    });
  }

  async findByUser(userId: string): Promise<Favorite[]> {
    return await this.favoriteRepository.find({
      where: { userId },
      relations: ['show', 'show.vendor', 'show.dj'],
    });
  }

  async findByShow(showId: string): Promise<Favorite[]> {
    return await this.favoriteRepository.find({
      where: { showId },
      relations: ['user', 'show'],
    });
  }

  async findByUserAndShow(userId: string, showId: string): Promise<Favorite> {
    return await this.favoriteRepository.findOne({
      where: { userId, showId },
      relations: ['user', 'show'],
    });
  }

  async remove(id: string): Promise<void> {
    await this.favoriteRepository.delete(id);
  }

  async removeByUserAndShow(userId: string, showId: string): Promise<void> {
    await this.favoriteRepository.delete({ userId, showId });
  }
}
