import AsyncStorage from '@react-native-async-storage/async-storage';
import { makeAutoObservable, runInAction } from 'mobx';
import { makePersistable } from 'mobx-persist-store';
import apiService from '../services/ApiService';
import { FriendRequest, Friendship, User } from '../types';

export class FriendsStore {
  friends: Friendship[] = [];
  friendRequests: FriendRequest[] = [];
  searchResults: User[] = [];
  isLoadingFriends = false;
  isLoadingRequests = false;
  isSearching = false;
  friendsError: string | null = null;
  requestsError: string | null = null;
  searchError: string | null = null;

  constructor() {
    makeAutoObservable(this);

    makePersistable(this, {
      name: 'FriendsStore',
      properties: ['friends', 'friendRequests'],
      storage: AsyncStorage,
    });
  }

  // Loading states
  setLoadingFriends(loading: boolean) {
    this.isLoadingFriends = loading;
  }

  setLoadingRequests(loading: boolean) {
    this.isLoadingRequests = loading;
  }

  setSearching(searching: boolean) {
    this.isSearching = searching;
  }

  // Error states
  setFriendsError(error: string | null) {
    this.friendsError = error;
  }

  setRequestsError(error: string | null) {
    this.requestsError = error;
  }

  setSearchError(error: string | null) {
    this.searchError = error;
  }

  // Data setters
  setFriends(friends: Friendship[]) {
    this.friends = friends;
  }

  setFriendRequests(requests: FriendRequest[]) {
    this.friendRequests = requests;
  }

  setSearchResults(results: User[]) {
    this.searchResults = results;
  }

  // API Methods
  async fetchFriends() {
    try {
      this.setLoadingFriends(true);
      this.setFriendsError(null);

      const response = await apiService.getFriends();

      if (response.success && response.data) {
        runInAction(() => {
          this.friends = response.data!;
        });
      } else {
        this.setFriendsError(response.error || 'Failed to fetch friends');
      }
    } catch (error: any) {
      this.setFriendsError(error.message || 'Failed to fetch friends');
      console.error('Error fetching friends:', error);
    } finally {
      this.setLoadingFriends(false);
    }
  }

  async fetchFriendRequests() {
    try {
      this.setLoadingRequests(true);
      this.setRequestsError(null);

      const response = await apiService.getFriendRequests();

      if (response.success && response.data) {
        runInAction(() => {
          this.friendRequests = response.data!;
        });
      } else {
        this.setRequestsError(response.error || 'Failed to fetch friend requests');
      }
    } catch (error: any) {
      this.setRequestsError(error.message || 'Failed to fetch friend requests');
      console.error('Error fetching friend requests:', error);
    } finally {
      this.setLoadingRequests(false);
    }
  }

  async searchUsers(query: string) {
    if (!query.trim()) {
      this.setSearchResults([]);
      return;
    }

    try {
      this.setSearching(true);
      this.setSearchError(null);

      const response = await apiService.searchUsers(query);

      if (response.success && response.data) {
        runInAction(() => {
          this.searchResults = response.data!;
        });
      } else {
        this.setSearchError(response.error || 'Failed to search users');
      }
    } catch (error: any) {
      this.setSearchError(error.message || 'Failed to search users');
      console.error('Error searching users:', error);
    } finally {
      this.setSearching(false);
    }
  }

  async sendFriendRequest(userId: string) {
    try {
      const response = await apiService.sendFriendRequest(userId);

      if (response.success && response.data) {
        runInAction(() => {
          this.friendRequests.push(response.data!);
        });
        return true;
      } else {
        console.error('Failed to send friend request:', response.error);
        return false;
      }
    } catch (error: any) {
      console.error('Error sending friend request:', error);
      return false;
    }
  }

  async respondToFriendRequest(requestId: string, accept: boolean) {
    try {
      const response = await apiService.respondToFriendRequest(requestId, accept);

      if (response.success) {
        runInAction(() => {
          // Remove the request from the list
          this.friendRequests = this.friendRequests.filter((req) => req.id !== requestId);

          // If accepted, refresh friends list
          if (accept) {
            this.fetchFriends();
          }
        });
        return true;
      } else {
        console.error('Failed to respond to friend request:', response.error);
        return false;
      }
    } catch (error: any) {
      console.error('Error responding to friend request:', error);
      return false;
    }
  }

  async removeFriend(friendshipId: string) {
    try {
      const response = await apiService.removeFriend(friendshipId);

      if (response.success) {
        runInAction(() => {
          this.friends = this.friends.filter((friendship) => friendship.id !== friendshipId);
        });
        return true;
      } else {
        console.error('Failed to remove friend:', response.error);
        return false;
      }
    } catch (error: any) {
      console.error('Error removing friend:', error);
      return false;
    }
  }

  // Computed properties
  get pendingRequests() {
    return this.friendRequests.filter((req) => req.status === 'pending');
  }

  get sentRequests() {
    return this.friendRequests.filter((req) => req.status === 'pending');
  }

  get friendsCount() {
    return this.friends.length;
  }

  get pendingRequestsCount() {
    return this.pendingRequests.length;
  }

  // Helper methods
  isFriend(userId: string) {
    return this.friends.some(
      (friendship) => friendship.user1Id === userId || friendship.user2Id === userId,
    );
  }

  hasPendingRequest(userId: string) {
    return this.friendRequests.some(
      (req) => req.status === 'pending' && (req.senderId === userId || req.receiverId === userId),
    );
  }

  getFriendData(friendship: Friendship, currentUserId: string) {
    // Return the friend's user data (not the current user's)
    if (friendship.user1Id === currentUserId) {
      return friendship.user2;
    } else {
      return friendship.user1;
    }
  }

  clearSearchResults() {
    this.searchResults = [];
    this.searchError = null;
  }

  // Cleanup
  clearData() {
    this.friends = [];
    this.friendRequests = [];
    this.searchResults = [];
    this.friendsError = null;
    this.requestsError = null;
    this.searchError = null;
  }
}
