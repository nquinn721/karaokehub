import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import * as SecureStore from 'expo-secure-store';

class ApiService {
  private api: AxiosInstance;
  private baseURL: string;

  // API endpoints
  public readonly endpoints = {
    auth: {
      login: '/auth/login',
      register: '/auth/register',
      logout: '/auth/logout',
      refresh: '/auth/refresh',
      me: '/auth/me',
      updateStageName: '/auth/update-stage-name',
    },
    shows: {
      list: '/shows',
      create: '/shows',
      update: (id: string) => `/shows/${id}`,
      delete: (id: string) => `/shows/${id}`,
      favorites: '/shows/favorites',
      addFavorite: (id: string) => `/shows/${id}/favorite`,
      removeFavorite: (id: string) => `/shows/${id}/favorite`,
    },
    music: {
      search: '/music/search',
      suggestions: '/music/suggestions',
      categories: '/music/categories',
      favorites: '/music/favorites',
      addFavorite: (id: string) => `/music/${id}/favorite`,
      removeFavorite: (id: string) => `/music/${id}/favorite`,
    },
    subscription: {
      status: '/subscription/status',
      createCheckoutSession: '/subscription/checkout',
      cancelSubscription: '/subscription/cancel',
    },
    venues: {
      search: '/venues/search',
      create: '/venues',
    },
    vendors: {
      list: '/vendors',
      create: '/vendors',
    },
    upload: {
      image: '/upload/image',
      parse: '/upload/parse',
    },
  };

  constructor() {
    // Use different base URLs for development and production
    this.baseURL = __DEV__
      ? 'http://localhost:3000/api' // Local development
      : 'https://api.karaokehub.com/api'; // Production

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
            // You might want to navigate to login screen here
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

  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.api.delete(url, config);
    return response.data;
  }

  // Utility method to upload files
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

  // Store auth tokens
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

  // Get current auth token
  async getAuthToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync('auth_token');
    } catch (error) {
      console.error('Failed to get auth token:', error);
      return null;
    }
  }

  // Check if user is authenticated
  async isAuthenticated(): Promise<boolean> {
    const token = await this.getAuthToken();
    return !!token;
  }
}

export const apiService = new ApiService();
export default apiService;
