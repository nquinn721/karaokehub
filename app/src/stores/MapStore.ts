import * as Location from 'expo-location';
import { makeAutoObservable, runInAction } from 'mobx';
import { MapBounds, Show, VenueProximity } from '../types';

interface MapRegion {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

export class MapStore {
  // Map state
  public isInitialized = false;
  public userLocation: { latitude: number; longitude: number } | null = null;
  public currentRegion: MapRegion | null = null;
  public currentZoom = 11;

  // Selected show for InfoWindow
  public selectedShow: Show | null = null;

  // Loading states
  public isLoadingShows = false;
  public isLoadingLocation = false;
  public locationPermissionStatus: Location.PermissionStatus | null = null;

  // Dependencies
  private showStore: any;

  constructor(showStore: any) {
    makeAutoObservable(this);
    this.showStore = showStore;
  }

  // Initialize the map store
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    // Request location permissions
    await this.requestLocationPermission();

    runInAction(() => {
      this.isInitialized = true;
    });
  }

  // Request location permission
  async requestLocationPermission(): Promise<boolean> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      runInAction(() => {
        this.locationPermissionStatus = status;
      });

      if (status === 'granted') {
        console.log('✅ Location permission granted');
        return true;
      } else {
        console.log('❌ Location permission denied');
        return false;
      }
    } catch (error) {
      console.error('Failed to request location permission:', error);
      return false;
    }
  }

  // Set the current map region
  setRegion = (region: MapRegion): void => {
    runInAction(() => {
      this.currentRegion = region;

      // Calculate approximate zoom level from latitudeDelta
      // This is an approximation since React Native Maps doesn't have direct zoom
      const zoom = Math.round(Math.log(360 / region.latitudeDelta) / Math.LN2);
      this.currentZoom = Math.max(1, Math.min(20, zoom));
    });

    // Fetch data based on new region
    this.fetchDataForCurrentView();
  };

  // Debounced data fetching to avoid too many API calls
  private debounceTimer: NodeJS.Timeout | null = null;
  private debouncedFetchData = (): void => {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this.fetchDataForCurrentView();
    }, 300);
  };

  // Main data fetching logic based on zoom level
  async fetchDataForCurrentView(): Promise<void> {
    if (!this.currentRegion) {
      return;
    }

    // Only use day filtering if enabled
    const day = this.showStore.useDayFilter ? this.showStore.selectedDay : undefined;

    runInAction(() => {
      this.isLoadingShows = true;
    });

    try {
      // At zoom 8 or lower, load all shows nationwide without distance filtering
      if (this.currentZoom <= 8) {
        await this.showStore.fetchAllShows(day, this.showStore.vendorFilter);
      } else {
        // Use appropriate radius for higher zoom levels
        const radius = this.currentZoom <= 11 ? 100 : 50; // 100 miles for medium zoom, 50 miles for detailed view

        const mapCenter: MapBounds = {
          lat: this.currentRegion.latitude,
          lng: this.currentRegion.longitude,
          radius,
        };

        await this.showStore.fetchShows(day, mapCenter);
      }
    } catch (error) {
      console.error('❌ MapStore: Failed to fetch data:', error);
    } finally {
      runInAction(() => {
        this.isLoadingShows = false;
      });
    }
  }

  // Handle marker press
  handleMarkerPress = (show: Show): void => {
    runInAction(() => {
      this.selectedShow = show;
    });

    // Also set in ShowStore for list highlighting
    this.showStore.setSelectedShow(show);
  };

  // Clear selected show
  clearSelectedShow = (): void => {
    runInAction(() => {
      this.selectedShow = null;
    });

    this.showStore.setSelectedShow(null);
  };

  // Select show from list (called when tapping on list item)
  selectShowFromList = (show: Show): void => {
    this.handleMarkerPress(show);

    // Center map on the selected show if coordinates are available
    const coordinates = this.showStore.getVenueCoordinates(show);
    if (coordinates) {
      this.animateToLocation(coordinates.lat, coordinates.lng, 14);
    }
  };

  // Animate to a specific location
  animateToLocation(latitude: number, longitude: number, zoom?: number) {
    const latitudeDelta = zoom ? 360 / Math.pow(2, zoom) : 0.01;
    const longitudeDelta = latitudeDelta;

    const newRegion: MapRegion = {
      latitude,
      longitude,
      latitudeDelta,
      longitudeDelta,
    };

    runInAction(() => {
      this.currentRegion = newRegion;
      if (zoom) {
        this.currentZoom = zoom;
      }
    });

    // The actual animation will be handled by the MapView component
    return newRegion;
  }

  // Get current location and center map
  async goToCurrentLocation(): Promise<{ success: boolean; region?: MapRegion; error?: string }> {
    runInAction(() => {
      this.isLoadingLocation = true;
    });

    try {
      // Check permission first
      if (this.locationPermissionStatus !== 'granted') {
        const granted = await this.requestLocationPermission();
        if (!granted) {
          runInAction(() => {
            this.isLoadingLocation = false;
          });
          return {
            success: false,
            error: 'Location permission not granted',
          };
        }
      }

      // Get current position
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 10000,
      });

      const { latitude, longitude } = location.coords;

      runInAction(() => {
        this.userLocation = { latitude, longitude };
        this.isLoadingLocation = false;
      });

      // Animate to current location
      const region = this.animateToLocation(latitude, longitude, 12);

      console.log('✅ Successfully got current location:', { latitude, longitude });
      return { success: true, region };
    } catch (error) {
      console.warn('⚠️ MapStore: Failed to get location:', error);

      runInAction(() => {
        this.isLoadingLocation = false;
      });

      // Default to center of US if location fails
      const defaultRegion = this.animateToLocation(39.8283, -98.5795, 4);

      return {
        success: false,
        error: 'Failed to get current location',
        region: defaultRegion,
      };
    }
  }

  // Venue detection for proximity alerts
  async detectNearbyVenues(shows: Show[], maxDistance: number = 0.1): Promise<VenueProximity[]> {
    if (!this.userLocation || !shows.length) {
      return [];
    }

    const nearbyVenues: VenueProximity[] = [];

    for (const show of shows) {
      const coordinates = this.showStore.getVenueCoordinates(show);
      if (!coordinates) continue;

      const distance = this.calculateDistance(
        this.userLocation.latitude,
        this.userLocation.longitude,
        coordinates.lat,
        coordinates.lng,
      );

      if (distance <= maxDistance) {
        nearbyVenues.push({
          show,
          distance,
          isAtVenue: distance <= 0.05, // Within ~50 meters
        });
      }
    }

    // Sort by distance (closest first)
    return nearbyVenues.sort((a, b) => a.distance - b.distance);
  }

  // Calculate distance between two coordinates (in miles)
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 3959; // Earth's radius in miles
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) *
        Math.cos(this.deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  // Get map region from bounds
  getRegionFromBounds(shows: Show[]): MapRegion | null {
    if (!shows.length) return null;

    const coordinates = shows
      .map((show) => this.showStore.getVenueCoordinates(show))
      .filter((coord) => coord !== null) as { lat: number; lng: number }[];

    if (!coordinates.length) return null;

    const latitudes = coordinates.map((coord) => coord.lat);
    const longitudes = coordinates.map((coord) => coord.lng);

    const minLat = Math.min(...latitudes);
    const maxLat = Math.max(...latitudes);
    const minLng = Math.min(...longitudes);
    const maxLng = Math.max(...longitudes);

    const centerLat = (minLat + maxLat) / 2;
    const centerLng = (minLng + maxLng) / 2;

    const latDelta = (maxLat - minLat) * 1.2; // Add 20% padding
    const lngDelta = (maxLng - minLng) * 1.2;

    return {
      latitude: centerLat,
      longitude: centerLng,
      latitudeDelta: Math.max(latDelta, 0.01), // Minimum zoom level
      longitudeDelta: Math.max(lngDelta, 0.01),
    };
  }

  // Fit map to show all shows
  fitToShows(shows: Show[]): MapRegion | null {
    const region = this.getRegionFromBounds(shows);
    if (region) {
      this.setRegion(region);
    }
    return region;
  }

  // Reset map state
  reset() {
    runInAction(() => {
      this.selectedShow = null;
      this.currentRegion = null;
      this.currentZoom = 11;
      this.isLoadingShows = false;
    });
  }

  // Cleanup
  cleanup() {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }
}

export const createMapStore = (showStore: any) => new MapStore(showStore);
