import { makeAutoObservable, runInAction } from 'mobx';
import { apiStore } from './ApiStore';

export interface AdminStatistics {
  totalUsers: number;
  activeUsers: number;
  totalVenues: number;
  totalShows: number;
  activeShows: number;
  totalDJs: number;
  totalVendors: number;
  totalFeedback: number;
  totalFavorites: number;
  pendingReviews: number;
  pendingShowReviews: number;
  growth: {
    newUsersLast30Days: number;
    newVenuesLast30Days: number;
    newShowsLast30Days: number;
  };
}

export interface AdminActivity {
  id: string;
  type: string;
  action: string;
  details: string;
  timestamp: Date;
  severity: 'success' | 'warning' | 'error' | 'info';
  timeAgo: string;
}

export interface SystemHealth {
  overall: number;
  database: {
    status: 'healthy' | 'unhealthy';
    responseTime?: number;
    error?: string;
  };
  api: {
    status: 'healthy' | 'unhealthy';
    responseTime?: number;
  };
  parser: {
    status: 'active' | 'error';
    lastRun?: Date;
  };
  dataIntegrity: {
    users: boolean;
    vendors: boolean;
    shows: boolean;
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  stageName?: string;
  avatar?: string;
  profileImageUrl?: string;
  provider?: string;
  providerId?: string;
  isActive: boolean;
  isAdmin: boolean;
  stripeCustomerId?: string;
  createdAt: Date;
  updatedAt: Date;
  featureOverrides?: AdminUserFeatureOverride[];
}

export interface AdminUserFeatureOverride {
  id: string;
  userId: string;
  featureType: 'song_previews' | 'song_favorites' | 'show_favorites' | 'ad_free' | 'premium_access';
  isEnabled: boolean;
  customLimit: number | null;
  notes: string | null;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminVenue {
  id: string;
  name: string;
  lat?: number;
  lng?: number;
  website?: string;
  description?: string;
  instagram?: string;
  facebook?: string;
  isActive: boolean;
  requiresReview: boolean;
  lastParsed?: Date;
  parseNotes?: string;
  showCount?: number;
  djCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminShow {
  id: string;
  djId?: string;
  venueId?: string;
  time?: string;
  day?: string;
  startTime?: string;
  endTime?: string;
  description?: string;
  source?: string;
  readableSource?: string;
  isActive: boolean;
  submittedBy?: string; // User ID who submitted this show
  dj?: AdminDJ;
  venue?: {
    id: string;
    name: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    lat?: string;
    lng?: string;
    phone?: string;
    website?: string;
  };
  submittedByUser?: AdminUser; // User who submitted this show
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminDJ {
  id: string;
  name: string;
  vendorId: string;
  isActive: boolean;
  vendor?: AdminVenue;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminVendor {
  id: string;
  name: string;
  website?: string;
  instagram?: string;
  facebook?: string;
  isActive: boolean;
  djCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminFavorite {
  id: string;
  user?: AdminUser;
  show?: AdminShow;
  createdAt: Date;
}

export interface AdminSong {
  id: string;
  url: string;
  rawData: any;
  aiAnalysis?: any;
  status: string;
  createdAt: Date;
}

export interface AdminFeedback {
  id: string;
  type: 'bug' | 'feature' | 'improvement' | 'compliment' | 'complaint' | 'general';
  subject?: string;
  message: string;
  email?: string;
  name?: string;
  userId?: string;
  user?: AdminUser;
  userAgent?: string;
  url?: string;
  status: 'pending' | 'reviewed' | 'resolved';
  response?: string;
  responseDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminShowReview {
  id: string;
  showId: string;
  submittedByUserId?: string;
  djName?: string;
  vendorName?: string;
  venueName?: string;
  venuePhone?: string;
  venueWebsite?: string;
  location?: string;
  description?: string;
  comments?: string;
  status: 'pending' | 'approved' | 'declined';
  adminNotes?: string;
  reviewedByUserId?: string;
  reviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  show?: AdminShow;
  submittedByUser?: AdminUser;
  reviewedByUser?: AdminUser;
}

export interface ParserStatus {
  status: string;
  statistics: {
    totalParsed: number;
    pending: number;
    approved: number;
    rejected: number;
    successRate: number;
  };
  recentActivity: Array<{
    id: string;
    url: string;
    status: string;
    createdAt: Date;
    timeAgo: string;
  }>;
}

export class AdminStore {
  statistics: AdminStatistics | null = null;
  recentActivity: AdminActivity[] = [];
  systemHealth: SystemHealth | null = null;
  isLoading = false;
  error: string | null = null;

  // Data Tables State
  users: PaginatedResponse<AdminUser> | null = null;
  venues: PaginatedResponse<AdminVenue> | null = null;
  shows: PaginatedResponse<AdminShow> | null = null;
  djs: PaginatedResponse<AdminDJ> | null = null;
  vendors: PaginatedResponse<AdminVendor> | null = null;
  favorites: PaginatedResponse<AdminFavorite> | null = null;
  songs: PaginatedResponse<AdminSong> | null = null;
  feedback: PaginatedResponse<AdminFeedback> | null = null;
  showReviews: PaginatedResponse<AdminShowReview> | null = null;
  parserStatus: ParserStatus | null = null;

  isLoadingTable = false;
  tableError: string | null = null;

  constructor() {
    makeAutoObservable(this);
  }

  setLoading(loading: boolean) {
    runInAction(() => {
      this.isLoading = loading;
    });
  }

  setError(error: string | null) {
    runInAction(() => {
      this.error = error;
    });
  }

  async fetchStatistics(): Promise<void> {
    try {
      this.setLoading(true);
      this.setError(null);

      const response = await apiStore.get('/admin/statistics');

      runInAction(() => {
        this.statistics = response;
      });
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to fetch statistics';
      this.setError(errorMessage);
    } finally {
      this.setLoading(false);
    }
  }

  async fetchRecentActivity(): Promise<void> {
    try {
      this.setLoading(true);
      this.setError(null);

      const response = await apiStore.get('/admin/recent-activity');

      runInAction(() => {
        this.recentActivity = response.map((activity: any) => ({
          ...activity,
          timestamp: new Date(activity.timestamp),
        }));
      });
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to fetch recent activity';
      this.setError(errorMessage);
    } finally {
      this.setLoading(false);
    }
  }

  async fetchSystemHealth(): Promise<void> {
    try {
      this.setLoading(true);
      this.setError(null);

      const response = await apiStore.get('/admin/system-health');

      runInAction(() => {
        this.systemHealth = {
          ...response,
          parser: {
            ...response.parser,
            lastRun: response.parser.lastRun ? new Date(response.parser.lastRun) : undefined,
          },
        };
      });
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to fetch system health';
      this.setError(errorMessage);
    } finally {
      this.setLoading(false);
    }
  }

  async fetchAllData(): Promise<void> {
    await Promise.all([
      this.fetchStatistics(),
      this.fetchRecentActivity(),
      this.fetchSystemHealth(),
    ]);
  }

  // Computed values for dashboard metrics
  get userGrowthPercentage(): string {
    if (!this.statistics) return '+0%';
    const { totalUsers, growth } = this.statistics;
    if (totalUsers === 0) return '+0%';

    const percentage = Math.round((growth.newUsersLast30Days / totalUsers) * 100);
    return `+${percentage}%`;
  }

  get venueGrowthPercentage(): string {
    if (!this.statistics) return '+0%';
    const { totalVenues, growth } = this.statistics;
    if (totalVenues === 0) return '+0%';

    const percentage = Math.round((growth.newVenuesLast30Days / totalVenues) * 100);
    return `+${percentage}%`;
  }

  get showGrowthPercentage(): string {
    if (!this.statistics) return '+0%';
    const { totalShows, growth } = this.statistics;
    if (totalShows === 0) return '+0%';

    const percentage = Math.round((growth.newShowsLast30Days / totalShows) * 100);
    return `+${percentage}%`;
  }

  get systemHealthStatus(): 'healthy' | 'warning' | 'critical' {
    if (!this.systemHealth) return 'warning';

    if (this.systemHealth.overall >= 95) return 'healthy';
    if (this.systemHealth.overall >= 80) return 'warning';
    return 'critical';
  }

  // Data Table Methods
  setTableLoading(loading: boolean) {
    runInAction(() => {
      this.isLoadingTable = loading;
    });
  }

  setTableError(error: string | null) {
    runInAction(() => {
      this.tableError = error;
    });
  }

  async fetchUsers(
    page = 1,
    limit = 10,
    search?: string,
    sortBy?: string,
    sortOrder?: 'ASC' | 'DESC',
  ): Promise<void> {
    try {
      this.setTableLoading(true);
      this.setTableError(null);

      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      if (search) {
        params.append('search', search);
      }

      if (sortBy) {
        params.append('sortBy', sortBy);
      }

      if (sortOrder) {
        params.append('sortOrder', sortOrder);
      }

      const response = await apiStore.get(`/admin/users?${params.toString()}`);

      runInAction(() => {
        this.users = {
          ...response,
          items: response.items.map((user: any) => ({
            ...user,
            createdAt: new Date(user.createdAt),
            // Map equippedAvatar to avatar field for consistent interface
            avatar: user.equippedAvatar?.imageUrl || null,
            // Ensure profileImageUrl is preserved in the mapping
            profileImageUrl: user.profileImageUrl,
          })),
        };
      });
    } catch (error: any) {
      // Don't show error for authentication issues since they're handled by interceptor
      if (error.response?.status === 401) {
        return;
      }
      const errorMessage = error.response?.data?.message || 'Failed to fetch users';
      this.setTableError(errorMessage);
    } finally {
      this.setTableLoading(false);
    }
  }

  async fetchVenues(
    page = 1,
    limit = 10,
    search?: string,
    sortBy?: string,
    sortOrder?: 'ASC' | 'DESC',
  ): Promise<void> {
    try {
      this.setTableLoading(true);
      this.setTableError(null);

      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      if (search) {
        params.append('search', search);
      }

      if (sortBy) {
        params.append('sortBy', sortBy);
      }

      if (sortOrder) {
        params.append('sortOrder', sortOrder);
      }

      const response = await apiStore.get(`/admin/venues?${params.toString()}`);

      runInAction(() => {
        this.venues = {
          ...response,
          items: response.items.map((venue: any) => ({
            ...venue,
            createdAt: new Date(venue.createdAt),
          })),
        };
      });
    } catch (error: any) {
      // Don't show error for authentication issues since they're handled by interceptor
      if (error.response?.status === 401) {
        return;
      }
      const errorMessage = error.response?.data?.message || 'Failed to fetch venues';
      this.setTableError(errorMessage);
    } finally {
      this.setTableLoading(false);
    }
  }

  async fetchShows(
    page = 1,
    limit = 10,
    search?: string,
    sortBy?: string,
    sortOrder?: 'ASC' | 'DESC',
  ): Promise<void> {
    try {
      this.setTableLoading(true);
      this.setTableError(null);

      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      if (search) {
        params.append('search', search);
      }

      if (sortBy) {
        params.append('sortBy', sortBy);
      }

      if (sortOrder) {
        params.append('sortOrder', sortOrder);
      }

      const response = await apiStore.get(`/admin/shows?${params.toString()}`);

      runInAction(() => {
        this.shows = {
          ...response,
          items: response.items.map((show: any) => ({
            ...show,
            createdAt: new Date(show.createdAt),
          })),
        };
      });
    } catch (error: any) {
      // Don't show error for authentication issues since they're handled by interceptor
      if (error.response?.status === 401) {
        return;
      }
      const errorMessage = error.response?.data?.message || 'Failed to fetch shows';
      this.setTableError(errorMessage);
    } finally {
      this.setTableLoading(false);
    }
  }

  async fetchNearbyShows(lat: number, lng: number, maxDistance = 100, day?: string): Promise<void> {
    try {
      this.setTableLoading(true);
      this.setTableError(null);

      // Use the same endpoint as the main shows page
      const endpoint = apiStore.endpoints.location.nearbyShows(lat, lng, maxDistance, day);
      const response = await apiStore.get(endpoint);

      runInAction(() => {
        // Transform the response to match the admin shows format
        this.shows = {
          items: response.map((show: any) => ({
            ...show,
            createdAt: show.createdAt ? new Date(show.createdAt) : new Date(),
          })),
          total: response.length,
          page: 1,
          limit: response.length,
          totalPages: 1,
        };
      });
    } catch (error: any) {
      // Don't show error for authentication issues since they're handled by interceptor
      if (error.response?.status === 401) {
        return;
      }
      const errorMessage = error.response?.data?.message || 'Failed to fetch nearby shows';
      this.setTableError(errorMessage);
    } finally {
      this.setTableLoading(false);
    }
  }

  async fetchDjs(
    page = 1,
    limit = 10,
    search?: string,
    sortBy?: string,
    sortOrder?: 'ASC' | 'DESC',
  ): Promise<void> {
    try {
      this.setTableLoading(true);
      this.setTableError(null);

      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      if (search) {
        params.append('search', search);
      }

      if (sortBy) {
        params.append('sortBy', sortBy);
      }

      if (sortOrder) {
        params.append('sortOrder', sortOrder);
      }

      const response = await apiStore.get(`/admin/djs?${params.toString()}`);

      runInAction(() => {
        this.djs = {
          ...response,
          items: response.items.map((dj: any) => ({
            ...dj,
            createdAt: new Date(dj.createdAt),
          })),
        };
      });
    } catch (error: any) {
      // Don't show error for authentication issues since they're handled by interceptor
      if (error.response?.status === 401) {
        return;
      }
      const errorMessage = error.response?.data?.message || 'Failed to fetch DJs';
      this.setTableError(errorMessage);
    } finally {
      this.setTableLoading(false);
    }
  }

  async fetchVendors(page = 1, limit = 10, search?: string): Promise<void> {
    try {
      this.setTableLoading(true);
      this.setTableError(null);

      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      if (search) {
        params.append('search', search);
      }

      const response = await apiStore.get(`/admin/vendors?${params.toString()}`);

      runInAction(() => {
        this.vendors = {
          ...response,
          items: response.items.map((vendor: any) => ({
            ...vendor,
            createdAt: new Date(vendor.createdAt),
            updatedAt: new Date(vendor.updatedAt),
          })),
        };
      });
    } catch (error: any) {
      // Don't show error for authentication issues since they're handled by interceptor
      if (error.response?.status === 401) {
        return;
      }
      const errorMessage = error.response?.data?.message || 'Failed to fetch vendors';
      this.setTableError(errorMessage);
    } finally {
      this.setTableLoading(false);
    }
  }

  async fetchFavorites(page = 1, limit = 10, search?: string): Promise<void> {
    try {
      this.setTableLoading(true);
      this.setTableError(null);

      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      if (search) {
        params.append('search', search);
      }

      const response = await apiStore.get(`/admin/favorites?${params.toString()}`);

      runInAction(() => {
        this.favorites = {
          ...response,
          items: response.items.map((favorite: any) => ({
            ...favorite,
            createdAt: new Date(favorite.createdAt),
            user: favorite.user
              ? {
                  ...favorite.user,
                  createdAt: new Date(favorite.user.createdAt),
                }
              : undefined,
            show: favorite.show
              ? {
                  ...favorite.show,
                  createdAt: new Date(favorite.show.createdAt),
                }
              : undefined,
          })),
        };
      });
    } catch (error: any) {
      // Don't show error for authentication issues since they're handled by interceptor
      if (error.response?.status === 401) {
        return;
      }
      const errorMessage = error.response?.data?.message || 'Failed to fetch favorites';
      this.setTableError(errorMessage);
    } finally {
      this.setTableLoading(false);
    }
  }

  async fetchSongs(page = 1, limit = 10, search?: string): Promise<void> {
    try {
      this.setTableLoading(true);
      this.setTableError(null);

      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      if (search) {
        params.append('search', search);
      }

      const response = await apiStore.get(`/admin/songs?${params.toString()}`);

      runInAction(() => {
        this.songs = {
          ...response,
          items: response.items.map((song: any) => ({
            ...song,
            createdAt: new Date(song.createdAt),
          })),
        };
      });
    } catch (error: any) {
      // Don't show error for authentication issues since they're handled by interceptor
      if (error.response?.status === 401) {
        return;
      }
      const errorMessage = error.response?.data?.message || 'Failed to fetch songs';
      this.setTableError(errorMessage);
    } finally {
      this.setTableLoading(false);
    }
  }

  async fetchFeedback(page = 1, limit = 10, search?: string): Promise<void> {
    try {
      this.setTableLoading(true);
      this.setTableError(null);

      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      if (search) {
        params.append('search', search);
      }

      const response = await apiStore.get(`/admin/feedback?${params.toString()}`);

      runInAction(() => {
        this.feedback = {
          ...response,
          items: response.items.map((feedback: any) => ({
            ...feedback,
            createdAt: new Date(feedback.createdAt),
            updatedAt: new Date(feedback.updatedAt),
            responseDate: feedback.responseDate ? new Date(feedback.responseDate) : undefined,
          })),
        };
      });
    } catch (error: any) {
      // Don't show error for authentication issues since they're handled by interceptor
      if (error.response?.status === 401) {
        return;
      }
      const errorMessage = error.response?.data?.message || 'Failed to fetch feedback';
      this.setTableError(errorMessage);
    } finally {
      this.setTableLoading(false);
    }
  }

  async fetchShowReviews(page = 1, limit = 10, search?: string): Promise<void> {
    try {
      this.setTableLoading(true);
      this.setTableError(null);

      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      if (search) {
        params.append('search', search);
      }

      const response = await apiStore.get(`/admin/show-reviews?${params.toString()}`);

      runInAction(() => {
        this.showReviews = {
          ...response,
          items: response.items.map((review: any) => ({
            ...review,
            createdAt: new Date(review.createdAt),
            updatedAt: new Date(review.updatedAt),
            reviewedAt: review.reviewedAt ? new Date(review.reviewedAt) : undefined,
          })),
        };
      });
    } catch (error: any) {
      // Don't show error for authentication issues since they're handled by interceptor
      if (error.response?.status === 401) {
        return;
      }
      const errorMessage = error.response?.data?.message || 'Failed to fetch show reviews';
      this.setTableError(errorMessage);
    } finally {
      this.setTableLoading(false);
    }
  }

  async approveShowReview(reviewId: string, adminNotes?: string): Promise<void> {
    try {
      await apiStore.patch(`/show-reviews/${reviewId}/review`, {
        status: 'approved',
        adminNotes,
      });

      // Refresh the reviews list
      if (this.showReviews) {
        await this.fetchShowReviews();
      }

      // Refresh statistics to update counts
      await this.fetchStatistics();
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to approve review');
    }
  }

  async declineShowReview(reviewId: string, adminNotes?: string): Promise<void> {
    try {
      await apiStore.patch(`/show-reviews/${reviewId}/review`, {
        status: 'declined',
        adminNotes,
      });

      // Refresh the reviews list
      if (this.showReviews) {
        await this.fetchShowReviews();
      }

      // Refresh statistics to update counts
      await this.fetchStatistics();
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to decline review');
    }
  }

  async fetchParserStatus(): Promise<void> {
    try {
      this.setTableLoading(true);
      this.setTableError(null);

      const response = await apiStore.get('/admin/parser/status');

      runInAction(() => {
        this.parserStatus = {
          ...response,
          recentActivity: response.recentActivity.map((activity: any) => ({
            ...activity,
            createdAt: new Date(activity.createdAt),
          })),
        };
      });
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to fetch parser status';
      this.setTableError(errorMessage);
    } finally {
      this.setTableLoading(false);
    }
  }

  // Delete methods
  async deleteVenue(id: string): Promise<void> {
    try {
      await apiStore.delete(`/admin/venues/${id}`);
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to delete venue');
    }
  }

  async deleteShow(id: string): Promise<void> {
    try {
      await apiStore.delete(`/admin/shows/${id}`);
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to delete show');
    }
  }

  async deleteDj(id: string): Promise<void> {
    try {
      await apiStore.delete(`/admin/djs/${id}`);
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to delete DJ');
    }
  }

  async deleteVendor(id: string): Promise<void> {
    try {
      await apiStore.delete(`/admin/vendors/${id}`);
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to delete vendor');
    }
  }

  // Update methods
  async updateVenue(id: string, data: any): Promise<void> {
    try {
      await apiStore.put(`/admin/venues/${id}`, data);
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to update venue');
    }
  }

  async verifyVenueLocation(venueId: string): Promise<any> {
    try {
      const response = await apiStore.post(`/admin/venues/${venueId}/verify-location`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to verify venue location');
    }
  }

  async updateShow(id: string, data: any): Promise<void> {
    try {
      await apiStore.put(`/shows/${id}`, data);
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to update show');
    }
  }

  async updateDj(id: string, data: any): Promise<void> {
    try {
      await apiStore.put(`/admin/djs/${id}`, data);
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to update DJ');
    }
  }

  async updateVendor(id: string, data: any): Promise<void> {
    try {
      await apiStore.put(`/admin/vendors/${id}`, data);
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to update vendor');
    }
  }

  async updateFeedback(id: string, data: any): Promise<void> {
    try {
      await apiStore.put(`/admin/feedback/${id}`, data);
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to update feedback');
    }
  }

  async deleteFeedback(id: string): Promise<void> {
    try {
      await apiStore.delete(`/admin/feedback/${id}`);
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to delete feedback');
    }
  }

  // Relationship methods
  async getVenueRelationships(id: string): Promise<any> {
    try {
      return await apiStore.get(`/admin/venues/${id}/relationships`);
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch venue relationships');
    }
  }

  async getDjRelationships(id: string): Promise<any> {
    try {
      return await apiStore.get(`/admin/djs/${id}/relationships`);
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch DJ relationships');
    }
  }

  // User Feature Override methods
  async getUserFeatureOverrides(userId: string): Promise<AdminUserFeatureOverride[]> {
    try {
      return await apiStore.get(`/admin/user-feature-overrides/user/${userId}`);
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch user feature overrides');
    }
  }

  async getAllFeatureOverrides(
    page: number = 1,
    limit: number = 20,
    search?: string,
  ): Promise<PaginatedResponse<AdminUserFeatureOverride>> {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(search && { search }),
      });

      return await apiStore.get(`/admin/user-feature-overrides?${params}`);
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch feature overrides');
    }
  }

  async createFeatureOverride(data: {
    userId: string;
    featureType: AdminUserFeatureOverride['featureType'];
    isEnabled: boolean;
    customLimit?: number | null;
    notes?: string;
    expiresAt?: Date | null;
  }): Promise<AdminUserFeatureOverride> {
    try {
      return await apiStore.post('/admin/user-feature-overrides', data);
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to create feature override');
    }
  }

  async updateFeatureOverride(
    id: string,
    data: {
      isEnabled?: boolean;
      customLimit?: number | null;
      notes?: string;
      expiresAt?: Date | null;
    },
  ): Promise<AdminUserFeatureOverride> {
    try {
      return await apiStore.put(`/admin/user-feature-overrides/${id}`, data);
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to update feature override');
    }
  }

  async deleteFeatureOverride(id: string): Promise<void> {
    try {
      await apiStore.delete(`/admin/user-feature-overrides/${id}`);
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to delete feature override');
    }
  }

  async cleanupExpiredOverrides(): Promise<void> {
    try {
      await apiStore.post('/admin/user-feature-overrides/cleanup-expired');
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to cleanup expired overrides');
    }
  }

  // Deduplication functionality
  async analyzeVenueDuplicates(): Promise<any> {
    try {
      this.isLoadingTable = true;
      const response = await apiStore.post('/admin/deduplicate/venues/analyze');
      return response;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to analyze venue duplicates';
      throw new Error(errorMessage);
    } finally {
      this.isLoadingTable = false;
    }
  }

  async analyzeShowDuplicates(): Promise<any> {
    try {
      this.isLoadingTable = true;
      const response = await apiStore.post('/admin/deduplicate/shows/analyze');
      return response;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to analyze show duplicates';
      throw new Error(errorMessage);
    } finally {
      this.isLoadingTable = false;
    }
  }

  async analyzeDjDuplicates(): Promise<any> {
    try {
      this.isLoadingTable = true;
      const response = await apiStore.post('/admin/deduplicate/djs/analyze');
      return response;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to analyze DJ duplicates';
      throw new Error(errorMessage);
    } finally {
      this.isLoadingTable = false;
    }
  }

  async analyzeVendorDuplicates(): Promise<any> {
    try {
      this.isLoadingTable = true;
      const response = await apiStore.post('/admin/deduplicate/vendors/analyze');
      return response;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to analyze vendor duplicates';
      throw new Error(errorMessage);
    } finally {
      this.isLoadingTable = false;
    }
  }

  async cleanupShowsSimple(): Promise<{
    deleted: number;
    message: string;
    details: string[];
  }> {
    try {
      this.isLoadingTable = true;
      const response = await apiStore.post('/admin/deduplicate/shows/cleanup');

      // Refresh shows data after cleanup
      await this.fetchShows(1, 10);

      return response;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to cleanup shows';
      throw new Error(errorMessage);
    } finally {
      this.isLoadingTable = false;
    }
  }

  async executeDuplicateDeletion(
    type: 'venues' | 'shows' | 'djs' | 'vendors',
    idsToDelete: string[],
  ): Promise<any> {
    try {
      this.isLoadingTable = true;
      const response = await apiStore.post(`/admin/deduplicate/${type}/execute`, { idsToDelete });

      // Refresh the relevant data after deletion
      switch (type) {
        case 'venues':
          await this.fetchVenues(1, 10);
          break;
        case 'shows':
          await this.fetchShows(1, 10);
          break;
        case 'djs':
          await this.fetchDjs(1, 10);
          break;
        case 'vendors':
          await this.fetchVendors(1, 10);
          break;
      }

      return response;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || `Failed to delete ${type} duplicates`;
      throw new Error(errorMessage);
    } finally {
      this.isLoadingTable = false;
    }
  }

  // Avatar Management
  async getAvailableAvatars(): Promise<any[]> {
    try {
      const response = await apiStore.get('/admin/avatars');
      return response;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to fetch available avatars';
      throw new Error(errorMessage);
    }
  }

  async assignAvatarToUser(userId: string, avatarId: string): Promise<void> {
    try {
      await apiStore.post(`/admin/users/${userId}/assign-avatar`, { avatarId });

      // Refresh users list to show updated avatar
      if (this.users) {
        await this.fetchUsers(this.users.page, this.users.limit);
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to assign avatar to user';
      throw new Error(errorMessage);
    }
  }

  // Store Management Methods
  storeItems = {
    avatars: null as any,
    microphones: null as any,
    coinPackages: null as any,
  };

  async fetchStoreAvatars(page: number = 1, limit: number = 50, search?: string): Promise<void> {
    try {
      this.isLoadingTable = true;
      this.setTableError(null);

      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      if (search) {
        params.append('search', search);
      }

      const response = await apiStore.get(`/admin/store/avatars?${params}`);

      runInAction(() => {
        this.storeItems.avatars = response;
      });
    } catch (error: any) {
      console.error('Error fetching store avatars:', error);
      this.setTableError(error.response?.data?.message || 'Failed to fetch store avatars');
    } finally {
      runInAction(() => {
        this.isLoadingTable = false;
      });
    }
  }

  async fetchStoreMicrophones(
    page: number = 1,
    limit: number = 50,
    search?: string,
  ): Promise<void> {
    try {
      this.isLoadingTable = true;
      this.setTableError(null);

      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      if (search) {
        params.append('search', search);
      }

      const response = await apiStore.get(`/admin/store/microphones?${params}`);

      runInAction(() => {
        this.storeItems.microphones = response;
      });
    } catch (error: any) {
      console.error('Error fetching store microphones:', error);
      this.setTableError(error.response?.data?.message || 'Failed to fetch store microphones');
    } finally {
      runInAction(() => {
        this.isLoadingTable = false;
      });
    }
  }

  async fetchStoreCoinPackages(
    page: number = 1,
    limit: number = 50,
    search?: string,
  ): Promise<void> {
    try {
      this.isLoadingTable = true;
      this.setTableError(null);

      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      if (search) {
        params.append('search', search);
      }

      const response = await apiStore.get(`/admin/store/coin-packages?${params}`);

      runInAction(() => {
        this.storeItems.coinPackages = response;
      });
    } catch (error: any) {
      console.error('Error fetching store coin packages:', error);
      this.setTableError(error.response?.data?.message || 'Failed to fetch store coin packages');
    } finally {
      runInAction(() => {
        this.isLoadingTable = false;
      });
    }
  }

  async deleteStoreAvatar(id: string): Promise<void> {
    try {
      console.log(`🗑️ Attempting to delete avatar: ${id}`);
      const response = await apiStore.delete(`/admin/store/avatars/${id}`);
      console.log(`✅ Avatar deletion response:`, response);

      // Refresh the avatars list
      if (this.storeItems.avatars) {
        await this.fetchStoreAvatars(this.storeItems.avatars.page, this.storeItems.avatars.limit);
      }

      return response;
    } catch (error: any) {
      console.error(`❌ Error deleting avatar ${id}:`, error);
      const errorMessage = error.response?.data?.message || 'Failed to delete avatar';

      // Set error in the store for UI display
      runInAction(() => {
        this.tableError = errorMessage;
      });

      throw new Error(errorMessage);
    }
  }

  async deleteStoreMicrophone(id: string, force: boolean = false): Promise<void> {
    try {
      console.log(`🗑️ Attempting to delete microphone: ${id}${force ? ' (force)' : ''}`);
      const url = `/admin/store/microphones/${id}${force ? '?force=true' : ''}`;
      const response = await apiStore.delete(url);
      console.log(`✅ Microphone deletion response:`, response);

      // Refresh the microphones list
      if (this.storeItems.microphones) {
        await this.fetchStoreMicrophones(
          this.storeItems.microphones.page,
          this.storeItems.microphones.limit,
        );
      }

      return response;
    } catch (error: any) {
      console.error(`❌ Error deleting microphone ${id}:`, error);

      // Try to get the most specific error message available
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data ||
        error.message ||
        'Failed to delete microphone';

      // Set error in the store for UI display
      runInAction(() => {
        this.tableError = errorMessage;
      });

      throw new Error(errorMessage);
    }
  }

  async deleteStoreCoinPackage(id: string): Promise<void> {
    try {
      console.log(`🗑️ Attempting to delete coin package: ${id}`);
      const response = await apiStore.delete(`/admin/store/coin-packages/${id}`);
      console.log(`✅ Coin package deletion response:`, response);

      // Refresh the coin packages list
      if (this.storeItems.coinPackages) {
        await this.fetchStoreCoinPackages(
          this.storeItems.coinPackages.page,
          this.storeItems.coinPackages.limit,
        );
      }

      return response;
    } catch (error: any) {
      console.error(`❌ Error deleting coin package ${id}:`, error);
      const errorMessage = error.response?.data?.message || 'Failed to delete coin package';

      // Set error in the store for UI display
      runInAction(() => {
        this.tableError = errorMessage;
      });

      throw new Error(errorMessage);
    }
  }

  async updateStoreAvatar(id: string, updateData: any): Promise<void> {
    try {
      console.log(`📝 Attempting to update avatar: ${id}`, updateData);
      const response = await apiStore.put(`/admin/store/avatars/${id}`, updateData);
      console.log(`✅ Avatar update response:`, response);

      // Refresh the avatars list
      if (this.storeItems.avatars) {
        await this.fetchStoreAvatars(this.storeItems.avatars.page, this.storeItems.avatars.limit);
      }

      return response;
    } catch (error: any) {
      console.error(`❌ Error updating avatar ${id}:`, error);
      const errorMessage = error.response?.data?.message || 'Failed to update avatar';

      // Set error in the store for UI display
      runInAction(() => {
        this.tableError = errorMessage;
      });

      throw new Error(errorMessage);
    }
  }

  async updateStoreMicrophone(id: string, updateData: any): Promise<void> {
    try {
      console.log(`📝 Attempting to update microphone: ${id}`, updateData);
      const response = await apiStore.put(`/admin/store/microphones/${id}`, updateData);
      console.log(`✅ Microphone update response:`, response);

      // Refresh the microphones list
      if (this.storeItems.microphones) {
        await this.fetchStoreMicrophones(
          this.storeItems.microphones.page,
          this.storeItems.microphones.limit,
        );
      }

      return response;
    } catch (error: any) {
      console.error(`❌ Error updating microphone ${id}:`, error);
      const errorMessage = error.response?.data?.message || 'Failed to update microphone';

      // Set error in the store for UI display
      runInAction(() => {
        this.tableError = errorMessage;
      });

      throw new Error(errorMessage);
    }
  }

  async createStoreAvatar(createData: any): Promise<void> {
    try {
      console.log(`➕ Attempting to create avatar:`, createData);
      const response = await apiStore.post(`/admin/store/avatars`, createData);
      console.log(`✅ Avatar creation response:`, response);

      // Refresh the avatars list
      if (this.storeItems.avatars) {
        await this.fetchStoreAvatars(this.storeItems.avatars.page, this.storeItems.avatars.limit);
      }

      return response;
    } catch (error: any) {
      console.error(`❌ Error creating avatar:`, error);
      const errorMessage = error.response?.data?.message || 'Failed to create avatar';

      // Set error in the store for UI display
      runInAction(() => {
        this.tableError = errorMessage;
      });

      throw new Error(errorMessage);
    }
  }

  async createStoreMicrophone(createData: any): Promise<void> {
    try {
      console.log(`➕ Attempting to create microphone:`, createData);
      const response = await apiStore.post(`/admin/store/microphones`, createData);
      console.log(`✅ Microphone creation response:`, response);

      // Refresh the microphones list
      if (this.storeItems.microphones) {
        await this.fetchStoreMicrophones(
          this.storeItems.microphones.page,
          this.storeItems.microphones.limit,
        );
      }

      return response;
    } catch (error: any) {
      console.error(`❌ Error creating microphone:`, error);
      const errorMessage = error.response?.data?.message || 'Failed to create microphone';

      // Set error in the store for UI display
      runInAction(() => {
        this.tableError = errorMessage;
      });

      throw new Error(errorMessage);
    }
  }

  async createStoreCoinPackage(createData: any): Promise<void> {
    try {
      console.log(`➕ Attempting to create coin package:`, createData);
      const response = await apiStore.post(`/admin/store/coin-packages`, createData);
      console.log(`✅ Coin package creation response:`, response);

      // Refresh the coin packages list
      if (this.storeItems.coinPackages) {
        await this.fetchStoreCoinPackages(
          this.storeItems.coinPackages.page,
          this.storeItems.coinPackages.limit,
        );
      }

      return response;
    } catch (error: any) {
      console.error(`❌ Error creating coin package:`, error);
      const errorMessage = error.response?.data?.message || 'Failed to create coin package';

      // Set error in the store for UI display
      runInAction(() => {
        this.tableError = errorMessage;
      });

      throw new Error(errorMessage);
    }
  }

  async updateStoreCoinPackage(id: string, updateData: any): Promise<void> {
    try {
      console.log(`✏️ Attempting to update coin package ${id}:`, updateData);
      const response = await apiStore.put(`/admin/store/coin-packages/${id}`, updateData);
      console.log(`✅ Coin package update response:`, response);

      // Refresh the coin packages list
      if (this.storeItems.coinPackages) {
        await this.fetchStoreCoinPackages(
          this.storeItems.coinPackages.page,
          this.storeItems.coinPackages.limit,
        );
      }

      return response;
    } catch (error: any) {
      console.error(`❌ Error updating coin package ${id}:`, error);
      const errorMessage = error.response?.data?.message || 'Failed to update coin package';

      // Set error in the store for UI display
      runInAction(() => {
        this.tableError = errorMessage;
      });

      throw new Error(errorMessage);
    }
  }

  async suggestItemName(
    itemType: 'avatar' | 'microphone',
    rarity: string,
    description?: string,
  ): Promise<string[]> {
    try {
      console.log(`🤖 Requesting AI name suggestions for ${itemType} (${rarity})`);
      const response = await apiStore.post(`/admin/store/suggest-name`, {
        itemType,
        rarity,
        description,
      });
      console.log(`✅ AI suggestions response:`, response);
      return response.suggestions || [];
    } catch (error: any) {
      console.error(`❌ Error getting AI suggestions:`, error);
      // Return fallback suggestions if AI fails
      const fallbackSuggestions =
        itemType === 'avatar'
          ? ['Melody Star', 'Rhythm Knight', 'Harmony Hero']
          : ['Sound Wave', 'Echo Master', 'Vocal Pro'];
      return fallbackSuggestions;
    }
  }
}

export const adminStore = new AdminStore();
