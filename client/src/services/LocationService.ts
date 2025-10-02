/**
 * Location Service for Live Show proximity detection
 * Handles user location, finding nearby shows, and distance calculations
 */

import { apiStore } from '@stores/ApiStore';

export interface UserLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: number;
}

export interface NearbyShow {
  show: {
    id: string;
    name: string;
    description?: string;
    djId?: string;
    djName?: string;
    startTime: string;
    endTime?: string;
    isActive: boolean;
    currentSingerId?: string;
    participants: any[];
    queue: any[];
    chatMessages: any[];
    createdAt: string;
    updatedAt: string;
    venueId?: string;
    venue?: {
      id: string;
      name: string;
      address: string;
      lat: number;
      lng: number;
    };
  };
  distanceMeters: number;
  venue?: {
    id: string;
    name: string;
    address: string;
    lat: number;
    lng: number;
  };
}

export interface LocationError {
  code:
    | 'PERMISSION_DENIED'
    | 'POSITION_UNAVAILABLE'
    | 'TIMEOUT'
    | 'UNSUPPORTED'
    | 'NETWORK_ERROR'
    | 'API_ERROR'
    | 'RETRY_EXHAUSTED';
  message: string;
  userMessage?: string;
  retryable?: boolean;
  retryAfter?: number;
}

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
}

class LocationService {
  private currentLocation: UserLocation | null = null;
  private watchId: number | null = null;
  private locationCallbacks: Array<(location: UserLocation) => void> = [];
  private errorCallbacks: Array<(error: LocationError) => void> = [];
  private retryConfig: RetryConfig = {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffFactor: 2,
  };

