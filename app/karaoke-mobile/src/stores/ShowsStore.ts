import AsyncStorage from '@react-native-async-storage/async-storage';
import { makeAutoObservable, runInAction } from 'mobx';
import { makePersistable } from 'mobx-persist-store';
import { apiService } from '../services/ApiService';
import { DJ, FavoriteShow, Show, Vendor } from '../types';

export class ShowsStore {
  shows: Show[] = [];
  filteredShows: Show[] = [];
  isLoadingShows = false;
  showsError: string | null = null;

  favoriteShows: FavoriteShow[] = [];
  isLoadingFavorites = false;
  favoritesError: string | null = null;

  vendors: Vendor[] = [];
  djs: DJ[] = [];

  // Filters
  selectedLocation = '';
  selectedDate = '';
  selectedVendor = '';
  showFavoritesOnly = false;

  // Search
  searchQuery = '';

  constructor() {
    makeAutoObservable(this);

    makePersistable(this, {
      name: 'ShowsStore',
      properties: ['favoriteShows', 'selectedLocation'],
      storage: AsyncStorage,
    });
  }

  // Actions
  setSearchQuery(query: string) {
    this.searchQuery = query;
    this.filterShows();
  }

  setSelectedLocation(location: string) {
    this.selectedLocation = location;
    this.filterShows();
  }

  setSelectedDate(date: string) {
    this.selectedDate = date;
    this.filterShows();
  }

  setSelectedVendor(vendor: string) {
    this.selectedVendor = vendor;
    this.filterShows();
  }

  setShowFavoritesOnly(favoritesOnly: boolean) {
    this.showFavoritesOnly = favoritesOnly;
    this.filterShows();
  }

  clearFilters() {
    this.selectedLocation = '';
    this.selectedDate = '';
    this.selectedVendor = '';
    this.showFavoritesOnly = false;
    this.searchQuery = '';
    this.filterShows();
  }

  private filterShows() {
    let filtered = [...this.shows];

    // Filter by search query
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(
        (show) =>
          show.venue?.toLowerCase().includes(query) ||
          show.description?.toLowerCase().includes(query) ||
          show.city?.toLowerCase().includes(query) ||
          show.state?.toLowerCase().includes(query) ||
          show.dj?.name?.toLowerCase().includes(query),
      );
    }

    // Filter by location
    if (this.selectedLocation) {
      filtered = filtered.filter(
        (show) =>
          show.city?.toLowerCase().includes(this.selectedLocation.toLowerCase()) ||
          show.state?.toLowerCase().includes(this.selectedLocation.toLowerCase()),
      );
    }

    // Filter by date (using day field)
    if (this.selectedDate) {
      const dayOfWeek = new Date(this.selectedDate)
        .toLocaleDateString('en', { weekday: 'long' })
        .toLowerCase();
      filtered = filtered.filter((show) => show.day?.includes(dayOfWeek));
    }

    // Filter by vendor (DJ)
    if (this.selectedVendor) {
      filtered = filtered.filter((show) => show.dj?.name === this.selectedVendor);
    }

    // Filter by favorites
    if (this.showFavoritesOnly) {
      const favoriteShowIds = this.favoriteShows.map((fav) => fav.showId);
      filtered = filtered.filter((show) => favoriteShowIds.includes(show.id));
    }

