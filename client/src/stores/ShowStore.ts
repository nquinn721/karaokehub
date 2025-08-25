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
  djId: string;
  address: string;
  city?: string; // City component of address
  state?: string; // State component of address
  zip?: string; // ZIP code component of address
  venue?: string; // The bar/restaurant name
  venuePhone?: string; // Venue contact phone number
  venueWebsite?: string; // Venue website URL
  source?: string; // Source URL/image that this show was parsed from
  day: DayOfWeek | string;
  startTime: string;
  endTime: string;
  description?: string;
  lat?: number; // Latitude coordinate
  lng?: number; // Longitude coordinate
  dj?: {
    id: string;
    name: string;
    vendor?: {
      id: string;
      name: string;
      owner?: string;
    };
  };
  favorites?: Array<{
    id: string;
    userId: string;
  }>;
}

export interface CitySummary {
  city: string;
  state: string;
  showCount: number;
  lat: number;
  lng: number;
  vendors: string[]; // Array of vendor names in this city
}

export interface CreateShowData {
  djId: string;
  address: string;
  day: string;
  startTime: string;
  endTime: string;
  description?: string;
  source?: string;
}

export class ShowStore {
  shows: Show[] = [];
  currentShow: Show | null = null;
  selectedDay: DayOfWeek = DayOfWeek.MONDAY;
  selectedShow: Show | null = null;
  isLoading = false;

