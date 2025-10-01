import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { Show } from '../show/show.entity';

export interface UpdateShowDto {
  startTime?: string;
  endTime?: string;
  venueId?: string;
  description?: string;
}

export interface DjShowResponse {
  id: string;
  startTime: string;
  endTime: string;
  venue: {
    id: string;
    name: string;
    address?: string;
  };
  description?: string;
  day?: string;
  time?: string;
}

@Injectable()
export class DjShowManagementService {
  constructor(
    @InjectRepository(Show)
    private readonly showRepository: Repository<Show>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async getDjShows(userId: string): Promise<DjShowResponse[]> {
    // Get user and validate they have DJ access
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['dj'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.isDjSubscriptionActive || !user.djId) {
      throw new ForbiddenException('User does not have active DJ subscription');
    }

    // Get all shows for this DJ
    const shows = await this.showRepository.find({
      where: { djId: user.djId },
      relations: ['venue', 'dj'],
      order: { startTime: 'ASC' },
    });

    return shows.map((show) => ({
      id: show.id,
      startTime: show.startTime,
      endTime: show.endTime,
      venue: {
        id: show.venue.id,
        name: show.venue.name,
        address: show.venue.address,
      },
      description: show.description,
      day: show.day,
      time: show.time,
    }));
  }

  async updateShow(
    userId: string,
    showId: string,
    updateData: UpdateShowDto,
  ): Promise<DjShowResponse> {
    // Validate user has DJ access
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['dj'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.isDjSubscriptionActive || !user.djId) {
      throw new ForbiddenException('User does not have active DJ subscription');
    }

    // Get the show and verify it belongs to this DJ
    const show = await this.showRepository.findOne({
      where: { id: showId },
      relations: ['venue', 'dj'],
    });

    if (!show) {
      throw new NotFoundException('Show not found');
    }

    if (show.djId !== user.djId) {
      throw new ForbiddenException('You can only edit your own shows');
    }

    // Update the show
    const updatePayload: any = {};

    if (updateData.startTime) {
      updatePayload.startTime = new Date(updateData.startTime);
    }

    if (updateData.endTime) {
      updatePayload.endTime = new Date(updateData.endTime);
    }

    if (updateData.venueId) {
      updatePayload.venueId = updateData.venueId;
    }

    if (updateData.description !== undefined) {
      updatePayload.description = updateData.description;
    }

    await this.showRepository.update(showId, updatePayload);

    // Return updated show
    const updatedShow = await this.showRepository.findOne({
      where: { id: showId },
      relations: ['venue', 'dj'],
    });

    return {
      id: updatedShow.id,
      startTime: updatedShow.startTime,
      endTime: updatedShow.endTime,
      venue: {
        id: updatedShow.venue.id,
        name: updatedShow.venue.name,
        address: updatedShow.venue.address,
      },
      description: updatedShow.description,
      day: updatedShow.day,
      time: updatedShow.time,
    };
  }
}
