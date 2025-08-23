import { makeAutoObservable, runInAction } from 'mobx';
import { apiStore } from './ApiStore';
import { songFavoriteStore } from './SongFavoriteStore';

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
  // Album artwork URLs
  albumArt?: {
    small?: string; // 100x100
    medium?: string; // 300x300
    large?: string; // 600x600
  };
  // Track preview URL (30-second preview)
  previewUrl?: string;
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
  isLoadingMore = false;
  selectedCategory = 'all';
  currentPage = 0;
  hasMoreSongs = true;
  itemsPerPage = 20;

  // Autocomplete functionality
  suggestions: string[] = [];
  isLoadingSuggestions = false;
  showSuggestions = false;

  // Featured categories - now using dynamic Spotify playlists
  featuredCategories = [
    {
      id: 'karaoke-classics',
      title: 'Karaoke Classics',
      image: '/images/music/karaoke-classics.png',
      spotifyQuery: 'karaoke classics hits most popular sing along',
      description: 'Top 100 karaoke classics that everyone loves to sing',
    },
    {
      id: 'best-of-80s',
      title: 'Best of 80s',
      image: '/images/music/best-of-80s.png',
      spotifyQuery: '80s hits decade classics top songs 1980s',
      description: 'Top 100 best songs from the 1980s decade',
    },
    {
      id: 'best-of-90s',
      title: 'Best of 90s',
      image: '/images/music/best-of-90s.png',
      spotifyQuery: '90s hits decade classics top songs 1990s',
      description: 'Top 100 best songs from the 1990s decade',
    },
    {
      id: 'rock-hits',
      title: 'Rock Hits',
      image: '/images/music/rock-hits.png',
      spotifyQuery: 'rock hits classics greatest rock songs all time',
      description: 'Top 100 greatest rock hits of all time',
    },
    {
      id: 'pop-hits',
      title: 'Pop Hits',
      image: '/images/music/pop-hits.png',
      spotifyQuery: 'pop hits top 40 mainstream popular songs',
      description: 'Top 100 pop hits and chart toppers',
    },
    {
      id: 'country-favorites',
      title: 'Country Favorites',
      image: '/images/music/country-favorites.png',
      spotifyQuery: 'country hits favorites classics top country songs',
      description: 'Top 100 country favorites and classics',
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

  setLoadingMore(loading: boolean) {
    runInAction(() => {
      this.isLoadingMore = loading;
    });
  }

  resetPagination() {
    runInAction(() => {
      this.currentPage = 0;
      this.hasMoreSongs = true;
      this.songs = [];
    });
  }

  // Autocomplete functionality
  setShowSuggestions(show: boolean) {
    runInAction(() => {
      this.showSuggestions = show;
    });
  }

  setSuggestions(suggestions: string[]) {
    runInAction(() => {
      this.suggestions = suggestions;
      this.isLoadingSuggestions = false;
    });
  }

  setLoadingSuggestions(loading: boolean) {
    runInAction(() => {
      this.isLoadingSuggestions = loading;
    });
  }

  // Debounced autocomplete search
  private autocompleteTimeout: number | null = null;

  // Debounced load more to prevent rapid successive calls
  private loadMoreTimeout: number | null = null;
  private lastLoadMoreTime = 0;

  async getSuggestions(query: string) {
    if (query.length < 3) {
      this.setSuggestions([]);
      this.setShowSuggestions(false);
      return;
    }

    // Clear previous timeout
    if (this.autocompleteTimeout) {
      clearTimeout(this.autocompleteTimeout);
    }

    // Set a new timeout for debouncing
    this.autocompleteTimeout = window.setTimeout(async () => {
      try {
        this.setLoadingSuggestions(true);

        const suggestions: string[] = [];
        const uniqueItems = new Set<string>();

        // First, check user's favorite songs for matches
        const favoriteSongs = songFavoriteStore.getFavoriteSongs();
        const matchingFavorites = favoriteSongs.filter(
          (song) =>
            song.title.toLowerCase().includes(query.toLowerCase()) ||
            (song.artist && song.artist.toLowerCase().includes(query.toLowerCase())),
        );

        // Add favorite matches first (highest priority)
        matchingFavorites.forEach((song) => {
          if (suggestions.length < 4) {
            const fullTitle = song.artist ? `${song.title} - ${song.artist}` : song.title;
            if (!uniqueItems.has(fullTitle.toLowerCase())) {
              suggestions.push(fullTitle);
              uniqueItems.add(fullTitle.toLowerCase());
            }
          }
        });

        // Then fetch from Spotify API for dynamic suggestions
        try {
          const response = await apiStore.get(
            `/music/search?q=${encodeURIComponent(query)}&limit=12`,
          );

          // Extract unique song titles and artists from API results
          if (response && Array.isArray(response)) {
            // Sort by score (popularity) if available
            const sortedResponse = response.sort((a: MusicSearchResult, b: MusicSearchResult) => {
              return (b.score || 0) - (a.score || 0);
            });

            sortedResponse.forEach((song: MusicSearchResult) => {
              // Add song title with artist for clarity
              if (song.title && song.artist && suggestions.length < 8) {
                const fullTitle = `${song.title} - ${song.artist}`;
                const titleOnly = song.title;

                if (
                  !uniqueItems.has(fullTitle.toLowerCase()) &&
                  !uniqueItems.has(titleOnly.toLowerCase())
                ) {
                  suggestions.push(fullTitle);
                  uniqueItems.add(fullTitle.toLowerCase());
                  uniqueItems.add(titleOnly.toLowerCase());
                }
              } else if (song.title && suggestions.length < 8) {
                if (!uniqueItems.has(song.title.toLowerCase())) {
                  suggestions.push(song.title);
                  uniqueItems.add(song.title.toLowerCase());
                }
              }
            });
          }
        } catch (apiError: any) {
          // API failed - use basic query-based suggestions
          console.log('Music API unavailable for suggestions');

          // If we still don't have many suggestions, add some basic karaoke classics
          if (suggestions.length < 4) {
            const basicSuggestions = [
              "Don't Stop Believin'",
              'Sweet Caroline',
              'Bohemian Rhapsody',
              'Piano Man',
              'I Want It That Way',
              'Mr. Brightside',
              'Wonderwall',
              'Total Eclipse of the Heart',
            ]
              .filter(
                (song) =>
                  song.toLowerCase().includes(query.toLowerCase()) &&
                  !uniqueItems.has(song.toLowerCase()),
              )
              .slice(0, 8 - suggestions.length);

            basicSuggestions.forEach((song) => {
              suggestions.push(song);
              uniqueItems.add(song.toLowerCase());
            });
          }
        }

        this.setSuggestions(suggestions.slice(0, 8));
        this.setShowSuggestions(suggestions.length > 0);
      } catch (error) {
        console.error('Error fetching suggestions:', error);
        this.setSuggestions([]);
        this.setShowSuggestions(false);
        this.setLoadingSuggestions(false);
      }
    }, 300); // 300ms debounce
  }

  async searchSongs(query?: string, limit = 20) {
    if (!query && !this.searchQuery) return;

    const searchQuery = query || this.searchQuery;

    try {
      this.setLoading(true);

      const response = await apiStore.get(
        `/music/search?q=${encodeURIComponent(searchQuery)}&limit=${limit}`,
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
        `/music/artists/search?q=${encodeURIComponent(searchQuery)}&limit=${limit}`,
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

  // Deduplicate songs by title, keeping the most popular version (highest score)
  private deduplicateSongs(songs: MusicSearchResult[]): MusicSearchResult[] {
    const songMap = new Map<string, MusicSearchResult>();
    const duplicatesFound: string[] = [];

    songs.forEach((song) => {
      // Create a normalized key from the song title (more aggressive normalization)
      const normalizedTitle = song.title
        .toLowerCase()
        .replace(/[^\w\s]/g, '') // Remove special characters
        .replace(/\s+/g, ' ') // Normalize whitespace
        .replace(/\b(acoustic|live|re-recorded|remastered|remix|version|feat|ft|featuring)\b/g, '') // Remove version indicators
        .replace(/\(.*?\)/g, '') // Remove content in parentheses
        .replace(/\[.*?\]/g, '') // Remove content in brackets
        .replace(/\s+/g, ' ') // Clean up whitespace again
        .trim();

      const existingSong = songMap.get(normalizedTitle);

      if (!existingSong) {
        songMap.set(normalizedTitle, song);
      } else {
        duplicatesFound.push(
          `Duplicate found: "${song.title}" vs "${existingSong.title}" (normalized: "${normalizedTitle}")`,
        );

        // Keep the song with higher score (more popular)
        // Priority order: score > original version > preview > album art
        const currentScore = song.score || 0;
        const existingScore = existingSong.score || 0;

        // Check if current song is original version (no version indicators)
        const currentIsOriginal =
          !/(acoustic|live|re-recorded|remastered|remix|\(.*?\)|\[.*?\])/i.test(song.title);
        const existingIsOriginal =
          !/(acoustic|live|re-recorded|remastered|remix|\(.*?\)|\[.*?\])/i.test(existingSong.title);

        const shouldReplace =
          currentScore > existingScore ||
          (currentScore === existingScore && currentIsOriginal && !existingIsOriginal) ||
          (currentScore === existingScore &&
            currentIsOriginal === existingIsOriginal &&
            ((song.albumArt && !existingSong.albumArt) ||
              (song.previewUrl && !existingSong.previewUrl) ||
              (song.year && !existingSong.year)));

        if (shouldReplace) {
          console.log(
            `Replacing "${existingSong.title}" with "${song.title}" (score: ${existingScore} -> ${currentScore}, original: ${existingIsOriginal} -> ${currentIsOriginal})`,
          );
          songMap.set(normalizedTitle, song);
        } else {
          console.log(
            `Keeping "${existingSong.title}" over "${song.title}" (score: ${existingScore} vs ${currentScore}, original: ${existingIsOriginal} vs ${currentIsOriginal})`,
          );
        }
      }
    });

    if (duplicatesFound.length > 0) {
      console.log(
        `🎵 Deduplication removed ${duplicatesFound.length} duplicate songs:`,
        duplicatesFound,
      );
    }

    const result = Array.from(songMap.values());
    console.log(`🎵 Deduplication: ${songs.length} input songs -> ${result.length} unique songs`);

    return result;
  }

  async searchCombined(query?: string, loadMore = false) {
    if (!query && !this.searchQuery) return;

    const searchQuery = query || this.searchQuery;

    try {
      if (loadMore) {
        this.setLoadingMore(true);
      } else {
        this.setLoading(true);
        this.resetPagination();
      }

      const offset = loadMore ? this.currentPage * this.itemsPerPage : 0;
      const response = await apiStore.get(
        `/music/search/combined?q=${encodeURIComponent(searchQuery)}&limit=${this.itemsPerPage}&offset=${offset}`,
      );

      runInAction(() => {
        let newSongs = response || [];

        if (loadMore) {
          // For load more, we need to deduplicate the combined results
          const allSongs = [...this.songs, ...newSongs];
          this.songs = this.deduplicateSongs(allSongs);
          this.isLoadingMore = false;
        } else {
          // For new search, deduplicate the results
          this.songs = this.deduplicateSongs(newSongs);
          this.isLoading = false;
        }

        // Update pagination state
        this.hasMoreSongs = response && response.length === this.itemsPerPage;
        if (loadMore) {
          this.currentPage++;
        } else {
          this.currentPage = 1;
        }
      });

      return { success: true };
    } catch (error: any) {
      runInAction(() => {
        if (loadMore) {
          this.isLoadingMore = false;
        } else {
          this.isLoading = false;
        }
      });
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to search music',
      };
    }
  }

  async loadCategoryMusic(categoryId: string, loadMore = false) {
    const category = this.featuredCategories.find((cat) => cat.id === categoryId);
    if (!category) {
      console.error('🚫 Category not found:', categoryId);
      return;
    }

    console.log('🎵 Loading category music:', {
      categoryId,
      categoryTitle: category.title,
      spotifyQuery: category.spotifyQuery,
      loadMore,
    });

    try {
      if (loadMore) {
        this.setLoadingMore(true);
      } else {
        this.setLoading(true);
        this.setSelectedCategory(categoryId);
        this.resetPagination();
      }

      // Use category endpoint for better query expansion and results
      const limit = loadMore ? 20 : 50; // Reasonable batch sizes

      // Split the spotify query into multiple search terms for better results
      const queries = category.spotifyQuery.split(' ').join(',');
      const apiUrl = `/music/category?queries=${encodeURIComponent(queries)}&limit=${limit}&targetCount=${limit}`;
      console.log('🌐 Making API request to:', apiUrl);

      const response = await apiStore.get(apiUrl);

      console.log('📦 API response received:', {
        isArray: Array.isArray(response),
        length: response?.length,
        firstItem: response?.[0],
        fullResponse: response,
      });

      runInAction(() => {
        if (response && Array.isArray(response) && response.length > 0) {
          console.log('✅ Processing non-empty response with', response.length, 'songs');
          let newSongs = response;

          if (loadMore) {
            // For pagination, append new songs
            const combinedSongs = [...this.songs, ...newSongs];
            this.songs = this.deduplicateSongs(combinedSongs);
            this.currentPage += 1;
          } else {
            // Initial load - prioritize liked songs at the top
            const favoriteSongs = songFavoriteStore.getFavoriteSongs();
            const likedSongIds = new Set(favoriteSongs.map((song) => song.spotifyId || song.id));

            // Separate liked and non-liked songs
            const likedSongs = newSongs.filter((song) => likedSongIds.has(song.id));
            const nonLikedSongs = newSongs.filter((song) => !likedSongIds.has(song.id));

            // Combine with liked songs first, then deduplicate
            this.songs = this.deduplicateSongs([...likedSongs, ...nonLikedSongs]);
            this.currentPage = 1;

            console.log(
              `🎵 Loaded ${response.length} songs for "${categoryId}", ${likedSongs.length} are favorited and shown first`,
            );
          }

          // Check if we have more songs to load
          this.hasMoreSongs = response.length === limit;
        } else {
          console.log('❌ Empty or invalid response, clearing songs list');
          if (!loadMore) {
            this.songs = [];
          }
          this.hasMoreSongs = false;
        }

        console.log('🔄 Final store state:', {
          songsCount: this.songs.length,
          isLoading: loadMore ? this.isLoadingMore : this.isLoading,
          hasMoreSongs: this.hasMoreSongs,
          selectedCategory: this.selectedCategory,
        });

        if (loadMore) {
          this.isLoadingMore = false;
        } else {
          this.isLoading = false;
        }
      });
    } catch (error) {
      console.error('Error loading category music:', error);
      runInAction(() => {
        this.isLoading = false;
        this.isLoadingMore = false;
        this.hasMoreSongs = false;
      });
    }
  }

  // Progressive loading for category music - loads 2 songs first, then the rest after 500ms
  async loadCategoryMusicProgressive(categoryId: string) {
    const category = this.featuredCategories.find((cat) => cat.id === categoryId);
    if (!category) {
      console.error('🚫 Category not found:', categoryId);
      return;
    }

    console.log('🎵 Starting progressive loading for category:', categoryId);

    try {
      this.setLoading(true);
      this.setSelectedCategory(categoryId);
      this.resetPagination();

      // Step 1: Load initial 2 songs quickly for immediate feedback
      const queries = category.spotifyQuery.split(' ').join(',');
      const initialApiUrl = `/music/category?queries=${encodeURIComponent(queries)}&limit=2&targetCount=2`;
      
      console.log('🚀 Loading initial 2 songs...');
      const initialResponse = await apiStore.get(initialApiUrl);

      if (initialResponse && Array.isArray(initialResponse) && initialResponse.length > 0) {
        runInAction(() => {
          // Show first 2 songs immediately
          const favoriteSongs = songFavoriteStore.getFavoriteSongs();
          const likedSongIds = new Set(favoriteSongs.map((song) => song.spotifyId || song.id));
          
          // Separate liked and non-liked songs from initial batch
          const likedSongs = initialResponse.filter((song) => likedSongIds.has(song.id));
          const nonLikedSongs = initialResponse.filter((song) => !likedSongIds.has(song.id));
          
          this.songs = this.deduplicateSongs([...likedSongs, ...nonLikedSongs]);
          this.isLoading = false; // Stop loading spinner for initial songs
          console.log('✅ Initial 2 songs loaded:', this.songs.length);
        });

        // Step 2: Wait 500ms then load the rest
        setTimeout(async () => {
          try {
            console.log('🔄 Loading remaining songs after 500ms...');
            const remainingApiUrl = `/music/category?queries=${encodeURIComponent(queries)}&limit=48&targetCount=48`;
            const remainingResponse = await apiStore.get(remainingApiUrl);

            if (remainingResponse && Array.isArray(remainingResponse) && remainingResponse.length > 0) {
              runInAction(() => {
                // Filter out songs we already have (avoid duplicates)
                const existingSongIds = new Set(this.songs.map(song => song.id));
                const newSongs = remainingResponse.filter(song => !existingSongIds.has(song.id));
                
                if (newSongs.length > 0) {
                  // Prioritize favorites in the new batch too
                  const favoriteSongs = songFavoriteStore.getFavoriteSongs();
                  const likedSongIds = new Set(favoriteSongs.map((song) => song.spotifyId || song.id));
                  
                  const likedNewSongs = newSongs.filter((song) => likedSongIds.has(song.id));
                  const nonLikedNewSongs = newSongs.filter((song) => !likedSongIds.has(song.id));
                  
                  // Append new songs (favorites first)
                  const allNewSongs = [...likedNewSongs, ...nonLikedNewSongs];
                  this.songs = this.deduplicateSongs([...this.songs, ...allNewSongs]);
                  
                  console.log(`✅ Progressive loading complete: ${this.songs.length} total songs`);
                }
                
                // Set pagination state
                this.currentPage = 1;
                this.hasMoreSongs = remainingResponse.length === 48;
              });
            }
          } catch (error) {
            console.error('Error loading remaining songs:', error);
          }
        }, 500);
      } else {
        console.log('❌ No initial songs found');
        runInAction(() => {
          this.songs = [];
          this.isLoading = false;
          this.hasMoreSongs = false;
        });
      }
    } catch (error) {
      console.error('Error in progressive loading:', error);
      runInAction(() => {
        this.isLoading = false;
        this.hasMoreSongs = false;
      });
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
      this.currentPage = 0;
      this.hasMoreSongs = true;
    });
  }

  // Load more songs for current search/category with debouncing
  async loadMore() {
    if (!this.hasMoreSongs || this.isLoadingMore) return;

    // Debounce rapid loadMore calls
    const now = Date.now();
    if (now - this.lastLoadMoreTime < 1000) {
      console.log('🚫 LoadMore debounced - too rapid');
      return;
    }

    // Clear any existing timeout
    if (this.loadMoreTimeout) {
      clearTimeout(this.loadMoreTimeout);
    }

    // Set timeout to prevent rapid successive calls
    this.loadMoreTimeout = window.setTimeout(async () => {
      this.lastLoadMoreTime = Date.now();
      console.log('🔄 LoadMore executing after debounce');

      if (this.selectedCategory !== 'all') {
        return await this.loadCategoryMusic(this.selectedCategory, true);
      } else if (this.searchQuery) {
        return await this.searchCombined(this.searchQuery, true);
      }
    }, 100); // Small delay to group rapid calls
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
