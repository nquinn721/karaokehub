import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { makeAutoObservable, runInAction } from 'mobx';

export interface ApiResponse<T = any> {
  data: T;
  success: boolean;
  message?: string;
}

export interface ApiError {
  message: string;
  status?: number;
  code?: string;
}

// Store axios instance outside of MobX class to prevent wrapping
let globalAxiosInstance: AxiosInstance;

class ApiStore {
  public isLoading = false;
  public error: ApiError | null = null;
  public clientConfig: {
    googleMapsApiKey?: string;
    googleClientId?: string;
    environment?: string;
  } | null = null;
  public configLoaded = false;

  // Getter to access the non-observable axios instance
  private get axiosInstance(): AxiosInstance {
    return globalAxiosInstance;
  }

  // Setter to update the non-observable axios instance
  private set axiosInstance(instance: AxiosInstance) {
    globalAxiosInstance = instance;
  } // Environment detection
  private get isDevelopment(): boolean {
    return import.meta.env.DEV || window.location.hostname === 'localhost';
  }

  // Dynamic base URL based on environment
  private get baseURL(): string {
    if (this.isDevelopment) {
      return 'http://localhost:8000/api';
    } else {
      // Production URL - use the custom domain which forwards to Cloud Run
      return `${window.location.origin}/api`;
    }
  }

  // WebSocket URL
  public get websocketURL(): string {
    if (this.isDevelopment) {
      return 'ws://localhost:8000';
    } else {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      return `${protocol}//${window.location.host}`;
    }
  }

  constructor() {
    makeAutoObservable(this);
    // Initialize axios immediately with fallback
    this.initializeAxios();
    // Start fetching config immediately for faster map loading
    this.initializeConfig().catch((error) => {
      console.warn('Failed to load initial config:', error);
      // Don't throw here - app should still work
    });
  }

  // Method to ensure axios is initialized
  private ensureInitialized(): void {
    if (!this.axiosInstance) {
      this.initializeAxios();
    }

    if (!this.axiosInstance) {
      console.error('Still no axiosInstance after initialization attempt');
      throw new Error('Unable to initialize axios instance');
    }
  }

