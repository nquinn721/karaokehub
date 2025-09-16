import * as SecureStore from 'expo-secure-store';
import { makeAutoObservable, runInAction } from 'mobx';
import { apiService } from '../services/ApiService';
import { LoginCredentials, RegisterCredentials, User } from '../types';

export class AuthStore {
  user: User | null = null;
  token: string | null = null;
  isLoading = false;
  isAuthenticated = false;
  showPostLoginModal = false;
  showStageNameModal = false;
  isNewUser = false;
  isInitializing = true;

  // Loop detection and prevention
  private authFailureCount = 0;
  private lastAuthFailureTime: number | null = null;
  private readonly MAX_AUTH_FAILURES = 3;
  private readonly AUTH_FAILURE_RESET_TIME = 300000; // 5 minutes

  constructor() {
    makeAutoObservable(this);
    this.initializeAuth();
  }

  // Initialize authentication state
  async initializeAuth() {
    try {
      runInAction(() => {
        this.isInitializing = true;
      });

      // Try to get token from secure storage
      const token = await SecureStore.getItemAsync('auth_token');
      if (token) {
        await this.setToken(token);
        await this.fetchUserProfile();
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
    } finally {
      runInAction(() => {
        this.isInitializing = false;
      });
    }
  }

  // Set authentication token
  async setToken(token: string) {
    runInAction(() => {
      this.token = token;
      this.isAuthenticated = true;
    });

    // Store token securely
    await SecureStore.setItemAsync('auth_token', token);

    // Set API default headers
    apiService.setAuthToken(token);
  }

  // Clear authentication
  async clearAuth() {
    runInAction(() => {
      this.user = null;
      this.token = null;
      this.isAuthenticated = false;
      this.showPostLoginModal = false;
      this.showStageNameModal = false;
      this.isNewUser = false;
    });

    // Clear stored token
    await SecureStore.deleteItemAsync('auth_token');

    // Clear API headers
    apiService.clearAuthToken();
  }

  // Login user
  async login(credentials: LoginCredentials) {
    try {
      runInAction(() => {
        this.isLoading = true;
      });

      const response = await apiService.post('/auth/login', credentials);

      if (response.success && response.data?.token) {
        await this.setToken(response.data.token);

        runInAction(() => {
          this.user = response.data.user;
          this.checkStageNameRequired();
        });

        return { success: true };
      }

      return { success: false, message: response.message || 'Login failed' };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: 'Login failed. Please try again.' };
    } finally {
      runInAction(() => {
        this.isLoading = false;
      });
    }
  }

  // Register user
  async register(credentials: RegisterCredentials) {
    try {
      runInAction(() => {
        this.isLoading = true;
      });

      const response = await apiService.post('/auth/register', credentials);

      if (response.success && response.data?.token) {
        await this.setToken(response.data.token);

        runInAction(() => {
          this.user = response.data.user;
          this.isNewUser = true;
          this.showPostLoginModal = true;
          this.checkStageNameRequired();
        });

        return { success: true };
      }

      return { success: false, message: response.message || 'Registration failed' };
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, message: 'Registration failed. Please try again.' };
    } finally {
      runInAction(() => {
        this.isLoading = false;
      });
    }
  }

  // Fetch user profile
  async fetchUserProfile() {
    try {
      const response = await apiService.get('/auth/profile');

      if (response.success && response.data) {
        runInAction(() => {
          this.user = response.data;
          this.checkStageNameRequired();
        });
        return { success: true };
      }

      // If profile fetch fails, clear auth
      await this.clearAuth();
      return { success: false };
    } catch (error) {
      console.error('Profile fetch error:', error);
      await this.clearAuth();
      return { success: false };
    }
  }

  // Update user profile
  async updateProfile(updates: Partial<User>) {
    try {
      runInAction(() => {
        this.isLoading = true;
      });

      const response = await apiService.put('/auth/profile', updates);

      if (response.success && response.data) {
        runInAction(() => {
          this.user = { ...this.user, ...response.data };
          this.checkStageNameRequired();
        });
        return { success: true };
      }

      return { success: false, message: response.message || 'Update failed' };
    } catch (error) {
      console.error('Profile update error:', error);
      return { success: false, message: 'Update failed. Please try again.' };
    } finally {
      runInAction(() => {
        this.isLoading = false;
      });
    }
  }

  // Logout user
  async logout() {
    try {
      // Call logout endpoint
      await apiService.post('/auth/logout', {});
    } catch (error) {
      console.error('Logout API error:', error);
    } finally {
      // Always clear local auth state
      await this.clearAuth();
    }
  }

  // Check if stage name is required
  checkStageNameRequired() {
    if (this.user && (!this.user.stageName || this.user.stageName.trim() === '')) {
      runInAction(() => {
        this.showStageNameModal = true;
      });
    }
  }

  // Force check stage name (used on route changes)
  forceCheckStageNameRequired() {
    this.checkStageNameRequired();
  }

  // Set stage name modal visibility
  setShowStageNameModal(show: boolean) {
    runInAction(() => {
      this.showStageNameModal = show;
    });
  }

  // Set post login modal visibility
  setShowPostLoginModal(show: boolean) {
    runInAction(() => {
      this.showPostLoginModal = show;
    });
  }

  // Google Sign In
  async googleSignIn(idToken: string) {
    try {
      runInAction(() => {
        this.isLoading = true;
      });

      const response = await apiService.post('/auth/google', { idToken });

      if (response.success && response.data?.token) {
        await this.setToken(response.data.token);

        runInAction(() => {
          this.user = response.data.user;
          this.isNewUser = response.data.isNewUser || false;
          if (this.isNewUser) {
            this.showPostLoginModal = true;
          }
          this.checkStageNameRequired();
        });

        return { success: true };
      }

      return { success: false, message: response.message || 'Google sign in failed' };
    } catch (error) {
      console.error('Google sign in error:', error);
      return { success: false, message: 'Google sign in failed. Please try again.' };
    } finally {
      runInAction(() => {
        this.isLoading = false;
      });
    }
  }

  // Facebook Sign In
  async facebookSignIn(accessToken: string) {
    try {
      runInAction(() => {
        this.isLoading = true;
      });

      const response = await apiService.post('/auth/facebook', { accessToken });

      if (response.success && response.data?.token) {
        await this.setToken(response.data.token);

        runInAction(() => {
          this.user = response.data.user;
          this.isNewUser = response.data.isNewUser || false;
          if (this.isNewUser) {
            this.showPostLoginModal = true;
          }
          this.checkStageNameRequired();
        });

        return { success: true };
      }

      return { success: false, message: response.message || 'Facebook sign in failed' };
    } catch (error) {
      console.error('Facebook sign in error:', error);
      return { success: false, message: 'Facebook sign in failed. Please try again.' };
    } finally {
      runInAction(() => {
        this.isLoading = false;
      });
    }
  }

  // Check if user is admin
  get isAdmin(): boolean {
    return this.user?.isAdmin || false;
  }

  // Check authentication failure limits
  private checkAuthFailureLimits(): boolean {
    const now = Date.now();

    // Reset failure count if enough time has passed
    if (this.lastAuthFailureTime && now - this.lastAuthFailureTime > this.AUTH_FAILURE_RESET_TIME) {
      this.authFailureCount = 0;
      this.lastAuthFailureTime = null;
    }

    return this.authFailureCount < this.MAX_AUTH_FAILURES;
  }

  // Record authentication failure
  private recordAuthFailure() {
    this.authFailureCount++;
    this.lastAuthFailureTime = Date.now();
  }
}

export const authStore = new AuthStore();
