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
  public clientConfig: { googleMapsApiKey?: string; environment?: string } | null = null;
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
      // Production URL - adjust this to your actual domain
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
    // Fetch client config on initialization
    this.fetchClientConfig();
  }

  // Method to ensure axios is initialized
  private ensureInitialized(): void {
    console.log('ensureInitialized called, axiosInstance:', this.axiosInstance);

    if (!this.axiosInstance) {
      console.log('axiosInstance is null, calling initializeAxios');
      this.initializeAxios();
    }

    if (!this.axiosInstance) {
      console.error('Still no axiosInstance after initialization attempt');
      throw new Error('Unable to initialize axios instance');
    }

    console.log('axiosInstance verified, has get method:', typeof this.axiosInstance.get);
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
      console.log('Creating axios instance...');

      // Use direct axios import to ensure we have a clean instance
      const axiosInstance = axios.create({
        baseURL: this.baseURL,
        timeout: 30000,
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('Axios instance created:', axiosInstance);
      console.log('Axios instance has get method:', typeof axiosInstance.get);
      console.log('Axios instance methods:', Object.keys(axiosInstance));

      // Only assign if we have a working instance
      if (axiosInstance && typeof axiosInstance.get === 'function') {
        this.axiosInstance = axiosInstance;
        console.log('Axios instance successfully assigned');

        // Try to set up interceptors if available
        this.setupInterceptors();
      } else {
        console.error('Created axios instance is invalid');
        throw new Error('Invalid axios instance created');
      }
    } catch (error) {
      console.error('Error initializing axios:', error);

      // Fallback: create most basic instance possible
      console.log('Creating fallback axios instance...');
      try {
        const fallbackInstance = axios.create({
          baseURL: this.baseURL,
          timeout: 30000,
          withCredentials: true,
        });

        if (fallbackInstance && typeof fallbackInstance.get === 'function') {
          this.axiosInstance = fallbackInstance;
          console.log('Fallback axios instance created successfully');
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
            const token = localStorage.getItem('auth_token');
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
              localStorage.removeItem('auth_token');
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
      console.log('Making GET request to:', this.baseURL + url);
      const response = await this.axiosInstance.get<T>(url, config);
      console.log('GET response received:', response);

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
      const response = await this.axiosInstance.post<T>(url, data, config);

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

  // Fetch client configuration from the server
  async fetchClientConfig(): Promise<void> {
    if (this.configLoaded) return; // Don't fetch again if already loaded

    try {
      const config = await this.get<{ googleMapsApiKey: string; environment: string }>(
        this.endpoints.config.client,
      );

      runInAction(() => {
        this.clientConfig = config;
        this.configLoaded = true;
      });
    } catch (error) {
      console.error('Failed to fetch client config:', error);
      // Don't throw here - app should still work without config
    }
  }

  // Get Google Maps API key from config
  get googleMapsApiKey(): string | undefined {
    return this.clientConfig?.googleMapsApiKey;
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
      makeMeAdmin: '/auth/make-me-admin',
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

    // KJ endpoints
    kjs: {
      base: '/kjs',
      byId: (id: string) => `/kjs/${id}`,
      byVendor: (vendorId: string) => `/kjs/vendor/${vendorId}`,
    },

    // Show endpoints
    shows: {
      base: '/shows',
      byId: (id: string) => `/shows/${id}`,
      byVendor: (vendorId: string) => `/shows/vendor/${vendorId}`,
      byKJ: (kjId: string) => `/shows/kj/${kjId}`,
      byDay: (day: string) => `/shows?day=${day}`,
    },

    // Favorite endpoints
    favorites: {
      base: '/favorites',
      my: '/favorites/my',
      byUser: (userId: string) => `/favorites/user/${userId}`,
      byShow: (showId: string) => `/favorites/show/${showId}`,
      removeByShow: (showId: string) => `/favorites/show/${showId}`,
    },
  };

  // Utility methods
  clearError() {
    runInAction(() => {
      this.error = null;
    });
  }

  setToken(token: string) {
    localStorage.setItem('auth_token', token);
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
    localStorage.removeItem('auth_token');
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
