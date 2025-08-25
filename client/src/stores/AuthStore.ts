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
    }).then(() => {
      this.safeInitialize();
    });
  }

  // Safe initialization with loop prevention
  private async safeInitialize() {
    if (this.isInitializing || this.hasInitialized) {
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
    // Set token in API store if it exists after hydration
    if (this.token) {
      try {
        apiStore.setToken(this.token);

        // Always fetch fresh profile data from API to ensure it's up to date
        await this.getProfile();
      } catch (error: any) {
        // Handle different error types safely without causing loops
        if (error?.response?.status === 401 || error?.status === 401) {
          this.clearAuthStateSilently();
        } else if (error?.code === 'NETWORK_ERROR' || error?.message?.includes('Network Error')) {
          // Don't clear auth on network errors - user might be offline
        } else {
          this.clearAuthStateSilently();
        }
      }

      // Fetch subscription status for authenticated users (only if still authenticated)
      if (this.isAuthenticated && this.token) {
        try {
          const { subscriptionStore } = await import('./index');
          await subscriptionStore.fetchSubscriptionStatus();
        } catch (error) {
          // Don't let subscription errors affect auth state
        }
      }
    }
  }

  // Clear auth state without triggering logout or navigation
  private clearAuthStateSilently() {
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
        subscriptionStore.fetchSubscriptionStatus().catch(() => {
          // Silent fail on subscription fetch
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
      setTimeout(() => this.logout(), 1000);
      return;
    }

    try {
      // Call logout endpoint
      await apiStore.post(apiStore.endpoints.auth.logout);
    } catch (error) {
      // Continue with logout even if API call fails
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
      // Silent fail
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
    window.location.href = googleUrl;
  }

  loginWithFacebook() {
    const facebookUrl = `${apiStore.environmentInfo.baseURL}${apiStore.endpoints.auth.facebook}`;
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
        // The API returns the user object directly, not wrapped in a data property
        this.user = { ...this.user!, ...response };
        this.isLoading = false;

        // Re-check stage name requirement after profile update
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
    // Only show stage name modal if:
    // 1. User is authenticated
    // 2. User data is loaded
    // 3. User doesn't have a stage name (null, undefined, or empty string)
    const shouldShowModal =
      this.isAuthenticated &&
      this.user &&
      (!this.user.stageName || this.user.stageName.trim() === '');

    this.showStageNameModal = !!shouldShowModal;
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
    return isAdminValue === true || (isAdminValue as any) === 1 || String(isAdminValue) === '1';
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
