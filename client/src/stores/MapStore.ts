import { autorun, makeAutoObservable, runInAction } from 'mobx';

export interface UserLocation {
  lat: number;
  lng: number;
}

export class MapStore {
  public userLocation: UserLocation | null = null;
  public selectedMarkerId: string | null = null;
  public mapInstance: google.maps.Map | null = null;
  public initialCenter = { lat: 40.7128, lng: -74.006 }; // Default to NYC
  public initialZoom = 8; // Much more zoomed out to show whole city/region
  public isInitialized = false;
  public locationError: string | null = null;
  public hasSetInitialBounds = false; // Flag to prevent infinite autorun loops

  // Store references to avoid circular dependencies
  private apiStore: any = null;
  private showStore: any = null;

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

      // Set up autorun after stores are available
      autorun(() => {
        // Only run this when we have shows and a map instance, but prevent infinite loops
        if (
          this.showStore?.showsWithCoordinates.length > 0 &&
          this.mapInstance &&
          !this.userLocation &&
          !this.hasSetInitialBounds
        ) {
          this.resetMapView();
          runInAction(() => {
            this.hasSetInitialBounds = true;
          });
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
    if (!this.mapInstance || !this.showStore?.showsWithCoordinates.length) {
      return;
    }

    const bounds = new google.maps.LatLngBounds();

    // Add all show coordinates to bounds
    this.showStore.showsWithCoordinates.forEach((show: any) => {
      if (show.lat && show.lng) {
        bounds.extend({
          lat: show.lat,
          lng: show.lng,
        });
      }
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
        this.mapInstance.setZoom(12); // Prevent zooming in too close
      }
      google.maps.event.removeListener(listener);
    });
  }

  // Pan to specific show
  panToShow(show: any): void {
    if (!this.mapInstance || !show.lat || !show.lng) {
      return;
    }

    const location = {
      lat: show.lat,
      lng: show.lng,
    };

    this.mapInstance.panTo(location);
    this.mapInstance.setZoom(16);

    // Select the show marker
    this.handleMarkerClick(show);
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
