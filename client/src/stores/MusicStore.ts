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

  // Featured categories
  featuredCategories = [
    {
      id: 'karaoke-classics',
      title: 'Karaoke Classics',
      image: '/images/music/karaoke-classics.png',
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
      image: '/images/music/best-of-80s.png',
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
      image: '/images/music/best-of-90s.png',
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
      image: '/images/music/rock-hits.png',
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
      image: '/images/music/pop-hits.png',
      queries: ['Shape of You', 'Uptown Funk', "Can't Stop the Feeling", 'Shake It Off', 'Happy'],
    },
    {
      id: 'country-favorites',
      title: 'Country Favorites',
      image: '/images/music/country-favorites.png',
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

        // Popular karaoke songs for better suggestions (expanded list)
        const popularKaraokeSongs = [
          "Don't Stop Believin'",
          'Sweet Caroline',
          'Bohemian Rhapsody',
          'I Want It That Way',
          'My Way',
          'Take On Me',
          'Total Eclipse of the Heart',
          'Girls Just Want to Have Fun',
          'Wonderwall',
          'Mr. Brightside',
          "Don't You (Forget About Me)",
          "Livin' on a Prayer",
          'Piano Man',
          'I Will Survive',
          'Love Shack',
          "Journey - Don't Stop Believin'",
          'Queen - Bohemian Rhapsody',
          'The Beatles - Hey Jude',
          "Elvis Presley - Can't Help Falling in Love",
          'Whitney Houston - I Will Always Love You',
          'The Killers - Mr. Brightside',
          'Oasis - Wonderwall',
          'Billy Joel - Piano Man',
          'Gloria Gaynor - I Will Survive',
          'The B-52s - Love Shack',
          'Backstreet Boys - I Want It That Way',
          'Elton John - Your Song',
          'Adele - Someone Like You',
          'Ed Sheeran - Perfect',
          'Bruno Mars - Just The Way You Are',
          'Lady Gaga - Shallow',
          'Taylor Swift - Shake It Off',
          'Imagine Dragons - Radioactive',
          'OneRepublic - Counting Stars',
          'Maroon 5 - Sugar',
          'The Chainsmokers - Closer',
          'Twenty One Pilots - Heathens',
          'Post Malone - Circles',
          'Lewis Capaldi - Someone You Loved',
          'Billie Eilish - Bad Guy',
          'Dua Lipa - Levitating',
          'Olivia Rodrigo - Drivers License',
          'Harry Styles - As It Was',
          'The Weeknd - Blinding Lights',
          'Lizzo - Good As Hell',
          'Doja Cat - Say So',
          'Ariana Grande - 7 rings',
          'Beyoncé - Crazy in Love',
          'Rihanna - Umbrella',
          'Katy Perry - Roar',
        ];

        const suggestions: string[] = [];
        const uniqueItems = new Set<string>();

        // First, add matching popular songs (prioritized)
        const matchingPopularSongs = popularKaraokeSongs.filter((song) =>
          song.toLowerCase().includes(query.toLowerCase()),
        );

        matchingPopularSongs.forEach((song) => {
          if (!uniqueItems.has(song.toLowerCase()) && suggestions.length < 8) {
            suggestions.push(song);
            uniqueItems.add(song.toLowerCase());
          }
        });

        // Then fetch from API if we need more suggestions
        if (suggestions.length < 6) {
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
            // Server is offline or API failed - that's OK, we have popular songs
            console.log('Music API unavailable, using popular karaoke songs only');

            // Add more popular songs if we still need suggestions
            if (suggestions.length < 4) {
              const additionalSuggestions = popularKaraokeSongs
                .filter(
                  (song) =>
                    song.toLowerCase().includes(query.toLowerCase()) &&
                    !uniqueItems.has(song.toLowerCase()),
                )
                .slice(0, 8 - suggestions.length);

              additionalSuggestions.forEach((song) => {
                suggestions.push(song);
                uniqueItems.add(song.toLowerCase());
              });
            }
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

    songs.forEach((song) => {
      // Create a normalized key from the song title (lowercase, remove special chars)
      const normalizedTitle = song.title
        .toLowerCase()
        .replace(/[^\w\s]/g, '') // Remove special characters
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();

      const existingSong = songMap.get(normalizedTitle);

      if (!existingSong) {
        songMap.set(normalizedTitle, song);
      } else {
        // Keep the song with higher score (more popular)
        // If scores are equal, prefer the one with album art or preview
        const currentScore = song.score || 0;
        const existingScore = existingSong.score || 0;

        const shouldReplace =
          currentScore > existingScore ||
          (currentScore === existingScore &&
            ((song.albumArt && !existingSong.albumArt) ||
              (song.previewUrl && !existingSong.previewUrl) ||
              (song.year && !existingSong.year)));

        if (shouldReplace) {
          songMap.set(normalizedTitle, song);
        }
      }
    });

    return Array.from(songMap.values());
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
    if (!category) return;

    try {
      if (loadMore) {
        this.setLoadingMore(true);
      } else {
        this.setLoading(true);
        this.setSelectedCategory(categoryId);
        this.resetPagination();
      }

      // For category loading, we'll search for multiple queries from the category
      const allResults: MusicSearchResult[] = [];

      if (loadMore) {
        // For pagination, use different queries or search terms
        const startIdx = this.currentPage * 2;
        const queriesToUse = category.queries.slice(startIdx, startIdx + 2);

        for (const query of queriesToUse) {
          const response = await apiStore.get(
            `/music/search?q=${encodeURIComponent(query)}&limit=15`,
          );
          if (response && Array.isArray(response)) {
            allResults.push(...response);
          }
        }
      } else {
        // Initial load - search with all queries but get more results per query
        for (const query of category.queries) {
          const response = await apiStore.get(
            `/music/search?q=${encodeURIComponent(query)}&limit=12`,
          );
          if (response && Array.isArray(response)) {
            allResults.push(...response);
          }
        }
      }

      runInAction(() => {
        let processedResults = this.deduplicateSongs(allResults);

        if (loadMore) {
          const combinedSongs = [...this.songs, ...processedResults];
          this.songs = this.deduplicateSongs(combinedSongs);
          this.isLoadingMore = false;
        } else {
          this.songs = processedResults;
          this.isLoading = false;
        }

        // Update pagination state - more generous pagination
        this.hasMoreSongs = this.currentPage < Math.ceil(category.queries.length / 2) - 1;
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
      this.currentPage = 0;
      this.hasMoreSongs = true;
    });
  }

  // Load more songs for current search/category
  async loadMore() {
    if (!this.hasMoreSongs || this.isLoadingMore) return;

    if (this.selectedCategory !== 'all') {
      return await this.loadCategoryMusic(this.selectedCategory, true);
    } else if (this.searchQuery) {
      return await this.searchCombined(this.searchQuery, true);
    }
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
