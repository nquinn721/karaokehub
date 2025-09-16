import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { ApiResponse } from '../types';

class ApiService {
  private api: AxiosInstance;
  private baseURL: string;

  constructor() {
    // Use your backend URL - update this to match your server
    this.baseURL = __DEV__ ? 'http://localhost:3000/api' : 'https://your-production-api.com/api';

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
    // Request interceptor
    this.api.interceptors.request.use(
      (config) => {
        console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('API Request Error:', error);
        return Promise.reject(error);
      },
    );

    // Response interceptor
    this.api.interceptors.response.use(
      (response: AxiosResponse) => {
        console.log(`API Response: ${response.status} ${response.config.url}`);
        return response;
      },
      (error) => {
        console.error('API Response Error:', error.response?.data || error.message);

        // Handle specific error codes
        if (error.response?.status === 401) {
          // Token expired or invalid - handled by auth store
          console.log('Unauthorized access - token may be expired');
        }

        return Promise.reject(error);
      },
    );
  }

  // Set authentication token
  setAuthToken(token: string) {
    this.api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  // Clear authentication token
  clearAuthToken() {
    delete this.api.defaults.headers.common['Authorization'];
  }

  // Generic request method
  private async request<T = any>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
    url: string,
    data?: any,
    config?: any,
  ): Promise<ApiResponse<T>> {
    try {
      const response = await this.api.request({
        method,
        url,
        data,
        ...config,
      });

      return {
        success: true,
        data: response.data,
        message: response.data?.message,
      };
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        'An unknown error occurred';

      return {
        success: false,
        error: errorMessage,
        message: errorMessage,
      };
    }
  }

  // HTTP Methods
  async get<T = any>(url: string, config?: any): Promise<ApiResponse<T>> {
    return this.request<T>('GET', url, undefined, config);
  }

  async post<T = any>(url: string, data?: any, config?: any): Promise<ApiResponse<T>> {
    return this.request<T>('POST', url, data, config);
  }

  async put<T = any>(url: string, data?: any, config?: any): Promise<ApiResponse<T>> {
    return this.request<T>('PUT', url, data, config);
  }

  async patch<T = any>(url: string, data?: any, config?: any): Promise<ApiResponse<T>> {
    return this.request<T>('PATCH', url, data, config);
  }

  async delete<T = any>(url: string, config?: any): Promise<ApiResponse<T>> {
    return this.request<T>('DELETE', url, undefined, config);
  }

  // Specific API endpoints

  // Auth endpoints
  async login(credentials: { email: string; password: string }) {
    return this.post('/auth/login', credentials);
  }

  async register(credentials: {
    email: string;
    password: string;
    name: string;
    stageName?: string;
  }) {
    return this.post('/auth/register', credentials);
  }

  async logout() {
    return this.post('/auth/logout');
  }

  async refreshToken() {
    return this.post('/auth/refresh');
  }

  async getUserProfile() {
    return this.get('/auth/profile');
  }

  async updateUserProfile(data: any) {
    return this.put('/auth/profile', data);
  }

  // Google/Facebook auth
  async googleAuth(idToken: string) {
    return this.post('/auth/google', { idToken });
  }

  async facebookAuth(accessToken: string) {
    return this.post('/auth/facebook', { accessToken });
  }

  // Shows endpoints
  async getShows(filters?: any) {
    return this.get('/shows', { params: filters });
  }

  async getShow(id: string) {
    return this.get(`/shows/${id}`);
  }

  async submitShow(data: any) {
    return this.post('/shows', data);
  }

  async updateShow(id: string, data: any) {
    return this.put(`/shows/${id}`, data);
  }

  async deleteShow(id: string) {
    return this.delete(`/shows/${id}`);
  }

  async flagShow(id: string, reason: string) {
    return this.post(`/shows/${id}/flag`, { reason });
  }

  // Music endpoints
  async searchMusic(query: string, page?: number, limit?: number) {
    return this.get('/music/search', {
      params: { q: query, page, limit },
    });
  }

  async getMusicCategories() {
    return this.get('/music/categories');
  }

  async getMusicByCategory(categoryId: string, page?: number) {
    return this.get(`/music/categories/${categoryId}`, {
      params: { page },
    });
  }

  async getArtist(artistId: string) {
    return this.get(`/music/artists/${artistId}`);
  }

  async getSong(songId: string) {
    return this.get(`/music/songs/${songId}`);
  }

  // Favorites endpoints
  async getShowFavorites() {
    return this.get('/favorites/shows');
  }

  async addShowFavorite(showId: string) {
    return this.post('/favorites/shows', { showId });
  }

  async removeShowFavorite(showId: string) {
    return this.delete(`/favorites/shows/${showId}`);
  }

  async getSongFavorites() {
    return this.get('/favorites/songs');
  }

  async addSongFavorite(songId: string) {
    return this.post('/favorites/songs', { songId });
  }

  async removeSongFavorite(songId: string) {
    return this.delete(`/favorites/songs/${songId}`);
  }

  // Subscription endpoints
  async getSubscriptionStatus() {
    return this.get('/subscription/status');
  }

  async createSubscription(planId: string) {
    return this.post('/subscription/create', { planId });
  }

  async cancelSubscription() {
    return this.post('/subscription/cancel');
  }

  async syncSubscription() {
    return this.post('/subscription/sync');
  }

  // Friends endpoints
  async getFriends() {
    return this.get('/friends');
  }

  async sendFriendRequest(userId: string) {
    return this.post('/friends/request', { userId });
  }

  async acceptFriendRequest(requestId: string) {
    return this.post(`/friends/accept/${requestId}`);
  }

  async rejectFriendRequest(requestId: string) {
    return this.post(`/friends/reject/${requestId}`);
  }

  async removeFriend(friendId: string) {
    return this.delete(`/friends/${friendId}`);
  }

  // Feedback endpoints
  async submitFeedback(data: { type: string; message: string; metadata?: any }) {
    return this.post('/feedback', data);
  }

  // File upload
  async uploadFile(file: any, type: 'avatar' | 'image') {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);

    return this.request('POST', '/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  }

  // Health check
  async healthCheck() {
    return this.get('/health');
  }

  // Get base URL for external use
  getBaseURL() {
    return this.baseURL;
  }
}

export const apiService = new ApiService();
