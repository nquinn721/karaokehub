import { makeAutoObservable, runInAction } from 'mobx';
import { apiStore } from './ApiStore';

export interface MusicSearchResult {
  id: string;
  title: string;
  artist?: string;
  artistId?: string;
  album?: string;
  year?: string;
  duration?: number;
  country?: string;
  disambiguation?: string;
  tags?: string[];
  score?: number;
}

export interface ArtistSearchResult {
  id: string;
  name: string;
  type?: string;
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
  selectedCategory = 'all';

  // Featured categories
  featuredCategories = [
    {
      id: 'karaoke-classics',
      title: 'Karaoke Classics',
      image: '/images/music/karaoke-classics.svg',
      queries: [
        "Don't Stop Believin'",
        'Sweet Caroline',
        'Bohemian Rhapsody',
        'My Way',
        'I Want It That Way',
      ],
    },
    {
      id: 'best-of-80s',
      title: 'Best of 80s',
      image: '/images/music/best-of-80s.svg',
      queries: [
        'Take On Me',
        "Don't You (Forget About Me)",
        'Total Eclipse of Heart',
        "Livin' on a Prayer",
        'Girls Just Want to Have Fun',
      ],
    },
    {
      id: 'best-of-90s',
      title: 'Best of 90s',
      image: '/images/music/best-of-90s.svg',
      queries: [
        'I Will Always Love You',
        'Wonderwall',
        'Smells Like Teen Spirit',
        'Black Velvet',
        'Mr. Brightside',
      ],
    },
    {
      id: 'rock-hits',
      title: 'Rock Hits',
      image: '/images/music/rock-hits.svg',
      queries: [
        "Don't Stop Me Now",
        'We Will Rock You',
        'Living After Midnight',
        'Pour Some Sugar On Me',
        'Eye of the Tiger',
      ],
    },
    {
      id: 'pop-hits',
      title: 'Pop Hits',
      image: '/images/music/pop-hits.svg',
      queries: ['Shape of You', 'Uptown Funk', "Can't Stop the Feeling", 'Shake It Off', 'Happy'],
    },
    {
      id: 'country-favorites',
      title: 'Country Favorites',
      image: '/images/music/country-favorites.svg',
      queries: [
        'Friends in Low Places',
        'Sweet Home Alabama',
        'Cruise',
        'Wagon Wheel',
        'Tennessee Whiskey',
      ],
    },
  ];

  constructor() {
    makeAutoObservable(this);
  }

  setSearchQuery(query: string) {
    runInAction(() => {
      this.searchQuery = query;
    });
  }

  setSelectedSong(song: MusicSearchResult | null) {
    runInAction(() => {
      this.selectedSong = song;
    });
  }

  setSelectedCategory(category: string) {
    runInAction(() => {
      this.selectedCategory = category;
    });
  }

  setLoading(loading: boolean) {
    runInAction(() => {
      this.isLoading = loading;
    });
  }

  async searchSongs(query?: string, limit = 20) {
    if (!query && !this.searchQuery) return;

    const searchQuery = query || this.searchQuery;

    try {
      this.setLoading(true);

      const response = await apiStore.get(
        `/api/music/search?q=${encodeURIComponent(searchQuery)}&limit=${limit}`,
      );

      runInAction(() => {
        this.songs = response || [];
        this.isLoading = false;
      });

      return { success: true };
    } catch (error: any) {
      runInAction(() => {
        this.isLoading = false;
      });
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to search songs',
      };
    }
  }

  async searchArtists(query?: string, limit = 20) {
    if (!query && !this.searchQuery) return;

    const searchQuery = query || this.searchQuery;

    try {
      this.setLoading(true);

      const response = await apiStore.get(
        `/api/music/artists/search?q=${encodeURIComponent(searchQuery)}&limit=${limit}`,
      );

      runInAction(() => {
        this.artists = response || [];
        this.isLoading = false;
      });

      return { success: true };
    } catch (error: any) {
      runInAction(() => {
        this.isLoading = false;
      });
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to search artists',
      };
    }
  }

  async searchCombined(query?: string, limit = 20) {
    if (!query && !this.searchQuery) return;

    const searchQuery = query || this.searchQuery;

    try {
      this.setLoading(true);

      const response = await apiStore.get(
        `/api/music/search/combined?q=${encodeURIComponent(searchQuery)}&limit=${limit}`,
      );

      runInAction(() => {
        this.songs = response || [];
        this.isLoading = false;
      });

      return { success: true };
    } catch (error: any) {
      runInAction(() => {
        this.isLoading = false;
      });
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to search music',
      };
    }
  }

  async loadCategoryMusic(categoryId: string) {
    const category = this.featuredCategories.find((cat) => cat.id === categoryId);
    if (!category) return;

    try {
      this.setLoading(true);
      this.setSelectedCategory(categoryId);

      // Search for multiple queries from the category
      const allResults: MusicSearchResult[] = [];

      for (const query of category.queries) {
        const response = await apiStore.get(
          `/api/music/search?q=${encodeURIComponent(query)}&limit=4`,
        );
        if (response && Array.isArray(response)) {
          allResults.push(...response);
        }
      }

      runInAction(() => {
        this.songs = allResults;
        this.isLoading = false;
      });

      return { success: true };
    } catch (error: any) {
      runInAction(() => {
        this.isLoading = false;
      });
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to load category music',
      };
    }
  }

  // Clear search results
  clearResults() {
    runInAction(() => {
      this.songs = [];
      this.artists = [];
      this.selectedSong = null;
      this.searchQuery = '';
      this.selectedCategory = 'all';
    });
  }

  // Get formatted duration
  formatDuration(duration?: number): string {
    if (!duration) return '';
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
}

export const musicStore = new MusicStore();
export default musicStore;
