import { Show } from '../stores/ShowStore';

export interface UserLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

export interface VenueProximity {
  show: Show;
  distance: number; // in meters
  isAtVenue: boolean; // within 20m - tight for adjacent venues
  isNearVenue: boolean; // within 50m - approaching venue
}

export class GeolocationService {
  private watchId: number | null = null;
  private locationCallbacks: ((location: UserLocation) => void)[] = [];
  private errorCallbacks: ((error: GeolocationPositionError) => void)[] = [];
  private isTracking = false;
  private lastKnownLocation: UserLocation | null = null;

  // Haversine formula to calculate distance between two points
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  }

  // Check if geolocation is supported
  isSupported(): boolean {
    return 'geolocation' in navigator;
  }

  // Get current position with high accuracy for precise venue detection
  async getCurrentPosition(): Promise<UserLocation> {
    return new Promise((resolve, reject) => {
      if (!this.isSupported()) {
        reject(new Error('Geolocation is not supported'));
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
          this.lastKnownLocation = location;
          resolve(location);
        },
        (error) => {
          reject(error);
        },
        {
          enableHighAccuracy: true, // Use GPS for highest accuracy
          timeout: 15000, // Longer timeout for high accuracy
          maximumAge: 0, // Always get fresh location for venue detection
        },
      );
    });
  }

  // Start continuous location tracking
  startTracking(): void {
    if (!this.isSupported() || this.isTracking) {
      return;
    }

    this.isTracking = true;

    // Get initial position
    this.getCurrentPosition()
      .then((location) => {
        this.notifyLocationCallbacks(location);
      })
      .catch((error) => {
        this.notifyErrorCallbacks(error);
      });

    // Watch position changes
    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        const location: UserLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: Date.now(),
        };
        this.lastKnownLocation = location;
        this.notifyLocationCallbacks(location);
      },
      (error) => {
        this.notifyErrorCallbacks(error);
      },
      {
        enableHighAccuracy: true, // Use GPS for precision
        timeout: 15000, // Longer timeout for accuracy
        maximumAge: 0, // Always get fresh location for venue detection
      },
    );
  }

  // Stop location tracking
  stopTracking(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    this.isTracking = false;
  }

  // Check proximity to shows with high precision for adjacent venues
  checkShowProximity(userLocation: UserLocation, shows: Show[]): VenueProximity[] {
    const proximities: VenueProximity[] = [];

    for (const show of shows) {
      if (show.lat && show.lng) {
        const distance = this.calculateDistance(
          userLocation.latitude,
          userLocation.longitude,
          show.lat,
          show.lng,
        );

        // Tight thresholds for distinguishing adjacent venues
        const isAtVenue = distance <= 20; // Within 20 meters - precise enough for adjacent buildings
        const isNearVenue = distance <= 50; // Within 50 meters - approaching venue

        if (isNearVenue) {
          proximities.push({
            show,
            distance,
            isAtVenue,
            isNearVenue,
          });
        }
      }
    }

    // Sort by distance (closest first)
    return proximities.sort((a, b) => a.distance - b.distance);
  }

  // Get shows happening today or soon
  getTodaysShows(shows: Show[]): Show[] {
    const today = new Date();
    const daysOfWeek = [
      'sunday',
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
    ];
    const todayName = daysOfWeek[today.getDay()];

    return shows.filter((show) => {
      const showDay = show.day.toLowerCase();
      return showDay === todayName;
    });
  }

  // Subscribe to location updates
  onLocationUpdate(callback: (location: UserLocation) => void): () => void {
    this.locationCallbacks.push(callback);
    return () => {
      const index = this.locationCallbacks.indexOf(callback);
      if (index > -1) {
        this.locationCallbacks.splice(index, 1);
      }
    };
  }

  // Subscribe to location errors
  onLocationError(callback: (error: GeolocationPositionError) => void): () => void {
    this.errorCallbacks.push(callback);
    return () => {
      const index = this.errorCallbacks.indexOf(callback);
      if (index > -1) {
        this.errorCallbacks.splice(index, 1);
      }
    };
  }

  // Get multiple high-accuracy samples and average for better precision
  async getHighPrecisionLocation(sampleCount: number = 3): Promise<UserLocation> {
    const samples: UserLocation[] = [];
    const maxAccuracy = 25; // Only use readings within 25m accuracy

    for (let i = 0; i < sampleCount; i++) {
      try {
        const location = await this.getCurrentPosition();

        // Only use samples with good accuracy
        if (location.accuracy <= maxAccuracy) {
          samples.push(location);
        }

        // Small delay between samples
        if (i < sampleCount - 1) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      } catch (error) {
        console.log(`📍 Location sample ${i + 1} failed (expected on desktop)`);
      }
    }

    if (samples.length === 0) {
      throw new Error('Unable to get accurate location reading');
    }

    // Average the samples for better precision
    const avgLocation: UserLocation = {
      latitude: samples.reduce((sum, loc) => sum + loc.latitude, 0) / samples.length,
      longitude: samples.reduce((sum, loc) => sum + loc.longitude, 0) / samples.length,
      accuracy: Math.min(...samples.map((loc) => loc.accuracy)),
      timestamp: Date.now(),
    };

    this.lastKnownLocation = avgLocation;
    return avgLocation;
  }

  // Get last known location
  getLastKnownLocation(): UserLocation | null {
    return this.lastKnownLocation;
  }

  // Notify location callbacks
  private notifyLocationCallbacks(location: UserLocation): void {
    this.locationCallbacks.forEach((callback) => callback(location));
  }

  // Notify error callbacks
  private notifyErrorCallbacks(error: GeolocationPositionError): void {
    this.errorCallbacks.forEach((callback) => callback(error));
  }

  // Format distance for display
  formatDistance(meters: number): string {
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    }
    return `${(meters / 1000).toFixed(1)}km`;
  }
}

// Singleton instance
export const geolocationService = new GeolocationService();
