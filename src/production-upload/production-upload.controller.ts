import {
  Body,
  Controller,
  Headers,
  Options,
  Post,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Response } from 'express';
import { Repository } from 'typeorm';
import { DJService } from '../dj/dj.service';
import { Show } from '../show/show.entity';
import { ShowService } from '../show/show.service';
import { VendorService } from '../vendor/vendor.service';
import { VenueService } from '../venue/venue.service';

export interface ProductionUploadData {
  vendors: any[];
  djs: any[];
  shows: any[];
  venues: any[];
}

@Controller('production-upload')
export class ProductionUploadController {
  constructor(
    private readonly configService: ConfigService,
    private readonly showService: ShowService,
    private readonly vendorService: VendorService,
    private readonly djService: DJService,
    private readonly venueService: VenueService,
    @InjectRepository(Show)
    private readonly showRepository: Repository<Show>,
  ) {}

  @Options('data')
  async handlePreflight(@Res() res: Response) {
    // Handle preflight CORS requests for production upload endpoint
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, x-upload-token, Referer, Origin');
    res.header('Access-Control-Max-Age', '86400'); // 24 hours
    res.header('Referrer-Policy', 'no-referrer-when-downgrade');
    res.status(200).send();
  }

  @Post('data')
  async uploadData(
    @Body() data: ProductionUploadData,
    @Headers('x-upload-token') uploadToken: string,
    @Res() res: Response,
  ) {
    // Set CORS headers for the actual request
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Credentials', 'false');
    res.header('Referrer-Policy', 'no-referrer-when-downgrade');
    res.header('Access-Control-Expose-Headers', 'Referrer-Policy');

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
        venues: data.venues?.length || 0,
      });

      const results = {
        vendors: { created: 0, updated: 0, errors: 0 },
        djs: { created: 0, updated: 0, errors: 0 },
        shows: { created: 0, updated: 0, errors: 0 },
        venues: { created: 0, updated: 0, errors: 0 },
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

      // Upload venues with duplicate detection
      for (const venueData of data.venues || []) {
        try {
          // Check for existing venue by name and address combination
          const existingVenue = await this.venueService.findByNameAndLocation(
            venueData.name,
            venueData.city,
            venueData.state,
            venueData.address,
          );

          if (existingVenue) {
            // Update existing venue with any missing information
            let venueUpdated = false;
            const updateData: any = {};

            if (!existingVenue.address && venueData.address) {
              updateData.address = venueData.address;
              venueUpdated = true;
            }
            if (!existingVenue.city && venueData.city) {
              updateData.city = venueData.city;
              venueUpdated = true;
            }
            if (!existingVenue.state && venueData.state) {
              updateData.state = venueData.state;
              venueUpdated = true;
            }
            if (!existingVenue.zip && venueData.zip) {
              updateData.zip = venueData.zip;
              venueUpdated = true;
            }
            if (!existingVenue.phone && venueData.phone) {
              updateData.phone = venueData.phone;
              venueUpdated = true;
            }
            if (!existingVenue.website && venueData.website) {
              updateData.website = venueData.website;
              venueUpdated = true;
            }
            if (!existingVenue.description && venueData.description) {
              updateData.description = venueData.description;
              venueUpdated = true;
            }
            if ((!existingVenue.lat || !existingVenue.lng) && venueData.lat && venueData.lng) {
              updateData.lat = parseFloat(venueData.lat);
              updateData.lng = parseFloat(venueData.lng);
              venueUpdated = true;
            }

            if (venueUpdated) {
              await this.venueService.update(existingVenue.id, updateData);
              results.venues.updated++;
            } else {
              // Venue exists and no updates needed
              results.venues.updated++;
            }
          } else {
            // Create new venue - convert lat/lng strings to numbers
            const createData = {
              ...venueData,
              lat: venueData.lat ? parseFloat(venueData.lat) : null,
              lng: venueData.lng ? parseFloat(venueData.lng) : null,
            };
            await this.venueService.create(createData);
            results.venues.created++;
          }
        } catch (error) {
          console.error('Error uploading venue:', error);
          results.venues.errors++;
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

          // Find venue by name and location
          let venue = null;
          if (showData.venue) {
            // First try to find existing venue by name and location
            venue = await this.venueService.findByNameAndLocation(
              showData.venue,
              showData.city,
              showData.state,
              showData.address,
            );

            // If not found, fall back to findOrCreate for backward compatibility
            if (!venue && (showData.venue || showData.address)) {
              venue = await this.venueService.findOrCreate({
                name: showData.venue || 'Unknown Venue',
                address: showData.address || null,
                city: showData.city || null,
                state: showData.state || null,
                zip: showData.zip || null,
                phone: showData.venuePhone || null,
                website: showData.venueWebsite || null,
                lat: showData.lat ? parseFloat(showData.lat) : null,
                lng: showData.lng ? parseFloat(showData.lng) : null,
              });
            }
          }

          // Prepare show data with resolved IDs (excluding venue fields now stored in venue relationship)
          const resolvedShowData = {
            day: showData.day,
            time: showData.startTime, // Map startTime to time field for compatibility
            startTime: showData.startTime,
            endTime: showData.endTime,
            description: showData.description,
            source: showData.source,
            djId: dj?.id || null,
            venueId: venue?.id || null,
          };

          // Check for existing show with same day, time, venue, and DJ
          const existingShow = await this.showRepository.findOne({
            where: {
              day: resolvedShowData.day,
              time: resolvedShowData.time,
              venueId: resolvedShowData.venueId,
              djId: resolvedShowData.djId,
            },
            relations: ['dj', 'dj.vendor', 'venue'], // Load DJ, vendor, and venue relationships
          });

          if (existingShow) {
            // Check if existing show belongs to the same vendor (through DJ)
            const isSameVendor = existingShow?.dj?.vendor?.id === vendor?.id;

            if (isSameVendor) {
              // Update existing show with any missing information
              let showUpdated = false;
              let venueUpdated = false;

              // Update venue information if missing
              if (existingShow.venue) {
                if (!existingShow.venue.address && showData.address) {
                  existingShow.venue.address = showData.address;
                  venueUpdated = true;
                }
                if (!existingShow.venue.phone && showData.venuePhone) {
                  existingShow.venue.phone = showData.venuePhone;
                  venueUpdated = true;
                }
                if (!existingShow.venue.website && showData.venueWebsite) {
                  existingShow.venue.website = showData.venueWebsite;
                  venueUpdated = true;
                }
                if (!existingShow.venue.city && showData.city) {
                  existingShow.venue.city = showData.city;
                  venueUpdated = true;
                }
                if (!existingShow.venue.state && showData.state) {
                  existingShow.venue.state = showData.state;
                  venueUpdated = true;
                }
                if (!existingShow.venue.zip && showData.zip) {
                  existingShow.venue.zip = showData.zip;
                  venueUpdated = true;
                }
                if (
                  (!existingShow.venue.lat || !existingShow.venue.lng) &&
                  showData.lat &&
                  showData.lng
                ) {
                  existingShow.venue.lat = showData.lat;
                  existingShow.venue.lng = showData.lng;
                  venueUpdated = true;
                }

                if (venueUpdated) {
                  await this.venueService.update(existingShow.venue.id, existingShow.venue);
                }
              }

              // Update show information if missing
              if (!existingShow.description && resolvedShowData.description) {
                existingShow.description = resolvedShowData.description;
                showUpdated = true;
              }
              if (!existingShow.source && resolvedShowData.source) {
                existingShow.source = resolvedShowData.source;
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

      const responseData = {
        success: true,
        message: 'Data uploaded successfully',
        results,
        summary: `Created: ${results.vendors.created} vendors, ${results.djs.created} DJs, ${results.venues.created} venues, ${results.shows.created} shows. Updated: ${results.vendors.updated} vendors, ${results.djs.updated} DJs, ${results.venues.updated} venues, ${results.shows.updated} shows. Errors: ${results.vendors.errors + results.djs.errors + results.venues.errors + results.shows.errors} total.`,
      };

      return res.json(responseData);
    } catch (error) {
      console.error('Production upload error:', error);
      return res.status(500).json({ error: `Upload failed: ${error.message}` });
    }
  }
}
