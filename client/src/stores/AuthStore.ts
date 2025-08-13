import { makeAutoObservable, runInAction } from 'mobx';
import { makePersistable } from 'mobx-persist-store';
import { apiStore } from './ApiStore';

export interface User {
  id: string;
  email: string;
  name: string;
  stageName?: string;
  avatar?: string;
  isAdmin?: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  name: string;
}

export class AuthStore {
  user: User | null = null;
  token: string | null = null;
  isLoading = false;
  isAuthenticated = false;

  constructor() {
    makeAutoObservable(this);

    // Make this store persistent
    makePersistable(this, {
      name: 'AuthStore',
      properties: ['user', 'token', 'isAuthenticated'],
      storage: window.localStorage,
    });

    // Set token in API store if it exists
    if (this.token) {
      apiStore.setToken(this.token);
      // Auto-fetch profile if we have a token but no user data
      if (!this.user) {
        this.getProfile().catch((error) => {
          console.warn('Failed to fetch profile on startup:', error);
        });
      }
    }
  }

  setLoading(loading: boolean) {
    this.isLoading = loading;
  }

  setToken(token: string) {
    runInAction(() => {
      this.token = token;
      this.isAuthenticated = true;
    });

    // Set token in API store
    apiStore.setToken(token);
  }

  async fetchProfile() {
    return await this.getProfile();
  }

  async login(credentials: LoginCredentials) {
    try {
      this.setLoading(true);

      const response = await apiStore.post(apiStore.endpoints.auth.login, credentials);

      runInAction(() => {
        this.user = response.user;
        this.token = response.token;
        this.isAuthenticated = true;
        this.isLoading = false;
      });

      // Set token in API store
      apiStore.setToken(response.token);

      return { success: true };
    } catch (error: any) {
      runInAction(() => {
        this.isLoading = false;
      });
      return {
        success: false,
        error: error.response?.data?.message || 'Login failed',
      };
    }
  }

  async register(credentials: RegisterCredentials) {
    try {
      this.setLoading(true);

      const response = await apiStore.post(apiStore.endpoints.auth.register, credentials);

      runInAction(() => {
        this.user = response.user;
        this.token = response.token;
        this.isAuthenticated = true;
        this.isLoading = false;
      });

      // Set token in API store
      apiStore.setToken(response.token);

      return { success: true };
    } catch (error: any) {
      runInAction(() => {
        this.isLoading = false;
      });
      return {
        success: false,
        error: error.response?.data?.message || 'Registration failed',
      };
    }
  }

  async logout() {
    try {
      // Call logout endpoint
      await apiStore.post(apiStore.endpoints.auth.logout);
    } catch (error) {
      // Continue with logout even if API call fails
      console.warn('Logout API call failed:', error);
    }

    runInAction(() => {
      this.user = null;
      this.token = null;
      this.isAuthenticated = false;
      this.isLoading = false;
    });

    // Clear token from API store
    apiStore.clearToken();
  }

  async getProfile() {
    try {
      this.setLoading(true);

      const response = await apiStore.get(apiStore.endpoints.auth.profile);

      runInAction(() => {
        // Fix: Extract the user from the response since backend returns {success: true, user: {...}}
        this.user = response.user || response;
        this.isLoading = false;
      });

      return { success: true };
    } catch (error: any) {
      runInAction(() => {
        this.isLoading = false;
      });
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to get profile',
      };
    }
  }

  updateUser(userData: Partial<User>) {
    if (this.user) {
      this.user = { ...this.user, ...userData };
    }
  }

  async makeMeAdmin() {
    try {
      this.setLoading(true);
      const response = await apiStore.post(apiStore.endpoints.auth.makeMeAdmin);

      runInAction(() => {
        if (response.user) {
          this.user = response.user;
        }
        this.isLoading = false;
      });

      return {
        success: true,
        message: response.message || 'You are now an admin!',
      };
    } catch (error: any) {
      runInAction(() => {
        this.isLoading = false;
      });
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to promote to admin',
      };
    }
  }

  // OAuth login methods
  loginWithGoogle() {
    const googleUrl = `${apiStore.environmentInfo.baseURL}${apiStore.endpoints.auth.google}`;
    console.log('Redirecting to Google OAuth URL:', googleUrl);
    console.log('Base URL:', apiStore.environmentInfo.baseURL);
    console.log('Google endpoint:', apiStore.endpoints.auth.google);
    window.location.href = googleUrl;
  }

  loginWithGithub() {
    window.location.href = `${apiStore.environmentInfo.baseURL}${apiStore.endpoints.auth.github}`;
  }

  async updateProfile(updateData: { name?: string; stageName?: string; avatar?: string }) {
    if (!this.user) {
      throw new Error('No user logged in');
    }

    this.isLoading = true;
    try {
      const response = await apiStore.patch(`/users/${this.user.id}`, updateData);
      runInAction(() => {
        this.user = { ...this.user!, ...response.data };
      });
      return response.data;
    } catch (error) {
      throw error;
    } finally {
      runInAction(() => {
        this.isLoading = false;
      });
    }
  }

  // Getter to check if current user is admin
  get isAdmin(): boolean {
    // Handle both boolean true and integer 1 from database
    const isAdminValue = this.user?.isAdmin;
    return isAdminValue === true || (isAdminValue as any) === 1;
  }

  // Debug method to check localStorage
  checkLocalStorage() {
    const stored = localStorage.getItem('AuthStore');
    console.log('AuthStore localStorage:', stored);
    console.log('Parsed:', stored ? JSON.parse(stored) : null);
    return stored;
  }
}
