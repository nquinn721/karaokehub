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

    console.log('🗺️ MapStore: Initializing...');

    // Wait for API store to be ready
    await this.apiStore.ensureInitialized();

    runInAction(() => {
      this.isInitialized = true;
    });

    console.log('🗺️ MapStore: Initialized');
  }

  // Set the Google Maps instance
  setMapInstance = (map: google.maps.Map): void => {
    console.log('🗺️ MapStore: Setting map instance');

    runInAction(() => {
      this.mapInstance = map;
    });

    // Set up event listeners for zoom and center changes
    map.addListener('zoom_changed', () => {
      const zoom = map.getZoom() || 11;
      console.log('🔍 Zoom changed to:', zoom);

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
      console.log('🗺️ MapStore: No map instance or center, skipping data fetch');
      return;
    }

    const zoom = this.currentZoom;
    const center = this.currentCenter;
    const day = this.showStore.selectedDay;
    const vendor = this.showStore.vendorFilter;

    console.log('🗺️ MapStore: Fetching data for view:', {
      zoom,
      center,
      day,
      vendor,
    });

    runInAction(() => {
      this.isLoadingShows = true;
    });

    try {
      if (zoom <= 9) {
        // Low zoom (9 or less): Get ALL shows with current filters (no radius limit)
        console.log('🌍 MapStore: Low zoom - fetching ALL shows with filters (no radius)');
        await this.showStore.fetchAllShows(day, vendor);
      } else {
        // High zoom (10+): Get shows within 100 miles of map center
        console.log('📍 MapStore: High zoom - fetching nearby shows within 100 miles');
        await this.showStore.fetchNearbyShows(center.lat, center.lng, 100, day, vendor);
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
    console.log('🎯 MapStore: Marker clicked:', show.venue || show.id);

    runInAction(() => {
      this.selectedShow = show;
    });

    // Also set in ShowStore for sidebar highlighting
    this.showStore.setSelectedShow(show);

    // Center map on the selected show if needed
    if (this.mapInstance && show.lat && show.lng) {
      const lat = typeof show.lat === 'string' ? parseFloat(show.lat) : show.lat;
      const lng = typeof show.lng === 'string' ? parseFloat(show.lng) : show.lng;

      this.mapInstance.panTo({ lat, lng });
    }
  };

  // Clear selected show
  clearSelectedShow = (): void => {
    console.log('🗺️ MapStore: Clearing selected show');

    runInAction(() => {
      this.selectedShow = null;
    });

    this.showStore.setSelectedShow(null);
  };

  // Select show from sidebar (called when clicking on sidebar show)
  selectShowFromSidebar = (show: any): void => {
    console.log('📝 MapStore: Show selected from sidebar:', show.venue || show.id);

    this.handleMarkerClick(show);

    // Zoom to show location if map is available
    if (this.mapInstance && show.lat && show.lng) {
      const lat = typeof show.lat === 'string' ? parseFloat(show.lat) : show.lat;
      const lng = typeof show.lng === 'string' ? parseFloat(show.lng) : show.lng;

      this.mapInstance.setCenter({ lat, lng });

      // Zoom in if we're too far out to see individual shows
      if (this.currentZoom <= 9) {
        this.mapInstance.setZoom(14);
      }
    }
  };

  // Get current location and center map
  async goToCurrentLocation(): Promise<void> {
    console.log('🌍 MapStore: Getting current location...');

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
        this.mapInstance.setZoom(12);
      }

      console.log('✅ MapStore: Location found:', { lat: latitude, lng: longitude });
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
        this.mapInstance.setZoom(5);
      }
    } finally {
      runInAction(() => {
        this.isLoadingLocation = false;
      });
    }
  }

  // Refresh data when filters change
  refreshDataForCurrentView = (): void => {
    console.log('🔄 MapStore: Refreshing data for current view');
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
