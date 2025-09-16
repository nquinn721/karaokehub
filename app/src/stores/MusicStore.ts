import { makeAutoObservable, runInAction } from 'mobx';
import { apiService } from '../services/ApiService';
import { MusicSearchResult } from '../types';

export interface ArtistSearchResult {
  id: string;
  name: string;
  country?: string;
  area?: string;
  disambiguation?: string;
  tags?: string[];
  score?: number;
  beginDate?: string;
  endDate?: string;
}

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
  maxSongs = 200;

  // Autocomplete functionality
  suggestions: string[] = [];
  isLoadingSuggestions = false;
  showSuggestions = false;

  // Featured categories
  featuredCategories = [
    {
      id: 'top-100',
      title: 'Top 100',
      description: 'Top 100 greatest songs of all time',
    },
    {
      id: 'karaoke-classics',
      title: 'Karaoke Classics',
      description: 'The best karaoke songs everyone loves',
    },
    {
      id: 'pop-hits',
      title: 'Pop Hits',
      description: 'Popular songs from all decades',
    },
    {
      id: 'rock-anthems',
      title: 'Rock Anthems',
      description: 'Classic rock songs perfect for karaoke',
    },
    {
      id: 'country-favorites',
      title: 'Country Favorites',
      description: 'Country music hits',
    },
    {
      id: 'duets',
      title: 'Duets',
      description: 'Perfect songs for singing with friends',
    },
  ];

  constructor() {
    makeAutoObservable(this);
  }

  // Computed getter for sorted songs with favorites first
  get sortedSongs(): MusicSearchResult[] {
    if (!this.songs.length) return [];

    // For mobile, we'll implement a simpler version
    // In the full implementation, you'd integrate with SongFavoriteStore
    return this.songs;
  }

  setLoading(loading: boolean) {
    runInAction(() => {
      this.isLoading = loading;
    });
  }

  setLoadingMore(loading: boolean) {
    runInAction(() => {
      this.isLoadingMore = loading;
    });
  }

  setSearchQuery(query: string) {
    runInAction(() => {
      this.searchQuery = query;
    });
  }

  setSelectedCategory(category: string) {
    runInAction(() => {
      this.selectedCategory = category;
      this.currentPage = 0;
      this.hasMoreSongs = true;
      this.songs = [];
    });
  }

  setSelectedSong(song: MusicSearchResult | null) {
    runInAction(() => {
      this.selectedSong = song;
    });
  }

  // Search for songs
  async searchSongs(query: string, loadMore: boolean = false) {
    try {
      if (!loadMore) {
        this.setLoading(true);
        runInAction(() => {
          this.songs = [];
          this.currentPage = 0;
          this.hasMoreSongs = true;
        });
      } else {
        this.setLoadingMore(true);
      }

      const params = {
        query,
        page: this.currentPage,
        limit: this.itemsPerPage,
        category: this.selectedCategory !== 'all' ? this.selectedCategory : undefined,
      };

      const response = await apiService.get(apiService.endpoints.music.search, { params });

      runInAction(() => {
        if (loadMore) {
          this.songs = [...this.songs, ...(response.songs || [])];
        } else {
          this.songs = response.songs || [];
        }

        this.currentPage += 1;
        this.hasMoreSongs = response.hasMore && this.songs.length < this.maxSongs;

        if (loadMore) {
          this.setLoadingMore(false);
        } else {
          this.setLoading(false);
        }
      });

      return { success: true };
    } catch (error: any) {
      runInAction(() => {
        if (loadMore) {
          this.setLoadingMore(false);
        } else {
          this.setLoading(false);
        }
      });

      console.error('Failed to search songs:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to search songs',
      };
    }
  }

  // Load songs by category
  async loadSongsByCategory(category: string, loadMore: boolean = false) {
    try {
      if (!loadMore) {
        this.setLoading(true);
        runInAction(() => {
          this.selectedCategory = category;
          this.songs = [];
          this.currentPage = 0;
          this.hasMoreSongs = true;
        });
      } else {
        this.setLoadingMore(true);
      }

      const params = {
        category,
        page: this.currentPage,
        limit: this.itemsPerPage,
      };

      const response = await apiService.get(apiService.endpoints.music.search, { params });

      runInAction(() => {
        if (loadMore) {
          this.songs = [...this.songs, ...(response.songs || [])];
        } else {
          this.songs = response.songs || [];
        }

        this.currentPage += 1;
        this.hasMoreSongs = response.hasMore && this.songs.length < this.maxSongs;

        if (loadMore) {
          this.setLoadingMore(false);
        } else {
          this.setLoading(false);
        }
      });

      return { success: true };
    } catch (error: any) {
      runInAction(() => {
        if (loadMore) {
          this.setLoadingMore(false);
        } else {
          this.setLoading(false);
        }
      });

      console.error('Failed to load songs by category:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to load songs',
      };
    }
  }

  // Get autocomplete suggestions
  async getSuggestions(query: string) {
    if (!query || query.length < 2) {
      runInAction(() => {
        this.suggestions = [];
        this.showSuggestions = false;
      });
      return;
    }

    try {
      runInAction(() => {
        this.isLoadingSuggestions = true;
      });

      const response = await apiService.get(apiService.endpoints.music.suggestions, {
        params: { query },
      });

      runInAction(() => {
        this.suggestions = response.suggestions || [];
        this.showSuggestions = true;
        this.isLoadingSuggestions = false;
      });
    } catch (error: any) {
      runInAction(() => {
        this.isLoadingSuggestions = false;
        this.suggestions = [];
      });

      console.warn('Failed to get suggestions:', error);
    }
  }

  // Hide suggestions
  hideSuggestions() {
    runInAction(() => {
      this.showSuggestions = false;
    });
  }

  // Load more songs (infinite scroll)
  async loadMoreSongs() {
    if (!this.hasMoreSongs || this.isLoadingMore || this.songs.length >= this.maxSongs) {
      return;
    }

    if (this.searchQuery) {
      return this.searchSongs(this.searchQuery, true);
    } else if (this.selectedCategory !== 'all') {
      return this.loadSongsByCategory(this.selectedCategory, true);
    }
  }

  // Add song to favorites
  async addToFavorites(songId: string) {
    try {
      await apiService.post(apiService.endpoints.music.addFavorite(songId));

      runInAction(() => {
        // Update the song in the list to reflect favorite status
        const song = this.songs.find((s) => s.id === songId);
        if (song) {
          // Add a flag to indicate it's favorited
          (song as any).isFavorited = true;
        }
      });

      return { success: true };
    } catch (error: any) {
      console.error('Failed to add song to favorites:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to add to favorites',
      };
    }
  }

  // Remove song from favorites
  async removeFromFavorites(songId: string) {
    try {
      await apiService.delete(apiService.endpoints.music.removeFavorite(songId));

      runInAction(() => {
        // Update the song in the list to reflect favorite status
        const song = this.songs.find((s) => s.id === songId);
        if (song) {
          // Remove the favorite flag
          (song as any).isFavorited = false;
        }
      });

      return { success: true };
    } catch (error: any) {
      console.error('Failed to remove song from favorites:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to remove from favorites',
      };
    }
  }

  // Clear search results
  clearResults() {
    runInAction(() => {
      this.songs = [];
      this.searchQuery = '';
      this.selectedCategory = 'all';
      this.currentPage = 0;
      this.hasMoreSongs = true;
      this.suggestions = [];
      this.showSuggestions = false;
    });
  }

  // Reset to default state
  reset() {
    runInAction(() => {
      this.songs = [];
      this.artists = [];
      this.selectedSong = null;
      this.searchQuery = '';
      this.selectedCategory = 'all';
      this.currentPage = 0;
      this.hasMoreSongs = true;
      this.suggestions = [];
      this.showSuggestions = false;
      this.isLoading = false;
      this.isLoadingMore = false;
      this.isLoadingSuggestions = false;
    });
  }
}

export const musicStore = new MusicStore();
