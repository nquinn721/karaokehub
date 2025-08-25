import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import {
  ApiResponse,
  FavoriteShow,
  FriendRequest,
  Friendship,
  LoginForm,
  MusicSearchResult,
  RegisterForm,
  Show,
  SongFavorite,
  User,
} from '../types';

// Configuration - Smart URL detection for development
const getApiBaseUrl = () => {
  if (!__DEV__) {
    return 'https://your-production-url.com/api';
  }

  // If EXPO_PUBLIC_API_BASE_URL is set, use it
  if (process.env.EXPO_PUBLIC_API_BASE_URL) {
    return process.env.EXPO_PUBLIC_API_BASE_URL;
  }

  // Auto-detect based on device type
  if (Platform.OS === 'android') {
    // Android emulator uses 10.0.2.2 to access host localhost
    // Physical devices need the actual IP address
    return Device.isDevice ? 'http://192.168.0.108:8000/api' : 'http://10.0.2.2:8000/api';
  } else if (Platform.OS === 'ios') {
    // iOS simulator can use localhost directly
    return Device.isDevice ? 'http://192.168.0.108:8000/api' : 'http://localhost:8000/api';
  }

  // Fallback
  return 'http://localhost:8000/api';
};

const API_BASE_URL = getApiBaseUrl();

class ApiService {
  private token: string | null = null;

  constructor() {
    this.loadToken();
    // Debug: Log the API URL being used
    console.log('🌐 API Base URL:', API_BASE_URL);
    console.log('📱 Device type:', Device.isDevice ? 'Physical Device' : 'Emulator/Simulator');
    console.log('🤖 Platform:', Platform.OS);
  }

  private async loadToken() {
    try {
      this.token = await AsyncStorage.getItem('auth_token');
    } catch (error) {
      console.error('Failed to load token:', error);
    }
  }

  private async saveToken(token: string) {
    try {
      this.token = token;
      await AsyncStorage.setItem('auth_token', token);
    } catch (error) {
      console.error('Failed to save token:', error);
    }
  }

  private async removeToken() {
    try {
      this.token = null;
      await AsyncStorage.removeItem('auth_token');
    } catch (error) {
      console.error('Failed to remove token:', error);
    }
  }

  async setAuthToken(token: string) {
    await this.saveToken(token);
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    try {
      const url = `${API_BASE_URL}${endpoint}`;
      console.log('🌐 Making request to:', url);

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string>),
      };

      if (this.token) {
        headers.Authorization = `Bearer ${this.token}`;
      }

      const response = await fetch(url, {
        ...options,
        headers,
      });

      console.log('📡 Response status:', response.status);
      const data = await response.json();

      if (!response.ok) {
        console.error('❌ API Error:', data);
        return {
          success: false,
          error: data.message || `HTTP error! status: ${response.status}`,
        };
      }

