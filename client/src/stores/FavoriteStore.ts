import { makeAutoObservable, runInAction } from 'mobx';
import { apiStore } from './ApiStore';

export interface Favorite {
  id: string;
  userId: string;
  showId: string;
  day: string;
  show?: {
    id: string;
    address: string;
    day: string;
    startTime: string;
    endTime: string;
    vendor?: {
      id: string;
      name: string;
    };
    dj?: {
      id: string;
      name: string;
    };
  };
}

export interface CreateFavoriteData {
  showId: string;
  day: string;
}

export class FavoriteStore {
  favorites: Favorite[] = [];
  isLoading = false;

  constructor() {
    makeAutoObservable(this);
  }

  setLoading(loading: boolean) {
    this.isLoading = loading;
  }

  async fetchMyFavorites() {
    try {
      this.setLoading(true);

      const response = await apiStore.get(apiStore.endpoints.favorites.my);

      runInAction(() => {
        this.favorites = response;
        this.isLoading = false;
      });

      return { success: true };
    } catch (error: any) {
      runInAction(() => {
        this.isLoading = false;
      });
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch favorites',
      };
    }
  }

  async addFavorite(favoriteData: CreateFavoriteData) {
    try {
      this.setLoading(true);

      const response = await apiStore.post(apiStore.endpoints.favorites.base, favoriteData);

      runInAction(() => {
        this.favorites.push(response);
        this.isLoading = false;
      });

      return { success: true, favorite: response };
    } catch (error: any) {
      runInAction(() => {
        this.isLoading = false;
      });
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to add favorite',
      };
    }
  }

  async removeFavorite(id: string) {
    try {
      this.setLoading(true);

      await apiStore.delete(apiStore.endpoints.favorites.base + `/${id}`);

      runInAction(() => {
        this.favorites = this.favorites.filter((fav) => fav.id !== id);
        this.isLoading = false;
      });

      return { success: true };
    } catch (error: any) {
      runInAction(() => {
        this.isLoading = false;
      });
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to remove favorite',
      };
    }
  }

  async removeFavoriteByShow(showId: string) {
    try {
      this.setLoading(true);

      await apiStore.delete(apiStore.endpoints.favorites.removeByShow(showId));

      runInAction(() => {
        this.favorites = this.favorites.filter((fav) => fav.showId !== showId);
        this.isLoading = false;
      });

      return { success: true };
    } catch (error: any) {
      runInAction(() => {
        this.isLoading = false;
      });
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to remove favorite',
      };
    }
  }

  isFavorite(showId: string): boolean {
    return this.favorites.some((fav) => fav.showId === showId);
  }

  getFavoriteByShow(showId: string): Favorite | undefined {
    return this.favorites.find((fav) => fav.showId === showId);
  }
}
