import { Body, Controller, Headers, Post, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DJService } from '../dj/dj.service';
import { Show } from '../show/show.entity';
import { ShowService } from '../show/show.service';
import { VendorService } from '../vendor/vendor.service';

export interface ProductionUploadData {
  vendors: any[];
  djs: any[];
  shows: any[];
}

@Controller('production-upload')
export class ProductionUploadController {
  constructor(
    private readonly configService: ConfigService,
    private readonly showService: ShowService,
    private readonly vendorService: VendorService,
    private readonly djService: DJService,
    @InjectRepository(Show)
    private readonly showRepository: Repository<Show>,
  ) {}

  @Post('data')
  async uploadData(
    @Body() data: ProductionUploadData,
    @Headers('x-upload-token') uploadToken: string,
  ) {
    // Verify upload token
    const expectedToken = this.configService.get<string>('PRODUCTION_UPLOAD_TOKEN');
    if (!expectedToken || uploadToken !== expectedToken) {
      throw new UnauthorizedException('Invalid upload token');
    }

    try {
      const results = {
        vendors: { created: 0, updated: 0, errors: 0 },
        djs: { created: 0, updated: 0, errors: 0 },
        shows: { created: 0, updated: 0, errors: 0 },
      };

      // Upload vendors
      for (const vendorData of data.vendors || []) {
        try {
          await this.vendorService.create(vendorData);
          results.vendors.created++;
        } catch (error) {
          console.error('Error uploading vendor:', error);
          results.vendors.errors++;
        }
      }

      // Upload DJs
      for (const djData of data.djs || []) {
        try {
          await this.djService.create(djData);
          results.djs.created++;
        } catch (error) {
          console.error('Error uploading DJ:', error);
          results.djs.errors++;
        }
      }

      // Upload shows with duplicate detection
      for (const showData of data.shows || []) {
        try {
          // Check for existing show with same vendor, day, time, venue, and DJ
          const existingShow = await this.showRepository.findOne({
            where: {
              vendorId: showData.vendorId || null,
              day: showData.day,
              time: showData.time,
              venue: showData.venue,
              djId: showData.djId || null,
            },
          });

          if (existingShow) {
            // Update existing show with any missing information
            let showUpdated = false;

            if (!existingShow.address && showData.address) {
              existingShow.address = showData.address;
              showUpdated = true;
            }
            if (!existingShow.venuePhone && showData.venuePhone) {
              existingShow.venuePhone = showData.venuePhone;
              showUpdated = true;
            }
            if (!existingShow.venueWebsite && showData.venueWebsite) {
              existingShow.venueWebsite = showData.venueWebsite;
              showUpdated = true;
            }
            if (!existingShow.description && showData.description) {
              existingShow.description = showData.description;
              showUpdated = true;
            }
            if (!existingShow.source && showData.source) {
              existingShow.source = showData.source;
              showUpdated = true;
            }
            if (!existingShow.city && showData.city) {
              existingShow.city = showData.city;
              showUpdated = true;
            }
            if (!existingShow.state && showData.state) {
              existingShow.state = showData.state;
              showUpdated = true;
            }
            if (!existingShow.zip && showData.zip) {
              existingShow.zip = showData.zip;
              showUpdated = true;
            }
            if ((!existingShow.lat || !existingShow.lng) && showData.lat && showData.lng) {
              existingShow.lat = showData.lat;
              existingShow.lng = showData.lng;
              showUpdated = true;
            }

            if (showUpdated) {
              await this.showRepository.save(existingShow);
              results.shows.updated++;
            } else {
              // Show exists and no updates needed, count as updated
              results.shows.updated++;
            }
          } else {
            // Create new show
            const newShow = this.showRepository.create(showData);
            await this.showRepository.save(newShow);
            results.shows.created++;
          }
        } catch (error) {
          console.error('Error uploading show:', error);
          results.shows.errors++;
        }
      }

      return {
        success: true,
        message: 'Data uploaded successfully',
        results,
      };
    } catch (error) {
      console.error('Production upload error:', error);
      throw new Error(`Upload failed: ${error.message}`);
    }
  }
}
