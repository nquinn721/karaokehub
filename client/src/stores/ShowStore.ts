import { makeAutoObservable, runInAction } from 'mobx';
import { geocodingService } from '../utils/geocoding';
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
  // Additional fields for map functionality
  lat?: number;
  lng?: number;
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
    // Don't automatically fetch - let the caller decide when to fetch
  }

  setSelectedShow(show: Show | null) {
    runInAction(() => {
      this.selectedShow = show;
    });
  }

  setLoading(loading: boolean) {
    this.isLoading = loading;
  }

  async fetchShows(day?: string | DayOfWeek) {
    try {
      console.log('ShowStore fetchShows called with day:', day);
      this.setLoading(true);

      const endpoint = day ? apiStore.endpoints.shows.byDay(day) : apiStore.endpoints.shows.base;
      console.log('Fetching shows from endpoint:', endpoint);

      const response = await apiStore.get(endpoint);
      console.log('API response received:', response?.length || 0, 'shows');

      // Set up geocoding service with API key
      if (apiStore.googleMapsApiKey) {
        geocodingService.setApiKey(apiStore.googleMapsApiKey);
      }

      // Geocode addresses for shows that don't have coordinates
      const showsWithCoordinates = await Promise.all(
        (response || []).map(async (show: Show) => {
          // If show already has coordinates, use them
          if (show.lat && show.lng) {
            return show;
          }

          // Otherwise, geocode the address
          if (show.address) {
            try {
              const geocodeResult = await geocodingService.geocodeAddress(show.address);
              return {
                ...show,
                lat: geocodeResult.lat,
                lng: geocodeResult.lng,
              };
            } catch (error) {
              console.warn(`Failed to geocode address "${show.address}":`, error);
              // Return show without coordinates if geocoding fails
              return show;
            }
          }

          // Return show without coordinates if no address
          return show;
        }),
      );

      runInAction(() => {
        this.shows = showsWithCoordinates;
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
    return this.shows.filter((show) => show.day === this.selectedDay);
  }

  get showsWithCoordinates() {
    return this.showsForSelectedDay.filter((show) => show.lat && show.lng);
  }

  // Method to geocode a single show address
  async geocodeShow(show: Show): Promise<Show> {
    if (!show.address || (show.lat && show.lng)) {
      return show; // Return as-is if no address or already has coordinates
    }

    // Set up geocoding service with API key
    if (apiStore.googleMapsApiKey) {
      geocodingService.setApiKey(apiStore.googleMapsApiKey);
    }

    try {
      const geocodeResult = await geocodingService.geocodeAddress(show.address);
      return {
        ...show,
        lat: geocodeResult.lat,
        lng: geocodeResult.lng,
      };
    } catch (error) {
      console.warn(`Failed to geocode show address "${show.address}":`, error);
      return show;
    }
  }

  // Method to clear geocoding cache if needed
  clearGeocodingCache(): void {
    geocodingService.clearCache();
  }

  // Method to get geocoding cache statistics
  getGeocodingCacheStats(): { totalEntries: number; cacheSize: string } {
    return geocodingService.getCacheStats();
  }
}

export const showStore = new ShowStore();
