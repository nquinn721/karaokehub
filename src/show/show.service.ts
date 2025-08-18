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
    centerLat: number,
    centerLng: number,
    radiusMiles: number = 35,
    day?: DayOfWeek,
  ): Promise<GeocodedShow[]> {
    try {
      // Build the base query with distance calculation using Haversine formula
      let query = this.showRepository
        .createQueryBuilder('show')
        .leftJoinAndSelect('show.vendor', 'vendor')
        .leftJoinAndSelect('show.dj', 'dj')
        .leftJoinAndSelect('show.favorites', 'favorites')
        .addSelect(
          `(3959 * acos(cos(radians(:centerLat)) * cos(radians(show.lat)) * 
           cos(radians(show.lng) - radians(:centerLng)) + 
           sin(radians(:centerLat)) * sin(radians(show.lat))))`,
          'distance',
        )
        .where('show.isActive = :isActive', { isActive: true })
        .andWhere('show.lat IS NOT NULL')
        .andWhere('show.lng IS NOT NULL')
        .having(
          `(3959 * acos(cos(radians(:centerLat)) * cos(radians(show.lat)) * 
           cos(radians(show.lng) - radians(:centerLng)) + 
           sin(radians(:centerLat)) * sin(radians(show.lat)))) <= :radiusMiles`,
        )
        .setParameters({
          centerLat,
          centerLng,
          radiusMiles,
        })
        .orderBy('distance', 'ASC');

      // Add day filter if specified
      if (day) {
        query = query.andWhere('show.day = :day', { day });
      }

      const results = await query.getRawAndEntities();

      // Map results to include distance
      const nearbyShows: GeocodedShow[] = results.entities.map((entity, index) => ({
        ...entity,
        distance: parseFloat(results.raw[index].distance) || 0,
      }));

      this.logger.log(
        `Found ${nearbyShows.length} shows within ${radiusMiles} miles of (${centerLat}, ${centerLng})${day ? ` for ${day}` : ''}`,
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

  // Geocode all existing shows that don't have coordinates
  async geocodeExistingShows(): Promise<{ processed: number; geocoded: number; errors: number }> {
    this.logger.log('Starting geocoding of existing shows...');

    const stats = { processed: 0, geocoded: 0, errors: 0 };

    try {
      // Find shows without coordinates
      const showsToGeocode = await this.showRepository.find({
        where: [
          { lat: null, isActive: true },
          { lng: null, isActive: true },
        ],
      });

      this.logger.log(`Found ${showsToGeocode.length} shows that need geocoding`);

      for (const show of showsToGeocode) {
        stats.processed++;

        if (!show.address) {
          this.logger.warn(`Show ${show.id} has no address, skipping`);
          stats.errors++;
          continue;
        }

        try {
          const geocodeResult = await this.geocodingService.geocodeAddress(show.address);

          if (geocodeResult) {
            await this.showRepository.update(show.id, {
              lat: geocodeResult.lat,
              lng: geocodeResult.lng,
            });

            stats.geocoded++;
            this.logger.log(
              `Geocoded show ${show.id}: ${show.address} -> (${geocodeResult.lat}, ${geocodeResult.lng})`,
            );
          } else {
            this.logger.warn(`Failed to geocode address: ${show.address}`);
            stats.errors++;
          }

          // Add small delay to avoid rate limiting
          await new Promise((resolve) => setTimeout(resolve, 100));
        } catch (error) {
          this.logger.error(`Error geocoding show ${show.id}:`, error);
          stats.errors++;
        }
      }

      this.logger.log(
        `Geocoding complete: ${stats.geocoded} geocoded, ${stats.errors} errors out of ${stats.processed} processed`,
      );
      return stats;
    } catch (error) {
      this.logger.error('Error during bulk geocoding:', error);
      throw error;
    }
  }

  // Re-geocode shows that have potentially incorrect coordinates
  async reGeocodeInvalidShows(): Promise<{ processed: number; fixed: number; errors: number }> {
    this.logger.log('Starting re-geocoding of shows with potentially invalid coordinates...');

    const stats = { processed: 0, fixed: 0, errors: 0 };

    try {
      // Find shows with coordinates that might be invalid
      // This includes specific problematic shows we've identified
      const problematicShowIds = [
        '6411d87c-741c-4cd7-a08f-d7d60a67452a', // Delaware, OH show with Australia coordinates
        '33de2af9-2794-4448-8102-edb834ab3ebc', // Sunbury, OH show with Michigan coordinates
        '915f1fd6-ed0f-4d90-9e95-4e5f1a6362a1', // Columbus, OH show with Austin, TX coordinates
      ];

      const showsToReGeocode = await this.showRepository.find({
        where: problematicShowIds.map((id) => ({ id, isActive: true })),
      });

      this.logger.log(`Found ${showsToReGeocode.length} shows that need re-geocoding`);

      for (const show of showsToReGeocode) {
        stats.processed++;

        if (!show.address) {
          this.logger.warn(`Show ${show.id} has no address, skipping`);
          stats.errors++;
          continue;
        }

        try {
          this.logger.log(
            `Re-geocoding ${show.venue} at ${show.address}, ${show.city}, ${show.state}`,
          );

          // Build full address for better geocoding results
          const fullAddress = `${show.address}, ${show.city}, ${show.state} ${show.zip}`.trim();
          const geocodeResult = await this.geocodingService.geocodeAddress(fullAddress);

          if (geocodeResult) {
            // Log the old vs new coordinates
            this.logger.log(
              `Show ${show.venue}: OLD coords (${show.lat}, ${show.lng}) -> NEW coords (${geocodeResult.lat}, ${geocodeResult.lng})`,
            );

            await this.showRepository.update(show.id, {
              lat: geocodeResult.lat,
              lng: geocodeResult.lng,
              city: geocodeResult.city || show.city,
              state: geocodeResult.state || show.state,
              zip: geocodeResult.zip || show.zip,
            });

            stats.fixed++;
            this.logger.log(`Successfully re-geocoded ${show.venue}`);
          } else {
            this.logger.warn(`Failed to re-geocode address: ${fullAddress}`);
            stats.errors++;
          }

          // Add delay to avoid rate limiting
          await new Promise((resolve) => setTimeout(resolve, 500));
        } catch (error) {
          this.logger.error(`Error re-geocoding show ${show.id}:`, error);
          stats.errors++;
        }
      }

      this.logger.log(
        `Re-geocoding complete: ${stats.fixed} fixed, ${stats.errors} errors out of ${stats.processed} processed`,
      );
      return stats;
    } catch (error) {
      this.logger.error('Error during re-geocoding:', error);
      throw error;
    }
  }
}