  // City summary data for zoom levels 9 and below
  citySummaries: CitySummary[] = [];
  isLoadingCitySummaries = false;
  isUsingCityView = false; // Track whether we're showing city view or individual shows

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
    return Array.from(new Set(this.shows.map((show) => show.dj?.vendor?.name).filter(Boolean)));
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
   * Handle marker click - toggle selection and move map
   */
  handleMarkerClick(showId: string) {
    const newId = this.selectedMarkerId === showId ? null : showId;
    this.setSelectedMarkerId(newId);

    // If selecting a show, find the show object and tell MapStore to select it
    if (newId) {
      const show = this.shows.find((s) => s.id === showId);
      if (show) {
        // Import MapStore dynamically to avoid circular dependencies
        import('./index').then(({ mapStore }) => {
          mapStore.selectedShow = show;
        });
      }
    } else {
      // If deselecting, clear the map selection
      import('./index').then(({ mapStore }) => {
        mapStore.clearSelectedShow();
      });
    }
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
      if (this._vendorFilter && show.dj?.vendor?.name !== this._vendorFilter) {
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

    // Trigger MapStore to refresh data for the new day
    this.refreshMapForDayChange();
  }

  // Helper method to refresh map when day changes
  private async refreshMapForDayChange() {
    try {
      // Dynamic import to avoid circular dependency
      const { mapStore } = await import('./MapStore');
      if (mapStore && mapStore.isInitialized) {
        // Let MapStore handle data fetching based on current zoom/location
        mapStore.refreshDataForCurrentView();
      }
    } catch (error) {
      console.error('Error refreshing map for day change:', error);
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

      // DEBUG: Add 3 second delay to see loading state behavior
      await new Promise(resolve => setTimeout(resolve, 3000));

      let endpoint: string;

      if (mapCenter) {
        // Use location-based query with map center
        const radius = mapCenter.radius || 35;
        endpoint = apiStore.endpoints.shows.nearby(mapCenter.lat, mapCenter.lng, radius, day);
      } else {
        // Fallback to day-based or all shows
        endpoint = day ? apiStore.endpoints.shows.byDay(day) : apiStore.endpoints.shows.base;
      }

      console.log('🔗 Fetching shows from endpoint:', endpoint);
      console.log('📅 Day parameter:', day);
      console.log('🗺️ Map center parameter:', mapCenter);

      const response = await apiStore.get(endpoint);

      runInAction(() => {
        // Remove duplicates by ID before storing
        const uniqueShows = response || [];
        const seenIds = new Set();
        const deduplicatedShows = uniqueShows.filter((show: any) => {
          if (seenIds.has(show.id)) {
            console.warn(
              `🔍 Duplicate show detected and removed: ${show.id} - ${show.venue?.name}`,
            );
            return false;
          }
          seenIds.add(show.id);
          return true;
        });

        console.log(
          `📊 Fetched ${uniqueShows.length} shows, after deduplication: ${deduplicatedShows.length}`,
        );
        this.shows = deduplicatedShows;
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

  // Fetch city summaries for zoom levels 9 and below
  async fetchCitySummaries(day?: DayOfWeek): Promise<{ success: boolean; error?: string }> {
    try {
      runInAction(() => {
        this.isLoadingCitySummaries = true;
        this.isUsingCityView = true;
      });

      console.log(`🏙️ Fetching city summaries for ${day || 'all days'}`);

      const endpoint = apiStore.endpoints.shows.citySummary(day);
      const response = await apiStore.get(endpoint);

      runInAction(() => {
        this.citySummaries = response || [];
        this.isLoadingCitySummaries = false;
      });

      console.log(`📊 Received ${this.citySummaries.length} city summaries`);
      return { success: true };
    } catch (error: any) {
      runInAction(() => {
        this.isLoadingCitySummaries = false;
        this.isUsingCityView = false;
      });
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch city summaries',
      };
    }
  }

  // Switch back to individual show view (for zoom 10+)
  switchToShowView() {
    runInAction(() => {
      this.isUsingCityView = false;
      this.citySummaries = [];
    });
    console.log('🎯 Switched to individual show view');
  }

  async fetchShow(id: string) {
    try {
      this.setLoading(true);

      // DEBUG: Add 3 second delay to see loading state behavior
      await new Promise(resolve => setTimeout(resolve, 3000));

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
  async handleFavoriteToggle(show: any, onAuthRequired?: () => void) {
    try {
      // Import from index to get the singleton instances
      const { authStore, favoriteStore } = await import('./index');

      if (!authStore.isAuthenticated) {
        // Call the auth required callback if provided
        if (onAuthRequired) {
          onAuthRequired();
        }
        return;
      }

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

  // Fetch all shows with filters (no distance limit) - for zoom 11-15
  async fetchAllShows(
    day?: DayOfWeek,
    vendor?: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      runInAction(() => {
        this.isLoading = true;
        this.isUsingCityView = false;
      });

      console.log(
        `🌍 Fetching all shows for ${day || 'all days'}${vendor ? ` and vendor ${vendor}` : ''}`,
      );

      // Use the regular /shows endpoint with filters
      let endpoint = '/shows';
      const params = new URLSearchParams();
      if (day) params.append('day', day);
      if (vendor) params.append('vendor', vendor);

      if (params.toString()) {
        endpoint += `?${params.toString()}`;
      }

      const response = await apiStore.get(endpoint);

      runInAction(() => {
        this.shows = response || [];
        this.isLoading = false;
      });

      console.log(`📍 Received ${this.shows.length} shows from all cities`);
      return { success: true };
    } catch (error: any) {
      runInAction(() => {
        this.isLoading = false;
      });
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch all shows',
      };
    }
  }

  // Fetch nearby shows within radius - for zoom 16+
  async fetchNearbyShows(
    lat: number,
    lng: number,
    radius: number,
    day?: DayOfWeek,
    vendor?: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      runInAction(() => {
        this.isLoading = true;
        this.isUsingCityView = false;
      });

      console.log(
        `📍 Fetching nearby shows within ${radius} miles for ${day || 'all days'}${vendor ? ` and vendor ${vendor}` : ''}`,
      );

      const params = new URLSearchParams({
        centerLat: lat.toString(),
        centerLng: lng.toString(),
        radius: radius.toString(),
      });

      if (day) params.append('day', day);
      if (vendor) params.append('vendor', vendor);

      const endpoint = `/shows/nearby?${params.toString()}`;
      const response = await apiStore.get(endpoint);

      runInAction(() => {
        this.shows = response || [];
        this.isLoading = false;
      });

      console.log(`📍 Received ${this.shows.length} nearby shows`);
      return { success: true };
    } catch (error: any) {
      runInAction(() => {
        this.isLoading = false;
      });
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch nearby shows',
      };
    }
  }

  /**
   * Search shows by venue name, vendor name, address, city, or DJ name
   */
  async searchShows(query: string, limit: number = 20): Promise<Show[]> {
    if (!query || query.trim().length < 2) {
      return [];
    }

    try {
      this.setLoading(true);

      const response = await apiStore.get(apiStore.endpoints.shows.search(query, limit));

      runInAction(() => {
        this.isLoading = false;
      });

      return response || [];
    } catch (error: any) {
      runInAction(() => {
        this.isLoading = false;
      });
      console.error('Error searching shows:', error);
      return [];
    }
  }

  /**
   * Get shows for a specific DJ for the current week
   */
  async getDJWeeklySchedule(djId: string): Promise<Show[]> {
    try {
      const response = await apiStore.get(apiStore.endpoints.shows.byDJ(djId));
      return response || [];
    } catch (error: any) {
      console.error('Error fetching DJ weekly schedule:', error);
      return [];
    }
  }

  /**
   * Get shows for a specific venue for the current week
   */
  async getVenueWeeklySchedule(venue: string): Promise<Show[]> {
    try {
      const response = await apiStore.get(apiStore.endpoints.shows.byVenue(venue));
      return response || [];
    } catch (error: any) {
      console.error('Error fetching venue weekly schedule:', error);
      return [];
    }
  }
}

export const showStore = new ShowStore();
