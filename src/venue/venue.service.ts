import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateVenueDto, UpdateVenueDto, VenueSearchFilters } from './dto/venue.dto';
import { Venue } from './venue.entity';

@Injectable()
export class VenueService {
  constructor(
    @InjectRepository(Venue)
    private venueRepository: Repository<Venue>,
  ) {}

  /**
   * Create a new venue
   */
  async create(createVenueDto: CreateVenueDto): Promise<Venue> {
    // Additional validation to ensure address is provided
    if (!createVenueDto.address) {
      throw new BadRequestException('Address is required to create a venue');
    }

    const venue = this.venueRepository.create({
      ...createVenueDto,
    });
    return await this.venueRepository.save(venue);
  }

  /**
   * Find venue by ID
   */
  async findById(id: string): Promise<Venue> {
    const venue = await this.venueRepository.findOne({
      where: { id },
      relations: ['shows'],
    });

    if (!venue) {
      throw new NotFoundException(`Venue with ID ${id} not found`);
    }

    return venue;
  }

  /**
   * Find venue by name and location (for deduplication)
   */
  async findByNameAndLocation(
    name: string,
    city?: string,
    state?: string,
    address?: string,
  ): Promise<Venue | null> {
    const query = this.venueRepository.createQueryBuilder('venue');

    // Exact name match (case insensitive)
    query.where('LOWER(venue.name) = LOWER(:name)', { name });

    // If we have city/state, match those
    if (city && state) {
      query.andWhere('LOWER(venue.city) = LOWER(:city)', { city });
      query.andWhere('LOWER(venue.state) = LOWER(:state)', { state });
    }

    // If we have address, match that too for higher confidence
    if (address) {
      query.andWhere('LOWER(venue.address) = LOWER(:address)', { address });
    }

    return await query.getOne();
  }

  /**
   * Search venues with filters
   */
  async search(filters: VenueSearchFilters = {}): Promise<Venue[]> {
    const query = this.venueRepository.createQueryBuilder('venue');

    if (filters.city) {
      query.andWhere('LOWER(venue.city) = LOWER(:city)', { city: filters.city });
    }

    if (filters.state) {
      query.andWhere('LOWER(venue.state) = LOWER(:state)', { state: filters.state });
    }

    if (filters.isActive !== undefined) {
      query.andWhere('venue.isActive = :isActive', { isActive: filters.isActive });
    }

    if (filters.search) {
      query.andWhere('LOWER(venue.name) LIKE LOWER(:search)', {
        search: `%${filters.search}%`,
      });
    }

    return await query.orderBy('venue.name', 'ASC').getMany();
  }

  /**
   * Update venue
   */
  async update(id: string, updateVenueDto: UpdateVenueDto): Promise<Venue> {
    const venue = await this.findById(id);

    // If trying to clear the address, prevent it
    if (updateVenueDto.address === '' || updateVenueDto.address === null) {
      throw new BadRequestException('Address cannot be removed from a venue');
    }

    Object.assign(venue, updateVenueDto);
    return await this.venueRepository.save(venue);
  }

  /**
   * Soft delete venue (mark as inactive)
   */
  async softDelete(id: string): Promise<void> {
    const venue = await this.findById(id);
    venue.isActive = false;
    await this.venueRepository.save(venue);
  }

  /**
   * Get all venues for a specific city/state
   */
  async getByLocation(city: string, state: string): Promise<Venue[]> {
    return await this.venueRepository.find({
      where: {
        city,
        state,
        isActive: true,
      },
      order: {
        name: 'ASC',
      },
    });
  }

  /**
   * Find or create venue (for parser system)
   */
  async findOrCreate(venueData: CreateVenueDto): Promise<Venue> {
    // Try to find existing venue
    const existing = await this.findByNameAndLocation(
      venueData.name,
      venueData.city,
      venueData.state,
      venueData.address,
    );

    if (existing) {
      let updated = false;

      // Update location data if we have better information
      if (venueData.lat && venueData.lng && (!existing.lat || !existing.lng)) {
        existing.lat = venueData.lat;
        existing.lng = venueData.lng;
        updated = true;
      }

      // Mark as user submitted if this submission is user-generated
      if (venueData.submittedBy && !existing.submittedBy) {
        existing.submittedBy = venueData.submittedBy;
        updated = true;
      }

      if (updated) {
        return await this.venueRepository.save(existing);
      }

      return existing;
    }

    // Create new venue
    return await this.create(venueData);
  }
}
