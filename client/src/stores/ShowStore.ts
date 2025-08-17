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
        console.log('Day changed, refetching shows for search center:', mapStore.searchCenter);

        await this.fetchShows(this.selectedDay, {
          lat: mapStore.searchCenter.lat,
          lng: mapStore.searchCenter.lng,
          radius: mapStore.getDynamicRadius(),
        });

        console.log('Shows refreshed for day change');
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
      console.log('ShowStore fetchShows called with day:', day, 'mapCenter:', mapCenter);
      this.setLoading(true);

      let endpoint: string;

      if (mapCenter) {
        // Use location-based query with map center
        const radius = mapCenter.radius || 35;
        endpoint = apiStore.endpoints.shows.nearby(mapCenter.lat, mapCenter.lng, radius, day);
        console.log('Fetching shows from nearby endpoint:', endpoint);
      } else {
        // Fallback to day-based or all shows
        endpoint = day ? apiStore.endpoints.shows.byDay(day) : apiStore.endpoints.shows.base;
        console.log('Fetching shows from standard endpoint:', endpoint);
      }

      const response = await apiStore.get(endpoint);
      console.log('API response received:', response?.length || 0, 'shows');

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
    console.log(
      `ShowStore.showsForSelectedDay: ${filtered.length} shows for ${this.selectedDay} (total shows: ${this.shows.length})`,
    );
    console.log(
      'All shows:',
      this.shows.map((s) => ({ id: s.id, day: s.day, venue: s.venue })),
    );
    console.log(
      'Filtered shows:',
      filtered.map((s) => ({ id: s.id, day: s.day, venue: s.venue })),
    );
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
}

export const showStore = new ShowStore();
