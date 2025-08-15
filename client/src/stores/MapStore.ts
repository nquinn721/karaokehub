import { autorun, makeAutoObservable, runInAction } from 'mobx';
import { geocodingService } from '../utils/geocoding';

export interface UserLocation {
  lat: number;
  lng: number;
}

export interface GeocodedShow {
  id: string;
  lat: number;
  lng: number;
  venue: string;
  address: string;
  distance?: number;
  [key: string]: any; // For other show properties
}

export class MapStore {
  public userLocation: UserLocation | null = null;
  public selectedMarkerId: string | null = null;
  public mapInstance: google.maps.Map | null = null;
  public initialCenter = { lat: 40.7128, lng: -74.006 }; // Default to NYC
  public initialZoom = 8;
  public isInitialized = false;
  public locationError: string | null = null;
  public hasSetInitialBounds = false;
  public geocodedShows: GeocodedShow[] = [];
  public isGeocoding = false;
  public maxDistanceMiles = 20; // 20 mile radius filter

  // Store references to avoid circular dependencies
  private apiStore: any = null;
  private showStore: any = null;
  private geocodeTimeout: number | null = null;
  private geocodeCache: Map<string, { lat: number; lng: number; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  constructor() {
    makeAutoObservable(this);
  }

  // Initialize the map store and set up reactive behaviors
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    // Import stores here to avoid circular dependency
    const { apiStore } = await import('./ApiStore');
    const { showStore } = await import('./ShowStore');

    // Set store references
    this.apiStore = apiStore;
    this.showStore = showStore;

    try {
      // Ensure API config is loaded
      await this.apiStore.initializeConfig();

      // Set up autorun to geocode shows when they change
      // Use a flag to prevent infinite loops and debounce to prevent excessive calls
      let isProcessing = false;
      autorun(() => {
        if (
          !isProcessing &&
          this.showStore?.shows.length > 0 &&
          this.apiStore?.googleMapsApiKey &&
          !this.isGeocoding
        ) {
          isProcessing = true;

          // Clear any existing timeout
          if (this.geocodeTimeout) {
            clearTimeout(this.geocodeTimeout);
          }

          // Debounce the geocoding call
          this.geocodeTimeout = window.setTimeout(() => {
            this.geocodeShowsInRange().finally(() => {
              isProcessing = false;
            });
          }, 500); // 500ms debounce
        }
      });

      // Get user location
      this.getUserLocation();

      runInAction(() => {
        this.isInitialized = true;
      });
    } catch (error) {
      console.error('Failed to initialize map store:', error);
    }
  }

  // Geocode shows and filter by distance from user location
  async geocodeShowsInRange(): Promise<void> {
    if (this.isGeocoding || !this.showStore?.shows) return;

    runInAction(() => {
      this.isGeocoding = true;
    });

    try {
      if (this.userLocation) {
        // Use server-side filtering for nearby shows
        const response = await fetch(
          `/shows/nearby?lat=${this.userLocation.lat}&lng=${this.userLocation.lng}&radius=${this.maxDistanceMiles}`,
        );

        if (response.ok) {
          const nearbyShows = await response.json();

          runInAction(() => {
            this.geocodedShows = nearbyShows.map((show: any) => ({
              ...show,
              id: show.id || show.showId,
              venue: show.venue || show.name || 'Unknown Venue',
            }));
            this.isGeocoding = false;
          });

          // Update map bounds to show all geocoded shows
          if (this.mapInstance && this.geocodedShows.length > 0) {
            this.fitMapToShows();
          }

          return;
        }
      }

      // Fallback to client-side geocoding if server endpoint fails or no user location
      await this.geocodeShowsClientSide();
    } catch (error) {
      console.error('Error getting nearby shows from server:', error);
      // Fallback to client-side geocoding
      await this.geocodeShowsClientSide();
    }
  }

