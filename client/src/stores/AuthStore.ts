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
  stageName?: string;
}

export class AuthStore {
  user: User | null = null;
  token: string | null = null;
  isLoading = false;
  isAuthenticated = false;
  showPostLoginModal = false;
  showStageNameModal = false;
  isNewUser = false;

  // Safeguard to prevent initialization loops
  private isInitializing = false;
  private hasInitialized = false;

  constructor() {
    makeAutoObservable(this);

    // Make this store persistent with proper hydration handling
    makePersistable(this, {
      name: 'AuthStore',
      properties: ['user', 'token', 'isAuthenticated'],
      storage: window.localStorage,
    })
      .then(() => {
        // This callback runs after hydration is complete
        console.log('AuthStore hydrated, token exists:', !!this.token);
        this.safeInitialize();
      })
      .catch((error) => {
        console.error('AuthStore hydration failed:', error);
        // Don't initialize if hydration fails to prevent loops
      });
  }

  // Safe initialization with loop prevention
  private async safeInitialize() {
    if (this.isInitializing || this.hasInitialized) {
      console.log('AuthStore already initializing or initialized, skipping');
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

  // Initialize the store after hydration with comprehensive error handling
  private async initialize() {
    console.log('AuthStore initialize called, token exists:', !!this.token);

    // Set token in API store if it exists after hydration
    if (this.token) {
      try {
        apiStore.setToken(this.token);

        // Always fetch fresh profile data from API to ensure it's up to date
        // This prevents stale cached data issues when user data changes in the database
        console.log('Fetching fresh profile data on app startup...');

        await this.getProfile();
      } catch (error: any) {
        console.warn('Failed to fetch profile on startup:', error);

        // Handle different error types safely without causing loops
        if (error?.response?.status === 401 || error?.status === 401) {
          console.log('Token invalid (401), clearing auth state silently');
          this.clearAuthStateSilently();
        } else if (error?.code === 'NETWORK_ERROR' || error?.message?.includes('Network Error')) {
          console.log('Network error during startup, keeping current auth state');
          // Don't clear auth on network errors - user might be offline
        } else {
          console.log('Unknown error during startup, clearing auth state silently');
          this.clearAuthStateSilently();
        }
      }

      // Fetch subscription status for authenticated users (only if still authenticated)
      if (this.isAuthenticated && this.token) {
        try {
          const { subscriptionStore } = await import('./index');
          await subscriptionStore.fetchSubscriptionStatus();
        } catch (error) {
          console.warn('Failed to fetch subscription status on startup:', error);
          // Don't let subscription errors affect auth state
        }
      }
    }
  }

  // Clear auth state without triggering logout or navigation
  private clearAuthStateSilently() {
    console.log('Clearing auth state silently to prevent loops');

    runInAction(() => {
      this.user = null;
      this.token = null;
      this.isAuthenticated = false;
      this.showPostLoginModal = false;
      this.showStageNameModal = false;
      this.isNewUser = false;
      this.isLoading = false;
    });

    // Clear token from API store
    try {
      apiStore.clearToken();
    } catch (error) {
      console.warn('Failed to clear API token:', error);
    }

    // Don't clear subscription here to avoid circular dependencies during startup
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

        // Check if stage name modal should be shown
        this.checkStageNameRequired();

        // Show modal if user doesn't have a stage name (legacy support)
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

        // For new users without stage name from registration, show stage name modal
        this.checkStageNameRequired();

        // Show modal for new users only if they don't have a stage name (legacy support)
        this.showPostLoginModal = !response.user?.stageName;
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
    // Prevent logout during initialization to avoid loops
    if (this.isInitializing) {
      console.log('Logout called during initialization, deferring');
      setTimeout(() => this.logout(), 1000);
      return;
    }

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
      this.showPostLoginModal = false;
      this.showStageNameModal = false;
      this.isNewUser = false;
    });

    // Clear token from API store
    apiStore.clearToken();

    // Clear subscription status on logout
    try {
      const { subscriptionStore } = await import('./index');
      subscriptionStore.clearSubscriptionStatus();
    } catch (error) {
      console.warn('Failed to clear subscription status:', error);
    }
  }