      console.log('✅ API Success:', endpoint);
      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error('💥 API request failed:', error);
      console.error('🔗 Failed URL:', `${API_BASE_URL}${endpoint}`);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  // Auth endpoints
  async login(credentials: LoginForm): Promise<ApiResponse<{ token: string; user: User }>> {
    const response = await this.request<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });

    if (response.success && response.data?.token) {
      await this.saveToken(response.data.token);
    }

    return response;
  }

  async register(userData: RegisterForm): Promise<ApiResponse<{ token: string; user: User }>> {
    const response = await this.request<{ token: string; user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });

    if (response.success && response.data?.token) {
      await this.saveToken(response.data.token);
    }

    return response;
  }

  async logout(): Promise<void> {
    await this.removeToken();
  }

  async getCurrentUser(): Promise<ApiResponse<User>> {
    return this.request<User>('/auth/me');
  }

  // Music endpoints
  async searchSongs(
    query: string,
    limit: number = 20,
    offset: number = 0,
  ): Promise<ApiResponse<MusicSearchResult[]>> {
    return this.request<MusicSearchResult[]>(
      `/music/search?q=${encodeURIComponent(query)}&limit=${limit}&offset=${offset}`,
    );
  }

  async searchArtists(
    query: string,
    limit: number = 20,
    offset: number = 0,
  ): Promise<ApiResponse<any[]>> {
    return this.request<any[]>(
      `/music/artists/search?q=${encodeURIComponent(query)}&limit=${limit}&offset=${offset}`,
    );
  }

  async getMusicCategories(): Promise<ApiResponse<any[]>> {
    return this.request<any[]>('/music/categories');
  }

  async getCategoryMusic(
    categoryId: string,
    limit: number = 20,
  ): Promise<ApiResponse<MusicSearchResult[]>> {
    return this.request<MusicSearchResult[]>(
      `/music/category?categoryId=${categoryId}&limit=${limit}`,
    );
  }

  // Song favorites endpoints
  async getFavoriteSongs(category?: string): Promise<ApiResponse<SongFavorite[]>> {
    const url = category
      ? `/song-favorites?category=${encodeURIComponent(category)}`
      : '/song-favorites';
    return this.request<SongFavorite[]>(url);
  }

  async addSongFavorite(
    songId: string,
    songData?: any,
    category?: string,
  ): Promise<ApiResponse<SongFavorite>> {
    return this.request<SongFavorite>(`/song-favorites/${songId}`, {
      method: 'POST',
      body: JSON.stringify({ songData: songData || {}, category: category || null }),
    });
  }

  async removeSongFavorite(songId: string, category?: string): Promise<ApiResponse<void>> {
    const url = category
      ? `/song-favorites/${songId}?category=${encodeURIComponent(category)}`
      : `/song-favorites/${songId}`;
    return this.request<void>(url, { method: 'DELETE' });
  }

  // Shows endpoints
  async getShows(params?: {
    city?: string;
    state?: string;
    date?: string;
    djId?: string;
    venueId?: string;
    limit?: number;
    offset?: number;
  }): Promise<ApiResponse<Show[]>> {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, value.toString());
        }
      });
    }

    const url = `/shows${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
    return this.request<Show[]>(url);
  }

  async getShow(showId: string): Promise<ApiResponse<Show>> {
    return this.request<Show>(`/shows/${showId}`);
  }

  async getShowsByLocation(
    lat: number,
    lng: number,
    radius: number = 50,
  ): Promise<ApiResponse<Show[]>> {
    return this.request<Show[]>(`/shows/location?lat=${lat}&lng=${lng}&radius=${radius}`);
  }

  // Show favorites endpoints
  async getFavoriteShows(): Promise<ApiResponse<FavoriteShow[]>> {
    return this.request<FavoriteShow[]>('/favorite-shows');
  }

  async addShowFavorite(showId: string): Promise<ApiResponse<FavoriteShow>> {
    return this.request<FavoriteShow>(`/favorite-shows/${showId}`, {
      method: 'POST',
    });
  }

  async removeShowFavorite(showId: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/favorite-shows/${showId}`, {
      method: 'DELETE',
    });
  }

  // Friends endpoints
  async getFriends(): Promise<ApiResponse<Friendship[]>> {
    return this.request<Friendship[]>('/friends');
  }

  async getFriendRequests(): Promise<ApiResponse<FriendRequest[]>> {
    return this.request<FriendRequest[]>('/friends/requests');
  }

  async sendFriendRequest(userId: string): Promise<ApiResponse<FriendRequest>> {
    return this.request<FriendRequest>('/friends/request', {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
  }

  async respondToFriendRequest(requestId: string, accept: boolean): Promise<ApiResponse<void>> {
    return this.request<void>(`/friends/request/${requestId}`, {
      method: 'PATCH',
      body: JSON.stringify({ accept }),
    });
  }

  async removeFriend(friendshipId: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/friends/${friendshipId}`, {
      method: 'DELETE',
    });
  }

  async searchUsers(query: string): Promise<ApiResponse<User[]>> {
    return this.request<User[]>(`/users/search?q=${encodeURIComponent(query)}`);
  }

  // User profile endpoints
  async updateProfile(data: Partial<User>): Promise<ApiResponse<User>> {
    return this.request<User>('/users/profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async uploadProfilePicture(imageUri: string): Promise<ApiResponse<{ url: string }>> {
    // This would need to be implemented with FormData for file upload
    // For now, we'll return a placeholder
    return {
      success: false,
      error: 'Profile picture upload not implemented yet',
    };
  }

  // Health check
  async healthCheck(): Promise<ApiResponse<{ status: string }>> {
    return this.request<{ status: string }>('/health');
  }
}

export const apiService = new ApiService();
export default apiService;
