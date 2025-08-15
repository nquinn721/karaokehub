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
  createdAt: string;
  updatedAt: string;
}

export interface SongFavorite {
  id: string;
  userId: string;
  songId: string;
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

  async fetchMySongFavorites() {
    try {
      this.setLoading(true);
      this.setError(null);

      const response = await apiStore.get('/api/song-favorites');

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

  async addSongFavorite(songId: string) {
    try {
      this.setError(null);

      const response = await apiStore.post(`/api/song-favorites/${songId}`, {});

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

  async removeSongFavorite(songId: string) {
    try {
      this.setError(null);

      const response = await apiStore.delete(`/api/song-favorites/${songId}`);

      if (response.success) {
        runInAction(() => {
          // Remove from local state
          this.songFavorites = this.songFavorites.filter((fav) => fav.songId !== songId);
        });
        return true;
      }
    } catch (error: any) {
      runInAction(() => {
        this.setError(error.message || 'Failed to remove song favorite');
      });
      throw error;
    }
  }

  async checkIfSongFavorite(songId: string): Promise<boolean> {
    try {
      const response = await apiStore.get(`/api/song-favorites/check/${songId}`);
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

  async toggleSongFavorite(songId: string): Promise<boolean> {
    const isFavorited = this.isSongFavorited(songId);

    if (isFavorited) {
      await this.removeSongFavorite(songId);
      return false;
    } else {
      await this.addSongFavorite(songId);
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
