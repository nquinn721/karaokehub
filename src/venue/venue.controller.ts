import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { Venue } from './venue.entity';
import { CreateVenueDto, UpdateVenueDto, VenueSearchFilters, VenueService } from './venue.service';

@Controller('venues')
export class VenueController {
  constructor(private readonly venueService: VenueService) {}

  /**
   * Create a new venue
   */
  @Post()
  async create(@Body() createVenueDto: CreateVenueDto): Promise<Venue> {
    return await this.venueService.create(createVenueDto);
  }

  /**
   * Get venue by ID
   */
  @Get(':id')
  async findById(@Param('id') id: string): Promise<Venue> {
    return await this.venueService.findById(id);
  }

  /**
   * Search venues with optional filters
   */
  @Get()
  async search(
    @Query('city') city?: string,
    @Query('state') state?: string,
    @Query('search') search?: string,
    @Query('isActive') isActive?: string,
  ): Promise<Venue[]> {
    const filters: VenueSearchFilters = {};

    if (city) filters.city = city;
    if (state) filters.state = state;
    if (search) filters.search = search;
    if (isActive !== undefined) {
      filters.isActive = isActive === 'true';
    }

    return await this.venueService.search(filters);
  }

  /**
   * Update venue
   */
  @Put(':id')
  async update(@Param('id') id: string, @Body() updateVenueDto: UpdateVenueDto): Promise<Venue> {
    return await this.venueService.update(id, updateVenueDto);
  }

  /**
   * Soft delete venue (mark as inactive)
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async softDelete(@Param('id') id: string): Promise<void> {
    await this.venueService.softDelete(id);
  }

  /**
   * Get venues by location
   */
  @Get('location/:state/:city')
  async getByLocation(
    @Param('state') state: string,
    @Param('city') city: string,
  ): Promise<Venue[]> {
    return await this.venueService.getByLocation(city, state);
  }
}
