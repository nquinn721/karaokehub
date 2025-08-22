import { makeAutoObservable, runInAction } from 'mobx';
import { apiStore } from './ApiStore';

export interface Friend {
  id: string;
  email: string;
  name: string;
  stageName?: string;
  avatar?: string;
  friendedAt: string;
}

export interface FriendRequest {
  id: string;
  requester: {
    id: string;
    email: string;
    name: string;
    stageName?: string;
    avatar?: string;
  };
  recipient: {
    id: string;
    email: string;
    name: string;
    stageName?: string;
    avatar?: string;
  };
  message?: string;
  createdAt: string;
}

export interface UserSearchResult {
  id: string;
  email: string;
  name: string;
  stageName?: string;
  avatar?: string;
}

export interface FriendsStats {
  friendsCount: number;
  pendingRequestsCount: number;
}

class FriendsStore {
  friends: Friend[] = [];
  pendingRequests: FriendRequest[] = [];
  sentRequests: FriendRequest[] = [];
  searchResults: UserSearchResult[] = [];
  stats: FriendsStats = { friendsCount: 0, pendingRequestsCount: 0 };
  loading = false;
  searchLoading = false;
  error: string | null = null;

  constructor() {
    makeAutoObservable(this);
  }

  // Search for users
  async searchUsers(query: string) {
    if (!query || query.length < 2) {
      runInAction(() => {
        this.searchResults = [];
      });
      return;
    }

    this.searchLoading = true;
    this.error = null;

    try {
      const response = await apiStore.get('/friends/search', { params: { query, limit: 10 } });

      runInAction(() => {
        this.searchResults = response.data;
        this.searchLoading = false;
      });
    } catch (error: any) {
      runInAction(() => {
        this.error = error.response?.data?.message || 'Failed to search users';
        this.searchLoading = false;
        this.searchResults = [];
      });
    }
  }

  // Send friend request
  async sendFriendRequest(recipientId: string, message?: string) {
    this.loading = true;
    this.error = null;

    try {
      await apiStore.post('/friends/request', { recipientId, message });

      // Remove from search results since request is sent
      runInAction(() => {
        this.searchResults = this.searchResults.filter((user) => user.id !== recipientId);
        this.loading = false;
      });

      // Refresh sent requests and stats
      await this.fetchSentRequests();
      await this.fetchStats();

      return { success: true };
    } catch (error: any) {
      runInAction(() => {
        this.error = error.response?.data?.message || 'Failed to send friend request';
        this.loading = false;
      });
      return { success: false, error: this.error };
    }
  }

  // Accept friend request
  async acceptFriendRequest(requestId: string) {
    this.loading = true;
    this.error = null;

    try {
      await apiStore.put(`/friends/requests/${requestId}/accept`);

      // Refresh all data
      await Promise.all([this.fetchFriends(), this.fetchPendingRequests(), this.fetchStats()]);

      runInAction(() => {
        this.loading = false;
      });

      return { success: true };
    } catch (error: any) {
      runInAction(() => {
        this.error = error.response?.data?.message || 'Failed to accept friend request';
        this.loading = false;
      });
      return { success: false, error: this.error };
    }
  }

  // Decline friend request
  async declineFriendRequest(requestId: string) {
    this.loading = true;
    this.error = null;

    try {
      await apiStore.put(`/friends/requests/${requestId}/decline`);

      // Refresh pending requests and stats
      await Promise.all([this.fetchPendingRequests(), this.fetchStats()]);

      runInAction(() => {
        this.loading = false;
      });

      return { success: true };
    } catch (error: any) {
      runInAction(() => {
        this.error = error.response?.data?.message || 'Failed to decline friend request';
        this.loading = false;
      });
      return { success: false, error: this.error };
    }
  }

  // Remove friend
  async removeFriend(friendId: string) {
    this.loading = true;
    this.error = null;

    try {
      await apiStore.delete(`/friends/${friendId}`);

      // Refresh friends and stats
      await Promise.all([this.fetchFriends(), this.fetchStats()]);

      runInAction(() => {
        this.loading = false;
      });

      return { success: true };
    } catch (error: any) {
      runInAction(() => {
        this.error = error.response?.data?.message || 'Failed to remove friend';
        this.loading = false;
      });
      return { success: false, error: this.error };
    }
  }

  // Fetch friends list
  async fetchFriends() {
    this.loading = true;
    this.error = null;

    try {
      const response = await apiStore.get('/friends');

      runInAction(() => {
        this.friends = response.data;
        this.loading = false;
      });
    } catch (error: any) {
      runInAction(() => {
        this.error = error.response?.data?.message || 'Failed to fetch friends';
        this.loading = false;
      });
    }
  }

  // Fetch pending friend requests
  async fetchPendingRequests() {
    try {
      const response = await apiStore.get('/friends/requests/pending');

      runInAction(() => {
        this.pendingRequests = response.data;
      });
    } catch (error: any) {
      runInAction(() => {
        this.error = error.response?.data?.message || 'Failed to fetch pending requests';
      });
    }
  }

  // Fetch sent friend requests
  async fetchSentRequests() {
    try {
      const response = await apiStore.get('/friends/requests/sent');

      runInAction(() => {
        this.sentRequests = response.data;
      });
    } catch (error: any) {
      runInAction(() => {
        this.error = error.response?.data?.message || 'Failed to fetch sent requests';
      });
    }
  }

  // Fetch friends stats
  async fetchStats() {
    try {
      const response = await apiStore.get('/friends/stats');

      runInAction(() => {
        this.stats = response.data;
      });
    } catch (error: any) {
      console.error('Failed to fetch friends stats:', error);
    }
  }

  // Load all friends data
  async loadAllData() {
    this.loading = true;
    this.error = null;

    try {
      await Promise.all([
        this.fetchFriends(),
        this.fetchPendingRequests(),
        this.fetchSentRequests(),
        this.fetchStats(),
      ]);
    } catch (error) {
      console.error('Failed to load friends data:', error);
    } finally {
      runInAction(() => {
        this.loading = false;
      });
    }
  }

  // Clear search results
  clearSearchResults() {
    this.searchResults = [];
  }

  // Clear error
  clearError() {
    this.error = null;
  }

  // Get friend by ID
  getFriendById(id: string): Friend | undefined {
    return this.friends.find((friend) => friend.id === id);
  }

  // Check if user is a friend
  isFriend(userId: string): boolean {
    return this.friends.some((friend) => friend.id === userId);
  }

  // Check if there's a pending request to this user
  hasPendingRequestTo(userId: string): boolean {
    return this.sentRequests.some((request) => request.recipient.id === userId);
  }

  // Check if there's a pending request from this user
  hasPendingRequestFrom(userId: string): boolean {
    return this.pendingRequests.some((request) => request.requester.id === userId);
  }
}

export const friendsStore = new FriendsStore();
export { FriendsStore };
