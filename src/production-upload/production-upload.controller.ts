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
      console.log('Production upload started:', {
        vendors: data.vendors?.length || 0,
        djs: data.djs?.length || 0,
        shows: data.shows?.length || 0,
      });

      const results = {
        vendors: { created: 0, updated: 0, errors: 0 },
        djs: { created: 0, updated: 0, errors: 0 },
        shows: { created: 0, updated: 0, errors: 0 },
      };

      // Upload vendors with duplicate detection
      for (const vendorData of data.vendors || []) {
        try {
          // Check for existing vendor by name
          const existingVendors = await this.vendorService.findAll();
          const existingVendor = existingVendors.find((v) => v.name === vendorData.name);

          if (existingVendor) {
            // Update existing vendor with any missing information
            let vendorUpdated = false;
            const updateData: any = {};

            if (!existingVendor.website && vendorData.website) {
              updateData.website = vendorData.website;
              vendorUpdated = true;
            }
            if (!existingVendor.description && vendorData.description) {
              updateData.description = vendorData.description;
              vendorUpdated = true;
            }

            if (vendorUpdated) {
              await this.vendorService.update(existingVendor.id, updateData);
              results.vendors.updated++;
            } else {
              // Vendor exists and no updates needed
              results.vendors.updated++;
            }
          } else {
            // Create new vendor
            await this.vendorService.create(vendorData);
            results.vendors.created++;
          }
        } catch (error) {
          console.error('Error uploading vendor:', error);
          results.vendors.errors++;
        }
      }

      // Upload DJs with duplicate detection
      for (const djData of data.djs || []) {
        try {
          // Find vendor by name to get vendorId
          const vendors = await this.vendorService.findAll();
          const vendor = vendors.find((v) => v.name === djData.vendorName);

          if (!vendor) {
            console.error(`Vendor not found for DJ: ${djData.name} (vendor: ${djData.vendorName})`);
            results.djs.errors++;
            continue;
          }

          // Check for existing DJ by name and vendor
          const existingDJs = await this.djService.findByVendor(vendor.id);
          const existingDJ = existingDJs.find((dj) => dj.name === djData.name);

          if (existingDJ) {
            // DJ already exists, count as updated
            results.djs.updated++;
          } else {
            // Create new DJ
            await this.djService.create({
              name: djData.name,
              vendorId: vendor.id,
            });
            results.djs.created++;
          }
        } catch (error) {
          console.error('Error uploading DJ:', error);
          results.djs.errors++;
        }
      }

      // Upload shows with duplicate detection
      for (const showData of data.shows || []) {
        try {
          // Find vendor and DJ by name to get their IDs
          const vendors = await this.vendorService.findAll();
          const vendor = vendors.find((v) => v.name === showData.vendorName);

          let dj = null;
          if (showData.djName && vendor) {
            const vendorDJs = await this.djService.findByVendor(vendor.id);
            dj = vendorDJs.find((d) => d.name === showData.djName);
          }

          // Prepare show data with resolved IDs
          const resolvedShowData = {
            ...showData,
            djId: dj?.id || null,
            time: showData.startTime, // Map startTime to time field for compatibility
            // Keep original startTime and endTime fields as well
            startTime: showData.startTime,
            endTime: showData.endTime,
          };

          // Check for existing show with same day, time, venue, and DJ
          const existingShow = await this.showRepository.findOne({
            where: {
              day: resolvedShowData.day,
              time: resolvedShowData.time,
              venue: resolvedShowData.venue,
              djId: resolvedShowData.djId,
            },
            relations: ['dj', 'dj.vendor'], // Load DJ and vendor relationships to check vendor match
          });

          if (existingShow) {
            // Check if existing show belongs to the same vendor (through DJ)
            const isSameVendor = existingShow?.dj?.vendor?.id === vendor?.id;

            if (isSameVendor) {
              // Update existing show with any missing information
              let showUpdated = false;

              if (!existingShow.address && resolvedShowData.address) {
                existingShow.address = resolvedShowData.address;
                showUpdated = true;
              }
              if (!existingShow.venuePhone && resolvedShowData.venuePhone) {
                existingShow.venuePhone = resolvedShowData.venuePhone;
                showUpdated = true;
              }
              if (!existingShow.venueWebsite && resolvedShowData.venueWebsite) {
                existingShow.venueWebsite = resolvedShowData.venueWebsite;
                showUpdated = true;
              }
              if (!existingShow.description && resolvedShowData.description) {
                existingShow.description = resolvedShowData.description;
                showUpdated = true;
              }
              if (!existingShow.source && resolvedShowData.source) {
                existingShow.source = resolvedShowData.source;
                showUpdated = true;
              }
              if (!existingShow.city && resolvedShowData.city) {
                existingShow.city = resolvedShowData.city;
                showUpdated = true;
              }
              if (!existingShow.state && resolvedShowData.state) {
                existingShow.state = resolvedShowData.state;
                showUpdated = true;
              }
              if (!existingShow.zip && resolvedShowData.zip) {
                existingShow.zip = resolvedShowData.zip;
                showUpdated = true;
              }
              if (
                (!existingShow.lat || !existingShow.lng) &&
                resolvedShowData.lat &&
                resolvedShowData.lng
              ) {
                existingShow.lat = resolvedShowData.lat;
                existingShow.lng = resolvedShowData.lng;
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
              // Show exists but belongs to different vendor, treat as new show
              const newShow = this.showRepository.create(resolvedShowData);
              await this.showRepository.save(newShow);
              results.shows.created++;
            }
          } else {
            // Create new show
            const newShow = this.showRepository.create(resolvedShowData);
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
        summary: `Created: ${results.vendors.created} vendors, ${results.djs.created} DJs, ${results.shows.created} shows. Updated: ${results.vendors.updated} vendors, ${results.djs.updated} DJs, ${results.shows.updated} shows. Errors: ${results.vendors.errors + results.djs.errors + results.shows.errors} total.`,
      };
    } catch (error) {
      console.error('Production upload error:', error);
      throw new Error(`Upload failed: ${error.message}`);
    }
  }
}
