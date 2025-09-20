import { makeAutoObservable } from 'mobx';

// Type for the ApiStore
type ApiStoreType = {
  get: (url: string, config?: any) => Promise<any>;
  post: (url: string, data?: any, config?: any) => Promise<any>;
  put: (url: string, data?: any, config?: any) => Promise<any>;
};

export interface Transaction {
  id: string;
  userId: string;
  user: {
    id: string;
    name: string;
    email: string;
    coinBalance: number;
  };
  type: 'coin_purchase' | 'microphone_purchase' | 'reward' | 'refund';
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  coinAmount: number;
  priceUSD?: number;
  stripePaymentIntentId?: string;
  stripeSessionId?: string;
  coinPackageId?: string;
  microphoneId?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  coinPackage?: {
    id: string;
    name: string;
    coins: number;
    priceUSD: number;
  };
}

export interface TransactionStatistics {
  totalTransactions: number;
  totalRevenue: number;
  pendingTransactions: number;
  failedTransactions: number;
  completedTransactions: number;
}

export class TransactionStore {
  transactions: Transaction[] = [];
  statistics: TransactionStatistics | null = null;
  loading = false;
  error: string | null = null;

  constructor(private apiStore: ApiStoreType) {
    makeAutoObservable(this);
  }

  async fetchTransactions(filters?: {
    page?: number;
    limit?: number;
    status?: string;
    type?: string;
    userId?: string;
  }) {
    this.loading = true;
    this.error = null;

    try {
      const params = new URLSearchParams();
      if (filters?.page) params.append('page', filters.page.toString());
      if (filters?.limit) params.append('limit', filters.limit.toString());
      if (filters?.status && filters.status !== 'all') params.append('status', filters.status);
      if (filters?.type && filters.type !== 'all') params.append('type', filters.type);
      if (filters?.userId) params.append('userId', filters.userId.toString());

      const response = await this.apiStore.get(`/admin/transactions?${params.toString()}`);

      console.log('Transaction API response:', response);

      // Handle different response structures
      if (response && Array.isArray(response)) {
        // Direct array response
        this.transactions = response;
      } else if (response && response.data) {
        // Nested data structure
        if (Array.isArray(response.data)) {
          this.transactions = response.data;
        } else if (response.data.data && Array.isArray(response.data.data)) {
          // Paginated structure
          this.transactions = response.data.data;
        } else {
          this.transactions = response.data;
        }
      } else if (response) {
        // Try to use response directly
        this.transactions = response;
      } else {
        this.error = 'No data received from server';
      }
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'Unknown error occurred';
    } finally {
      this.loading = false;
    }
  }

  async fetchStatistics() {
    try {
      const response = await this.apiStore.get('/admin/transactions/statistics');

      console.log('Statistics API response:', response);

      if (response && response.data) {
        this.statistics = response.data;
      } else if (response) {
        this.statistics = response;
      }
    } catch (error) {
      console.error('Failed to fetch transaction statistics:', error);
    }
  }

  async addCoinsToUser(userId: string, amount: number, description?: string) {
    this.loading = true;
    this.error = null;

    try {
      const response = await this.apiStore.post(`/admin/users/${userId}/add-coins`, {
        amount,
        description,
      });

      if (response.success) {
        // Refresh transactions after adding coins
        await this.fetchTransactions();
        await this.fetchStatistics();
        return response;
      } else {
        this.error = response.message || 'Failed to add coins';
        throw new Error(this.error || 'Failed to add coins');
      }
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'Unknown error occurred';
      throw error;
    } finally {
      this.loading = false;
    }
  }

  async updateUserCoins(userId: string, newBalance: number, description?: string) {
    this.loading = true;
    this.error = null;

    try {
      const response = await this.apiStore.put(`/admin/users/${userId}/coins`, {
        balance: newBalance,
        description,
      });

      if (response.success) {
        // Refresh transactions after updating coins
        await this.fetchTransactions();
        await this.fetchStatistics();
        return response;
      } else {
        this.error = response.message || 'Failed to update coins';
        throw new Error(this.error || 'Failed to update coins');
      }
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'Unknown error occurred';
      throw error;
    } finally {
      this.loading = false;
    }
  }

  async getUserWithTransactions(userId: string) {
    this.loading = true;
    this.error = null;

    try {
      const response = await this.apiStore.get(`/admin/users/${userId}/transactions`);

      if (response.success && response.data) {
        return response.data;
      } else {
        this.error = response.message || 'Failed to fetch user transactions';
        throw new Error(this.error || 'Failed to fetch user transactions');
      }
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'Unknown error occurred';
      throw error;
    } finally {
      this.loading = false;
    }
  }

  async searchUsers(searchTerm: string) {
    try {
      // If no search term, get all active users for client-side fuzzy search
      const endpoint = searchTerm
        ? `/admin/users/search?q=${encodeURIComponent(searchTerm)}`
        : '/admin/users/search?q=&all=true';

      const response = await this.apiStore.get(endpoint);
      if (response.success && response.data) {
        return response.data;
      } else {
        return [];
      }
    } catch (error) {
      console.error('Failed to search users:', error);
      return [];
    }
  }

  async addRewardToUser(userId: string, amount: number, description?: string) {
    this.loading = true;
    this.error = null;

    try {
      const response = await this.apiStore.post(`/admin/users/${userId}/add-reward`, {
        amount,
        description,
      });

      if (response.success) {
        // Refresh transactions after adding reward
        await this.fetchTransactions();
        await this.fetchStatistics();
        return response;
      } else {
        this.error = response.message || 'Failed to add reward';
        throw new Error(this.error || 'Failed to add reward');
      }
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'Unknown error occurred';
      throw error;
    } finally {
      this.loading = false;
    }
  }

  clearError() {
    this.error = null;
  }

  reset() {
    this.transactions = [];
    this.statistics = null;
    this.loading = false;
    this.error = null;
  }
}