  // Check if interceptors are working (simplified)
  private hasWorkingInterceptors(): boolean {
    try {
      return !!(
        this.axiosInstance?.interceptors?.request &&
        this.axiosInstance?.interceptors?.response &&
        typeof this.axiosInstance.interceptors.request.use === 'function' &&
        typeof this.axiosInstance.interceptors.response.use === 'function'
      );
    } catch {
      return false;
    }
  }
  private initializeAxios() {
    console.log('initializeAxios called, baseURL:', this.baseURL);

    try {
      // Create axios instance with standard configuration
      // Use direct axios import to ensure we have a clean instance
      const axiosInstance = axios.create({
        baseURL: this.baseURL,
        timeout: 30000,
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Only assign if we have a working instance
      if (axiosInstance && typeof axiosInstance.get === 'function') {
        this.axiosInstance = axiosInstance;

        // Try to set up interceptors if available
        this.setupInterceptors();
      } else {
        console.error('Created axios instance is invalid');
        throw new Error('Invalid axios instance created');
      }
    } catch (error) {
      console.error('Error initializing axios:', error);

      // Fallback: create most basic instance possible
      try {
        const fallbackInstance = axios.create({
          baseURL: this.baseURL,
          timeout: 30000,
          withCredentials: true,
        });

        if (fallbackInstance && typeof fallbackInstance.get === 'function') {
          this.axiosInstance = fallbackInstance;
        } else {
          console.error('Fallback axios instance also invalid');
          throw new Error('Cannot create any working axios instance');
        }
      } catch (fallbackError) {
        console.error('Fallback axios creation failed:', fallbackError);
        throw new Error('Complete axios initialization failure');
      }
    }
  }
  private setupInterceptors() {
    // Silently skip if interceptors aren't available (common in production builds)
    if (!this.hasWorkingInterceptors()) {
      return;
    }

    try {
      // Request interceptor
      this.axiosInstance.interceptors.request.use(
        (config: any) => {
          try {
            runInAction(() => {
              this.isLoading = true;
              this.error = null;
            });

            // Add auth token if available
            const token = localStorage.getItem('token');
            if (token) {
              config.headers.Authorization = `Bearer ${token}`;
            }
          } catch (error) {
            // Silent fallback
          }
          return config;
        },
        (error: any) => {
          try {
            runInAction(() => {
              this.isLoading = false;
              this.error = {
                message: 'Request failed to send',
                code: 'REQUEST_ERROR',
              };
            });
          } catch {
            // Silent fallback
          }
          return Promise.reject(error);
        },
      );

      // Response interceptor
      this.axiosInstance.interceptors.response.use(
        (response: any) => {
          try {
            runInAction(() => {
              this.isLoading = false;
            });
          } catch {
            // Silent fallback
          }
          return response;
        },
        (error: any) => {
          try {
            runInAction(() => {
              this.isLoading = false;
              this.error = {
                message: error.response?.data?.message || error.message || 'An error occurred',
                status: error.response?.status,
                code: error.response?.data?.code || 'API_ERROR',
              };
            });

            // Handle auth errors
            if (error.response?.status === 401) {
              localStorage.removeItem('token');
              window.location.href = '/login';
            }
          } catch {
            // Silent fallback
          }
          return Promise.reject(error);
        },
      );
    } catch (error) {
      // Interceptors failed to set up - this is fine, we have manual fallbacks
    }
  }

  // Generic HTTP methods
  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    this.ensureInitialized();

    // Additional check: if axiosInstance exists but doesn't have get method, reinitialize
    if (!this.axiosInstance || typeof this.axiosInstance.get !== 'function') {
      console.error('Axios instance is corrupted, reinitializing...', this.axiosInstance);
      this.initializeAxios();

      if (!this.axiosInstance || typeof this.axiosInstance.get !== 'function') {
        throw new Error('Failed to create working axios instance');
      }
    }

    // Manual loading state management if interceptors aren't available
    const hasInterceptors = this.hasWorkingInterceptors();

    if (!hasInterceptors) {
      runInAction(() => {
        this.isLoading = true;
        this.error = null;
      });
    }

    try {
      const response = await this.axiosInstance.get<T>(url, config);

      if (!hasInterceptors) {
        runInAction(() => {
          this.isLoading = false;
        });
      }

      return response.data;
    } catch (error: any) {
      if (!hasInterceptors) {
        runInAction(() => {
          this.isLoading = false;
          this.error = {
            message: error.response?.data?.message || error.message || 'An error occurred',
            status: error.response?.status,
            code: error.response?.data?.code || 'UNKNOWN_ERROR',
          };
        });
      }
      throw error;
    }
  }

  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    this.ensureInitialized();

    const hasInterceptors = this.hasWorkingInterceptors();

    if (!hasInterceptors) {
      runInAction(() => {
        this.isLoading = true;
        this.error = null;
      });
    }

    try {
      // Check if this is a parser endpoint that needs longer timeout
      const isParserEndpoint =
        url.includes('/parser/parse') || url.includes('/parser/parse-and-save');

      // Use longer timeout for parser endpoints (15 minutes) or default config
      const requestConfig = isParserEndpoint
        ? { ...config, timeout: 900000 } // 15 minutes for parsing (enhanced FB parsing needs more time)
        : config;

      const response = await this.axiosInstance.post<T>(url, data, requestConfig);

      if (!hasInterceptors) {
        runInAction(() => {
          this.isLoading = false;
        });
      }

      return response.data;
    } catch (error: any) {
      if (!hasInterceptors) {
        runInAction(() => {
          this.isLoading = false;
          this.error = {
            message: error.response?.data?.message || error.message || 'An error occurred',
            status: error.response?.status,
            code: error.response?.data?.code || 'UNKNOWN_ERROR',
          };
        });
      }
      throw error;
    }
  }

  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    this.ensureInitialized();

    const hasInterceptors = this.hasWorkingInterceptors();

    if (!hasInterceptors) {
      runInAction(() => {
        this.isLoading = true;
        this.error = null;
      });
    }

