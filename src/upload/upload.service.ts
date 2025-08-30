import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DJ } from '../dj/dj.entity';
import { Show } from '../show/show.entity';
import { Vendor } from '../vendor/vendor.entity';
import { Venue } from '../venue/venue.entity';
import { UploadDataDto } from './dto/upload.dto';

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);

  constructor(
    @InjectRepository(Vendor)
    private vendorRepository: Repository<Vendor>,
    @InjectRepository(DJ)
    private djRepository: Repository<DJ>,
    @InjectRepository(Show)
    private showRepository: Repository<Show>,
    @InjectRepository(Venue)
    private venueRepository: Repository<Venue>,
  ) {}

  async fetchLocalData(): Promise<UploadDataDto> {
    this.logger.log('Fetching local database data...');

    try {
      // Fetch all entities from local database
      const vendors = await this.vendorRepository.find();
      const djs = await this.djRepository.find({ relations: ['vendor'] });
      const shows = await this.showRepository.find({ relations: ['dj', 'dj.vendor', 'venue'] });
      const venues = await this.venueRepository.find();

      // Transform entities to DTOs
      const vendorDtos = vendors.map((vendor) => ({
        name: vendor.name,
        website: vendor.website || '',
        description: vendor.description,
      }));

      const djDtos = djs.map((dj) => ({
        name: dj.name,
        vendorName: dj.vendor?.name || '',
      }));

      const venueDtos = venues.map((venue) => ({
        name: venue.name,
        address: venue.address || '',
        city: venue.city || '',
        state: venue.state || '',
        zip: venue.zip || '',
        lat: venue.lat?.toString() || '',
        lng: venue.lng?.toString() || '',
        phone: venue.phone || '',
        website: venue.website || '',
        description: venue.description || '',
      }));

      const showDtos = shows.map((show) => ({
        venue: show.venue?.name || '',
        address: show.venue?.address || '',
        city: show.venue?.city || '',
        state: show.venue?.state || '',
        zip: show.venue?.zip || '',
        day: show.day,
        startTime: show.startTime,
        endTime: show.endTime,
        djName: show.dj?.name || '',
        vendorName: show.dj?.vendor?.name || '',
        description: show.description,
        venuePhone: show.venue?.phone || '',
        venueWebsite: show.venue?.website || '',
        lat: show.venue?.lat?.toString() || '',
        lng: show.venue?.lng?.toString() || '',
      }));

      this.logger.log(
        `Fetched ${vendorDtos.length} vendors, ${djDtos.length} DJs, ${showDtos.length} shows, ${venueDtos.length} venues`,
      );

      return {
        vendors: vendorDtos,
        djs: djDtos,
        shows: showDtos,
        venues: venueDtos,
        metadata: {
          source: 'local_database',
          uploadedAt: new Date().toISOString(),
          notes: 'Bulk upload from local development environment',
        },
      };
    } catch (error) {
      this.logger.error('Failed to fetch local data:', error);
      throw new Error(`Failed to fetch local database data: ${error.message}`);
    }
  }
}
