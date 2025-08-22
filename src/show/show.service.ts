import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { Brackets, Repository } from 'typeorm';
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
  source?: string;
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
  source?: string;
}

export interface GeocodedShow extends Show {
  lat: number;
  lng: number;
  distance: number;
}

export interface CitySummary {
  city: string;
  state: string;
  showCount: number;
  lat: number;
  lng: number;
  vendors: string[];
}

@Injectable()
export class ShowService {
  private readonly logger = new Logger(ShowService.name);

  constructor(
    @InjectRepository(Show)
    private showRepository: Repository<Show>,
    private geocodingService: GeocodingService,
  ) {}

  /**
   * Calculate distance between two coordinates in miles
   */
  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 3959; // Earth's radius in miles
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Convert degrees to radians
   */
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Find which metropolitan area a city belongs to
   */
  private findMetropolitanArea(
    cityName: string,
    stateName: string,
    lat?: number,
    lng?: number,
  ): {
    metro: string;
    center: { lat: number; lng: number };
  } | null {
    try {
      const metroAreasPath = path.join(process.cwd(), 'data', 'metropolitan-areas.json');
      let metroData: any = {};

      try {
        const metroFile = fs.readFileSync(metroAreasPath, 'utf8');
        metroData = JSON.parse(metroFile);
      } catch (error) {
        this.logger.warn('Could not read metropolitan-areas.json');
        return null;
      }

      // First, check if city is explicitly listed as a suburb
      for (const [metroName, metroInfo] of Object.entries(metroData.metropolitan_areas)) {
        const metro = metroInfo as any;

        // Check if it's the major city
        if (metro.major_city === cityName && metro.state === stateName) {
          return {
            metro: metroName,
            center: metro.center,
          };
        }

        // Check if it's in the suburbs list
        if (metro.suburbs && metro.suburbs.includes(cityName)) {
          return {
            metro: metroName,
            center: metro.center,
          };
        }
      }

      // If we have coordinates, check distance-based clustering
      if (lat && lng) {
        for (const [metroName, metroInfo] of Object.entries(metroData.metropolitan_areas)) {
          const metro = metroInfo as any;
          const distance = this.calculateDistance(lat, lng, metro.center.lat, metro.center.lng);

          if (distance <= metro.radius_miles) {
            this.logger.log(
              `Found ${cityName}, ${stateName} within ${metroName} (${distance.toFixed(1)} miles from center)`,
            );
            return {
              metro: metroName,
              center: metro.center,
            };
          }
        }
      }

      return null;
    } catch (error) {
      this.logger.warn('Error checking metropolitan areas:', error);
      return null;
    }
  }

  async create(createShowDto: CreateShowDto): Promise<Show> {
    const show = this.showRepository.create(createShowDto);
    return await this.showRepository.save(show);
  }

  async findAll(): Promise<Show[]> {
    return await this.showRepository.find({
      where: { isActive: true },
      relations: ['vendor', 'dj', 'favoriteShows'],
    });
  }

  async findOne(id: string): Promise<Show> {
    return await this.showRepository.findOne({
      where: { id, isActive: true },
      relations: ['vendor', 'dj', 'favoriteShows'],
    });
  }

  async findByVendor(vendorId: string): Promise<Show[]> {
    return await this.showRepository.find({
      where: { vendorId, isActive: true },
      relations: ['vendor', 'dj', 'favoriteShows'],
    });
  }

  async findByDJ(djId: string): Promise<Show[]> {
    return await this.showRepository.find({
      where: { djId, isActive: true },
      relations: ['vendor', 'dj', 'favoriteShows'],
    });
  }

