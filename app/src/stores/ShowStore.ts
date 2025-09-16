import { makeAutoObservable, runInAction } from 'mobx';
import { apiService } from '../services/ApiService';
import { CitySummary, DayOfWeek, MapBounds, Show } from '../types';

export class ShowStore {
  shows: Show[] = [];
  currentShow: Show | null = null;
  selectedDay: DayOfWeek = DayOfWeek.MONDAY;
  selectedShow: Show | null = null;
  isLoading = false;

  // City summary data for zoom levels
  citySummaries: CitySummary[] = [];
  isLoadingCitySummaries = false;
  isUsingCityView = false;

  // Filter state
  private _radiusFilter = 25; // miles
  private _vendorFilter: string | null = null;
  private _useDayFilter = true;

  // Fetch control to prevent loops
  private _lastFetchTime = 0;
  private _fetchDebounceTime = 2000; // 2 seconds minimum between fetches
  private _isInitialized = false;

  constructor() {
    makeAutoObservable(this);
  }

  // Getters
  get radiusFilter(): number {
    return this._radiusFilter;
  }

  get vendorFilter(): string | null {
    return this._vendorFilter;
  }

  get useDayFilter(): boolean {
    return this._useDayFilter;
  }

  get isInitialized(): boolean {
    return this._isInitialized;
  }

  // Check if we should fetch (prevent rapid successive calls)
  private shouldFetch(): boolean {
    const now = Date.now();
    const timeSinceLastFetch = now - this._lastFetchTime;
    return timeSinceLastFetch >= this._fetchDebounceTime;
  }

  // Mark fetch as completed
  private markFetchCompleted() {
    this._lastFetchTime = Date.now();
    this._isInitialized = true;
  }

  get filteredShows(): Show[] {
    return this.shows.filter((show) => {
      // Day filter
      if (this._useDayFilter && show.day !== this.selectedDay) {
        return false;
      }

      // Vendor filter
      if (this._vendorFilter && show.dj?.vendor?.id !== this._vendorFilter) {
        return false;
      }

      return true;
    });
  }

  // Actions
  setLoading(loading: boolean) {
    runInAction(() => {
      this.isLoading = loading;
    });
  }

  setSelectedDay(day: DayOfWeek) {
    runInAction(() => {
      this.selectedDay = day;
    });
  }

  setSelectedShow(show: Show | null) {
    runInAction(() => {
      this.selectedShow = show;
    });
  }

  setRadiusFilter(radius: number) {
    runInAction(() => {
      this._radiusFilter = radius;
    });
  }

  setVendorFilter(vendorId: string | null) {
    runInAction(() => {
      this._vendorFilter = vendorId;
    });
  }

  setUseDayFilter(use: boolean) {
    runInAction(() => {
      this._useDayFilter = use;
    });
  }

