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
  showPostLoginModal = false;
  isNewUser = false;

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

      // Fetch subscription status for authenticated users
      // Import is done dynamically to avoid circular dependencies
      import('./index').then(({ subscriptionStore }) => {
        subscriptionStore.fetchSubscriptionStatus().catch((error) => {
          console.warn('Failed to fetch subscription status on startup:', error);
        });
      });
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

  // Force refresh profile data - useful after admin status changes
  async refreshProfile() {
    console.log('AuthStore: Force refreshing profile data...');
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
        this.isNewUser = false;

        // Show modal if user doesn't have a stage name
        this.showPostLoginModal = !response.user?.stageName;
      });

      // Set token in API store
      apiStore.setToken(response.token);

      // Fetch subscription status after successful login
      import('./index').then(({ subscriptionStore }) => {
        subscriptionStore.fetchSubscriptionStatus().catch((error) => {
          console.warn('Failed to fetch subscription status after login:', error);
        });
      });

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
        this.isNewUser = true;

        // Always show modal for new users
        this.showPostLoginModal = true;
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

    // Clear subscription status on logout
    import('./index').then(({ subscriptionStore }) => {
      subscriptionStore.clearSubscriptionStatus();
    });
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

  // OAuth login methods
  loginWithGoogle() {
    const googleUrl = `${apiStore.environmentInfo.baseURL}${apiStore.endpoints.auth.google}`;
    console.log('Redirecting to Google OAuth URL:', googleUrl);
    console.log('Base URL:', apiStore.environmentInfo.baseURL);
    console.log('Google endpoint:', apiStore.endpoints.auth.google);
    window.location.href = googleUrl;
  }

  loginWithFacebook() {
    const facebookUrl = `${apiStore.environmentInfo.baseURL}${apiStore.endpoints.auth.facebook}`;
    console.log('Redirecting to Facebook OAuth URL:', facebookUrl);
    console.log('Base URL:', apiStore.environmentInfo.baseURL);
    console.log('Facebook endpoint:', apiStore.endpoints.auth.facebook);
    window.location.href = facebookUrl;
  }

  loginWithGithub() {
    window.location.href = `${apiStore.environmentInfo.baseURL}${apiStore.endpoints.auth.github}`;
  }

  async updateProfile(updateData: { name?: string; stageName?: string; avatar?: string }) {
    if (!this.user) {
      return {
        success: false,
        error: 'No user logged in',
      };
    }

    try {
      this.setLoading(true);
      const response = await apiStore.patch(`/users/${this.user.id}`, updateData);

      runInAction(() => {
        this.user = { ...this.user!, ...response.data };
        this.isLoading = false;
      });

      return { success: true, data: response.data };
    } catch (error: any) {
      runInAction(() => {
        this.isLoading = false;
      });
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to update profile',
      };
    }
  }

  setShowPostLoginModal(show: boolean) {
    this.showPostLoginModal = show;
  }

  closePostLoginModal() {
    this.showPostLoginModal = false;
    this.isNewUser = false;
  }

  // Getter to check if current user is admin
  get isAdmin(): boolean {
    if (!this.user) return false;

    // Handle both boolean true and integer 1 from database
    const isAdminValue = this.user?.isAdmin;
    const result =
      isAdminValue === true || (isAdminValue as any) === 1 || String(isAdminValue) === '1';

    // Debug logging
    console.log('AuthStore.isAdmin check:', {
      user: this.user,
      isAdminValue,
      result,
      userKeys: this.user ? Object.keys(this.user) : 'no user',
    });

    return result;
  }

  // Debug method to check localStorage
  checkLocalStorage() {
    const stored = localStorage.getItem('AuthStore');
    console.log('AuthStore localStorage:', stored);
    console.log('Parsed:', stored ? JSON.parse(stored) : null);
    return stored;
  }

  // Handle OAuth success callback
  async handleAuthSuccess(token: string, navigate: (path: string) => void) {
    try {
      // Store the token and set authentication state
      localStorage.setItem('token', token);
      this.setToken(token);

      // Fetch user profile with the new token
      await this.fetchProfile();

      // Navigate to dashboard on success
      navigate('/dashboard');
    } catch (error) {
      console.error('Failed to complete authentication:', error);
      // Navigate to error page on failure
      navigate('/auth/error');
    }
  }
}