  async getProfile() {
    try {
      this.setLoading(true);

      const response = await apiStore.get(apiStore.endpoints.auth.profile);

      runInAction(() => {
        // Fix: Extract the user from the response since backend returns {success: true, user: {...}}
        this.user = response.user || response;
        this.isLoading = false;

        // Check if stage name modal should be shown after profile fetch
        this.checkStageNameRequired();
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

      console.log('updateProfile API response:', response);
      console.log('updateProfile response.data:', response.data);
      console.log('Current user before update:', this.user);

      runInAction(() => {
        // The API returns the user object directly, not wrapped in a data property
        this.user = { ...this.user!, ...response };
        console.log('Updated user after merge:', this.user);
        this.isLoading = false;

        // Re-check stage name requirement after profile update
        // This will automatically close the modal if a stage name was set
        console.log('About to call checkStageNameRequired after profile update');
        this.checkStageNameRequired();
      });

      return { success: true, data: response };
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

  // Check if stage name is required and show modal
  checkStageNameRequired() {
    console.log('checkStageNameRequired called with:', {
      isAuthenticated: this.isAuthenticated,
      user: this.user,
      stageName: this.user?.stageName,
      stageNameTrimmed: this.user?.stageName?.trim(),
      currentShowStageNameModal: this.showStageNameModal,
    });

    // Only show stage name modal if:
    // 1. User is authenticated
    // 2. User data is loaded
    // 3. User doesn't have a stage name (null, undefined, or empty string)
    const shouldShowModal =
      this.isAuthenticated &&
      this.user &&
      (!this.user.stageName || this.user.stageName.trim() === '');

    console.log('shouldShowModal calculated as:', shouldShowModal);

    if (shouldShowModal) {
      console.log('Stage name required - showing modal for user:', this.user?.email);
      this.showStageNameModal = true;
    } else {
      console.log('Stage name not required - hiding modal');
      this.showStageNameModal = false;
    }

    console.log('Final showStageNameModal state:', this.showStageNameModal);
  }

  // Force check stage name requirement - called from App component
  forceCheckStageNameRequired() {
    if (this.isAuthenticated && this.user) {
      this.checkStageNameRequired();
    }
  }

  setShowStageNameModal(show: boolean) {
    this.showStageNameModal = show;
  }

  closeStageNameModal() {
    this.showStageNameModal = false;
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

  // Debug method to clear cached data and force fresh fetch
  clearCacheAndRefresh() {
    console.log('Clearing AuthStore cache and refreshing from API...');
    localStorage.removeItem('AuthStore');
    if (this.token) {
      this.getProfile()
        .then(() => {
          console.log('Profile refreshed from API');
        })
        .catch((error) => {
          console.error('Failed to refresh profile:', error);
        });
    }
  }

  // Handle One Tap authentication success
  async handleOneTapSuccess(authData: { token: string; user: User; isNewUser?: boolean }) {
    try {
      runInAction(() => {
        this.user = authData.user;
        this.token = authData.token;
        this.isAuthenticated = true;
        this.isLoading = false;
        this.isNewUser = authData.isNewUser || false;

        // Check if stage name modal should be shown
        this.checkStageNameRequired();

        // Show modal if user doesn't have a stage name (legacy support)
        this.showPostLoginModal = !authData.user?.stageName;
      });

      // Set token in API store
      apiStore.setToken(authData.token);

      // Fetch subscription status after successful login
      import('./index').then(({ subscriptionStore }) => {
        subscriptionStore.fetchSubscriptionStatus().catch((error) => {
          console.warn('Failed to fetch subscription status after One Tap login:', error);
        });
      });

      console.log('One Tap authentication successful');
      return { success: true };
    } catch (error) {
      console.error('Failed to handle One Tap success:', error);
      return { success: false, error: 'Failed to complete authentication' };
    }
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