    this.filteredShows = filtered;
  }

  // API Methods
  async fetchShows() {
    try {
      this.isLoadingShows = true;
      this.showsError = null;

      const response = await apiService.getShows();

      runInAction(() => {
        this.shows = response.data || [];
        this.filterShows();
      });
    } catch (error: any) {
      runInAction(() => {
        this.showsError = error.message || 'Failed to fetch shows';
        console.error('Error fetching shows:', error);
      });
    } finally {
      runInAction(() => {
        this.isLoadingShows = false;
      });
    }
  }

  async fetchFavoriteShows() {
    try {
      this.isLoadingFavorites = true;
      this.favoritesError = null;

      const response = await apiService.getFavoriteShows();

      runInAction(() => {
        this.favoriteShows = response.data || [];
      });
    } catch (error: any) {
      runInAction(() => {
        this.favoritesError = error.message || 'Failed to fetch favorite shows';
        console.error('Error fetching favorite shows:', error);
      });
    } finally {
      runInAction(() => {
        this.isLoadingFavorites = false;
      });
    }
  }

  async addFavoriteShow(showId: string) {
    try {
      const response = await apiService.addShowFavorite(showId);

      if (response.success && response.data) {
        runInAction(() => {
          this.favoriteShows.push(response.data!);
        });
        return true;
      }
      return false;
    } catch (error: any) {
      console.error('Error adding favorite show:', error);
      return false;
    }
  }

  async removeFavoriteShow(showId: string) {
    try {
      const response = await apiService.removeShowFavorite(showId);

      if (response.success) {
        runInAction(() => {
          this.favoriteShows = this.favoriteShows.filter((fav) => fav.showId !== showId);
        });
        return true;
      }
      return false;
    } catch (error: any) {
      console.error('Error removing favorite show:', error);
      return false;
    }
  }

  async fetchVendors() {
    try {
      // TODO: Add vendors endpoint to ApiService
      // const response = await apiService.getVendors();
      runInAction(() => {
        this.vendors = [];
      });
    } catch (error: any) {
      console.error('Error fetching vendors:', error);
    }
  }

  async fetchDJs() {
    try {
      // TODO: Add DJs endpoint to ApiService
      // const response = await apiService.getDJs();
      runInAction(() => {
        this.djs = [];
      });
    } catch (error: any) {
      console.error('Error fetching DJs:', error);
    }
  }

  // Computed values
  get uniqueLocations() {
    const locations = this.shows
      .map((show) => `${show.city}, ${show.state}`)
      .filter(Boolean)
      .filter((location, index, array) => array.indexOf(location) === index);
    return locations.sort();
  }

  get uniqueVendors() {
    const vendors = this.shows
      .map((show) => show.dj?.name)
      .filter(Boolean)
      .filter((vendor, index, array) => array.indexOf(vendor) === index);
    return vendors.sort();
  }

  get upcomingShows() {
    // For karaoke shows, we'll consider shows happening this week or later
    // Since shows have day of week but not specific dates, we'll sort by day/time
    return this.filteredShows
      .filter((show) => show.isActive && show.isValid)
      .sort((a, b) => {
        const dayOrder = [
          'monday',
          'tuesday',
          'wednesday',
          'thursday',
          'friday',
          'saturday',
          'sunday',
        ];
        const dayA = dayOrder.indexOf(a.day || '');
        const dayB = dayOrder.indexOf(b.day || '');

        if (dayA !== dayB) {
          return dayA - dayB;
        }

        // If same day, sort by start time
        const timeA = a.startTime || '00:00';
        const timeB = b.startTime || '00:00';
        return timeA.localeCompare(timeB);
      });
  }

  get pastShows() {
    // For recurring karaoke shows, we don't really have "past" shows
    // But we can show inactive or invalid shows here
    return this.filteredShows
      .filter((show) => !show.isActive || !show.isValid)
      .sort((a, b) => {
        const dayOrder = [
          'monday',
          'tuesday',
          'wednesday',
          'thursday',
          'friday',
          'saturday',
          'sunday',
        ];
        const dayA = dayOrder.indexOf(a.day || '');
        const dayB = dayOrder.indexOf(b.day || '');

        if (dayA !== dayB) {
          return dayB - dayA; // Reverse order for past shows
        }

        const timeA = a.startTime || '00:00';
        const timeB = b.startTime || '00:00';
        return timeB.localeCompare(timeA);
      });
  }

  isShowFavorited(showId: string) {
    return this.favoriteShows.some((fav) => fav.showId === showId);
  }

  getShowById(showId: string) {
    return this.shows.find((show) => show.id === showId);
  }
}
