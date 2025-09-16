import { makeAutoObservable, runInAction } from 'mobx';
import { apiService } from '../services/ApiService';
import { DayOfWeek, LocationCoords, Show, ShowFilters } from '../types';

export class ShowStore {
  shows: Show[] = [];
  filteredShows: Show[] = [];
  selectedShow: Show | null = null;
  isLoading = false;
  searchQuery = '';
  selectedDay: DayOfWeek | 'all' = 'all';
  selectedCity = '';
  selectedState = '';
  favoritesOnly = false;
  sidebarOpen = false;

  // Map-related state
  mapCenter: LocationCoords | null = null;
  mapZoom = 10;
  selectedMapShow: Show | null = null;

  // User location
  userLocation: LocationCoords | null = null;
  locationPermissionGranted = false;

  constructor() {
    makeAutoObservable(this);
  }

  // Fetch all shows
  async fetchShows(filters?: ShowFilters) {
    try {
      runInAction(() => {
        this.isLoading = true;
      });

      const response = await apiService.getShows(filters);

      if (response.success && response.data) {
        runInAction(() => {
          this.shows = response.data;
          this.applyFilters();
        });
        return { success: true, data: response.data };
      }

      return { success: false, message: response.message || 'Failed to fetch shows' };
    } catch (error) {
      console.error('Fetch shows error:', error);
      return { success: false, message: 'Failed to fetch shows. Please try again.' };
    } finally {
      runInAction(() => {
        this.isLoading = false;
      });
    }
  }

  // Get show by ID
  async getShow(id: string) {
    try {
      const response = await apiService.getShow(id);

      if (response.success && response.data) {
        return { success: true, data: response.data };
      }

      return { success: false, message: response.message || 'Failed to fetch show' };
    } catch (error) {
      console.error('Get show error:', error);
      return { success: false, message: 'Failed to fetch show. Please try again.' };
    }
  }

  // Submit new show
  async submitShow(showData: Partial<Show>) {
    try {
      runInAction(() => {
        this.isLoading = true;
      });

      const response = await apiService.submitShow(showData);

      if (response.success && response.data) {
        // Add to local shows list
        runInAction(() => {
          this.shows.push(response.data);
          this.applyFilters();
        });
        return { success: true, data: response.data };
      }

      return { success: false, message: response.message || 'Failed to submit show' };
    } catch (error) {
      console.error('Submit show error:', error);
      return { success: false, message: 'Failed to submit show. Please try again.' };
    } finally {
      runInAction(() => {
        this.isLoading = false;
      });
    }
  }

  // Update existing show
  async updateShow(id: string, updates: Partial<Show>) {
    try {
      const response = await apiService.updateShow(id, updates);

      if (response.success && response.data) {
        // Update local shows list
        runInAction(() => {
          const index = this.shows.findIndex((show) => show.id === id);
          if (index !== -1) {
            this.shows[index] = { ...this.shows[index], ...response.data };
            this.applyFilters();
          }
        });
        return { success: true, data: response.data };
      }

      return { success: false, message: response.message || 'Failed to update show' };
    } catch (error) {
      console.error('Update show error:', error);
      return { success: false, message: 'Failed to update show. Please try again.' };
    }
  }

  // Flag show as invalid
  async flagShow(id: string, reason: string) {
    try {
      const response = await apiService.flagShow(id, reason);

      if (response.success) {
        // Update local shows list
        runInAction(() => {
          const index = this.shows.findIndex((show) => show.id === id);
          if (index !== -1) {
            this.shows[index].isFlagged = true;
            this.applyFilters();
          }
        });
        return { success: true };
      }

      return { success: false, message: response.message || 'Failed to flag show' };
    } catch (error) {
      console.error('Flag show error:', error);
      return { success: false, message: 'Failed to flag show. Please try again.' };
    }
  }

  // Set search query and apply filters
  setSearchQuery(query: string) {
    runInAction(() => {
      this.searchQuery = query;
      this.applyFilters();
    });
  }

  // Set selected day filter
  setSelectedDay(day: DayOfWeek | 'all') {
    runInAction(() => {
      this.selectedDay = day;
      this.applyFilters();
    });
  }

  // Set selected city filter
  setSelectedCity(city: string) {
    runInAction(() => {
      this.selectedCity = city;
      this.applyFilters();
    });
  }

  // Set selected state filter
  setSelectedState(state: string) {
    runInAction(() => {
      this.selectedState = state;
      this.applyFilters();
    });
  }

  // Toggle favorites only filter
  toggleFavoritesOnly() {
    runInAction(() => {
      this.favoritesOnly = !this.favoritesOnly;
      this.applyFilters();
    });
  }

  // Set favorites only filter
  setFavoritesOnly(favoritesOnly: boolean) {
    runInAction(() => {
      this.favoritesOnly = favoritesOnly;
      this.applyFilters();
    });
  }

  // Clear all filters
  clearFilters() {
    runInAction(() => {
      this.searchQuery = '';
      this.selectedDay = 'all';
      this.selectedCity = '';
      this.selectedState = '';
      this.favoritesOnly = false;
      this.applyFilters();
    });
  }

