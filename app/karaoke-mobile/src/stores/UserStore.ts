import AsyncStorage from '@react-native-async-storage/async-storage';
import { makeAutoObservable, runInAction } from 'mobx';
import { makePersistable } from 'mobx-persist-store';
import apiService from '../services/ApiService';
import { User, UserSettings } from '../types';

export class UserStore {
  currentUser: User | null = null;
  settings: UserSettings = {
    notifications: {
      showReminders: true,
      friendRequests: true,
      newShows: true,
    },
    privacy: {
      profileVisibility: 'public',
      showFavorites: true,
    },
    preferences: {
      favoriteGenres: [],
    },
  };
  isLoading = false;
  error: string | null = null;

  constructor() {
    makeAutoObservable(this);

    makePersistable(this, {
      name: 'UserStore',
      properties: ['currentUser', 'settings'],
      storage: AsyncStorage,
    });
  }

  setCurrentUser(user: User | null) {
    this.currentUser = user;
  }

  setSettings(settings: Partial<UserSettings>) {
    this.settings = { ...this.settings, ...settings };
  }

  setLoading(loading: boolean) {
    this.isLoading = loading;
  }

  setError(error: string | null) {
    this.error = error;
  }

  // API Methods
  async fetchCurrentUser() {
    try {
      this.setLoading(true);
      this.setError(null);

      const response = await apiService.getCurrentUser();

      if (response.success && response.data) {
        runInAction(() => {
          this.currentUser = response.data!;
        });
      } else {
        this.setError(response.error || 'Failed to fetch user data');
      }
    } catch (error: any) {
      this.setError(error.message || 'Failed to fetch user data');
      console.error('Error fetching current user:', error);
    } finally {
      this.setLoading(false);
    }
  }

  async updateProfile(data: Partial<User>) {
    try {
      this.setLoading(true);
      this.setError(null);

      const response = await apiService.updateProfile(data);

      if (response.success && response.data) {
        runInAction(() => {
          this.currentUser = response.data!;
        });
        return true;
      } else {
        this.setError(response.error || 'Failed to update profile');
        return false;
      }
    } catch (error: any) {
      this.setError(error.message || 'Failed to update profile');
      console.error('Error updating profile:', error);
      return false;
    } finally {
      this.setLoading(false);
    }
  }

  async uploadProfilePicture(imageUri: string) {
    try {
      this.setLoading(true);
      this.setError(null);

      const response = await apiService.uploadProfilePicture(imageUri);

      if (response.success && response.data) {
        runInAction(() => {
          if (this.currentUser) {
            this.currentUser.profilePicture = response.data!.url;
          }
        });
        return response.data.url;
      } else {
        this.setError(response.error || 'Failed to upload profile picture');
        return null;
      }
    } catch (error: any) {
      this.setError(error.message || 'Failed to upload profile picture');
      console.error('Error uploading profile picture:', error);
      return null;
    } finally {
      this.setLoading(false);
    }
  }

  // Settings methods
  updateNotificationSettings(notifications: Partial<UserSettings['notifications']>) {
    this.settings.notifications = { ...this.settings.notifications, ...notifications };
  }

  updatePrivacySettings(privacy: Partial<UserSettings['privacy']>) {
    this.settings.privacy = { ...this.settings.privacy, ...privacy };
  }

  updatePreferences(preferences: Partial<UserSettings['preferences']>) {
    this.settings.preferences = { ...this.settings.preferences, ...preferences };
  }

  addFavoriteGenre(genre: string) {
    if (!this.settings.preferences.favoriteGenres.includes(genre)) {
      this.settings.preferences.favoriteGenres.push(genre);
    }
  }

  removeFavoriteGenre(genre: string) {
    this.settings.preferences.favoriteGenres = this.settings.preferences.favoriteGenres.filter(
      (g) => g !== genre,
    );
  }

  // Computed properties
  get isLoggedIn() {
    return !!this.currentUser;
  }

  get userDisplayName() {
    if (!this.currentUser) return 'Guest';

    if (this.currentUser.stageName) {
      return this.currentUser.stageName;
    }

    return `${this.currentUser.firstName} ${this.currentUser.lastName}`.trim();
  }

  get userInitials() {
    if (!this.currentUser) return 'GU';

    const firstName = this.currentUser.firstName || '';
    const lastName = this.currentUser.lastName || '';

    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  }

  // Cleanup
  clearUserData() {
    this.currentUser = null;
    this.settings = {
      notifications: {
        showReminders: true,
        friendRequests: true,
        newShows: true,
      },
      privacy: {
        profileVisibility: 'public',
        showFavorites: true,
      },
      preferences: {
        favoriteGenres: [],
      },
    };
    this.error = null;
  }
}