  // Client-side geocoding fallback
  private async geocodeShowsClientSide(): Promise<void> {
    try {
      // Set up geocoding service with API key
      if (this.apiStore?.googleMapsApiKey) {
        geocodingService.setApiKey(this.apiStore.googleMapsApiKey);
      }

      const geocodedShows: GeocodedShow[] = [];
      let apiCallCount = 0;
      const MAX_API_CALLS_PER_BATCH = 10;

      // Geocode each show with an address
      for (const show of this.showStore.shows) {
        if (!show.address) continue;

        try {
          let geocodeResult = null;

          // Check cache first
          const cached = this.geocodeCache.get(show.address);
          if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
            geocodeResult = { lat: cached.lat, lng: cached.lng };
          } else if (apiCallCount < MAX_API_CALLS_PER_BATCH) {
            // Only make API call if under the limit
            geocodeResult = await geocodingService.geocodeAddress(show.address);
            apiCallCount++;

            if (geocodeResult) {
              // Cache the result
              this.geocodeCache.set(show.address, {
                lat: geocodeResult.lat,
                lng: geocodeResult.lng,
                timestamp: Date.now(),
              });
            }

            // Add small delay between API calls
            if (apiCallCount < MAX_API_CALLS_PER_BATCH) {
              await new Promise((resolve) => setTimeout(resolve, 100));
            }
          } else {
            // Skip if we've hit the API call limit
            console.log(`Skipping geocoding for "${show.address}" - API limit reached`);
            continue;
          }

          if (geocodeResult) {
            const geocodedShow: GeocodedShow = {
              ...show,
              lat: geocodeResult.lat,
              lng: geocodeResult.lng,
            };

            // Calculate distance from user location if available
            if (this.userLocation) {
              geocodedShow.distance = this.calculateDistance(
                this.userLocation.lat,
                this.userLocation.lng,
                geocodeResult.lat,
                geocodeResult.lng,
              );

              // Only include shows within the specified radius
              if (geocodedShow.distance <= this.maxDistanceMiles) {
                geocodedShows.push(geocodedShow);
              }
            } else {
              // If no user location, include all geocoded shows
              geocodedShows.push(geocodedShow);
            }
          }
        } catch (error) {
          console.warn(`Failed to geocode address "${show.address}":`, error);
        }
      }

      runInAction(() => {
        this.geocodedShows = geocodedShows;
        this.isGeocoding = false;
      });

      // Update map bounds to show all geocoded shows
      if (this.mapInstance && geocodedShows.length > 0) {
        this.fitMapToShows();
      }
    } catch (error) {
      console.error('Error geocoding shows client-side:', error);
      runInAction(() => {
        this.isGeocoding = false;
      });
    }
  }

  // Calculate distance between two coordinates in miles
  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 3959; // Earth's radius in miles
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  // Fit map to show all geocoded shows
  private fitMapToShows(): void {
    if (!this.mapInstance || this.geocodedShows.length === 0) return;

    const bounds = new google.maps.LatLngBounds();

    // Add all show coordinates to bounds
    this.geocodedShows.forEach((show) => {
      bounds.extend({ lat: show.lat, lng: show.lng });
    });

    // Add user location to bounds if available
    if (this.userLocation) {
      bounds.extend(this.userLocation);
    }

    // Fit map to bounds
    this.mapInstance.fitBounds(bounds);

    // Set maximum zoom level to maintain city-wide view
    const listener = google.maps.event.addListener(this.mapInstance, 'bounds_changed', () => {
      if (this.mapInstance && this.mapInstance.getZoom()! > 12) {
        this.mapInstance.setZoom(12);
      }
      google.maps.event.removeListener(listener);
    });
  }

  // Get user's current location
  private getUserLocation(): void {
    if (!navigator.geolocation) {
      runInAction(() => {
        this.locationError = 'Geolocation is not supported by this browser';
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };

        runInAction(() => {
          this.userLocation = location;
          this.locationError = null;
        });

        // Pan to user location if map is loaded
        if (this.mapInstance) {
          this.mapInstance.panTo(location);
          this.mapInstance.setZoom(14);
        }

        // Re-geocode shows with new user location for distance filtering
        this.geocodeShowsInRange();
      },
      (error) => {
        let errorMessage = 'Error getting user location';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access denied by user';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information is unavailable';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out';
            break;
        }

        runInAction(() => {
          this.locationError = errorMessage;
        });
        console.warn('Error getting user location:', error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000, // 5 minutes
      },
    );
  }

  // Set the map instance
  setMapInstance = (map: google.maps.Map | null): void => {
    if (!this) {
      console.error('MapStore context is undefined');
      return;
    }

    runInAction(() => {
      this.mapInstance = map;
    });

    // If we have user location and the map just loaded, pan to it
    if (map && this.userLocation) {
      map.panTo(this.userLocation);
      map.setZoom(14);
    }
  };

  // Public method to request location and go to current location
  goToCurrentLocation = async (): Promise<void> => {
    if (this.userLocation && this.mapInstance) {
      // If we already have user location, just pan to it
      this.mapInstance.panTo(this.userLocation);
      this.mapInstance.setZoom(14);
      // Refresh shows for current location
      await this.geocodeShowsInRange();
      return;
    }

    // Request location permission and get current location
    this.getUserLocation();
  };

  // Check if we have location permission
  hasLocationPermission = (): boolean => {
    return this.userLocation !== null && this.locationError === null;
  };

  // Clear location error
  clearLocationError = (): void => {
    runInAction(() => {
      this.locationError = null;
    });
  };

  // Handle marker click
  handleMarkerClick = (show: any): void => {
    if (!this) {
      console.error('MapStore context is undefined in handleMarkerClick');
      return;
    }

    runInAction(() => {
      this.selectedMarkerId = show.id;
    });

    // Update selected show in show store
    this.showStore?.setSelectedShow(show);
  };

  // Close info window
  closeInfoWindow = (): void => {
    if (!this) {
      console.error('MapStore context is undefined in closeInfoWindow');
      return;
    }

    runInAction(() => {
      this.selectedMarkerId = null;
    });

    // Clear selected show
    this.showStore?.setSelectedShow(null);
  };

  // Reset map view to show all shows
  resetMapView(): void {
    if (!this.mapInstance) {
      return;
    }

    // Use the new geocoded shows system
    if (this.geocodedShows.length > 0) {
      this.fitMapToShows();
    } else if (this.userLocation) {
      this.mapInstance.setCenter(this.userLocation);
      this.mapInstance.setZoom(12);
    }
  }

  // Pan to specific show
  panToShow(show: any): void {
    if (!this.mapInstance) return;

    // Find the geocoded show
    const geocodedShow = this.geocodedShows.find((s) => s.id === show.id);
    if (!geocodedShow) {
      console.warn('Show not found in geocoded shows');
      return;
    }

    const location = {
      lat: geocodedShow.lat,
      lng: geocodedShow.lng,
    };

    this.mapInstance.panTo(location);
    this.mapInstance.setZoom(16);

    // Select the show marker
    this.handleMarkerClick(geocodedShow);
  }

  // Get Google Maps API key
  get apiKey(): string | undefined {
    return this.apiStore?.googleMapsApiKey;
  }

  // Check if config is loaded
  get isConfigLoaded(): boolean {
    return this.apiStore?.configLoaded || false;
  }

  // Get current center for map
  get currentCenter(): { lat: number; lng: number } {
    return this.userLocation || this.initialCenter;
  }

  // Get current zoom level
  get currentZoom(): number {
    return this.userLocation ? 9 : this.initialZoom; // 9 = ~20 mile radius when user location available
  }

  // Check if a specific marker is selected
  isMarkerSelected(showId: string): boolean {
    return this.selectedMarkerId === showId;
  }

  // Cleanup method for when component unmounts
  cleanup(): void {
    // Clear any pending timeouts
    if (this.geocodeTimeout) {
      clearTimeout(this.geocodeTimeout);
      this.geocodeTimeout = null;
    }

    // Clear geocoding cache
    this.geocodeCache.clear();

    runInAction(() => {
      this.mapInstance = null;
      this.selectedMarkerId = null;
      this.isInitialized = false;
      this.hasSetInitialBounds = false; // Reset bounds flag
    });
  }
}

// Create and export singleton instance
export const mapStore = new MapStore();
export default mapStore;
