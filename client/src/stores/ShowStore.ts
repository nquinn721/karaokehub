import { makeAutoObservable, runInAction } from 'mobx';
import { apiStore } from './ApiStore';

export enum DayOfWeek {
  MONDAY = 'monday',
  TUESDAY = 'tuesday',
  WEDNESDAY = 'wednesday',
  THURSDAY = 'thursday',
  FRIDAY = 'friday',
  SATURDAY = 'saturday',
  SUNDAY = 'sunday',
}

export interface Show {
  id: string;
  vendorId: string;
  djId: string;
  address: string;
  venue?: string; // The bar/restaurant name
  venuePhone?: string; // Venue contact phone number
  venueWebsite?: string; // Venue website URL
  day: DayOfWeek | string;
  startTime: string;
  endTime: string;
  description?: string;
  lat?: number; // Latitude coordinate
  lng?: number; // Longitude coordinate
  vendor?: {
    id: string;
    name: string;
    owner: string;
  };
  dj?: {
    id: string;
    name: string;
  };
  favorites?: Array<{
    id: string;
    userId: string;
  }>;
}

export interface CreateShowData {
  vendorId: string;
  djId: string;
  address: string;
  day: string;
  startTime: string;
  endTime: string;
  description?: string;
}

export class ShowStore {
  shows: Show[] = [];
  currentShow: Show | null = null;
  selectedDay: DayOfWeek = DayOfWeek.MONDAY;
  selectedShow: Show | null = null;
  isLoading = false;

  // UI State (moved from ShowsPageStore)
  public sidebarOpen: boolean = false;
  public selectedMarkerId: string | null = null;

  // Filter state
  private _radiusFilter = 25; // miles
  private _vendorFilter: string | null = null;
  private _useDayFilter = true;

  constructor() {
    makeAutoObservable(this);
    // Initialize with current day but don't fetch automatically
    const today = new Date().getDay();
    const dayMapping = [
      DayOfWeek.SUNDAY,
      DayOfWeek.MONDAY,
      DayOfWeek.TUESDAY,
      DayOfWeek.WEDNESDAY,
      DayOfWeek.THURSDAY,
      DayOfWeek.FRIDAY,
      DayOfWeek.SATURDAY,
    ];
    this.selectedDay = dayMapping[today];

    // Set initial sidebar state based on device
    this.initializeSidebarState();
  }

  private initializeSidebarState() {
    // Check if we're on mobile (similar to useMediaQuery)
    const isMobile = window.innerWidth < 900; // md breakpoint
    this.sidebarOpen = !isMobile; // Default open on desktop, closed on mobile
  }

  // Filter getters and setters
  get radiusFilter() {
    return this._radiusFilter;
  }

  get vendorFilter() {
    return this._vendorFilter;
  }

  get useDayFilter() {
    return this._useDayFilter;
  }

  setRadiusFilter(radius: number) {
    runInAction(() => {
      this._radiusFilter = radius;
    });
  }

  setVendorFilter(vendor: string | null) {
    runInAction(() => {
      this._vendorFilter = vendor;
    });
  }

  setUseDayFilter(use: boolean) {
    runInAction(() => {
      this._useDayFilter = use;
    });
  }

  // Get unique vendors for filtering
  get uniqueVendors() {
    return Array.from(new Set(this.shows.map((show) => show.vendor?.name).filter(Boolean)));
  }

  // ============ UI STATE METHODS ============

  setSidebarOpen(open: boolean) {
    runInAction(() => {
      this.sidebarOpen = open;
    });
  }

  toggleSidebar() {
    this.setSidebarOpen(!this.sidebarOpen);
  }

  setSelectedMarkerId(id: string | null) {
    runInAction(() => {
      this.selectedMarkerId = id;
    });
  }

  // ============ MAP INTEGRATION METHODS ============

  /**
   * Handle marker click - toggle selection
   */
  handleMarkerClick(showId: string) {
    const newId = this.selectedMarkerId === showId ? null : showId;
    this.setSelectedMarkerId(newId);
  }

  // TODO: Distance calculation temporarily disabled - will be moved to server-side
  // Calculate distance between two points
  // private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  //   const R = 3959; // Earth's radius in miles
  //   const dLat = ((lat2 - lat1) * Math.PI) / 180;
  //   const dLng = ((lng2 - lng1) * Math.PI) / 180;
  //   const a =
  //     Math.sin(dLat / 2) * Math.sin(dLat / 2) +
  //     Math.cos((lat1 * Math.PI) / 180) *
  //       Math.cos((lat2 * Math.PI) / 180) *
  //       Math.sin(dLng / 2) *
  //       Math.sin(dLng / 2);
  //   const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  //   return R * c;
  // }

  // Get filtered shows based on current filters
  get filteredShows() {
    return this.shows.filter((show) => {
      // Vendor filter
      if (this._vendorFilter && show.vendor?.name !== this._vendorFilter) {
        return false;
      }

      // TODO: Radius filter temporarily disabled due to circular dependency
      // Will be moved to server-side filtering in next iteration

      return true;
    });
  }

  setSelectedDay(day: DayOfWeek) {
    runInAction(() => {
      this.selectedDay = day;
      this.selectedShow = null; // Clear selection when changing days
    });

    // Refresh map markers for the new day
    this.refreshMapForDayChange();

    // Don't automatically fetch - let the caller decide when to fetch
  }

  // Helper method to refresh map when day changes
  private async refreshMapForDayChange() {
    try {
      // Dynamic import to avoid circular dependency
      const { mapStore } = await import('./MapStore');
      if (mapStore && mapStore.isInitialized && mapStore.searchCenter) {
        // Fetch shows based on current search center and new selected day
        await this.fetchShows(this.selectedDay, {
          lat: mapStore.searchCenter.lat,
          lng: mapStore.searchCenter.lng,
          radius: mapStore.getDynamicRadius(),
        });
      }
    } catch (error) {
      console.warn('Could not refresh shows for day change:', error);
    }
  }

