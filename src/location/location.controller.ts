import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Logger,
  Param,
  Post,
  Query,
  Request,
  UnauthorizedException,
} from '@nestjs/common';
import { GeocodingService } from '../geocoding/geocoding.service';
import { DayOfWeek } from '../show/show.entity';
import { ShowService } from '../show/show.service';
import { UserService } from '../user/user.service';

@Controller('location')
export class LocationController {
  private readonly logger = new Logger(LocationController.name);

  constructor(
    private readonly showService: ShowService,
    private readonly geocodingService: GeocodingService,
    private readonly userService: UserService,
  ) {}

  /**
   * Check if user needs location update
   */
  @Get('needs-update/:userId')
  async needsLocationUpdate(@Param('userId') userId: string) {
    try {
      const needsUpdate = await this.userService.needsLocationUpdate(userId);
      return {
        needsUpdate,
        message: needsUpdate ? 'User location needs to be updated' : 'User location is already set',
      };
    } catch (error) {
      this.logger.error(`Failed to check location update status: ${error.message}`);
      throw new HttpException('Failed to check location status', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Update user location based on coordinates
   */
  @Post('update-user-location')
  async updateUserLocation(
    @Body() body: { userId: string; latitude: number; longitude: number },
    @Request() req: any,
  ) {
    const { userId, latitude, longitude } = body;

    // Verify user is updating their own location or is admin
    const requestingUser = req.user;
    if (requestingUser?.id !== userId && !requestingUser?.isAdmin) {
      throw new UnauthorizedException("Cannot update another user's location");
    }

    try {
      // Use Google API to get structured location data directly
      const locationData = await this.geocodingService.reverseGeocodeToLocationData(
        latitude,
        longitude,
      );

      if (locationData && locationData.city && locationData.state) {
        // Update user's city/state
        await this.userService.updateLocation(userId, locationData.city, locationData.state);

        return {
          success: true,
          location: {
            city: locationData.city,
            state: locationData.state,
            address: locationData.address || 'Address not available',
          },
          message: 'Location updated successfully using Google API',
        };
      } else {
        throw new Error('Could not get city/state from Google API response');
      }
    } catch (error) {
      this.logger.error(`Failed to update user location: ${error.message}`);
      throw new HttpException('Failed to update location', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Calculate distance between two points using Google Maps Distance Matrix API
   */
  @Get('calculate-distance')
  async calculateDistance(
    @Query('lat1') lat1: string,
    @Query('lng1') lng1: string,
    @Query('lat2') lat2: string,
    @Query('lng2') lng2: string,
  ) {
    const latitude1 = parseFloat(lat1);
    const longitude1 = parseFloat(lng1);
    const latitude2 = parseFloat(lat2);
    const longitude2 = parseFloat(lng2);

    if (isNaN(latitude1) || isNaN(longitude1) || isNaN(latitude2) || isNaN(longitude2)) {
      throw new Error('Invalid coordinates provided');
    }

    try {
      const distanceMiles = await this.geocodingService.calculateDistance(
        latitude1,
        longitude1,
        latitude2,
        longitude2,
      );

      const distanceMeters = distanceMiles * 1609.34;

      return {
        origin: { lat: latitude1, lng: longitude1 },
        destination: { lat: latitude2, lng: longitude2 },
        distance: {
          miles: Math.round(distanceMiles * 100) / 100,
          meters: Math.round(distanceMeters),
          kilometers: Math.round((distanceMeters / 1000) * 100) / 100,
        },
      };
    } catch (error) {
      this.logger.error('Distance calculation failed:', error);
      throw new Error('Failed to calculate distance');
    }
  }

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

    // Filter shows with coordinates and calculate distances (async for real distance calculation)
    const showsWithDistances = [];
    for (const show of shows.filter((show) => show.venue?.lat && show.venue?.lng)) {
      try {
        const distanceMiles = await this.geocodingService.calculateDistance(
          latitude,
          longitude,
          show.venue!.lat!,
          show.venue!.lng!,
        );
        const distanceMeters = distanceMiles * 1609.34; // Convert miles to meters

        showsWithDistances.push({
          ...show,
          distance: Math.round(distanceMeters),
        });
      } catch (error) {
        this.logger.warn(`Failed to calculate distance for show ${show.id}:`, error);
        // Fallback to sync Haversine calculation
        const distanceMiles = this.geocodingService.calculateDistanceSync(
          latitude,
          longitude,
          show.venue!.lat!,
          show.venue!.lng!,
        );
        const distanceMeters = distanceMiles * 1609.34;

        showsWithDistances.push({
          ...show,
          distance: Math.round(distanceMeters),
        });
      }
    }

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
    @Query('day') day?: DayOfWeek,
  ) {
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    const radiusMeters = radius ? parseFloat(radius) : 10; // Default 10 meters
    const maxMilesDistance = maxMiles ? parseFloat(maxMiles) : 100; // Default 100 miles

    if (isNaN(latitude) || isNaN(longitude)) {
      throw new Error('Invalid latitude or longitude');
    }

    // Get shows for the specified day or today
    const targetDay = day || this.getTodayDay();
    const shows = await this.showService.findByDay(targetDay);

    // Calculate distances for all shows (async for real distance calculation)
    const showsWithDistance = [];
    for (const show of shows.filter((show) => show.venue?.lat && show.venue?.lng)) {
      try {
        const distanceMiles = await this.geocodingService.calculateDistance(
          latitude,
          longitude,
          show.venue!.lat!,
          show.venue!.lng!,
        );
        const distanceMeters = distanceMiles * 1609.34; // Convert miles to meters

        showsWithDistance.push({
          ...show,
          distance: Math.round(distanceMeters),
          distanceMiles: Math.round(distanceMiles * 100) / 100, // Round to 2 decimal places
        });
      } catch (error) {
        this.logger.warn(`Failed to calculate distance for show ${show.id}:`, error);
        // Fallback to sync Haversine calculation
        const distanceMiles = this.geocodingService.calculateDistanceSync(
          latitude,
          longitude,
          show.venue!.lat!,
          show.venue!.lng!,
        );
        const distanceMeters = distanceMiles * 1609.34;

        showsWithDistance.push({
          ...show,
          distance: Math.round(distanceMeters),
          distanceMiles: Math.round(distanceMiles * 100) / 100,
        });
      }
    }

    // Sort by distance
    showsWithDistance.sort((a, b) => a.distance - b.distance);

    // Find shows within specified radius (default 10 meters)
    const nearbyShows = showsWithDistance.filter((show) => show.distance <= radiusMeters);

    // Find shows within 100 meters
    const showsWithin100m = showsWithDistance.filter((show) => show.distance <= 100);

    // Filter all shows by maximum miles distance
    const showsWithinMaxDistance = showsWithDistance.filter(
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
      day: targetDay,
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
