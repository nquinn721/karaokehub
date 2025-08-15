import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GeocodingService } from '../geocoding/geocoding.service';
import { DayOfWeek, Show } from './show.entity';

export interface CreateShowDto {
  vendorId: string;
  djId: string;
  address: string;
  day: DayOfWeek;
  startTime: string;
  endTime: string;
  description?: string;
}

export interface UpdateShowDto {
  vendorId?: string;
  djId?: string;
  address?: string;
  day?: DayOfWeek;
  startTime?: string;
  endTime?: string;
  description?: string;
  isActive?: boolean;
}

export interface GeocodedShow extends Show {
  lat: number;
  lng: number;
  distance: number;
}

@Injectable()
export class ShowService {
  private readonly logger = new Logger(ShowService.name);

  constructor(
    @InjectRepository(Show)
    private showRepository: Repository<Show>,
    private geocodingService: GeocodingService,
  ) {}

  async create(createShowDto: CreateShowDto): Promise<Show> {
    const show = this.showRepository.create(createShowDto);
    return await this.showRepository.save(show);
  }

  async findAll(): Promise<Show[]> {
    return await this.showRepository.find({
      where: { isActive: true },
      relations: ['vendor', 'dj', 'favorites'],
    });
  }

  async findOne(id: string): Promise<Show> {
    return await this.showRepository.findOne({
      where: { id, isActive: true },
      relations: ['vendor', 'dj', 'favorites'],
    });
  }

  async findByVendor(vendorId: string): Promise<Show[]> {
    return await this.showRepository.find({
      where: { vendorId, isActive: true },
      relations: ['vendor', 'dj', 'favorites'],
    });
  }

  async findByDJ(djId: string): Promise<Show[]> {
    return await this.showRepository.find({
      where: { djId, isActive: true },
      relations: ['vendor', 'dj', 'favorites'],
    });
  }

  async findByDay(day: DayOfWeek): Promise<Show[]> {
    return await this.showRepository.find({
      where: { day, isActive: true },
      relations: ['vendor', 'dj', 'favorites'],
    });
  }

  async findNearby(
    userLat: number,
    userLng: number,
    radiusMiles: number = 20,
    day?: DayOfWeek,
  ): Promise<GeocodedShow[]> {
    try {
      // Get all shows (optionally filtered by day)
      let shows: Show[];

      if (day) {
        shows = await this.findByDay(day);
      } else {
        shows = await this.findAll();
      }

      // Filter shows by distance and add geocoding data
      const nearbyShows = await this.geocodingService.filterByDistance(
        shows,
        userLat,
        userLng,
        radiusMiles,
      );

      // Sort by distance (closest first)
      nearbyShows.sort((a, b) => a.distance - b.distance);

      this.logger.log(
        `Found ${nearbyShows.length} shows within ${radiusMiles} miles of (${userLat}, ${userLng})`,
      );

      return nearbyShows;
    } catch (error) {
      this.logger.error('Error finding nearby shows:', error);
      throw error;
    }
  }

  async update(id: string, updateShowDto: UpdateShowDto): Promise<Show> {
    await this.showRepository.update(id, updateShowDto);
    return await this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    await this.showRepository.update(id, { isActive: false });
  }

  // Note: Geocoding functionality removed as lat/lng are no longer stored
  async geocodeExistingShows(): Promise<{ processed: number; geocoded: number; errors: number }> {
    this.logger.log('Geocoding functionality has been removed');
    return { processed: 0, geocoded: 0, errors: 0 };
  }
}
