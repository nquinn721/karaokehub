import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import * as SecureStore from 'expo-secure-store';

/**
 * Base API Service for centralized API configuration
 * Matches the web app's ApiStore pattern for consistency
 */
class BaseApiService {
  private api: AxiosInstance;

  // Environment detection - use production in Expo Go
  private get isDevelopment(): boolean {
    // In Expo Go, always use production API even in dev mode
    // since localhost won't be accessible
    return false; // Force production API for now
  }

  // Dynamic base URL based on environment
  private get baseURL(): string {
    if (this.isDevelopment) {
      return 'http://localhost:8000/api'; // Match web app dev URL
    } else {
      return 'https://karaoke-hub.com/api'; // Production URL
    }
  }

  // API endpoints - centralized URL management (matches web app structure)
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
      refresh: '/auth/refresh',
      profile: '/auth/profile',
      me: '/auth/me',
      google: '/auth/google',
      github: '/auth/github',
      facebook: '/auth/facebook',
      updateStageName: '/auth/update-stage-name',
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
      list: '/vendors',
      create: '/vendors',
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
      list: '/shows',
      create: '/shows',
      byId: (id: string) => `/shows/${id}`,
      update: (id: string) => `/shows/${id}`,
      delete: (id: string) => `/shows/${id}`,
      byVendor: (vendorId: string) => `/shows/vendor/${vendorId}`,
      byDJ: (djId: string) => `/shows/dj/${djId}`,
      byVenue: (venueName: string) => `/shows/venue/${encodeURIComponent(venueName)}`,
      byDay: (day: string) => `/shows?day=${day}`,
      nearby: (centerLat: number, centerLng: number, radius: number = 35, day?: string) =>
        `/shows/nearby?centerLat=${centerLat}&centerLng=${centerLng}&radius=${radius}${day ? `&day=${day}` : ''}`,
      search: (query: string, limit: number = 20) =>
        `/shows/search?query=${encodeURIComponent(query)}&limit=${limit}`,
      citySummary: (day?: string) => `/shows/city-summary${day ? `?day=${day}` : ''}`,
      favorites: '/shows/favorites',
      addFavorite: (id: string) => `/shows/${id}/favorite`,
      removeFavorite: (id: string) => `/shows/${id}/favorite`,
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
      proximityCheck: (lat: number, lng: number, radius?: number, maxMiles?: number) => {
        let url = `/location/proximity-check?lat=${lat}&lng=${lng}`;
        if (radius) url += `&radius=${radius}`;
        if (maxMiles) url += `&maxMiles=${maxMiles}`;
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

    // Music endpoints
    music: {
      search: '/music/search',
      suggestions: '/music/suggestions',
      categories: '/music/categories',
      favorites: '/music/favorites',
      addFavorite: (id: string) => `/music/${id}/favorite`,
      removeFavorite: (id: string) => `/music/${id}/favorite`,
    },

    // Subscription endpoints
    subscription: {
      status: '/subscription/status',
      createCheckoutSession: '/subscription/create-checkout-session',
      createPortalSession: '/subscription/create-portal-session',
      cancelSubscription: '/subscription/cancel',
    },

    // Venue endpoints
    venues: {
      base: '/venues',
      search: '/venues/search',
      create: '/venues',
      byId: (id: string) => `/venues/${id}`,
    },

    // Upload endpoints
    upload: {
      image: '/upload/image',
      parse: '/upload/parse',
    },

    // Parser endpoints
    parser: {
      parseWebsite: '/parser/parse-website',
      parseAndSave: '/parser/parse-and-save',
    },

    // Admin endpoints
    admin: {
      stats: '/admin/stats',
      users: '/admin/users',
      shows: '/admin/shows',
      vendors: '/admin/vendors',
    },
  };

  constructor() {
    this.api = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor to add auth token
    this.api.interceptors.request.use(
      async (config) => {
        try {
          const token = await SecureStore.getItemAsync('auth_token');
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }
        } catch (error) {
          console.warn('Failed to get auth token:', error);
        }
        return config;
      },
      (error) => Promise.reject(error),
    );

    // Response interceptor for token refresh
    this.api.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const refreshToken = await SecureStore.getItemAsync('refresh_token');
            if (refreshToken) {
              const response = await this.api.post(this.endpoints.auth.refresh, {
                refreshToken,
              });

              const { token } = response.data;
              await SecureStore.setItemAsync('auth_token', token);

              // Retry original request with new token
              originalRequest.headers.Authorization = `Bearer ${token}`;
              return this.api(originalRequest);
            }
          } catch (refreshError) {
            // Refresh failed, user needs to log in again
            await this.clearTokens();
            console.warn('Token refresh failed:', refreshError);
          }
        }

        return Promise.reject(error);
      },
    );
  }

  private async clearTokens() {
    try {
      await SecureStore.deleteItemAsync('auth_token');
      await SecureStore.deleteItemAsync('refresh_token');
    } catch (error) {
      console.warn('Failed to clear tokens:', error);
    }
  }

  // Generic request methods
  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.api.get(url, config);
    return response.data;
  }

  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.api.post(url, data, config);
    return response.data;
  }

  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.api.put(url, data, config);
    return response.data;
  }

  async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.api.patch(url, data, config);
    return response.data;
  }

  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.api.delete(url, config);
    return response.data;
  }

  // Utility methods
  async uploadFile(file: { uri: string; type: string; name: string }, additionalData?: any) {
    const formData = new FormData();

    // Add the file
    formData.append('file', {
      uri: file.uri,
      type: file.type,
      name: file.name,
    } as any);

    // Add additional data if provided
    if (additionalData) {
      Object.keys(additionalData).forEach((key) => {
        formData.append(key, additionalData[key]);
      });
    }

    return this.post(this.endpoints.upload.image, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  }

  // Auth helper methods
  async setAuthTokens(token: string, refreshToken?: string) {
    try {
      await SecureStore.setItemAsync('auth_token', token);
      if (refreshToken) {
        await SecureStore.setItemAsync('refresh_token', refreshToken);
      }
    } catch (error) {
      console.error('Failed to store auth tokens:', error);
    }
  }

  async getAuthToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync('auth_token');
    } catch (error) {
      console.warn('Failed to get auth token:', error);
      return null;
    }
  }

  async isAuthenticated(): Promise<boolean> {
    const token = await this.getAuthToken();
    return !!token;
  }

  // Environment info
  get environmentInfo() {
    return {
      isDevelopment: this.isDevelopment,
      baseURL: this.baseURL,
    };
  }
}

// Export singleton instance
export const baseApiService = new BaseApiService();
export default baseApiService;
