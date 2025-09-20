import { makeAutoObservable } from 'mobx';
import { apiStore } from './ApiStore';

export interface Transaction {
  id: string;
  userId: string;
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
  user?: {
    id: string;
    name: string;
    email: string;
    coins: number;
  };
  coinPackage?: {
    id: string;
    name: string;
    description: string;
    coinAmount: number;
    priceUSD: number;
    bonusCoins: number;
  };
}

export interface TransactionStatistics {
  totalTransactions: number;
  completedTransactions: number;
  pendingTransactions: number;
  failedTransactions: number;
  totalCoinsDistributed: number;
  totalCoinsSpent: number;
  coinPurchases: number;
  microphonePurchases: number;
}

export interface UserTransactionData {
  user: {
    id: string;
    name: string;
    email: string;
    coins: number;
    createdAt: string;
    isActive: boolean;
  };
  transactions: Transaction[];
}

export interface TransactionResponse {
  data: Transaction[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

class TransactionStore {
  transactions: Transaction[] = [];
  statistics: TransactionStatistics | null = null;
  userTransactionData: UserTransactionData | null = null;
  isLoading = false;
  error: string | null = null;
  
  // Pagination and filtering
  currentPage = 1;
  totalPages = 1;
  totalTransactions = 0;
  filters = {
    search: '',
    userId: '',
    type: '',
    status: '',
    sortBy: 'createdAt',
    sortOrder: 'DESC' as 'ASC' | 'DESC',
  };

  constructor() {
    makeAutoObservable(this);
  }

  setLoading(loading: boolean) {
    this.isLoading = loading;
  }

  setError(error: string | null) {
    this.error = error;
  }

  setTransactions(data: TransactionResponse) {
    this.transactions = data.data;
    this.currentPage = data.page;
    this.totalPages = data.totalPages;
    this.totalTransactions = data.total;
  }

  setStatistics(statistics: TransactionStatistics) {
    this.statistics = statistics;
  }

  setUserTransactionData(data: UserTransactionData) {
    this.userTransactionData = data;
  }

  setFilters(filters: Partial<typeof this.filters>) {
    this.filters = { ...this.filters, ...filters };
  }

  async fetchTransactions(page = 1, limit = 25) {
    try {
      this.setLoading(true);
      this.setError(null);

      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        sortBy: this.filters.sortBy,
        sortOrder: this.filters.sortOrder,
      });

      if (this.filters.search) params.append('search', this.filters.search);
      if (this.filters.userId) params.append('userId', this.filters.userId);
      if (this.filters.type) params.append('type', this.filters.type);
      if (this.filters.status) params.append('status', this.filters.status);

      const data = await apiStore.get(`/admin/transactions?${params.toString()}`);
      this.setTransactions(data);
    } catch (error) {
      this.setError(error instanceof Error ? error.message : 'Failed to fetch transactions');
    } finally {
      this.setLoading(false);
    }
  }

  async fetchTransactionStatistics() {
    try {
      this.setError(null);
      const data = await apiStore.get('/admin/transactions/statistics');
      this.setStatistics(data);
    } catch (error) {
      this.setError(error instanceof Error ? error.message : 'Failed to fetch statistics');
    }
  }

  async fetchUserTransactions(userId: string) {
    try {
      this.setLoading(true);
      this.setError(null);

      const data = await apiStore.get(`/admin/users/${userId}/transactions`);
      this.setUserTransactionData(data);
    } catch (error) {
      this.setError(error instanceof Error ? error.message : 'Failed to fetch user transactions');
    } finally {
      this.setLoading(false);
    }
  }

  async addCoinsToUser(userId: string, amount: number, description?: string) {
    try {
      this.setLoading(true);
      this.setError(null);

      const data = await apiStore.post(`/admin/users/${userId}/add-coins`, {
        amount,
        description,
      });

      // Refresh current data
      if (this.userTransactionData?.user.id === userId) {
        await this.fetchUserTransactions(userId);
      }
      await this.fetchTransactions(this.currentPage);
      await this.fetchTransactionStatistics();

      return data;
    } catch (error) {
      this.setError(error instanceof Error ? error.message : 'Failed to add coins');
      throw error;
    } finally {
      this.setLoading(false);
    }
  }

  async updateUserCoins(userId: string, coins: number, description?: string) {
    try {
      this.setLoading(true);
      this.setError(null);

      const data = await apiStore.put(`/admin/users/${userId}/coins`, {
        coins,
        description,
      });

      // Refresh current data
      if (this.userTransactionData?.user.id === userId) {
        await this.fetchUserTransactions(userId);
      }
      await this.fetchTransactions(this.currentPage);
      await this.fetchTransactionStatistics();

      return data;
    } catch (error) {
      this.setError(error instanceof Error ? error.message : 'Failed to update coins');
      throw error;
    } finally {
      this.setLoading(false);
    }
  }

  // Helper methods
  getTransactionTypeIcon(type: string) {
    switch (type) {
      case 'coin_purchase':
        return '💰';
      case 'microphone_purchase':
        return '🎤';
      case 'reward':
        return '🎁';
      case 'refund':
        return '↩️';
      default:
        return '📄';
    }
  }

  getTransactionStatusColor(status: string) {
    switch (status) {
      case 'completed':
        return 'success';
      case 'pending':
        return 'warning';
      case 'failed':
        return 'error';
      case 'refunded':
        return 'info';
      default:
        return 'default';
    }
  }

  formatCoinAmount(amount: number) {
    return amount >= 0 ? `+${amount.toLocaleString()}` : amount.toLocaleString();
  }
}

export const transactionStore = new TransactionStore();