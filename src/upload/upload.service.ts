import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vendor } from '../vendor/vendor.entity';
import { DJ } from '../dj/dj.entity';
import { Show } from '../show/show.entity';
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
  ) {}

  async fetchLocalData(): Promise<UploadDataDto> {
    this.logger.log('Fetching local database data...');

    try {
      // Fetch all entities from local database
      const vendors = await this.vendorRepository.find();
      const djs = await this.djRepository.find({ relations: ['vendor'] });
      const shows = await this.showRepository.find({ relations: ['dj', 'dj.vendor'] });

      // Transform entities to DTOs
      const vendorDtos = vendors.map(vendor => ({
        name: vendor.name,
        owner: vendor.owner || '',
        website: vendor.website || '',
        description: vendor.description,
      }));

      const djDtos = djs.map(dj => ({
        name: dj.name,
        vendorName: dj.vendor?.name || '',
      }));

      const showDtos = shows.map(show => ({
        venue: show.venue,
        address: show.address,
        city: show.city,
        state: show.state,
        zip: show.zip,
        day: show.day,
        startTime: show.startTime,
        endTime: show.endTime,
        djName: show.dj?.name || '',
        vendorName: show.dj?.vendor?.name || '',
        description: show.description,
        venuePhone: show.venuePhone,
        venueWebsite: show.venueWebsite,
        lat: show.lat?.toString(),
        lng: show.lng?.toString(),
      }));

      this.logger.log(`Fetched ${vendorDtos.length} vendors, ${djDtos.length} DJs, ${showDtos.length} shows`);

      return {
        vendors: vendorDtos,
        djs: djDtos,
        shows: showDtos,
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