    try {
      const response = await this.axiosInstance.put<T>(url, data, config);

      if (!hasInterceptors) {
        runInAction(() => {
          this.isLoading = false;
        });
      }

      return response.data;
    } catch (error: any) {
      if (!hasInterceptors) {
        runInAction(() => {
          this.isLoading = false;
          this.error = {
            message: error.response?.data?.message || error.message || 'An error occurred',
            status: error.response?.status,
            code: error.response?.data?.code || 'UNKNOWN_ERROR',
          };
        });
      }
      throw error;
    }
  }

  async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    this.ensureInitialized();

    const hasInterceptors = this.hasWorkingInterceptors();

    if (!hasInterceptors) {
      runInAction(() => {
        this.isLoading = true;
        this.error = null;
      });
    }

    try {
      const response = await this.axiosInstance.patch<T>(url, data, config);

      if (!hasInterceptors) {
        runInAction(() => {
          this.isLoading = false;
        });
      }

      return response.data;
    } catch (error: any) {
      if (!hasInterceptors) {
        runInAction(() => {
          this.isLoading = false;
          this.error = {
            message: error.response?.data?.message || error.message || 'An error occurred',
            status: error.response?.status,
            code: error.response?.data?.code || 'UNKNOWN_ERROR',
          };
        });
      }
      throw error;
    }
  }

  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    this.ensureInitialized();

    const hasInterceptors = this.hasWorkingInterceptors();

    if (!hasInterceptors) {
      runInAction(() => {
        this.isLoading = true;
        this.error = null;
      });
    }

    try {
      const response = await this.axiosInstance.delete<T>(url, config);

      if (!hasInterceptors) {
        runInAction(() => {
          this.isLoading = false;
        });
      }

      return response.data;
    } catch (error: any) {
      if (!hasInterceptors) {
        runInAction(() => {
          this.isLoading = false;
          this.error = {
            message: error.response?.data?.message || error.message || 'An error occurred',
            status: error.response?.status,
            code: error.response?.data?.code || 'UNKNOWN_ERROR',
          };
        });
      }
      throw error;
    }
  }

  // Initialize client config - call this early in app lifecycle
  async initializeConfig(): Promise<void> {
    if (!this.configLoaded) {
      await this.fetchClientConfig();
    }
  }

  // Fetch client configuration from the server
  async fetchClientConfig(): Promise<void> {
    if (this.configLoaded) return; // Don't fetch again if already loaded

    // Check if config was preloaded in the HTML
    const preloadedConfig = (window as any).__KARAOKE_HUB_CONFIG__;
    if (preloadedConfig && preloadedConfig.googleMapsApiKey) {
      runInAction(() => {
        this.clientConfig = preloadedConfig;
        this.configLoaded = true;
      });
      return;
    }

    const maxRetries = 3;
    let retryCount = 0;

    while (retryCount < maxRetries) {
      try {
        // Use a timeout to ensure fast failure
        const config = await Promise.race([
          this.get<{ googleMapsApiKey: string; googleClientId: string; environment: string }>(
            this.endpoints.config.client,
          ),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Config request timeout')), 5000),
          ),
        ]);

        runInAction(() => {
          this.clientConfig = config;
          this.configLoaded = true;
        });
        return; // Success, exit retry loop
      } catch (error) {
        retryCount++;
        console.warn(`Failed to fetch client config (attempt ${retryCount}/${maxRetries}):`, error);

        if (retryCount >= maxRetries) {
          console.error('All config fetch attempts failed:', error);
          // Set configLoaded = true even on failure so app doesn't hang
          runInAction(() => {
            this.configLoaded = true;
          });
          return;
        }

        // Wait before retry (exponential backoff)
        await new Promise((resolve) => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
      }
    }
  }

  // Get Google Maps API key from config
  get googleMapsApiKey(): string | undefined {
    // Only get from server config - no fallback to env variables in production
    return this.clientConfig?.googleMapsApiKey;
  }

  // Get Google Client ID from config
  get googleClientId(): string | undefined {
    return this.clientConfig?.googleClientId;
  }

  // Get environment from server config, fallback to local detection
  get environment(): string {
    return this.clientConfig?.environment || (this.isDevelopment ? 'development' : 'production');
  }

  // Check if running in development mode based on server config
  get isServerDevelopment(): boolean {
    return this.environment === 'development';
  }

  // API endpoints - centralized URL management
  public readonly endpoints = {
    // Config endpoints
    config: {
      client: '/config/client',
    },

    // Auth endpoints
    auth: {
      login: '/auth/login',
      register: '/auth/register',
      logout: '/auth/logout',
      profile: '/auth/profile',
      google: '/auth/google',
      github: '/auth/github',
      facebook: '/auth/facebook',
    },

    // User endpoints
    users: {
      base: '/users',
      byId: (id: string) => `/users/${id}`,
    },

    // Vendor endpoints
    vendors: {
      base: '/vendors',
      byId: (id: string) => `/vendors/${id}`,
    },

    // DJ endpoints
    djs: {
      base: '/djs',
      byId: (id: string) => `/djs/${id}`,
      byVendor: (vendorId: string) => `/djs/vendor/${vendorId}`,
    },

    // Show endpoints
    shows: {
      base: '/shows',
      byId: (id: string) => `/shows/${id}`,
      byVendor: (vendorId: string) => `/shows/vendor/${vendorId}`,
      byDJ: (djId: string) => `/shows/dj/${djId}`,
      byVenue: (venueName: string) => `/shows/venue/${encodeURIComponent(venueName)}`,
      byDay: (day: string) => `/shows?day=${day}`,
      nearby: (centerLat: number, centerLng: number, radius: number = 35, day?: string) =>
        `/shows/nearby?centerLat=${centerLat}&centerLng=${centerLng}&radius=${radius}${day ? `&day=${day}` : ''}`,
      search: (query: string, limit: number = 20) =>
        `/shows/search?query=${encodeURIComponent(query)}&limit=${limit}`,
      citySummary: (day?: string) => `/shows/city-summary${day ? `?day=${day}` : ''}`,
    },

    // Location endpoints
    location: {
      test: '/location/test',
      reverseGeocode: (lat: number, lng: number) =>
        `/location/reverse-geocode?lat=${lat}&lng=${lng}`,
      nearbyShows: (lat: number, lng: number, maxDistance?: number, day?: string) => {
        let url = `/location/nearby-shows?lat=${lat}&lng=${lng}`;
        if (maxDistance) url += `&maxDistance=${maxDistance}`;
        if (day) url += `&day=${day}`;
        return url;
      },
      proximityCheck: (lat: number, lng: number, radius?: number, maxMiles?: number, day?: string) => {
        let url = `/location/proximity-check?lat=${lat}&lng=${lng}`;
        if (radius) url += `&radius=${radius}`;
        if (maxMiles) url += `&maxMiles=${maxMiles}`;
        if (day) url += `&day=${day}`;
        return url;
      },
      calculateDistance: (lat1: number, lng1: number, lat2: number, lng2: number) =>
        `/location/calculate-distance?lat1=${lat1}&lng1=${lng1}&lat2=${lat2}&lng2=${lng2}`,
    },

    // Favorite endpoints
    favorites: {
      base: '/favorites',
      my: '/favorites/my',
      byUser: (userId: string) => `/favorites/user/${userId}`,
      byShow: (showId: string) => `/favorites/show/${showId}`,
      removeByShow: (showId: string) => `/favorites/show/${showId}`,
    },

    // Subscription endpoints
    subscription: {
      status: '/subscription/status',
      createCheckoutSession: '/subscription/create-checkout-session',
      createPortalSession: '/subscription/create-portal-session',
      sync: '/subscription/sync',
      webhook: '/subscription/webhook',
      pricing: '/subscription/pricing',
    },

    // Admin endpoints
    admin: {
      base: '/admin',
      stats: '/admin/stats',
      apiLogs: {
        base: '/admin/api-logs',
        stats: '/admin/api-logs/stats',
        recent: '/admin/api-logs/recent',
        cleanup: '/admin/api-logs/cleanup',
      },
    },
  };

  // Utility methods
  clearError() {
    runInAction(() => {
      this.error = null;
    });
  }

  setToken(token: string) {
    localStorage.setItem('token', token);
    // Update default headers if axios instance is available
    if (
      globalAxiosInstance &&
      globalAxiosInstance.defaults &&
      globalAxiosInstance.defaults.headers
    ) {
      globalAxiosInstance.defaults.headers.Authorization = `Bearer ${token}`;
    }
  }

  clearToken() {
    localStorage.removeItem('token');
    localStorage.removeItem('auth_token'); // Also clear 'auth_token' key for compatibility
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('auth_token');
    // Remove default headers if axios instance is available
    if (
      globalAxiosInstance &&
      globalAxiosInstance.defaults &&
      globalAxiosInstance.defaults.headers
    ) {
      delete globalAxiosInstance.defaults.headers.Authorization;
    }
  }

  // Environment info for debugging
  public get environmentInfo() {
    return {
      isDevelopment: this.isDevelopment,
      baseURL: this.baseURL,
      websocketURL: this.websocketURL,
      hostname: window.location.hostname,
      protocol: window.location.protocol,
    };
  }
}

// Create and export singleton instance
export const apiStore = new ApiStore();
export default apiStore;
