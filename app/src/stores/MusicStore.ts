import { makeAutoObservable, runInAction } from 'mobx';
import { apiService } from '../services/ApiService';
import { ArtistSearchResult, MusicFilters, MusicSearchResult } from '../types';

export class MusicStore {
  songs: MusicSearchResult[] = [];
  artists: ArtistSearchResult[] = [];
  selectedSong: MusicSearchResult | null = null;
  searchQuery = '';
  isLoading = false;
  isLoadingMore = false;
  selectedCategory = 'all';
  currentPage = 0;
  hasMoreSongs = true;
  itemsPerPage = 20;
  maxSongs = 200; // Maximum number of songs to load

  // Music categories
  categories = [
    { id: 'all', name: 'All Music' },
    { id: 'rock', name: 'Rock' },
    { id: 'pop', name: 'Pop' },
    { id: 'hip-hop', name: 'Hip Hop' },
    { id: 'country', name: 'Country' },
    { id: 'r&b', name: 'R&B' },
    { id: 'electronic', name: 'Electronic' },
    { id: 'jazz', name: 'Jazz' },
    { id: 'classical', name: 'Classical' },
    { id: 'reggae', name: 'Reggae' },
    { id: 'folk', name: 'Folk' },
    { id: 'blues', name: 'Blues' },
    { id: 'metal', name: 'Metal' },
    { id: 'punk', name: 'Punk' },
    { id: 'indie', name: 'Indie' },
  ];

  // Recent searches
  recentSearches: string[] = [];

  constructor() {
    makeAutoObservable(this);
    this.loadRecentSearches();
  }

  // Load recent searches from storage
  private async loadRecentSearches() {
    try {
      const AsyncStorage = await import('@react-native-async-storage/async-storage');
      const stored = await AsyncStorage.default.getItem('music-recent-searches');
      if (stored) {
        runInAction(() => {
          this.recentSearches = JSON.parse(stored);
        });
      }
    } catch (error) {
      console.error('Error loading recent searches:', error);
    }
  }

  // Save recent searches to storage
  private async saveRecentSearches() {
    try {
      const AsyncStorage = await import('@react-native-async-storage/async-storage');
      await AsyncStorage.default.setItem(
        'music-recent-searches',
        JSON.stringify(this.recentSearches),
      );
    } catch (error) {
      console.error('Error saving recent searches:', error);
    }
  }

  // Add to recent searches
  addToRecentSearches(query: string) {
    if (!query.trim() || this.recentSearches.includes(query)) return;

    runInAction(() => {
      this.recentSearches = [query, ...this.recentSearches.slice(0, 9)]; // Keep only 10 recent searches
    });

    this.saveRecentSearches();
  }

  // Clear recent searches
  clearRecentSearches() {
    runInAction(() => {
      this.recentSearches = [];
    });
    this.saveRecentSearches();
  }

  // Search for songs
  async searchSongs(query: string, loadMore = false) {
    if (!query.trim()) {
      this.clearSearch();
      return { success: true, data: [] };
    }

    try {
      if (!loadMore) {
        runInAction(() => {
          this.isLoading = true;
          this.currentPage = 0;
          this.songs = [];
          this.hasMoreSongs = true;
          this.searchQuery = query;
        });
      } else {
        runInAction(() => {
          this.isLoadingMore = true;
        });
      }

      const page = loadMore ? this.currentPage + 1 : 0;
      const response = await apiService.searchMusic(query, page, this.itemsPerPage);

      if (response.success && response.data) {
        const newSongs = response.data.songs || [];

        runInAction(() => {
          if (loadMore) {
            this.songs = [...this.songs, ...newSongs];
          } else {
            this.songs = newSongs;
          }

          this.currentPage = page;
          this.hasMoreSongs =
            newSongs.length === this.itemsPerPage && this.songs.length < this.maxSongs;
          this.artists = response.data.artists || [];
        });

        // Add to recent searches if not loading more
        if (!loadMore) {
          this.addToRecentSearches(query);
        }

        return { success: true, data: newSongs };
      }

      return { success: false, message: response.message || 'Search failed' };
    } catch (error) {
      console.error('Music search error:', error);
      return { success: false, message: 'Search failed. Please try again.' };
    } finally {
      runInAction(() => {
        this.isLoading = false;
        this.isLoadingMore = false;
      });
    }
  }

  // Load more songs
  async loadMoreSongs() {
    if (!this.hasMoreSongs || this.isLoadingMore || !this.searchQuery) return;
    return this.searchSongs(this.searchQuery, true);
  }