  /**
   * Get user's current location with retry mechanism
   */
  async getCurrentLocation(retryAttempt: number = 0): Promise<UserLocation> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject({
          code: 'UNSUPPORTED',
          message: 'Geolocation is not supported by this browser',
          userMessage:
            'Location services are not available on this device. You can still join shows without location detection.',
          retryable: false,
        });
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location: UserLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: Date.now(),
          };

          this.currentLocation = location;
          this.notifyLocationCallbacks(location);
          resolve(location);
        },
        async (error) => {
          const locationError = this.mapGeolocationError(error);

          // Retry logic for retryable errors
          if (locationError.retryable && retryAttempt < this.retryConfig.maxAttempts) {
            const delay = Math.min(
              this.retryConfig.baseDelay * Math.pow(this.retryConfig.backoffFactor, retryAttempt),
              this.retryConfig.maxDelay,
            );

            console.log(
              `Location request failed, retrying in ${delay}ms (attempt ${retryAttempt + 1}/${this.retryConfig.maxAttempts})`,
            );

            setTimeout(() => {
              this.getCurrentLocation(retryAttempt + 1)
                .then(resolve)
                .catch(reject);
            }, delay);
          } else {
            if (retryAttempt >= this.retryConfig.maxAttempts) {
              locationError.code = 'RETRY_EXHAUSTED';
              locationError.message = `Failed to get location after ${this.retryConfig.maxAttempts} attempts: ${locationError.message}`;
              locationError.userMessage =
                'Unable to access your location after multiple attempts. You can still join shows without location detection.';
            }

            this.notifyErrorCallbacks(locationError);
            reject(locationError);
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 15000, // Increased timeout
          maximumAge: 30000, // Reduced max age for fresher location
        },
      );
    });
  }

  /**
   * Start watching user location changes
   */
  startWatchingLocation(): void {
    if (!navigator.geolocation || this.watchId !== null) {
      return;
    }

    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        const location: UserLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: Date.now(),
        };

        this.currentLocation = location;
        this.notifyLocationCallbacks(location);
      },
      (error) => {
        const locationError = this.mapGeolocationError(error);
        this.notifyErrorCallbacks(locationError);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 300000, // 5 minutes
      },
    );
  }

  /**
   * Stop watching location changes
   */
  stopWatchingLocation(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }

  /**
   * Find shows near user's current location
   */
  async findNearbyShows(location?: UserLocation, radiusMeters: number = 30): Promise<NearbyShow[]> {
    const userLocation = location || this.currentLocation;

    if (!userLocation) {
      throw new Error('User location not available. Please enable location services.');
    }

    try {
      const response = await apiStore.post('/live-shows/nearby', {
        userLatitude: userLocation.latitude,
        userLongitude: userLocation.longitude,
        radiusMeters,
      });

      if (response.success) {
        return response.shows;
      } else {
        throw new Error(response.message || 'Failed to find nearby shows');
      }
    } catch (error) {
      console.error('Error finding nearby shows:', error);
      throw error;
    }
  }

  /**
   * Calculate distance between two points using backend API
   */
  async calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): Promise<number> {
    try {
      const response = await apiStore.get(
        `/location/calculate-distance?lat1=${lat1}&lng1=${lng1}&lat2=${lat2}&lng2=${lng2}`,
      );

      return response.distance.meters;
    } catch (error) {
      console.error('Error calculating distance:', error);
      // Fallback to haversine calculation
      return this.calculateDistanceHaversine(lat1, lng1, lat2, lng2);
    }
  }

  /**
   * Haversine formula for distance calculation (fallback)
   */
  private calculateDistanceHaversine(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
  ): number {
    const R = 6371000; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lng2 - lng1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  }

  /**
   * Check if user is within specified radius of a venue
   */
  async isWithinRadius(
    venueLatitude: number,
    venueLongitude: number,
    radiusMeters: number = 30,
    userLocation?: UserLocation,
  ): Promise<boolean> {
    const location = userLocation || this.currentLocation;

    if (!location) {
      return false;
    }

    const distance = await this.calculateDistance(
      location.latitude,
      location.longitude,
      venueLatitude,
      venueLongitude,
    );

    return distance <= radiusMeters;
  }

  /**
   * Subscribe to location updates
   */
  onLocationUpdate(callback: (location: UserLocation) => void): () => void {
    this.locationCallbacks.push(callback);

    // Return unsubscribe function
    return () => {
      const index = this.locationCallbacks.indexOf(callback);
      if (index > -1) {
        this.locationCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Subscribe to location errors
   */
  onLocationError(callback: (error: LocationError) => void): () => void {
    this.errorCallbacks.push(callback);

    // Return unsubscribe function
    return () => {
      const index = this.errorCallbacks.indexOf(callback);
      if (index > -1) {
        this.errorCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Get cached location if available
   */
  getCachedLocation(): UserLocation | null {
    return this.currentLocation;
  }

  /**
   * Check if location services are supported
   */
  isSupported(): boolean {
    return 'geolocation' in navigator;
  }

  /**
   * Request location permission
   */
  async requestPermission(): Promise<boolean> {
    if (!this.isSupported()) {
      return false;
    }

    try {
      await this.getCurrentLocation();
      return true;
    } catch (error) {
      return false;
    }
  }

  private mapGeolocationError(error: GeolocationPositionError): LocationError {
    switch (error.code) {
      case error.PERMISSION_DENIED:
        return {
          code: 'PERMISSION_DENIED',
          message:
            'Location access denied by user. Please enable location services to join live shows.',
          userMessage:
            'Location access is required to find nearby karaoke shows. Please enable location services in your browser settings.',
          retryable: false,
        };
      case error.POSITION_UNAVAILABLE:
        return {
          code: 'POSITION_UNAVAILABLE',
          message: 'Location information unavailable. Please check your GPS settings.',
          userMessage:
            'Unable to determine your location. Please ensure GPS is enabled and you have a clear signal.',
          retryable: true,
        };
      case error.TIMEOUT:
        return {
          code: 'TIMEOUT',
          message: 'Location request timed out. Please try again.',
          userMessage:
            'Location detection is taking too long. Please try again or check your GPS signal.',
          retryable: true,
          retryAfter: 2000,
        };
      default:
        return {
          code: 'POSITION_UNAVAILABLE',
          message: 'Unable to get location. Please ensure location services are enabled.',
          userMessage:
            'Something went wrong while detecting your location. Please check your device settings.',
          retryable: true,
        };
    }
  }

  private notifyLocationCallbacks(location: UserLocation): void {
    this.locationCallbacks.forEach((callback) => {
      try {
        callback(location);
      } catch (error) {
        console.error('Error in location callback:', error);
      }
    });
  }

  private notifyErrorCallbacks(error: LocationError): void {
    this.errorCallbacks.forEach((callback) => {
      try {
        callback(error);
      } catch (error) {
        console.error('Error in location error callback:', error);
      }
    });
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.stopWatchingLocation();
    this.locationCallbacks = [];
    this.errorCallbacks = [];
    this.currentLocation = null;
  }
}

// Export singleton instance
export const locationService = new LocationService();
