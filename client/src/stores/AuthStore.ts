import { makeAutoObservable, runInAction } from 'mobx';
import { makePersistable } from 'mobx-persist-store';
import { apiStore } from './ApiStore';

export interface UserAvatar {
  id: string;
  baseAvatarId: string;
  microphoneId?: string;
  outfitId?: string;
  shoesId?: string;
}

export interface Avatar {
  id: string;
  name: string;
  description: string;
  type: string;
  rarity: string;
  imageUrl: string;
  price: number;
  coinPrice: number;
  isAvailable: boolean;
}

export interface User {
  id: string;
  email: string;
  name: string;
  stageName?: string;
  avatar?: string;
  userAvatar?: UserAvatar;
  equippedAvatar?: Avatar;
  isAdmin?: boolean;
  city?: string;
  state?: string;
  djId?: string;
  isDjSubscriptionActive?: boolean;
  djStripeSubscriptionId?: string;
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

class AuthStore {
  user: User | null = null;
  token: string | null = null;
  isAuthenticated = false;
  isLoading = false;
  showPostLoginModal = false;
  showStageNameModal = false;
  isNewUser = false;
  stageNameRequired = false;

  private initialized = false;
  isInitializing = true;

  constructor() {
    makeAutoObservable(this);

    // Simple persistence setup
    makePersistable(this, {
      name: 'AuthStore',
      properties: ['user', 'token', 'isAuthenticated'],
      storage: window.localStorage,
    }).then(() => {
      this.initialize();
    });
  }

  // Simple initialization - no complex loop detection
  private async initialize() {
    if (this.initialized) return;
    this.initialized = true;

    try {
      // Add a small delay to prevent rapid initialization cycles
      await new Promise((resolve) => setTimeout(resolve, 100));

      // If we have a token, validate it
      if (this.token) {
        apiStore.setToken(this.token);

        try {
          const result = await this.getProfile();
          if (!result.success && result.error?.includes('401')) {
            // Only clear auth for 401 errors, silently
            this.clearAuthState();
          }
        } catch (error: any) {
          // Only clear auth for 401 errors, silently
          if (error?.response?.status === 401 || error?.status === 401) {
            this.clearAuthState();
          }
        }
      }
    } catch (error) {
      // Silent fallback
    } finally {
      // Mark initialization as complete
      runInAction(() => {
        this.isInitializing = false;
      });
    }
  }

  // Simple login
  async login(credentials: LoginCredentials) {
    runInAction(() => {
      this.isLoading = true;
    });

    try {
      const response = await apiStore.post(apiStore.endpoints.auth.login, credentials);

      if (response.user && response.token) {
        runInAction(() => {
          this.user = response.user;
          this.token = response.token;
          this.isAuthenticated = true;
          this.isNewUser = false;
        });

        apiStore.setToken(response.token);

        // Handle location detection
        this.handleLocationDetection();

        return { success: true };
      } else {
        return { success: false, error: 'Invalid response from server' };
      }
    } catch (error: any) {
      console.error('Login error:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Login failed',
      };
    } finally {
      runInAction(() => {
        this.isLoading = false;
      });
    }
  }

  // Simple register
  async register(credentials: RegisterCredentials) {
    runInAction(() => {
      this.isLoading = true;
    });

    try {
      const response = await apiStore.post(apiStore.endpoints.auth.register, credentials);

      if (response.user && response.token) {
        runInAction(() => {
          this.user = response.user;
          this.token = response.token;
          this.isAuthenticated = true;
          this.isNewUser = true;
        });

        apiStore.setToken(response.token);

        // Handle location detection
        this.handleLocationDetection();

        return { success: true };
      } else {
        return { success: false, error: 'Invalid response from server' };
      }
    } catch (error: any) {
      console.error('Register error:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Registration failed',
      };
    } finally {
      runInAction(() => {
        this.isLoading = false;
      });
    }
  }

  // Simple logout
  async logout() {
    try {
      await apiStore.post(apiStore.endpoints.auth.logout);
    } catch (error) {
      console.warn('Logout API call failed, continuing with local logout');
    }

    this.clearAuthState();
  }

