import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { makeAutoObservable, runInAction } from 'mobx';
import { makePersistable } from 'mobx-persist-store';
import { apiService } from '../services/ApiService';
import { LoginCredentials, RegisterCredentials, User } from '../types';

export class AuthStore {
  user: User | null = null;
  token: string | null = null;
  isLoading = false;
  isAuthenticated = false;
  showStageNameModal = false;
  isNewUser = false;
  isInitializing = false;

  private hasInitialized = false;

  constructor() {
    makeAutoObservable(this);

    // Make this store persistent with AsyncStorage for React Native
    makePersistable(this, {
      name: 'AuthStore',
      properties: ['user', 'isAuthenticated'],
      storage: AsyncStorage,
    }).then(() => {
      this.safeInitialize();
    });
  }

  private async safeInitialize() {
    if (this.hasInitialized || this.isInitializing) {
      return;
    }

    this.isInitializing = true;

    try {
      await this.initialize();
      this.hasInitialized = true;
    } catch (error) {
      console.error('AuthStore initialization failed:', error);
    } finally {
      this.isInitializing = false;
    }
  }

  private async initialize() {
    try {
      // Check for stored token in SecureStore
      const token = await SecureStore.getItemAsync('auth_token');

      if (token) {
        this.token = token;

        // Verify token is still valid by fetching user info
        try {
          const userData = await apiService.get(apiService.endpoints.auth.me);

          runInAction(() => {
            this.user = userData;
            this.isAuthenticated = true;
            this.checkStageNameRequired();
          });

          // Fetch subscription status
          this.fetchSubscriptionStatus();
        } catch (error) {
          console.warn('Token validation failed:', error);
          await this.clearAuthData();
        }
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
      await this.clearAuthData();
    }
  }

  private async clearAuthData() {
    runInAction(() => {
      this.user = null;
      this.token = null;
      this.isAuthenticated = false;
      this.showStageNameModal = false;
      this.isNewUser = false;
    });

    try {
      await SecureStore.deleteItemAsync('auth_token');
      await SecureStore.deleteItemAsync('refresh_token');
    } catch (error) {
      console.warn('Failed to clear auth data:', error);
    }
  }

  private checkStageNameRequired() {
    if (this.user && (!this.user.stageName || this.user.stageName.trim() === '')) {
      this.showStageNameModal = true;
    }
  }

  private async fetchSubscriptionStatus() {
    try {
      // Subscription status will be fetched elsewhere to avoid circular dependency
      console.log('Subscription status fetch deferred to avoid circular dependency');
    } catch (error) {
      console.warn('Failed to fetch subscription status:', error);
    }
  }

  setLoading(loading: boolean) {
    runInAction(() => {
      this.isLoading = loading;
    });
  }

  setShowStageNameModal(show: boolean) {
    runInAction(() => {
      this.showStageNameModal = show;
    });
  }

  async login(credentials: LoginCredentials) {
    try {
      this.setLoading(true);

      const response = await apiService.post(apiService.endpoints.auth.login, credentials);

      const { user, token, refreshToken } = response;

      // Store tokens securely
      await apiService.setAuthTokens(token, refreshToken);

      runInAction(() => {
        this.user = user;
        this.token = token;
        this.isAuthenticated = true;
        this.isLoading = false;

        // Check if stage name is required
        this.checkStageNameRequired();
      });

      // Fetch subscription status after successful login
      this.fetchSubscriptionStatus();

      return { success: true };
    } catch (error: any) {
      runInAction(() => {
        this.isLoading = false;
      });

      console.error('Login failed:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Login failed',
      };
    }
  }

  async register(credentials: RegisterCredentials) {
    try {
      this.setLoading(true);

      const response = await apiService.post(apiService.endpoints.auth.register, credentials);

      const { user, token, refreshToken } = response;

      // Store tokens securely
      await apiService.setAuthTokens(token, refreshToken);

      runInAction(() => {
        this.user = user;
        this.token = token;
        this.isAuthenticated = true;
        this.isNewUser = true;
        this.isLoading = false;

        // Check if stage name is required
        this.checkStageNameRequired();
      });

      // Fetch subscription status after successful registration
      this.fetchSubscriptionStatus();

      return { success: true };
    } catch (error: any) {
      runInAction(() => {
        this.isLoading = false;
      });

      console.error('Registration failed:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Registration failed',
      };
    }
  }

  async logout() {
    try {
      // Call logout endpoint
      await apiService.post(apiService.endpoints.auth.logout);
    } catch (error) {
      console.warn('Logout API call failed:', error);
      // Continue with local logout even if API call fails
    }

    // Clear all auth data
    await this.clearAuthData();

    // Clear subscription status - avoiding circular dependency
    try {
      console.log('Subscription status cleared (deferred to avoid circular dependency)');
    } catch (error) {
      console.warn('Failed to clear subscription status:', error);
    }
  }

  async updateStageName(stageName: string) {
    try {
      this.setLoading(true);

      const response = await apiService.put(apiService.endpoints.auth.updateStageName, {
        stageName,
      });

      runInAction(() => {
        if (this.user) {
          this.user.stageName = stageName;
        }
        this.showStageNameModal = false;
        this.isLoading = false;
      });

      return { success: true };
    } catch (error: any) {
      runInAction(() => {
        this.isLoading = false;
      });

      console.error('Stage name update failed:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to update stage name',
      };
    }
  }

  forceCheckStageNameRequired() {
    this.checkStageNameRequired();
  }

  // Getter for checking if user has admin privileges
  get isAdmin(): boolean {
    return this.user?.isAdmin === true;
  }

  // Getter for user display name
  get displayName(): string {
    if (!this.user) return '';
    return this.user.stageName || this.user.name || this.user.email;
  }
}

export const authStore = new AuthStore();
