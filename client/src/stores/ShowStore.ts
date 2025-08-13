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
  kjId: string;
  address: string;
  day: DayOfWeek | string;
  startTime: string;
  endTime: string;
  description?: string;
  vendor?: {
    id: string;
    name: string;
    owner: string;
  };
  kj?: {
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
  kjId: string;
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
          // Create more realistic coordinates based on venue names
          let coordinates = { lat: 40.7128, lng: -74.006 }; // Default NYC

          // Try to match venue names to approximate locations
          const venueName = show.address?.toLowerCase() || '';

          if (venueName.includes('brooklyn')) {
            coordinates = { lat: 40.6782, lng: -73.9442 };
          } else if (venueName.includes('queens')) {
            coordinates = { lat: 40.7282, lng: -73.7949 };
          } else if (venueName.includes('bronx')) {
            coordinates = { lat: 40.8448, lng: -73.8648 };
          } else if (venueName.includes('manhattan')) {
            coordinates = { lat: 40.7831, lng: -73.9712 };
          } else if (venueName.includes('staten island')) {
            coordinates = { lat: 40.5795, lng: -74.1502 };
          } else {
            // Spread venues around NYC area with smaller random variation
            coordinates = {
              lat: 40.7128 + (Math.random() - 0.5) * 0.05, // Smaller random spread
              lng: -74.006 + (Math.random() - 0.5) * 0.05,
            };
          }

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

  async fetchShowsByKJ(kjId: string) {
    try {
      this.setLoading(true);

      const response = await apiStore.get(apiStore.endpoints.shows.byKJ(kjId));

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
        error: error.response?.data?.message || 'Failed to fetch KJ shows',
      };
    }
  }

  get showsForSelectedDay() {
    return this.shows.filter((show) => show.day === this.selectedDay);
  }

  get showsWithCoordinates() {
    return this.showsForSelectedDay.filter((show) => show.lat && show.lng);
  }
}

export const showStore = new ShowStore();