  /**
   * Normalize venue name to handle common variations
   */
  private normalizeVenueName(venueName: string): string[] {
    const normalized = venueName
      .toLowerCase()
      .replace(/[''"]/g, '') // Remove quotes/apostrophes
      .replace(/&/g, 'and') // Normalize ampersands
      .replace(/\s+/g, ' ') // Normalize spaces
      .trim();

    // Generate common variations
    const variations = new Set<string>();
    variations.add(venueName); // Original
    variations.add(normalized); // Normalized

    // Handle specific known variations
    if (
      normalized.includes('oneilly') ||
      normalized.includes('onelly') ||
      normalized.includes('nelly')
    ) {
      variations.add('oneillys sports pub');
      variations.add('onellys sports pub and grill');
      variations.add('o nellys sports pub and grill');
      variations.add("oneilly's sports pub");
      variations.add("o'nelly's sports pub & grill");
    }

    return Array.from(variations);
  }

  async findByVenue(venueName: string): Promise<Show[]> {
    console.log('🏢 Service findByVenue called with:', venueName);

    // Get venue name variations
    const venueVariations = this.normalizeVenueName(venueName);
    console.log('🏢 Searching for venue variations:', venueVariations);

    // Search for all variations
    const allShows = await this.showRepository
      .createQueryBuilder('show')
      .leftJoinAndSelect('show.vendor', 'vendor')
      .leftJoinAndSelect('show.dj', 'dj')
      .leftJoinAndSelect('show.favoriteShows', 'favoriteShows')
      .where('show.isActive = :isActive', { isActive: true })
      .andWhere('LOWER(show.venue) IN (:...venues)', {
        venues: venueVariations.map((v) => v.toLowerCase()),
      })
      .addOrderBy(
        // Order by day of week (Monday=1, Tuesday=2, etc.)
        `CASE show.day 
          WHEN 'monday' THEN 1
          WHEN 'tuesday' THEN 2
          WHEN 'wednesday' THEN 3
          WHEN 'thursday' THEN 4
          WHEN 'friday' THEN 5
          WHEN 'saturday' THEN 6
          WHEN 'sunday' THEN 7
          ELSE 8
        END`,
        'ASC',
      )
      .addOrderBy('show.startTime', 'ASC')
      .getMany();

    console.log('🏢 Total shows found for all variations:', allShows.length);

    return allShows;
  }

  async findByDay(day: DayOfWeek): Promise<Show[]> {
    return await this.showRepository.find({
      where: { day, isActive: true },
      relations: ['vendor', 'dj', 'favoriteShows'],
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
        .leftJoinAndSelect('show.favoriteShows', 'favoriteShows')
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

  async getCitySummary(day?: DayOfWeek): Promise<CitySummary[]> {
    this.logger.log(`Getting city summary${day ? ` for ${day}` : ''}`);

    try {
      // Read locations data
      const locationsPath = path.join(process.cwd(), 'data', 'locations.json');
      let locationsData: any = {};

      try {
        const locationsFile = fs.readFileSync(locationsPath, 'utf8');
        locationsData = JSON.parse(locationsFile);
      } catch (error) {
        this.logger.warn('Could not read locations.json, falling back to database only');
      }

      // Get show counts from database
      const queryBuilder = this.showRepository
        .createQueryBuilder('show')
        .leftJoinAndSelect('show.vendor', 'vendor')
        .where('show.isActive = :isActive', { isActive: true })
        .andWhere('show.city IS NOT NULL')
        .andWhere('show.state IS NOT NULL');

      if (day) {
        queryBuilder.andWhere('show.day = :day', { day });
      }

      const shows = await queryBuilder.getMany();

      // Group shows by city and state
      const cityShowCounts = new Map<
        string,
        {
          city: string;
          state: string;
          showCount: number;
          vendors: Set<string>;
        }
      >();

      shows.forEach((show) => {
        const key = `${show.city}-${show.state}`;

        if (!cityShowCounts.has(key)) {
          cityShowCounts.set(key, {
            city: show.city,
            state: show.state,
            showCount: 0,
            vendors: new Set(),
          });
        }

        const cityData = cityShowCounts.get(key);
        if (cityData) {
          cityData.showCount++;
          cityData.vendors.add(show.vendor?.name || 'Unknown');
        }
      });

      // Combine with locations data
      const citySummaries: CitySummary[] = [];

      for (const [stateName, cities] of Object.entries(locationsData)) {
        if (Array.isArray(cities)) {
          for (const cityInfo of cities) {
            if (typeof cityInfo === 'object' && cityInfo.city) {
              const key = `${cityInfo.city}-${stateName}`;
              const showData = cityShowCounts.get(key);

              // Only include cities that have shows
              if (showData && showData.showCount > 0) {
                citySummaries.push({
                  city: cityInfo.city,
                  state: stateName,
                  showCount: showData.showCount,
                  lat: cityInfo.lat,
                  lng: cityInfo.lng,
                  vendors: Array.from(showData.vendors),
                });
              }
            }
          }
        }
      }

      // Add any cities from database that aren't in locations.json
      for (const [key, cityData] of cityShowCounts.entries()) {
        const existingCity = citySummaries.find(
          (c) => c.city === cityData.city && c.state === cityData.state,
        );

        if (!existingCity) {
          // Try to get lat/lng from any show in this city that has coordinates
          const cityShows = shows.filter(
            (s) => s.city === cityData.city && s.state === cityData.state,
          );
          const showWithCoords = cityShows.find((s) => s.lat && s.lng);

          if (showWithCoords && showWithCoords.lat && showWithCoords.lng) {
            citySummaries.push({
              city: cityData.city,
              state: cityData.state,
              showCount: cityData.showCount,
              lat: Number(showWithCoords.lat),
              lng: Number(showWithCoords.lng),
              vendors: Array.from(cityData.vendors),
            });
            this.logger.log(
              `Added missing city to summary: ${cityData.city}, ${cityData.state} (${cityData.showCount} shows)`,
            );
          } else {
            // Fallback: Use Google Geocoding API to get city coordinates
            try {
              const geocodeResult = await this.geocodingService.geocodeAddress(
                `${cityData.city}, ${cityData.state}`,
              );
              if (geocodeResult) {
                citySummaries.push({
                  city: cityData.city,
                  state: cityData.state,
                  showCount: cityData.showCount,
                  lat: geocodeResult.lat,
                  lng: geocodeResult.lng,
                  vendors: Array.from(cityData.vendors),
                });
                this.logger.log(
                  `Geocoded and added missing city: ${cityData.city}, ${cityData.state} (${cityData.showCount} shows)`,
                );
              } else {
                this.logger.warn(
                  `Could not geocode city: ${cityData.city}, ${cityData.state} - skipping`,
                );
              }
            } catch (error) {
              this.logger.warn(`Geocoding failed for ${cityData.city}, ${cityData.state}:`, error);
            }
          }
        }
      }

      this.logger.log(`Found ${citySummaries.length} cities with shows`);
      return citySummaries;
    } catch (error) {
      this.logger.error('Error getting city summary:', error);
      throw error;
    }
  }

  /**
   * Search shows by venue name, vendor name, address, city, or DJ name with enhanced partial matching
   */
  async searchShows(query: string, limit: number = 20): Promise<Show[]> {
    if (!query || query.trim().length < 1) {
      return [];
    }

    const searchTerms = query.trim().toLowerCase().split(/\s+/);

    try {
      const shows = await this.showRepository
        .createQueryBuilder('show')
        .leftJoinAndSelect('show.vendor', 'vendor')
        .leftJoinAndSelect('show.dj', 'dj')
        .leftJoinAndSelect('show.favoriteShows', 'favoriteShows')
        .where('show.isActive = :isActive', { isActive: true })
        .andWhere(
          new Brackets((qb) => {
            searchTerms.forEach((term, index) => {
              const termParam = `searchTerm${index}`;
              const wildcardTerm = `%${term}%`;

              const condition = new Brackets((subQb) => {
                subQb
                  .where(`LOWER(show.venue) LIKE :${termParam}`, { [termParam]: wildcardTerm })
                  .orWhere(`LOWER(show.address) LIKE :${termParam}`, { [termParam]: wildcardTerm })
                  .orWhere(`LOWER(show.city) LIKE :${termParam}`, { [termParam]: wildcardTerm })
                  .orWhere(`LOWER(vendor.name) LIKE :${termParam}`, { [termParam]: wildcardTerm })
                  .orWhere(`LOWER(dj.name) LIKE :${termParam}`, { [termParam]: wildcardTerm });
              });

              if (index === 0) {
                qb.where(condition);
              } else {
                qb.andWhere(condition);
              }
            });
          }),
        )
        .orderBy(
          // Prioritize exact matches and better relevance
          `CASE 
            WHEN LOWER(show.venue) LIKE :exactVenue THEN 1
            WHEN LOWER(dj.name) LIKE :exactDJ THEN 2
            WHEN LOWER(vendor.name) LIKE :exactVendor THEN 3
            WHEN LOWER(show.city) LIKE :exactCity THEN 4
            ELSE 5
          END`,
          'ASC',
        )
        .addOrderBy('show.venue', 'ASC')
        .addOrderBy('show.day', 'ASC')
        .addOrderBy('show.startTime', 'ASC')
        .setParameters({
          exactVenue: `%${query.trim().toLowerCase()}%`,
          exactDJ: `%${query.trim().toLowerCase()}%`,
          exactVendor: `%${query.trim().toLowerCase()}%`,
          exactCity: `%${query.trim().toLowerCase()}%`,
        })
        .take(limit)
        .getMany();

      this.logger.log(`Search for "${query}" returned ${shows.length} results`);
      return shows;
    } catch (error) {
      this.logger.error('Error searching shows:', error);
      throw error;
    }
  }
}
