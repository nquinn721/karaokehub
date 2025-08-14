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
    // Initialize with current day
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
    this.fetchShows(day);
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
      this.setLoading(true);

      const endpoint = day ? apiStore.endpoints.shows.byDay(day) : apiStore.endpoints.shows.base;

      const response = await apiStore.get(endpoint);

      runInAction(() => {
        // Add realistic coordinates based on venue addresses/names
        // In a real app, you'd geocode addresses or store coordinates in the database
        this.shows = (response || []).map((show: Show) => {
          const coordinates = this.getCoordinatesFromAddress(show.address || '');

          return {
            ...show,
            lat: coordinates.lat,
            lng: coordinates.lng,
          };
        });
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

  // Enhanced geocoding logic for better location mapping
  private getCoordinatesFromAddress(address: string): { lat: number; lng: number } {
    const lowerAddress = address.toLowerCase();

    // City/Region-based mapping for more accurate coordinates
    const cityMappings = [
      // New York Area
      { patterns: ['brooklyn', 'bk'], coords: { lat: 40.6782, lng: -73.9442 } },
      {
        patterns: ['queens', 'flushing', 'astoria', 'jamaica'],
        coords: { lat: 40.7282, lng: -73.7949 },
      },
      { patterns: ['bronx'], coords: { lat: 40.8448, lng: -73.8648 } },
      {
        patterns: ['manhattan', 'midtown', 'east village', 'west village', 'soho', 'tribeca'],
        coords: { lat: 40.7831, lng: -73.9712 },
      },
      { patterns: ['staten island'], coords: { lat: 40.5795, lng: -74.1502 } },
      { patterns: ['new york', 'nyc', 'ny'], coords: { lat: 40.7128, lng: -74.006 } },

      // Other major cities that might appear in karaoke venues
      { patterns: ['buffalo'], coords: { lat: 42.8864, lng: -78.8784 } },
      { patterns: ['rochester'], coords: { lat: 43.1566, lng: -77.6088 } },
      { patterns: ['syracuse'], coords: { lat: 43.0481, lng: -76.1474 } },
      { patterns: ['albany'], coords: { lat: 42.6526, lng: -73.7562 } },

      // New Jersey
      { patterns: ['newark', 'jersey city', 'hoboken'], coords: { lat: 40.7282, lng: -74.0776 } },
      { patterns: ['new jersey', 'nj'], coords: { lat: 40.2206, lng: -74.7564 } },

      // Connecticut
      {
        patterns: ['bridgeport', 'new haven', 'hartford', 'stamford'],
        coords: { lat: 41.3083, lng: -73.0176 },
      },
      { patterns: ['connecticut', 'ct'], coords: { lat: 41.5978, lng: -72.7554 } },

      // Pennsylvania
      { patterns: ['philadelphia', 'philly'], coords: { lat: 39.9526, lng: -75.1652 } },
      { patterns: ['pittsburgh'], coords: { lat: 40.4406, lng: -79.9959 } },
      { patterns: ['pennsylvania', 'pa'], coords: { lat: 40.5908, lng: -77.2098 } },

      // Major metro areas that commonly have karaoke
      { patterns: ['boston'], coords: { lat: 42.3601, lng: -71.0589 } },
      { patterns: ['washington dc', 'dc', 'washington'], coords: { lat: 38.9072, lng: -77.0369 } },
      { patterns: ['chicago'], coords: { lat: 41.8781, lng: -87.6298 } },
      { patterns: ['los angeles', 'la'], coords: { lat: 34.0522, lng: -118.2437 } },
      { patterns: ['miami'], coords: { lat: 25.7617, lng: -80.1918 } },
      { patterns: ['atlanta'], coords: { lat: 33.749, lng: -84.388 } },

      // Ohio cities
      { patterns: ['columbus', 'columbus ohio'], coords: { lat: 39.9612, lng: -82.9988 } },
      { patterns: ['cleveland'], coords: { lat: 41.4993, lng: -81.6944 } },
      { patterns: ['cincinnati'], coords: { lat: 39.1031, lng: -84.512 } },
      { patterns: ['toledo'], coords: { lat: 41.6528, lng: -83.5379 } },
      { patterns: ['akron'], coords: { lat: 41.0814, lng: -81.519 } },
      { patterns: ['dayton'], coords: { lat: 39.7589, lng: -84.1916 } },
    ];

    // Find matching city
    for (const mapping of cityMappings) {
      if (mapping.patterns.some((pattern) => lowerAddress.includes(pattern))) {
        // Add small random variation to avoid exact overlaps
        return {
          lat: mapping.coords.lat + (Math.random() - 0.5) * 0.01,
          lng: mapping.coords.lng + (Math.random() - 0.5) * 0.01,
        };
      }
    }

    // State-level fallbacks for addresses without specific cities
    if (lowerAddress.includes('ny') || lowerAddress.includes('new york')) {
      return { lat: 42.1657, lng: -74.9481 }; // Central NY
    }
    if (lowerAddress.includes('nj') || lowerAddress.includes('new jersey')) {
      return { lat: 40.2206, lng: -74.7564 };
    }
    if (lowerAddress.includes('ct') || lowerAddress.includes('connecticut')) {
      return { lat: 41.5978, lng: -72.7554 };
    }
    if (lowerAddress.includes('pa') || lowerAddress.includes('pennsylvania')) {
      return { lat: 40.5908, lng: -77.2098 };
    }
    if (lowerAddress.includes('ma') || lowerAddress.includes('massachusetts')) {
      return { lat: 42.2081, lng: -71.0275 };
    }
    if (lowerAddress.includes('oh') || lowerAddress.includes('ohio')) {
      return { lat: 40.4173, lng: -82.9071 }; // Central Ohio
    }

    // Default to NYC with random variation if no match found
    return {
      lat: 40.7128 + (Math.random() - 0.5) * 0.1,
      lng: -74.006 + (Math.random() - 0.5) * 0.1,
    };
  }
}

export const showStore = new ShowStore();