  // Get songs by category
  async getSongsByCategory(categoryId: string, loadMore = false) {
    try {
      if (!loadMore) {
        runInAction(() => {
          this.isLoading = true;
          this.currentPage = 0;
          this.songs = [];
          this.hasMoreSongs = true;
          this.selectedCategory = categoryId;
          this.searchQuery = '';
        });
      } else {
        runInAction(() => {
          this.isLoadingMore = true;
        });
      }

      const page = loadMore ? this.currentPage + 1 : 0;
      const response = await apiService.getMusicByCategory(categoryId, page);

      if (response.success && response.data) {
        const newSongs = response.data.songs || [];

        runInAction(() => {
          if (loadMore) {
            this.songs = [...this.songs, ...newSongs];
          } else {
            this.songs = newSongs;
          }

          this.currentPage = page;
          this.hasMoreSongs =
            newSongs.length === this.itemsPerPage && this.songs.length < this.maxSongs;
        });

        return { success: true, data: newSongs };
      }

      return { success: false, message: response.message || 'Failed to load category' };
    } catch (error) {
      console.error('Category load error:', error);
      return { success: false, message: 'Failed to load category. Please try again.' };
    } finally {
      runInAction(() => {
        this.isLoading = false;
        this.isLoadingMore = false;
      });
    }
  }

  // Get artist details
  async getArtist(artistId: string) {
    try {
      runInAction(() => {
        this.isLoading = true;
      });

      const response = await apiService.getArtist(artistId);

      if (response.success && response.data) {
        return { success: true, data: response.data };
      }

      return { success: false, message: response.message || 'Failed to load artist' };
    } catch (error) {
      console.error('Artist load error:', error);
      return { success: false, message: 'Failed to load artist. Please try again.' };
    } finally {
      runInAction(() => {
        this.isLoading = false;
      });
    }
  }

  // Get song details
  async getSong(songId: string) {
    try {
      runInAction(() => {
        this.isLoading = true;
      });

      const response = await apiService.getSong(songId);

      if (response.success && response.data) {
        runInAction(() => {
          this.selectedSong = response.data;
        });
        return { success: true, data: response.data };
      }

      return { success: false, message: response.message || 'Failed to load song' };
    } catch (error) {
      console.error('Song load error:', error);
      return { success: false, message: 'Failed to load song. Please try again.' };
    } finally {
      runInAction(() => {
        this.isLoading = false;
      });
    }
  }

  // Set selected song
  setSelectedSong(song: MusicSearchResult | null) {
    runInAction(() => {
      this.selectedSong = song;
    });
  }

  // Clear search results
  clearSearch() {
    runInAction(() => {
      this.songs = [];
      this.artists = [];
      this.searchQuery = '';
      this.currentPage = 0;
      this.hasMoreSongs = true;
      this.selectedCategory = 'all';
      this.selectedSong = null;
    });
  }

  // Filter songs by various criteria
  filterSongs(filters: MusicFilters) {
    let filteredSongs = [...this.songs];

    if (filters.query) {
      const query = filters.query.toLowerCase();
      filteredSongs = filteredSongs.filter(
        (song) =>
          song.title.toLowerCase().includes(query) ||
          song.artist?.toLowerCase().includes(query) ||
          song.album?.toLowerCase().includes(query),
      );
    }

    if (filters.artist) {
      filteredSongs = filteredSongs.filter((song) =>
        song.artist?.toLowerCase().includes(filters.artist!.toLowerCase()),
      );
    }

    if (filters.year) {
      filteredSongs = filteredSongs.filter((song) => song.year === filters.year);
    }

    return filteredSongs;
  }

  // Get popular songs (mock data for now)
  getPopularSongs() {
    // This would typically come from the API
    return this.songs.slice(0, 10);
  }

  // Get recently played songs (from local storage)
  async getRecentlyPlayedSongs() {
    try {
      const AsyncStorage = await import('@react-native-async-storage/async-storage');
      const stored = await AsyncStorage.default.getItem('music-recently-played');
      if (stored) {
        return JSON.parse(stored);
      }
      return [];
    } catch (error) {
      console.error('Error loading recently played songs:', error);
      return [];
    }
  }

  // Add song to recently played
  async addToRecentlyPlayed(song: MusicSearchResult) {
    try {
      const AsyncStorage = await import('@react-native-async-storage/async-storage');
      const recentlyPlayed = await this.getRecentlyPlayedSongs();

      // Remove if already exists and add to beginning
      const filtered = recentlyPlayed.filter((s: MusicSearchResult) => s.id !== song.id);
      const updated = [song, ...filtered.slice(0, 19)]; // Keep only 20 recent songs

      await AsyncStorage.default.setItem('music-recently-played', JSON.stringify(updated));
    } catch (error) {
      console.error('Error adding to recently played:', error);
    }
  }

  // Get category by ID
  getCategoryById(categoryId: string) {
    return this.categories.find((cat) => cat.id === categoryId);
  }

  // Get songs count
  get songsCount() {
    return this.songs.length;
  }

  // Check if can load more
  get canLoadMore() {
    return this.hasMoreSongs && !this.isLoadingMore && !this.isLoading;
  }

  // Check if has results
  get hasResults() {
    return this.songs.length > 0;
  }

  // Check if is searching
  get isSearching() {
    return this.searchQuery.trim().length > 0;
  }
}

export const musicStore = new MusicStore();