  // Fetch shows with optional filters
  async fetchShows(day?: DayOfWeek, location?: MapBounds, force = false) {
    // Prevent fetch loops
    if (!force && !this.shouldFetch()) {
      console.log('🚫 Skipping fetch - too soon since last fetch');
      return { success: true, cached: true };
    }

    // If already loading, don't start another fetch
    if (this.isLoading) {
      console.log('🚫 Skipping fetch - already loading');
      return { success: true, loading: true };
    }

    try {
      console.log('📡 Fetching shows from production API...');
      this.setLoading(true);

      const params: any = {};

      if (day && this._useDayFilter) {
        params.day = day;
      }

      if (location) {
        params.lat = location.lat;
        params.lng = location.lng;
        params.radius = location.radius || this._radiusFilter;
      }

      if (this._vendorFilter) {
        params.vendorId = this._vendorFilter;
      }

      console.log('📡 API request params:', params);
      const response = await apiService.get(apiService.endpoints.shows.list, { params });
      console.log('✅ Shows loaded successfully:', response?.shows?.length || 0, 'shows');

      runInAction(() => {
        this.shows = response.shows || [];
        this.isUsingCityView = false;
        this.isLoading = false;
      });

      this.markFetchCompleted();
      return { success: true, shows: this.shows };
    } catch (error: any) {
      console.error('❌ Failed to fetch shows:', error);
      
      runInAction(() => {
        this.isLoading = false;
      });

      // Still mark as completed to prevent immediate retries
      this.markFetchCompleted();

      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to fetch shows',
        status: error.response?.status,
      };
    }
  }

  // Fetch all shows nationwide (for low zoom levels)
  async fetchAllShows(day?: DayOfWeek, vendorFilter?: string | null) {
    try {
      this.setLoading(true);

      const params: any = {};

      if (day && this._useDayFilter) {
        params.day = day;
      }

      if (vendorFilter) {
        params.vendorId = vendorFilter;
      }

      params.nationwide = true;

      const response = await apiService.get(apiService.endpoints.shows.list, { params });

      runInAction(() => {
        this.shows = response.shows || [];
        this.isUsingCityView = false;
        this.isLoading = false;
      });

      return { success: true };
    } catch (error: any) {
      runInAction(() => {
        this.isLoading = false;
      });

      console.error('Failed to fetch all shows:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch shows',
      };
    }
  }

  // Fetch city summaries for low zoom levels
  async fetchCitySummaries(day?: DayOfWeek) {
    try {
      runInAction(() => {
        this.isLoadingCitySummaries = true;
      });

      const params: any = { citySummary: true };

      if (day && this._useDayFilter) {
        params.day = day;
      }

      const response = await apiService.get(apiService.endpoints.shows.list, { params });

      runInAction(() => {
        this.citySummaries = response.citySummaries || [];
        this.isUsingCityView = true;
        this.isLoadingCitySummaries = false;
      });

      return { success: true };
    } catch (error: any) {
      runInAction(() => {
        this.isLoadingCitySummaries = false;
      });

      console.error('Failed to fetch city summaries:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch city summaries',
      };
    }
  }

  // Create a new show
  async createShow(showData: Partial<Show>) {
    try {
      this.setLoading(true);

      const response = await apiService.post(apiService.endpoints.shows.create, showData);

      runInAction(() => {
        if (response.show) {
          this.shows.push(response.show);
        }
        this.isLoading = false;
      });

      return { success: true, show: response.show };
    } catch (error: any) {
      runInAction(() => {
        this.isLoading = false;
      });

      console.error('Failed to create show:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to create show',
      };
    }
  }

  // Update an existing show
  async updateShow(showId: string, showData: Partial<Show>) {
    try {
      this.setLoading(true);

      const response = await apiService.put(apiService.endpoints.shows.update(showId), showData);

      runInAction(() => {
        const index = this.shows.findIndex((show) => show.id === showId);
        if (index !== -1 && response.show) {
          this.shows[index] = response.show;
        }
        this.isLoading = false;
      });

      return { success: true, show: response.show };
    } catch (error: any) {
      runInAction(() => {
        this.isLoading = false;
      });

      console.error('Failed to update show:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to update show',
      };
    }
  }

  // Delete a show
  async deleteShow(showId: string) {
    try {
      this.setLoading(true);

      await apiService.delete(apiService.endpoints.shows.delete(showId));

      runInAction(() => {
        this.shows = this.shows.filter((show) => show.id !== showId);
        if (this.selectedShow?.id === showId) {
          this.selectedShow = null;
        }
        this.isLoading = false;
      });

      return { success: true };
    } catch (error: any) {
      runInAction(() => {
        this.isLoading = false;
      });

      console.error('Failed to delete show:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to delete show',
      };
    }
  }

  // Favorite a show
  async addToFavorites(showId: string) {
    try {
      await apiService.post(apiService.endpoints.shows.addFavorite(showId));

      runInAction(() => {
        const show = this.shows.find((s) => s.id === showId);
        if (show) {
          // Update the favorites array optimistically
          if (!show.favorites) {
            show.favorites = [];
          }
          // Add placeholder favorite (the backend will return the real user ID)
          show.favorites.push({
            id: 'temp',
            userId: 'current-user',
          });
        }
      });

      return { success: true };
    } catch (error: any) {
      console.error('Failed to add show to favorites:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to add to favorites',
      };
    }
  }

  // Remove from favorites
  async removeFromFavorites(showId: string) {
    try {
      await apiService.delete(apiService.endpoints.shows.removeFavorite(showId));

      runInAction(() => {
        const show = this.shows.find((s) => s.id === showId);
        if (show?.favorites) {
          // Remove from favorites optimistically
          show.favorites = show.favorites.filter((fav) => fav.userId !== 'current-user');
        }
      });

      return { success: true };
    } catch (error: any) {
      console.error('Failed to remove show from favorites:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to remove from favorites',
      };
    }
  }

  // Utility methods
  getVenueCoordinates(show: Show): { lat: number; lng: number } | null {
    if (show.venue?.lat && show.venue?.lng) {
      return { lat: show.venue.lat, lng: show.venue.lng };
    }
    return null;
  }

  isShowFavorited(showId: string, userId: string): boolean {
    const show = this.shows.find((s) => s.id === showId);
    return !!show?.favorites?.some((fav) => fav.userId === userId);
  }

  getShowsByVenue(venueId: string): Show[] {
    return this.shows.filter((show) => show.venue?.id === venueId);
  }

  // Initialize store - call this once when app starts
  async initialize() {
    if (this._isInitialized) {
      console.log('📱 ShowStore already initialized');
      return { success: true, cached: true };
    }

    console.log('🚀 Initializing ShowStore with production data...');
    return await this.fetchShows(undefined, undefined, true);
  }

  // Force refresh (ignores debounce)
  async refresh() {
    console.log('🔄 Force refreshing shows...');
    return await this.fetchShows(undefined, undefined, true);
  }

  // Clear all data
  clearData() {
    runInAction(() => {
      this.shows = [];
      this.citySummaries = [];
      this.selectedShow = null;
      this.currentShow = null;
      this.isUsingCityView = false;
      this._isInitialized = false;
      this._lastFetchTime = 0;
    });
  }
}

export const showStore = new ShowStore();
