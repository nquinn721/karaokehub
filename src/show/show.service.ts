import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GeocodingService } from '../geocoding/geocoding.service';
import { CreateVenueDto } from '../venue/dto/venue.dto';
import { VenueService } from '../venue/venue.service';
import { CreateShowDto, UpdateShowDto } from './dto/show.dto';
import { DayOfWeek, Show } from './show.entity';

export interface GeocodedShow extends Show {
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

// Legacy interface for backward compatibility
export interface LegacyShowData {
  djId?: string;
  venue?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  lat?: number;
  lng?: number;
  venuePhone?: string;
  venueWebsite?: string;
  day?: DayOfWeek;
  startTime?: string;
  endTime?: string;
  description?: string;
  source?: string;
}

@Injectable()
export class ShowService {
  private readonly logger = new Logger(ShowService.name);

  constructor(
    @InjectRepository(Show)
    private showRepository: Repository<Show>,
    private geocodingService: GeocodingService,
    private venueService: VenueService,
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

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Create a new show with venue handling
   */
  async create(createShowDto: CreateShowDto): Promise<Show> {
    // Validate that either venueId or venue creation data is provided
    if (!createShowDto.venueId && !createShowDto.venueName) {
      throw new BadRequestException('Either venue ID or venue name is required to create a show');
    }

    let venueId = createShowDto.venueId;

    // If no venueId provided, create or find venue
    if (!venueId && createShowDto.venueName) {
      // Validate that if creating a venue, address is provided
      if (!createShowDto.venueAddress) {
        throw new BadRequestException('Address is required when creating a new venue');
      }

      const venueDto: CreateVenueDto = {
        name: createShowDto.venueName,
        address: createShowDto.venueAddress,
        city: createShowDto.venueCity,
        state: createShowDto.venueState,
        zip: createShowDto.venueZip,
        phone: createShowDto.venuePhone,
        website: createShowDto.venueWebsite,
        userSubmitted: createShowDto.userSubmitted || false,
      };

      const venue = await this.venueService.findOrCreate(venueDto);
      venueId = venue.id;
    }

    // Final validation - ensure we have both DJ and venue
    if (!createShowDto.djId) {
      throw new BadRequestException('DJ is required to create a show');
    }
    if (!venueId) {
      throw new BadRequestException('Venue is required to create a show');
    }

    const show = this.showRepository.create({
      djId: createShowDto.djId,
      venueId,
      day: createShowDto.day,
      startTime: createShowDto.startTime,
      endTime: createShowDto.endTime,
      description: createShowDto.description,
      source: createShowDto.source,
      userSubmitted: createShowDto.userSubmitted || false,
    });

    return await this.showRepository.save(show);
  }

  /**
   * Legacy method to create show from old data format
   */
  async createFromLegacyData(legacyData: LegacyShowData): Promise<Show> {
    return await this.create({
      djId: legacyData.djId,
      venueName: legacyData.venue,
      venueAddress: legacyData.address,
      venueCity: legacyData.city,
      venueState: legacyData.state,
      venueZip: legacyData.zip,
      venuePhone: legacyData.venuePhone,
      venueWebsite: legacyData.venueWebsite,
      day: legacyData.day,
      startTime: legacyData.startTime,
      endTime: legacyData.endTime,
      description: legacyData.description,
      source: legacyData.source,
    });
  }

  async findAll(): Promise<Show[]> {
    return await this.showRepository.find({
      relations: ['dj', 'dj.vendor', 'venue', 'favoriteShows'],
      where: { isActive: true, isValid: true, isFlagged: false },
    });
  }

  async findOne(id: string): Promise<Show> {
    return await this.showRepository.findOne({
      where: { id },
      relations: ['dj', 'dj.vendor', 'venue', 'favoriteShows'],
    });
  }

  async findByDay(day: DayOfWeek): Promise<Show[]> {
    return await this.showRepository.find({
      where: { day, isActive: true, isValid: true, isFlagged: false },
      relations: ['dj', 'dj.vendor', 'venue', 'favoriteShows'],
    });
  }

  async findNearby(
    centerLat: number,
    centerLng: number,
    radiusMiles: number = 35,
    day?: DayOfWeek,
  ): Promise<GeocodedShow[]> {
    try {
      // Build the base query with distance calculation using venue coordinates
      let query = this.showRepository
        .createQueryBuilder('show')
        .leftJoinAndSelect('show.dj', 'dj')
        .leftJoinAndSelect('dj.vendor', 'vendor')
        .leftJoinAndSelect('show.venue', 'venue')
        .leftJoinAndSelect('show.favoriteShows', 'favoriteShows')
        .addSelect(
          `(3959 * acos(cos(radians(:centerLat)) * cos(radians(venue.lat)) * 
           cos(radians(venue.lng) - radians(:centerLng)) + 
           sin(radians(:centerLat)) * sin(radians(venue.lat))))`,
          'distance',
        )
        .where('show.isActive = :isActive', { isActive: true })
        .andWhere('show.isValid = :isValid', { isValid: true })
        .andWhere('show.isFlagged = :isFlagged', { isFlagged: false })
        .andWhere('venue.lat IS NOT NULL')
        .andWhere('venue.lng IS NOT NULL')
        .having(
          `(3959 * acos(cos(radians(:centerLat)) * cos(radians(venue.lat)) * 
           cos(radians(venue.lng) - radians(:centerLng)) + 
           sin(radians(:centerLat)) * sin(radians(venue.lat)))) <= :radiusMiles`,
        )
        .setParameters({
          centerLat,
          centerLng,
          radiusMiles,
          isActive: true,
          isValid: true,
          isFlagged: false,
        })
        .orderBy('distance', 'ASC');

      // Add day filter if specified
      if (day) {
        query = query.andWhere('show.day = :day', { day });
      }

      const results = await query.getRawAndEntities();

      // Map results to include distance
      const nearbyShows: GeocodedShow[] = results.entities.map((entity, index) => {
        const distanceValue = parseFloat(results.raw[index].distance) || 0;
        return Object.assign(entity, { distance: distanceValue });
      });

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
    // Get the current show to check if we're trying to remove required fields
    const currentShow = await this.findOne(id);

    // Prevent removing DJ or venue from a show
    if (updateShowDto.djId === null || updateShowDto.djId === '') {
      throw new BadRequestException('DJ cannot be removed from a show');
    }

    if (updateShowDto.venueId === null || updateShowDto.venueId === '') {
      throw new BadRequestException('Venue cannot be removed from a show');
    }

    await this.showRepository.update(id, updateShowDto);
    return await this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    await this.showRepository.update(id, { isActive: false });
  }

  /**
   * Get shows by location (using venue data)
   */
  async findByLocation(city: string, state: string): Promise<Show[]> {
    return await this.showRepository
      .createQueryBuilder('show')
      .leftJoinAndSelect('show.dj', 'dj')
      .leftJoinAndSelect('dj.vendor', 'vendor')
      .leftJoinAndSelect('show.venue', 'venue')
      .leftJoinAndSelect('show.favoriteShows', 'favoriteShows')
      .where('show.isActive = :isActive', { isActive: true })
      .andWhere('show.isValid = :isValid', { isValid: true })
      .andWhere('show.isFlagged = :isFlagged', { isFlagged: false })
      .andWhere('LOWER(venue.city) = LOWER(:city)', { city })
      .andWhere('LOWER(venue.state) = LOWER(:state)', { state })
      .orderBy('venue.name', 'ASC')
      .addOrderBy('show.day', 'ASC')
      .addOrderBy('show.startTime', 'ASC')
      .getMany();
  }

  /**
   * Get city summary for a specific day
   */
  async getCitySummary(day?: DayOfWeek): Promise<CitySummary[]> {
    return this.getCitySummaries(); // For now, ignore day parameter
  }

  /**
   * Get city summaries (using venue data)
   */
  async getCitySummaries(): Promise<CitySummary[]> {
    const results = await this.showRepository
      .createQueryBuilder('show')
      .leftJoin('show.venue', 'venue')
      .leftJoin('show.dj', 'dj')
      .leftJoin('dj.vendor', 'vendor')
      .select('venue.city', 'city')
      .addSelect('venue.state', 'state')
      .addSelect('COUNT(DISTINCT show.id)', 'showCount')
      .addSelect('AVG(venue.lat)', 'lat')
      .addSelect('AVG(venue.lng)', 'lng')
      .addSelect('array_agg(DISTINCT vendor.name)', 'vendors')
      .where('show.isActive = :isActive', { isActive: true })
      .andWhere('show.isValid = :isValid', { isValid: true })
      .andWhere('show.isFlagged = :isFlagged', { isFlagged: false })
      .andWhere('venue.city IS NOT NULL')
      .andWhere('venue.state IS NOT NULL')
      .groupBy('venue.city, venue.state')
      .having('COUNT(DISTINCT show.id) > 0')
      .orderBy('COUNT(DISTINCT show.id)', 'DESC')
      .getRawMany();

    return results.map((result) => ({
      city: result.city,
      state: result.state,
      showCount: parseInt(result.showCount, 10),
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lng),
      vendors: result.vendors ? result.vendors.filter(Boolean) : [],
    }));
  }

  /**
   * Migration helper: Populate venues from legacy show data
   */
  async migrateLegacyVenueData(): Promise<{ processed: number; venues: number; errors: number }> {
    this.logger.warn('Legacy migration method - venue data should already be migrated');
    return { processed: 0, venues: 0, errors: 0 };
  }

  // Note: Remove these methods after migration is complete
  async geocodeExistingShows(): Promise<{ processed: number; geocoded: number; errors: number }> {
    this.logger.warn('geocodeExistingShows is deprecated. Use VenueService geocoding instead.');
    return { processed: 0, geocoded: 0, errors: 0 };
  }

  /**
   * Search shows by query string
   */
  async searchShows(query: string, limit: number = 20): Promise<Show[]> {
    return this.showRepository
      .createQueryBuilder('show')
      .leftJoinAndSelect('show.venue', 'venue')
      .leftJoinAndSelect('show.dj', 'dj')
      .leftJoinAndSelect('dj.vendor', 'vendor')
      .where('show.isActive = :isActive', { isActive: true })
      .andWhere('show.isValid = :isValid', { isValid: true })
      .andWhere('show.isFlagged = :isFlagged', { isFlagged: false })
      .andWhere(
        '(LOWER(venue.name) LIKE LOWER(:query) OR LOWER(venue.address) LIKE LOWER(:query) OR LOWER(venue.city) LIKE LOWER(:query) OR LOWER(dj.name) LIKE LOWER(:query) OR LOWER(vendor.name) LIKE LOWER(:query))',
        { query: `%${query}%` },
      )
      .orderBy('venue.name', 'ASC')
      .addOrderBy('show.day', 'ASC')
      .addOrderBy('show.startTime', 'ASC')
      .limit(limit)
      .getMany();
  }

  /**
   * Find shows by vendor ID
   */
  async findByVendor(vendorId: string): Promise<Show[]> {
    return this.showRepository
      .createQueryBuilder('show')
      .leftJoinAndSelect('show.venue', 'venue')
      .leftJoinAndSelect('show.dj', 'dj')
      .leftJoinAndSelect('dj.vendor', 'vendor')
      .where('show.isActive = :isActive', { isActive: true })
      .andWhere('show.isValid = :isValid', { isValid: true })
      .andWhere('show.isFlagged = :isFlagged', { isFlagged: false })
      .andWhere('vendor.id = :vendorId', { vendorId })
      .orderBy('venue.name', 'ASC')
      .addOrderBy('show.day', 'ASC')
      .addOrderBy('show.startTime', 'ASC')
      .getMany();
  }

  /**
   * Find shows by DJ ID
   */
  async findByDJ(djId: string): Promise<Show[]> {
    return this.showRepository
      .createQueryBuilder('show')
      .leftJoinAndSelect('show.venue', 'venue')
      .leftJoinAndSelect('show.dj', 'dj')
      .leftJoinAndSelect('dj.vendor', 'vendor')
      .where('show.isActive = :isActive', { isActive: true })
      .andWhere('show.isValid = :isValid', { isValid: true })
      .andWhere('show.isFlagged = :isFlagged', { isFlagged: false })
      .andWhere('dj.id = :djId', { djId })
      .orderBy('venue.name', 'ASC')
      .addOrderBy('show.day', 'ASC')
      .addOrderBy('show.startTime', 'ASC')
      .getMany();
  }

  /**
   * Find shows by venue name
   */
  async findByVenue(venueName: string): Promise<Show[]> {
    return this.showRepository
      .createQueryBuilder('show')
      .leftJoinAndSelect('show.venue', 'venue')
      .leftJoinAndSelect('show.dj', 'dj')
      .leftJoinAndSelect('dj.vendor', 'vendor')
      .where('show.isActive = :isActive', { isActive: true })
      .andWhere('show.isValid = :isValid', { isValid: true })
      .andWhere('show.isFlagged = :isFlagged', { isFlagged: false })
      .andWhere('LOWER(venue.name) = LOWER(:venueName)', { venueName })
      .orderBy('show.day', 'ASC')
      .addOrderBy('show.startTime', 'ASC')
      .getMany();
  }

  /**
   * Re-geocode shows with invalid coordinates
   */
  async reGeocodeInvalidShows(): Promise<{ processed: number; geocoded: number; errors: number }> {
    this.logger.warn('reGeocodeInvalidShows is deprecated. Use VenueService geocoding instead.');
    return { processed: 0, geocoded: 0, errors: 0 };
  }

  /**
   * Mark a show as invalid
   */
  async markAsInvalid(id: string): Promise<Show> {
    await this.showRepository.update(id, { isValid: false });
    return this.showRepository.findOne({
      where: { id },
      relations: ['venue', 'dj', 'dj.vendor'],
    });
  }

  /**
   * Mark a show as valid
   */
  async markAsValid(id: string): Promise<Show> {
    await this.showRepository.update(id, { isValid: true });
    return this.showRepository.findOne({
      where: { id },
      relations: ['venue', 'dj', 'dj.vendor'],
    });
  }

  /**
   * Find invalid shows
   */
  async findInvalidShows(): Promise<Show[]> {
    return this.showRepository
      .createQueryBuilder('show')
      .leftJoinAndSelect('show.venue', 'venue')
      .leftJoinAndSelect('show.dj', 'dj')
      .leftJoinAndSelect('dj.vendor', 'vendor')
      .where('show.isActive = :isActive', { isActive: true })
      .andWhere('show.isValid = :isValid', { isValid: false })
      .orderBy('venue.name', 'ASC')
      .addOrderBy('show.day', 'ASC')
      .addOrderBy('show.startTime', 'ASC')
      .getMany();
  }

  /**
   * Flag a show as problematic
   */
  async flagShow(id: string, userId: string): Promise<Show> {
    await this.showRepository.update(id, { isFlagged: true });
    this.logger.log(`Show ${id} flagged by user ${userId}`);
    return this.showRepository.findOne({
      where: { id },
      relations: ['venue', 'dj', 'dj.vendor'],
    });
  }

  /**
   * Unflag a show
   */
  async unflagShow(id: string, userId: string): Promise<Show> {
    await this.showRepository.update(id, { isFlagged: false });
    this.logger.log(`Show ${id} unflagged by user ${userId}`);
    return this.showRepository.findOne({
      where: { id },
      relations: ['venue', 'dj', 'dj.vendor'],
    });
  }
}
