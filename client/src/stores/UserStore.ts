import { makeAutoObservable, runInAction } from 'mobx';
import { apiStore } from './ApiStore';

export interface User {
  id: string;
  email: string;
  name: string;
  stageName?: string;
  avatar?: string;
  isActive: boolean;
  isAdmin: boolean;
}

export interface UpdateAvatarRequest {
  avatarId: string;
}

export class UserStore {
  currentUser: User | null = null;
  isLoading = false;
  error: string | null = null;

  constructor() {
    makeAutoObservable(this);
  }

  private clearError() {
    this.error = null;
  }

  private setError(error: string) {
    this.error = error;
  }

  private setLoading(loading: boolean) {
    this.isLoading = loading;
  }

  // Get current user based on token
  async getCurrentUser(): Promise<User | null> {
    this.clearError();
    this.setLoading(true);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Decode token to get user ID
      const payload = JSON.parse(atob(token.split('.')[1]));
      const userId = payload.sub || payload.id || payload.userId;

      if (!userId) {
        throw new Error('User ID not found in token');
      }

      const user = await apiStore.get<User>(`/users/${userId}`);

      runInAction(() => {
        this.currentUser = user;
        this.setLoading(false);
      });

      return user;
    } catch (error: any) {
      console.error('Failed to get current user:', error);
      runInAction(() => {
        this.setError(error.message || 'Failed to get current user');
        this.setLoading(false);
        this.currentUser = null;
      });
      return null;
    }
  }

  // Get user by ID
  async getUser(userId: string): Promise<User | null> {
    this.clearError();
    this.setLoading(true);

    try {
      const user = await apiStore.get<User>(`/users/${userId}`);

      runInAction(() => {
        this.setLoading(false);
      });

      return user;
    } catch (error: any) {
      console.error('Failed to get user:', error);
      runInAction(() => {
        this.setError(error.message || 'Failed to get user');
        this.setLoading(false);
      });
      return null;
    }
  }

  // Update user avatar
  async updateAvatar(userId: string, avatarId: string): Promise<User | null> {
    this.clearError();
    this.setLoading(true);

    try {
      const user = await apiStore.patch<User>(`/users/${userId}/avatar`, {
        avatarId,
      });

      runInAction(() => {
        // Update current user if this is the current user
        if (this.currentUser && this.currentUser.id === userId) {
          this.currentUser = user;
        }
        this.setLoading(false);
      });

      return user;
    } catch (error: any) {
      console.error('Failed to update avatar:', error);
      runInAction(() => {
        this.setError(error.message || 'Failed to update avatar');
        this.setLoading(false);
      });
      return null;
    }
  }

  // Clear current user (for logout)
  clearCurrentUser() {
    runInAction(() => {
      this.currentUser = null;
      this.error = null;
    });
  }
}

// Create singleton instance
export const userStore = new UserStore();
