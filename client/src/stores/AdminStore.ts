import { makeAutoObservable, runInAction } from 'mobx';
import { apiStore } from './ApiStore';

export interface AdminStatistics {
  totalUsers: number;
  activeUsers: number;
  totalVendors: number;
  totalShows: number;
  activeShows: number;
  totalDJs: number;
  totalFavorites: number;
  pendingReviews: number;
  growth: {
    newUsersLast30Days: number;
    newVendorsLast30Days: number;
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
  name?: string;
  isActive: boolean;
  createdAt: Date;
}

export interface AdminVenue {
  id: string;
  name: string;
  location?: string;
  createdAt: Date;
}

export interface AdminShow {
  id: string;
  day?: string;
  isActive: boolean;
  vendor?: AdminVenue;
  dj?: AdminDJ;
  createdAt: Date;
}

export interface AdminDJ {
  id: string;
  name: string;
  bio?: string;
  createdAt: Date;
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
  favorites: PaginatedResponse<AdminFavorite> | null = null;
  songs: PaginatedResponse<AdminSong> | null = null;
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
    const { totalVendors, growth } = this.statistics;
    if (totalVendors === 0) return '+0%';

    const percentage = Math.round((growth.newVendorsLast30Days / totalVendors) * 100);
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

  async fetchUsers(page = 1, limit = 10, search?: string): Promise<void> {
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

      const response = await apiStore.get(`/admin/users?${params.toString()}`);

      runInAction(() => {
        this.users = {
          ...response,
          items: response.items.map((user: any) => ({
            ...user,
            createdAt: new Date(user.createdAt),
          })),
        };
      });
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to fetch users';
      this.setTableError(errorMessage);
    } finally {
      this.setTableLoading(false);
    }
  }

  async fetchVenues(page = 1, limit = 10, search?: string): Promise<void> {
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
      const errorMessage = error.response?.data?.message || 'Failed to fetch venues';
      this.setTableError(errorMessage);
    } finally {
      this.setTableLoading(false);
    }
  }

  async fetchShows(page = 1, limit = 10, search?: string): Promise<void> {
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
      const errorMessage = error.response?.data?.message || 'Failed to fetch shows';
      this.setTableError(errorMessage);
    } finally {
      this.setTableLoading(false);
    }
  }

  async fetchDjs(page = 1, limit = 10, search?: string): Promise<void> {
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
      const errorMessage = error.response?.data?.message || 'Failed to fetch DJs';
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
      const errorMessage = error.response?.data?.message || 'Failed to fetch songs';
      this.setTableError(errorMessage);
    } finally {
      this.setTableLoading(false);
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
}

export const adminStore = new AdminStore();
