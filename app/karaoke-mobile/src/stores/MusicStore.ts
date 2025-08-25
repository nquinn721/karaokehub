import AsyncStorage from '@react-native-async-storage/async-storage';
import { makeAutoObservable, runInAction } from 'mobx';
import { makePersistable } from 'mobx-persist-store';
import { apiService } from '../services/ApiService';
import { MusicSearchResult, SongFavorite } from '../types';

export class MusicStore {
  searchResults: MusicSearchResult[] = [];
  searchQuery = '';
  isSearching = false;
  searchError: string | null = null;

  favorites: SongFavorite[] = [];
  isLoadingFavorites = false;
  favoritesError: string | null = null;

  selectedCategory = '';
  categories: any[] = [];
  categoryMusic: MusicSearchResult[] = [];
  isLoadingCategory = false;

  currentPlayingSong: MusicSearchResult | null = null;
  isPlaying = false;

  recentSearches: string[] = [];

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });

    makePersistable(this, {
      name: 'MusicStore',
      properties: ['recentSearches', 'selectedCategory'],
      storage: AsyncStorage,
    });
  }

  // Search methods
  setSearchQuery(query: string) {
    this.searchQuery = query;
  }

  setSearching(searching: boolean) {
    this.isSearching = searching;
  }

  setSearchError(error: string | null) {
    this.searchError = error;
  }

  setSearchResults(results: MusicSearchResult[]) {
    this.searchResults = results;
  }

  addRecentSearch(query: string) {
    if (query.trim() && !this.recentSearches.includes(query)) {
      this.recentSearches = [query, ...this.recentSearches.slice(0, 9)]; // Keep last 10 searches
    }
  }

  clearRecentSearches() {
    this.recentSearches = [];
  }

  async searchSongs(query: string, limit: number = 20): Promise<void> {
    try {
      this.setSearching(true);
      this.setSearchError(null);
      this.setSearchQuery(query);

      const response = await apiService.searchSongs(query, limit);

      runInAction(() => {
        if (response.success && response.data) {
          this.setSearchResults(response.data);
          this.addRecentSearch(query);
        } else {
          this.setSearchError(response.error || 'Search failed');
          this.setSearchResults([]);
        }
      });
    } catch (error) {
      runInAction(() => {
        this.setSearchError(error instanceof Error ? error.message : 'Search failed');
        this.setSearchResults([]);
      });
    } finally {
      runInAction(() => {
        this.setSearching(false);
      });
    }
  }

  clearSearch() {
    this.setSearchQuery('');
    this.setSearchResults([]);
    this.setSearchError(null);
  }

  // Favorites methods
  setFavorites(favorites: SongFavorite[]) {
    this.favorites = favorites;
  }

  setLoadingFavorites(loading: boolean) {
    this.isLoadingFavorites = loading;
  }

  setFavoritesError(error: string | null) {
    this.favoritesError = error;
  }

  async fetchFavorites(category?: string): Promise<void> {
    try {
      this.setLoadingFavorites(true);
      this.setFavoritesError(null);

      const response = await apiService.getFavoriteSongs(category);

      runInAction(() => {
        if (response.success && response.data) {
          this.setFavorites(response.data);
        } else {
          this.setFavoritesError(response.error || 'Failed to fetch favorites');
        }
      });
    } catch (error) {
      runInAction(() => {
        this.setFavoritesError(
          error instanceof Error ? error.message : 'Failed to fetch favorites',
        );
      });
    } finally {
      runInAction(() => {
        this.setLoadingFavorites(false);
      });
    }
  }

  async addToFavorites(song: MusicSearchResult, category?: string): Promise<boolean> {
    try {
      const response = await apiService.addSongFavorite(song.id, song, category);

      if (response.success && response.data) {
        runInAction(() => {
          this.favorites.push(response.data!);
        });
        return true;
      } else {
        console.error('Failed to add favorite:', response.error);
        return false;
      }
    } catch (error) {
      console.error('Failed to add favorite:', error);
      return false;
    }
  }

  async removeFromFavorites(songId: string, category?: string): Promise<boolean> {
    try {
      const response = await apiService.removeSongFavorite(songId, category);

      if (response.success) {
        runInAction(() => {
          this.favorites = this.favorites.filter(
            (fav) => !(fav.songId === songId && (!category || fav.category === category)),
          );
        });
        return true;
      } else {
        console.error('Failed to remove favorite:', response.error);
        return false;
      }
    } catch (error) {
      console.error('Failed to remove favorite:', error);
      return false;
    }
  }

  isFavorite(songId: string, category?: string): boolean {
    return this.favorites.some(
      (fav) => fav.songId === songId && (!category || fav.category === category),
    );
  }

  getFavoritesForCategory(category?: string): SongFavorite[] {
    if (!category) return this.favorites;
    return this.favorites.filter((fav) => fav.category === category);
  }

  // Category methods
  setSelectedCategory(category: string) {
    this.selectedCategory = category;
  }

  setCategories(categories: any[]) {
    this.categories = categories;
  }

  setCategoryMusic(music: MusicSearchResult[]) {
    this.categoryMusic = music;
  }

  setLoadingCategory(loading: boolean) {
    this.isLoadingCategory = loading;
  }

  async fetchCategories(): Promise<void> {
    try {
      const response = await apiService.getMusicCategories();

      runInAction(() => {
        if (response.success && response.data) {
          this.setCategories(response.data);
        }
      });
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  }

  async fetchCategoryMusic(categoryId: string, limit: number = 20): Promise<void> {
    try {
      this.setLoadingCategory(true);

      const response = await apiService.getCategoryMusic(categoryId, limit);

      runInAction(() => {
        if (response.success && response.data) {
          this.setCategoryMusic(response.data);
        } else {
          this.setCategoryMusic([]);
        }
      });
    } catch (error) {
      runInAction(() => {
        this.setCategoryMusic([]);
      });
    } finally {
      runInAction(() => {
        this.setLoadingCategory(false);
      });
    }
  }

  // Player methods
  setCurrentPlayingSong(song: MusicSearchResult | null) {
    this.currentPlayingSong = song;
  }

  setPlaying(playing: boolean) {
    this.isPlaying = playing;
  }

  playPause(song?: MusicSearchResult) {
    if (song && song.id !== this.currentPlayingSong?.id) {
      this.setCurrentPlayingSong(song);
      this.setPlaying(true);
    } else {
      this.setPlaying(!this.isPlaying);
    }
  }

  stop() {
    this.setPlaying(false);
    this.setCurrentPlayingSong(null);
  }

  // Getters
  get hasSearchResults(): boolean {
    return this.searchResults.length > 0;
  }

  get hasRecentSearches(): boolean {
    return this.recentSearches.length > 0;
  }

  get favoritesCount(): number {
    return this.favorites.length;
  }

  get searchResultsCount(): number {
    return this.searchResults.length;
  }
}