  // Simple profile fetch
  async getProfile() {
    try {
      const response = await apiStore.get(apiStore.endpoints.auth.profile);

      if (response.user) {
        runInAction(() => {
          this.user = response.user;
          this.isAuthenticated = true;
        });
        return { success: true };
      } else {
        return { success: false, error: 'No user data received' };
      }
    } catch (error: any) {
      console.error('Get profile error:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch profile',
      };
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

  // Handle Google One Tap success
  async handleOneTapSuccess(authData: { token: string; user: User; isNewUser?: boolean }) {
    try {
      runInAction(() => {
        this.user = authData.user;
        this.token = authData.token;
        this.isAuthenticated = true;
        this.isLoading = false;
        this.isNewUser = authData.isNewUser || false;

        // Show stage name modal if needed
        if (!authData.user?.stageName || authData.user.stageName.trim() === '') {
          this.stageNameRequired = true;
          this.showStageNameModal = true;
        }

        // Show post-login modal if no stage name
        this.showPostLoginModal = !authData.user?.stageName;
      });

      // Set token in API store
      apiStore.setToken(authData.token);

      // Handle location detection
      this.handleLocationDetection();

      return { success: true };
    } catch (error) {
      console.error('Failed to handle One Tap success:', error);
      return { success: false, error: 'Failed to complete authentication' };
    }
  }

  // Simple auth state clearing
  clearAuthState() {
    runInAction(() => {
      this.user = null;
      this.token = null;
      this.isAuthenticated = false;
      this.showPostLoginModal = false;
      this.showStageNameModal = false;
      this.isNewUser = false;
      this.isLoading = false;
      this.stageNameRequired = false;
      this.isInitializing = false;
    });

    apiStore.clearToken();
  }

  // Location detection (simplified)
  private async handleLocationDetection() {
    try {
      if (!this.user?.id) return;

      const { locationService } = await import('../services/LocationService');

      locationService
        .autoUpdateLocationIfNeeded(this.user.id)
        .then((result) => {
          if (result.updated && result.location) {
            console.log('📍 Location auto-detected:', result.location);

            runInAction(() => {
              if (this.user) {
                this.user.city = result.location?.city;
                this.user.state = result.location?.state;
              }
            });
          }
        })
        .catch((error) => {
          console.log('📍 Location detection failed:', error);
        });
    } catch (error) {
      console.error('📍 Failed to load LocationService:', error);
    }
  }

  // Refresh profile data
  async refreshProfile() {
    const result = await this.getProfile();
    return result;
  }

  // Simple setters
  setLoading(loading: boolean) {
    this.isLoading = loading;
  }

  setToken(token: string) {
    this.token = token;
    apiStore.setToken(token);
  }

  setUser(user: User) {
    this.user = user;
    this.isAuthenticated = true;
  }

  setShowStageNameModal(show: boolean) {
    runInAction(() => {
      this.showStageNameModal = show;
    });
  }

  // Avatar URL getter
  getAvatarUrl(user: User | null = this.user): string {
    if (!user) return '/images/avatar/avatars/alex.png'; // Default avatar

    // Priority 1: Check for equipped avatar (new system) - use imageUrl from the avatar relation
    if (user.equippedAvatar?.imageUrl) {
      return user.equippedAvatar.imageUrl;
    }

    // Priority 2: Check for userAvatar.baseAvatarId (legacy system)
    if (user.userAvatar?.baseAvatarId) {
      return `/images/avatar/avatars/${user.userAvatar.baseAvatarId}.png`;
    }

    // Priority 3: Fallback to old avatar field if it exists
    if (user.avatar) {
      return user.avatar;
    }

    // Default avatar
    return '/images/avatar/avatars/alex.png';
  }

  // Admin check
  get isAdmin(): boolean {
    if (!this.user) return false;

    // Handle both boolean true and integer 1 from database
    const isAdminValue = this.user?.isAdmin;
    return isAdminValue === true || (isAdminValue as any) === 1 || String(isAdminValue) === '1';
  }

  // Update profile
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
        if (!this.user?.stageName || this.user.stageName.trim() === '') {
          this.stageNameRequired = true;
          this.showStageNameModal = true;
        } else {
          this.stageNameRequired = false;
          this.showStageNameModal = false;
        }
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

  // Modal controls
  closePostLoginModal() {
    runInAction(() => {
      this.showPostLoginModal = false;
      this.isNewUser = false;
    });
  }

  // Handle auth success callback (simplified)
  async handleAuthSuccess(token: string, navigate: (path: string) => void) {
    try {
      // Store the token and set authentication state
      localStorage.setItem('token', token);
      this.setToken(token);

      // Fetch user profile with the new token
      const result = await this.getProfile();

      if (result.success) {
        // Navigate to dashboard on success
        navigate('/dashboard');
      } else {
        // Navigate to error page on failure
        navigate('/auth/error');
      }
    } catch (error) {
      console.error('Failed to complete authentication:', error);
      // Navigate to error page on failure
      navigate('/auth/error');
    }
  }

  forceCheckStageNameRequired() {
    if (this.user && (!this.user.stageName || this.user.stageName.trim() === '')) {
      runInAction(() => {
        this.stageNameRequired = true;
        this.showStageNameModal = true;
      });
    }
  }

  // Debug method to check auth status
  async debugAuth() {
    const token = localStorage.getItem('token');
    console.log('🔍 Auth Debug Info:', {
      hasToken: !!token,
      tokenLength: token?.length,
      tokenPreview: token ? `${token.substring(0, 20)}...` : null,
      isAuthenticated: this.isAuthenticated,
      userId: this.user?.id,
      userEmail: this.user?.email,
    });

    // Test API call to verify token works
    try {
      const response = await apiStore.get('/location/auth-test');
      console.log('✅ Auth test successful:', response);
      return { success: true, response };
    } catch (error: any) {
      console.log('❌ Auth test failed:', {
        status: error.response?.status,
        message: error.response?.data?.message,
        error: error.message,
      });
      return { success: false, error };
    }
  }
}

export const authStore = new AuthStore();
export { AuthStore };