  // Apply current filters to shows
  private applyFilters() {
    let filtered = [...this.shows];

    // Filter by search query
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(
        (show) =>
          show.dj?.name.toLowerCase().includes(query) ||
          show.venue?.name.toLowerCase().includes(query) ||
          show.venue?.city?.toLowerCase().includes(query) ||
          show.venue?.address?.toLowerCase().includes(query) ||
          show.description?.toLowerCase().includes(query),
      );
    }

    // Filter by day
    if (this.selectedDay !== 'all') {
      filtered = filtered.filter((show) => show.day === this.selectedDay);
    }

    // Filter by city
    if (this.selectedCity.trim()) {
      filtered = filtered.filter((show) =>
        show.venue?.city?.toLowerCase().includes(this.selectedCity.toLowerCase()),
      );
    }

    // Filter by state
    if (this.selectedState.trim()) {
      filtered = filtered.filter((show) =>
        show.venue?.state?.toLowerCase().includes(this.selectedState.toLowerCase()),
      );
    }

    // Filter by favorites (would need favorite store integration)
    if (this.favoritesOnly) {
      // This would be integrated with the favorites store
      // filtered = filtered.filter(show => favoriteStore.isShowFavorited(show.id));
    }

    // Filter out flagged shows
    filtered = filtered.filter((show) => !show.isFlagged);

    runInAction(() => {
      this.filteredShows = filtered;
    });
  }

  // Select show
  setSelectedShow(show: Show | null) {
    runInAction(() => {
      this.selectedShow = show;
    });
  }

  // Set selected map show
  setSelectedMapShow(show: Show | null) {
    runInAction(() => {
      this.selectedMapShow = show;
    });
  }

  // Set sidebar visibility
  setSidebarOpen(open: boolean) {
    runInAction(() => {
      this.sidebarOpen = open;
    });
  }

  // Set map center
  setMapCenter(center: LocationCoords | null) {
    runInAction(() => {
      this.mapCenter = center;
    });
  }

  // Set user location
  setUserLocation(location: LocationCoords | null) {
    runInAction(() => {
      this.userLocation = location;
    });
  }

  // Set location permission status
  setLocationPermissionGranted(granted: boolean) {
    runInAction(() => {
      this.locationPermissionGranted = granted;
    });
  }

  // Get shows for a specific day
  getShowsForDay(day: DayOfWeek) {
    return this.filteredShows.filter((show) => show.day === day);
  }

  // Get shows for today
  getTodaysShows() {
    const today = new Date().getDay();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const todayName = dayNames[today] as DayOfWeek;
    return this.getShowsForDay(todayName);
  }

  // Get upcoming shows (today and next 2 days)
  getUpcomingShows() {
    const today = new Date().getDay();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

    const upcomingDays: DayOfWeek[] = [];
    for (let i = 0; i < 3; i++) {
      const dayIndex = (today + i) % 7;
      upcomingDays.push(dayNames[dayIndex] as DayOfWeek);
    }

    return this.filteredShows.filter((show) => upcomingDays.includes(show.day as DayOfWeek));
  }

  // Get shows near location
  getShowsNearLocation(location: LocationCoords, radiusMiles = 25) {
    return this.filteredShows.filter((show) => {
      if (!show.venue?.lat || !show.venue?.lng) return false;

      const distance = this.calculateDistance(
        location.latitude,
        location.longitude,
        show.venue.lat,
        show.venue.lng,
      );

      return distance <= radiusMiles;
    });
  }

  // Calculate distance between two coordinates in miles
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 3959; // Earth's radius in miles
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  // Get unique cities
  get uniqueCities() {
    const cities = this.shows
      .map((show) => show.venue?.city)
      .filter((city) => city && city.trim())
      .map((city) => city!.trim());
    return [...new Set(cities)].sort();
  }

  // Get unique states
  get uniqueStates() {
    const states = this.shows
      .map((show) => show.venue?.state)
      .filter((state) => state && state.trim())
      .map((state) => state!.trim());
    return [...new Set(states)].sort();
  }

  // Format time helper
  formatTime(time: string): string {
    if (!time) return '';
    try {
      const [hours, minutes] = time.split(':');
      const date = new Date();
      date.setHours(parseInt(hours, 10), parseInt(minutes, 10));
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return time;
    }
  }

  // Get day display name
  getDayDisplayName(day: DayOfWeek | string): string {
    const dayNames: { [key: string]: string } = {
      monday: 'Monday',
      tuesday: 'Tuesday',
      wednesday: 'Wednesday',
      thursday: 'Thursday',
      friday: 'Friday',
      saturday: 'Saturday',
      sunday: 'Sunday',
    };
    return dayNames[day.toLowerCase()] || day;
  }

  // Check if has active filters
  get hasActiveFilters(): boolean {
    return (
      this.searchQuery.trim() !== '' ||
      this.selectedDay !== 'all' ||
      this.selectedCity.trim() !== '' ||
      this.selectedState.trim() !== '' ||
      this.favoritesOnly
    );
  }

  // Get filter summary
  get filterSummary(): string {
    const filters = [];
    if (this.searchQuery.trim()) filters.push(`"${this.searchQuery}"`);
    if (this.selectedDay !== 'all') filters.push(this.getDayDisplayName(this.selectedDay));
    if (this.selectedCity.trim()) filters.push(this.selectedCity);
    if (this.selectedState.trim()) filters.push(this.selectedState);
    if (this.favoritesOnly) filters.push('Favorites');

    return filters.join(', ');
  }
}

export const showStore = new ShowStore();
