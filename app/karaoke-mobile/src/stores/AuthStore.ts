import AsyncStorage from '@react-native-async-storage/async-storage';
import { makeAutoObservable, runInAction } from 'mobx';
import { makePersistable } from 'mobx-persist-store';
import { apiService } from '../services/ApiService';
import { LoginForm, RegisterForm, User } from '../types';

export class AuthStore {
  user: User | null = null;
  isLoading = false;
  isAuthenticated = false;
  error: string | null = null;

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });

    makePersistable(this, {
      name: 'AuthStore',
      properties: ['user', 'isAuthenticated'],
      storage: AsyncStorage,
    });
  }

  setLoading(loading: boolean) {
    this.isLoading = loading;
  }

  setError(error: string | null) {
    this.error = error;
  }

  setUser(user: User | null) {
    this.user = user;
    this.isAuthenticated = !!user;
  }

  async login(credentials: LoginForm): Promise<boolean> {
    try {
      this.setLoading(true);
      this.setError(null);

      const response = await apiService.login(credentials);

      if (response.success && response.data) {
        runInAction(() => {
          this.setUser(response.data!.user);
        });
        return true;
      } else {
        this.setError(response.error || 'Login failed');
        return false;
      }
    } catch (error) {
      runInAction(() => {
        this.setError(error instanceof Error ? error.message : 'Login failed');
      });
      return false;
    } finally {
      runInAction(() => {
        this.setLoading(false);
      });
    }
  }

  async register(userData: RegisterForm): Promise<boolean> {
    try {
      this.setLoading(true);
      this.setError(null);

      const response = await apiService.register(userData);

      if (response.success && response.data) {
        runInAction(() => {
          this.setUser(response.data!.user);
        });
        return true;
      } else {
        this.setError(response.error || 'Registration failed');
        return false;
      }
    } catch (error) {
      runInAction(() => {
        this.setError(error instanceof Error ? error.message : 'Registration failed');
      });
      return false;
    } finally {
      runInAction(() => {
        this.setLoading(false);
      });
    }
  }

  async logout() {
    try {
      await apiService.logout();
      runInAction(() => {
        this.setUser(null);
      });
    } catch (error) {
      console.error('Logout failed:', error);
      // Still clear local state even if API call fails
      runInAction(() => {
        this.setUser(null);
      });
    }
  }

  async getCurrentUser(): Promise<boolean> {
    try {
      this.setLoading(true);
      this.setError(null);

      const response = await apiService.getCurrentUser();

      if (response.success && response.data) {
        runInAction(() => {
          this.setUser(response.data!);
        });
        return true;
      } else {
        // Token might be invalid, clear local state
        runInAction(() => {
          this.setUser(null);
        });
        return false;
      }
    } catch (error) {
      runInAction(() => {
        this.setError(error instanceof Error ? error.message : 'Failed to get user');
        this.setUser(null);
      });
      return false;
    } finally {
      runInAction(() => {
        this.setLoading(false);
      });
    }
  }

  async updateProfile(data: Partial<User>): Promise<boolean> {
    try {
      this.setLoading(true);
      this.setError(null);

      const response = await apiService.updateProfile(data);

      if (response.success && response.data) {
        runInAction(() => {
          this.setUser(response.data!);
        });
        return true;
      } else {
        this.setError(response.error || 'Profile update failed');
        return false;
      }
    } catch (error) {
      runInAction(() => {
        this.setError(error instanceof Error ? error.message : 'Profile update failed');
      });
      return false;
    } finally {
      runInAction(() => {
        this.setLoading(false);
      });
    }
  }

  async handleSocialAuthSuccess(token: string, user: User): Promise<void> {
    try {
      // Store the JWT token in the API service
      await apiService.setAuthToken(token);

      runInAction(() => {
        this.setUser(user);
      });
    } catch (error) {
      console.error('Social auth success handling failed:', error);
      throw error;
    }
  }

  // Getters
  get displayName(): string {
    if (!this.user) return 'Guest';
    return this.user.stageName || `${this.user.firstName} ${this.user.lastName}`;
  }

  get initials(): string {
    if (!this.user) return 'G';
    return `${this.user.firstName.charAt(0)}${this.user.lastName.charAt(0)}`.toUpperCase();
  }
}