  setSelectedShow(show: Show | null) {
    runInAction(() => {
      this.selectedShow = show;
    });
  }

  setLoading(loading: boolean) {
    this.isLoading = loading;
  }

  async fetchShows(
    day?: string | DayOfWeek,
    mapCenter?: { lat: number; lng: number; radius?: number },
  ) {
    try {
      this.setLoading(true);

      let endpoint: string;

      if (mapCenter) {
        // Use location-based query with map center
        const radius = mapCenter.radius || 35;
        endpoint = apiStore.endpoints.shows.nearby(mapCenter.lat, mapCenter.lng, radius, day);
      } else {
        // Fallback to day-based or all shows
        endpoint = day ? apiStore.endpoints.shows.byDay(day) : apiStore.endpoints.shows.base;
      }

      const response = await apiStore.get(endpoint);

      runInAction(() => {
        this.shows = response || [];
        this.isLoading = false;
      });

      return { success: true };
    } catch (error: any) {
      runInAction(() => {
        this.isLoading = false;
      });
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch shows',
      };
    }
  }

  async fetchShow(id: string) {
    try {
      this.setLoading(true);

      const response = await apiStore.get(apiStore.endpoints.shows.byId(id));

      runInAction(() => {
        this.currentShow = response;
        this.isLoading = false;
      });

      return { success: true };
    } catch (error: any) {
      runInAction(() => {
        this.isLoading = false;
      });
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch show',
      };
    }
  }

  async createShow(showData: CreateShowData) {
    try {
      this.setLoading(true);

      const response = await apiStore.post(apiStore.endpoints.shows.base, showData);

      runInAction(() => {
        this.shows.push(response);
        this.isLoading = false;
      });

      return { success: true, show: response };
    } catch (error: any) {
      runInAction(() => {
        this.isLoading = false;
      });
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to create show',
      };
    }
  }

  async updateShow(id: string, updateData: Partial<CreateShowData>) {
    try {
      this.setLoading(true);

      const response = await apiStore.patch(apiStore.endpoints.shows.byId(id), updateData);

      runInAction(() => {
        const index = this.shows.findIndex((show) => show.id === id);
        if (index !== -1) {
          this.shows[index] = response;
        }
        if (this.currentShow?.id === id) {
          this.currentShow = response;
        }
        this.isLoading = false;
      });

      return { success: true, show: response };
    } catch (error: any) {
      runInAction(() => {
        this.isLoading = false;
      });
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to update show',
      };
    }
  }

  async deleteShow(id: string) {
    try {
      this.setLoading(true);

      await apiStore.delete(apiStore.endpoints.shows.byId(id));

      runInAction(() => {
        this.shows = this.shows.filter((show) => show.id !== id);
        if (this.currentShow?.id === id) {
          this.currentShow = null;
        }
        this.isLoading = false;
      });

      return { success: true };
    } catch (error: any) {
      runInAction(() => {
        this.isLoading = false;
      });
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to delete show',
      };
    }
  }

  async fetchShowsByVendor(vendorId: string) {
    try {
      this.setLoading(true);

      const response = await apiStore.get(apiStore.endpoints.shows.byVendor(vendorId));

      runInAction(() => {
        this.shows = response;
        this.isLoading = false;
      });

      return { success: true };
    } catch (error: any) {
      runInAction(() => {
        this.isLoading = false;
      });
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch vendor shows',
      };
    }
  }

  async fetchShowsByDJ(djId: string) {
    try {
      this.setLoading(true);

      const response = await apiStore.get(apiStore.endpoints.shows.byDJ(djId));

      runInAction(() => {
        this.shows = response;
        this.isLoading = false;
      });

      return { success: true };
    } catch (error: any) {
      runInAction(() => {
        this.isLoading = false;
      });
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch DJ shows',
      };
    }
  }

  get showsForSelectedDay() {
    const filtered = this.shows.filter((show) => show.day === this.selectedDay);
    return filtered;
  }

  get showsWithCoordinates() {
    // Return geocoded shows from MapStore instead
    return [];
  }

  // Geocoding methods removed since lat/lng are no longer stored
  async geocodeShow(show: Show): Promise<Show> {
    return show; // No geocoding needed
  }

  // Method to clear geocoding cache if needed
  clearGeocodingCache(): void {
    // No-op since geocoding is no longer used
  }

  // Method to get geocoding cache statistics
  getGeocodingCacheStats(): { totalEntries: number; cacheSize: string } {
    return { totalEntries: 0, cacheSize: '0 B' };
  }

  /**
   * Handle favorite toggle with store updates
   */
  async handleFavoriteToggle(show: any) {
    try {
      // Import from index to get the singleton instances
      const { authStore, favoriteStore } = await import('./index');

      if (!authStore.isAuthenticated) return;

      const isFavorited = show.favorites?.some((fav: any) => fav.userId === authStore.user?.id);

      if (isFavorited) {
        const favorite = show.favorites?.find((fav: any) => fav.userId === authStore.user?.id);
        if (favorite) {
          await favoriteStore.removeFavorite(favorite.id);
        }
      } else {
        await favoriteStore.addFavorite({
          showId: show.id,
          day: show.day,
        });
      }

      // Refresh shows to update favorites
      if (this.useDayFilter) {
        await this.fetchShows(this.selectedDay);
      } else {
        await this.fetchShows();
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  }
}

export const showStore = new ShowStore();
