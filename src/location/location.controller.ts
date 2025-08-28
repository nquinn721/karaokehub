import { Controller, Get, Query } from '@nestjs/common';
import { GeocodingService } from '../geocoding/geocoding.service';
import { DayOfWeek } from '../show/show.entity';
import { ShowService } from '../show/show.service';

@Controller('location')
export class LocationController {
  constructor(
    private readonly showService: ShowService,
    private readonly geocodingService: GeocodingService,
  ) {}

  /**
   * Test endpoint to verify location services are working
   */
  @Get('test')
  async testLocation() {
    return {
      message: 'Location services are working',
      timestamp: new Date().toISOString(),
      services: {
        showService: !!this.showService,
        geocodingService: !!this.geocodingService,
      },
    };
  }

  /**
   * Get coordinates from address using forward geocoding
   */
  @Get('geocode')
  async geocodeAddress(@Query('address') address: string): Promise<any> {
    if (!address) {
      throw new Error('Address parameter is required');
    }

    const result = await this.geocodingService.geocodeAddress(address);

    return {
      address,
      result: result || null,
    };
  }

  /**
   * Get address from coordinates using reverse geocoding
   */
  @Get('reverse-geocode')
  async reverseGeocode(@Query('lat') lat: string, @Query('lng') lng: string) {
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);

    if (isNaN(latitude) || isNaN(longitude)) {
      throw new Error('Invalid latitude or longitude');
    }

    const address = await this.geocodingService.reverseGeocode(latitude, longitude);

    return {
      latitude,
      longitude,
      address: address || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
    };
  }

  /**
   * Get shows for today with proximity calculation from current location
   */
  @Get('nearby-shows')
  async getNearbyShows(
    @Query('lat') lat: string,
    @Query('lng') lng: string,
    @Query('maxDistance') maxDistance?: string,
    @Query('day') day?: DayOfWeek,
  ) {
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    const maxDistanceMeters = maxDistance ? parseFloat(maxDistance) : 1000; // Default 1km

    if (isNaN(latitude) || isNaN(longitude)) {
      throw new Error('Invalid latitude or longitude');
    }

    // Get today's day if not specified
    const targetDay = day || this.getTodayDay();

    // Get shows for the day
    const shows = await this.showService.findByDay(targetDay);

    // Filter shows with coordinates and calculate distances
    const showsWithDistances = shows
      .filter((show) => show.lat && show.lng)
      .map((show) => {
        const distanceMiles = this.geocodingService.calculateDistance(
          latitude,
          longitude,
          show.lat!,
          show.lng!,
        );
        const distanceMeters = distanceMiles * 1609.34; // Convert miles to meters

        return {
          ...show,
          distance: Math.round(distanceMeters),
        };
      });

    // Filter by distance and sort
    const filteredShows = showsWithDistances
      .filter((show) => show.distance <= maxDistanceMeters)
      .sort((a, b) => a.distance - b.distance);

    // Get address for current location
    const currentAddress = await this.geocodingService.reverseGeocode(latitude, longitude);

    return {
      location: {
        latitude,
        longitude,
        address: currentAddress || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
      },
      shows: filteredShows,
      totalShows: filteredShows.length,
      maxDistance: maxDistanceMeters,
      day: targetDay,
    };
  }

  /**
   * Get shows within specific radius for location tracking
   */
  @Get('proximity-check')
  async checkProximity(
    @Query('lat') lat: string,
    @Query('lng') lng: string,
    @Query('radius') radius?: string, // in meters, default 10
    @Query('maxMiles') maxMiles?: string, // in miles, default 100
  ) {
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    const radiusMeters = radius ? parseFloat(radius) : 10; // Default 10 meters
    const maxMilesDistance = maxMiles ? parseFloat(maxMiles) : 100; // Default 100 miles

    if (isNaN(latitude) || isNaN(longitude)) {
      throw new Error('Invalid latitude or longitude');
    }

    // Get today's shows
    const today = this.getTodayDay();
    const shows = await this.showService.findByDay(today);

    // Calculate distances for all shows
    const allShowsWithDistance = shows
      .filter((show) => show.lat && show.lng)
      .map((show) => {
        const distanceMiles = this.geocodingService.calculateDistance(
          latitude,
          longitude,
          show.lat!,
          show.lng!,
        );
        const distanceMeters = distanceMiles * 1609.34; // Convert miles to meters

        return {
          ...show,
          distance: Math.round(distanceMeters),
          distanceMiles: Math.round(distanceMiles * 100) / 100, // Round to 2 decimal places
        };
      });

    // Sort by distance
    allShowsWithDistance.sort((a, b) => a.distance - b.distance);

    // Find shows within specified radius (default 10 meters)
    const nearbyShows = allShowsWithDistance.filter((show) => show.distance <= radiusMeters);

    // Find shows within 100 meters
    const showsWithin100m = allShowsWithDistance.filter((show) => show.distance <= 100);

    // Filter all shows by maximum miles distance
    const showsWithinMaxDistance = allShowsWithDistance.filter(
      (show) => show.distanceMiles <= maxMilesDistance,
    );

    // Get address for current location
    const currentAddress = await this.geocodingService.reverseGeocode(latitude, longitude);

    return {
      location: {
        latitude,
        longitude,
        address: currentAddress || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
      },
      withinRadius: nearbyShows,
      within100m: showsWithin100m,
      allShowsByDistance: showsWithinMaxDistance,
      radius: radiusMeters,
      maxMiles: maxMilesDistance,
      day: today,
    };
  }

  /**
   * Get current day as DayOfWeek enum
   */
  private getTodayDay(): DayOfWeek {
    const today = new Date();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return dayNames[today.getDay()] as DayOfWeek;
  }
}
