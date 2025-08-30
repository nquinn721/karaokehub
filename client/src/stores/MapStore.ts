import { makeAutoObservable, runInAction } from 'mobx';

export class MapStore {
  // Map instance and state
  public mapInstance: google.maps.Map | null = null;
  public isInitialized = false;
  public userLocation: { lat: number; lng: number } | null = null;
  public currentCenter: { lat: number; lng: number } | null = null;
  public currentZoom = 11;

  // Selected show for InfoWindow
  public selectedShow: any = null;

  // Loading states
  public isLoadingShows = false;
  public isLoadingLocation = false;

  // Dependencies
  private apiStore: any;
  private showStore: any;

  constructor(apiStore: any, showStore: any) {
    makeAutoObservable(this);
    this.apiStore = apiStore;
    this.showStore = showStore;
  }

  // Initialize the map store
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    // Wait for API store to be ready
    await this.apiStore.ensureInitialized();

    runInAction(() => {
      this.isInitialized = true;
    });
  }

  // Set the Google Maps instance
  setMapInstance = (map: google.maps.Map): void => {
    runInAction(() => {
      this.mapInstance = map;
    });

    // Set up event listeners for zoom and center changes
    map.addListener('zoom_changed', () => {
      const zoom = map.getZoom() || 11;

      runInAction(() => {
        this.currentZoom = zoom;
      });

      // Fetch data based on new zoom level
      this.fetchDataForCurrentView();
    });

    map.addListener('center_changed', () => {
      const center = map.getCenter();
      if (center) {
        const lat = center.lat();
        const lng = center.lng();

        runInAction(() => {
          this.currentCenter = { lat, lng };
        });

        // Debounce the data fetching to avoid too many requests
        this.debouncedFetchData();
      }
    });

    // Initial data fetch
    this.fetchDataForCurrentView();
  };

  // Debounced data fetching to avoid too many API calls
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
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
    if (!this.mapInstance || !this.currentCenter) {
      return;
    }

    // Only use day filtering if enabled
    const day = this.showStore.useDayFilter ? this.showStore.selectedDay : undefined;

    runInAction(() => {
      this.isLoadingShows = true;
    });

    try {
      // At zoom 9 or lower, load all shows nationwide without distance filtering
      if (this.currentZoom <= 9) {
        console.log(
          '🌎 MapStore: Fetching ALL shows nationwide (zoom 9 or lower)',
          this.currentZoom,
        );

        await this.showStore.fetchAllShows(day, this.showStore.vendorFilter);
      } else {
        // For zoom levels 10+, use location-based filtering with smaller radius
        console.log('📍 MapStore: Fetching regional shows (zoom 10+)', this.currentZoom);

        // Use appropriate radius for higher zoom levels
        const radius = this.currentZoom <= 12 ? 100 : 50; // 100 miles for medium zoom, 50 miles for detailed view

        const mapCenter = this.currentCenter
          ? { lat: this.currentCenter.lat, lng: this.currentCenter.lng, radius }
          : undefined;

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

  // Handle marker click
  handleMarkerClick = (show: any): void => {
    runInAction(() => {
      this.selectedShow = show;
    });

    // Also set in ShowStore for sidebar highlighting
    this.showStore.setSelectedShow(show);

    // Center map on the selected show if needed
    const coordinates = this.showStore.getVenueCoordinates(show);
    if (this.mapInstance && coordinates) {
      this.mapInstance.panTo(coordinates);
    }
  };

  // Clear selected show
  clearSelectedShow = (): void => {
    runInAction(() => {
      this.selectedShow = null;
    });

    this.showStore.setSelectedShow(null);
  };

  // Select show from sidebar (called when clicking on sidebar show)
  selectShowFromSidebar = (show: any): void => {
    this.handleMarkerClick(show);

    // Zoom to show location if map is available
    const coordinates = this.showStore.getVenueCoordinates(show);
    if (this.mapInstance && coordinates) {
      this.mapInstance.setCenter(coordinates);

      // Zoom in if we're too far out to see individual shows
      if (this.currentZoom <= 9) {
        this.mapInstance.setZoom(14);
      }
    }
  };

  // Get current location and center map
  async goToCurrentLocation(isMobile: boolean = false): Promise<void> {
    runInAction(() => {
      this.isLoadingLocation = true;
    });

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        if (!navigator.geolocation) {
          reject(new Error('Geolocation not supported'));
          return;
        }

        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 10000,
          enableHighAccuracy: true,
        });
      });

      const { latitude, longitude } = position.coords;

      runInAction(() => {
        this.userLocation = { lat: latitude, lng: longitude };
        this.currentCenter = { lat: latitude, lng: longitude };
      });

      // Center map on user location
      if (this.mapInstance) {
        this.mapInstance.setCenter({ lat: latitude, lng: longitude });
        this.mapInstance.setZoom(isMobile ? 10 : 12);
      }
    } catch (error) {
      console.warn('⚠️ MapStore: Failed to get location:', error);

      // Default to center of US if location fails
      const defaultLocation = { lat: 39.8283, lng: -98.5795 };

      runInAction(() => {
        this.userLocation = defaultLocation;
        this.currentCenter = defaultLocation;
      });

      if (this.mapInstance) {
        this.mapInstance.setCenter(defaultLocation);
        this.mapInstance.setZoom(isMobile ? 8 : 5);
      }
    } finally {
      runInAction(() => {
        this.isLoadingLocation = false;
      });
    }
  }

  // Refresh data when filters change
  refreshDataForCurrentView = (): void => {
    this.fetchDataForCurrentView();
  };

  // Get Google Maps API key
  get googleMapsApiKey(): string | undefined {
    return this.apiStore?.googleMapsApiKey;
  }
}

// Create a singleton instance
import { apiStore } from './ApiStore';
import { showStore } from './ShowStore';

export const mapStore = new MapStore(apiStore, showStore);
