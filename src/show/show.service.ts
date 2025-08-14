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
  lat?: number;
  lng?: number;
}

export interface UpdateShowDto {
  vendorId?: string;
  djId?: string;
  address?: string;
  day?: DayOfWeek;
  startTime?: string;
  endTime?: string;
  description?: string;
  lat?: number;
  lng?: number;
  isActive?: boolean;
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
    // If coordinates aren't provided but address is, try to geocode
    let lat = createShowDto.lat;
    let lng = createShowDto.lng;

    if (!lat || !lng) {
      if (createShowDto.address) {
        try {
          const geocodeResult = await this.geocodingService.geocodeAddress(createShowDto.address);
          if (geocodeResult) {
            lat = geocodeResult.lat;
            lng = geocodeResult.lng;
            this.logger.log(
              `Geocoded address "${createShowDto.address}" to coordinates: ${lat}, ${lng}`,
            );
          }
        } catch (error) {
          this.logger.warn(`Failed to geocode address "${createShowDto.address}":`, error);
        }
      }
    }

    const show = this.showRepository.create({
      ...createShowDto,
      lat,
      lng,
    });

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

  async update(id: string, updateShowDto: UpdateShowDto): Promise<Show> {
    // If address is being updated but coordinates aren't provided, try to geocode
    let updateData = { ...updateShowDto };

    if (updateShowDto.address && (!updateShowDto.lat || !updateShowDto.lng)) {
      try {
        const geocodeResult = await this.geocodingService.geocodeAddress(updateShowDto.address);
        if (geocodeResult) {
          updateData.lat = geocodeResult.lat;
          updateData.lng = geocodeResult.lng;
          this.logger.log(
            `Geocoded updated address "${updateShowDto.address}" to coordinates: ${updateData.lat}, ${updateData.lng}`,
          );
        }
      } catch (error) {
        this.logger.warn(`Failed to geocode updated address "${updateShowDto.address}":`, error);
      }
    }

    await this.showRepository.update(id, updateData);
    return await this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    await this.showRepository.update(id, { isActive: false });
  }

  // Batch geocode shows that don't have coordinates
  async geocodeExistingShows(): Promise<{ processed: number; geocoded: number; errors: number }> {
    const showsWithoutCoords = await this.showRepository.find({
      where: { isActive: true },
      select: ['id', 'address', 'lat', 'lng'],
    });

    const needGeocoding = showsWithoutCoords.filter(
      (show) => show.address && (!show.lat || !show.lng),
    );

    if (needGeocoding.length === 0) {
      this.logger.log('No shows require geocoding');
      return { processed: 0, geocoded: 0, errors: 0 };
    }

    this.logger.log(`Geocoding ${needGeocoding.length} shows...`);

    let geocoded = 0;
    let errors = 0;

    // Process shows individually to handle errors gracefully
    for (const show of needGeocoding) {
      try {
        const geocodeResult = await this.geocodingService.geocodeAddress(show.address);
        if (geocodeResult) {
          await this.showRepository.update(show.id, {
            lat: geocodeResult.lat,
            lng: geocodeResult.lng,
          });
          geocoded++;
          this.logger.log(
            `Geocoded show ${show.id}: ${show.address} -> ${geocodeResult.lat}, ${geocodeResult.lng}`,
          );
        } else {
          errors++;
          this.logger.warn(`Failed to geocode show ${show.id}: ${show.address}`);
        }
      } catch (error) {
        errors++;
        this.logger.error(`Error geocoding show ${show.id}:`, error);
      }
    }

    this.logger.log(
      `Geocoding complete: ${geocoded} success, ${errors} errors out of ${needGeocoding.length} shows`,
    );

    return {
      processed: needGeocoding.length,
      geocoded,
      errors,
    };
  }
}
