import { makeAutoObservable, runInAction } from 'mobx';
import { apiStore } from './ApiStore';

export interface Song {
  id: string;
  title: string;
  artist: string;
  album?: string;
  genre?: string;
  duration?: number;
  spotifyId?: string;
  youtubeId?: string;
  albumArtSmall?: string;
  albumArtMedium?: string;
  albumArtLarge?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SongFavorite {
  id: string;
  userId: string;
  songId: string;
  category?: string;
  createdAt: string;
  song?: Song;
}

export class SongFavoriteStore {
  songFavorites: SongFavorite[] = [];
  isLoading = false;
  error: string | null = null;

  constructor() {
    makeAutoObservable(this);
  }

  setLoading(loading: boolean) {
    this.isLoading = loading;
  }

  setError(error: string | null) {
    this.error = error;
  }

  async fetchMySongFavorites(category?: string) {
    try {
      this.setLoading(true);
      this.setError(null);

      const url = category
        ? `/song-favorites?category=${encodeURIComponent(category)}`
        : '/song-favorites';
      const response = await apiStore.get(url);

      runInAction(() => {
        this.songFavorites = response.data || [];
      });
    } catch (error: any) {
      runInAction(() => {
        this.setError(error.message || 'Failed to fetch song favorites');
        console.error('Error fetching song favorites:', error);
      });
    } finally {
      runInAction(() => {
        this.setLoading(false);
      });
    }
  }

  async addSongFavorite(songId: string, songData?: any, category?: string) {
    try {
      this.setError(null);

      const requestBody = {
        songData: songData || {},
        category: category || null,
      };

      const response = await apiStore.post(`/song-favorites/${songId}`, requestBody);

      if (response.success) {
        runInAction(() => {
          // Add to local state
          this.songFavorites.push(response.data);
        });
        return response.data;
      }
    } catch (error: any) {
      runInAction(() => {
        this.setError(error.message || 'Failed to add song favorite');
      });
      throw error;
    }
  }

  async removeSongFavorite(songId: string, category?: string) {
    try {
      this.setError(null);

      console.log(
        '🎵 SongFavoriteStore.removeSongFavorite called with:',
        songId,
        'category:',
        category,
      );
      console.log(
        '🎵 Current favorites before removal:',
        this.songFavorites.map((fav) => ({
          id: fav.id,
          songId: fav.songId,
          category: fav.category,
          spotifyId: fav.song?.spotifyId,
          title: fav.song?.title,
        })),
      );

      const url = category
        ? `/song-favorites/${songId}?category=${encodeURIComponent(category)}`
        : `/song-favorites/${songId}`;

      const response = await apiStore.delete(url);

      if (response.success) {
        runInAction(() => {
          // Remove from local state - check both songId and spotifyId
          this.songFavorites = this.songFavorites.filter((fav) => {
            const matchesSongId = fav.songId === songId;
            const matchesSpotifyId = fav.song?.spotifyId === songId;

            // If category is specified, only remove if it matches
            if (category && fav.category !== category) {
              return true; // Keep this favorite
            }

            return !(matchesSongId || matchesSpotifyId);
          });

          console.log(
            '🎵 Favorites after removal:',
            this.songFavorites.map((fav) => ({
              id: fav.id,
              songId: fav.songId,
              category: fav.category,
              spotifyId: fav.song?.spotifyId,
              title: fav.song?.title,
            })),
          );
        });
        return true;
      }
    } catch (error: any) {
      console.error('❌ Error removing song favorite:', error);
      runInAction(() => {
        this.setError(error.message || 'Failed to remove song favorite');
      });
      throw error;
    }
  }

  async checkIfSongFavorite(songId: string): Promise<boolean> {
    try {
      const response = await apiStore.get(`/song-favorites/check/${songId}`);
      return response.data?.isFavorite || false;
    } catch (error) {
      console.error('Error checking song favorite status:', error);
      return false;
    }
  }

  isSongFavorited(songId: string): boolean {
    return this.songFavorites.some((fav) => fav.songId === songId);
  }

  getSongFavoriteCount(): number {
    return this.songFavorites.length;
  }

  getFavoriteSongs(): Song[] {
    return this.songFavorites.map((fav) => fav.song).filter((song) => song !== undefined) as Song[];
  }

  getFavoriteSongsForCategory(categoryId: string): Song[] {
    // Filter favorites by category if it exists, otherwise return all favorites
    const categoryFavorites = this.songFavorites.filter(
      (fav) => fav.category === categoryId && fav.song,
    );

    // If we have category-specific favorites, return those
    if (categoryFavorites.length > 0) {
      return categoryFavorites
        .map((fav) => fav.song)
        .filter((song) => song !== undefined) as Song[];
    }

    // If no category-specific favorites, return all favorites
    // This ensures users see their favorites even if they were added before category tracking
    const allFavorites = this.getFavoriteSongs();
    return allFavorites;
  }

  async toggleSongFavorite(songId: string, category?: string, songData?: any): Promise<boolean> {
    const isFavorited = this.isSongFavorited(songId);

    if (isFavorited) {
      await this.removeSongFavorite(songId, category);
      return false;
    } else {
      await this.addSongFavorite(songId, songData, category);
      return true;
    }
  }

  clearSongFavorites() {
    runInAction(() => {
      this.songFavorites = [];
      this.error = null;
    });
  }
}

// Create singleton instance
export const songFavoriteStore = new SongFavoriteStore();
