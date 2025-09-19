import { makeAutoObservable, runInAction } from 'mobx';
import { apiStore } from './ApiStore';

export interface UserAvatar {
  id: string;
  baseAvatarId: string;
  microphoneId?: string;
  outfitId?: string;
  shoesId?: string;
}

export interface Microphone {
  id: string;
  name: string;
  description: string;
  type: string;
  rarity: string;
  imageUrl: string;
  price: number;
  coinPrice: number;
  isAvailable: boolean;
}

export interface UserMicrophone {
  id: string;
  userId: string;
  microphoneId: string;
  isEquipped: boolean;
  acquiredAt: string;
  microphone: Microphone;
}

export interface Avatar {
  id: string;
  name: string;
  description: string;
  type: string;
  rarity: string;
  imageUrl: string;
  price: number;
  coinPrice: number;
  isAvailable: boolean;
}

export interface UserAvatarOwnership {
  id: string;
  userId: string;
  avatarId: string;
  isEquipped: boolean;
  acquiredAt: string;
  avatar: Avatar;
}

export interface User {
  id: string;
  email: string;
  name: string;
  stageName?: string;
  avatar?: string; // Keep for backward compatibility
  userAvatar?: UserAvatar; // New avatar system
  isActive: boolean;
  isAdmin: boolean;
  // New ownership pattern fields
  equippedAvatarId?: string;
  equippedMicrophoneId?: string;
  equippedAvatar?: Avatar;
  equippedMicrophone?: Microphone;
  coins?: number;
}

export interface UpdateAvatarRequest {
  baseAvatarId: string;
  microphoneId?: string;
  outfitId?: string;
  shoesId?: string;
}

export class UserStore {
  currentUser: User | null = null;
  userMicrophones: UserMicrophone[] = [];
  userAvatars: UserAvatarOwnership[] = [];
  isLoading = false;
  isMicrophonesLoading = false;
  isAvatarsLoading = false;
  error: string | null = null;

  constructor() {
    makeAutoObservable(this);
  }

  // Helper to get avatar URL from userAvatar data
  getAvatarUrl(user: User | null): string {
    if (!user) return '/images/avatar/avatar_1.png'; // Default avatar

    // If user has new userAvatar system data, use it
    if (user.userAvatar?.baseAvatarId) {
      return `/images/avatar/${user.userAvatar.baseAvatarId}.png`;
    }

    // Fallback to old avatar field if it exists
    if (user.avatar) {
      return user.avatar;
    }

    // Default avatar
    return '/images/avatar/avatar_1.png';
  }

  private clearError() {
    this.error = null;
  }

  private setError(error: string) {
    this.error = error;
  }

  private setLoading(loading: boolean) {
    this.isLoading = loading;
  }

  // Get current user based on token
  async getCurrentUser(): Promise<User | null> {
    this.clearError();
    this.setLoading(true);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Decode token to get user ID
      const payload = JSON.parse(atob(token.split('.')[1]));
      const userId = payload.sub || payload.id || payload.userId;

      if (!userId) {
        throw new Error('User ID not found in token');
      }

      const user = await apiStore.get<User>(`/users/${userId}`);

      runInAction(() => {
        this.currentUser = user;
        this.setLoading(false);
      });

      return user;
    } catch (error: any) {
      console.error('Failed to get current user:', error);
      runInAction(() => {
        this.setError(error.message || 'Failed to get current user');
        this.setLoading(false);
        this.currentUser = null;
      });
      return null;
    }
  }

  // Get user by ID
  async getUser(userId: string): Promise<User | null> {
    this.clearError();
    this.setLoading(true);

    try {
      const user = await apiStore.get<User>(`/users/${userId}`);

      runInAction(() => {
        this.setLoading(false);
      });

      return user;
    } catch (error: any) {
      console.error('Failed to get user:', error);
      runInAction(() => {
        this.setError(error.message || 'Failed to get user');
        this.setLoading(false);
      });
      return null;
    }
  }

  // Update user avatar using the new avatar system
  async updateAvatar(avatarData: {
    baseAvatarId: string;
    microphoneId?: string;
    outfitId?: string;
    shoesId?: string;
  }): Promise<any> {
    this.clearError();
    this.setLoading(true);

    try {
      const result = await apiStore.put('/avatar/my-avatar', avatarData);

      runInAction(() => {
        this.setLoading(false);
      });

      return result;
    } catch (error: any) {
      console.error('Failed to update avatar:', error);
      runInAction(() => {
        this.setError(error.message || 'Failed to update avatar');
        this.setLoading(false);
      });
      return null;
    }
  }

  // Get user's microphones
  async getUserMicrophones(): Promise<UserMicrophone[]> {
    console.log('🔊 UserStore: getUserMicrophones called');
    this.clearError();
    this.isMicrophonesLoading = true;

    try {
      console.log('🔊 UserStore: Making API call to /avatar/my-microphones');
      const microphones = await apiStore.get<UserMicrophone[]>('/avatar/my-microphones');
      console.log('🔊 UserStore: API call successful, received:', microphones);
      console.log('🔊 UserStore: Microphones count:', microphones?.length || 0);

      runInAction(() => {
        this.userMicrophones = microphones;
        this.isMicrophonesLoading = false;
      });

      return microphones;
    } catch (error: any) {
      console.error('🔊 UserStore: Failed to get user microphones:', error);
      console.error('🔊 UserStore: Error details:', {
        message: error.message,
        status: error.status,
        response: error.response,
      });

      runInAction(() => {
        this.setError(error.message || 'Failed to get microphones');
        this.isMicrophonesLoading = false;
        this.userMicrophones = [];
      });
      return [];
    }
  }

  // Update equipped microphone
  async updateEquippedMicrophone(microphoneId: string): Promise<boolean> {
    this.clearError();
    this.setLoading(true);

    try {
      await apiStore.put(`/avatar/my-microphone/${microphoneId}`, {});

      // Refresh current user to get updated equipped microphone data
      await this.getCurrentUser();

      // Update local state
      runInAction(() => {
        this.userMicrophones = this.userMicrophones.map((um) => ({
          ...um,
          isEquipped: um.microphoneId === microphoneId,
        }));
        this.setLoading(false);
      });

      return true;
    } catch (error: any) {
      console.error('Failed to update equipped microphone:', error);
      runInAction(() => {
        this.setError(error.message || 'Failed to update microphone');
        this.setLoading(false);
      });
      return false;
    }
  }

  // Get currently equipped microphone
  getEquippedMicrophone(): UserMicrophone | null {
    // First try to use the new pattern from currentUser
    if (this.currentUser?.equippedMicrophone && this.currentUser?.equippedMicrophoneId) {
      // Create a UserMicrophone-like object from the equipped microphone
      return {
        id: `equipped_${this.currentUser.equippedMicrophoneId}`,
        userId: this.currentUser.id,
        microphoneId: this.currentUser.equippedMicrophoneId,
        isEquipped: true,
        acquiredAt: new Date().toISOString(),
        microphone: this.currentUser.equippedMicrophone,
      };
    }

    // Fallback to old pattern for compatibility
    return this.userMicrophones.find((um) => um.isEquipped) || null;
  }

  // Get user's avatars
  async getUserAvatars(): Promise<UserAvatarOwnership[]> {
    console.log('🎭 UserStore: getUserAvatars called');
    this.clearError();
    this.isAvatarsLoading = true;

    try {
      console.log('🎭 UserStore: Making API call to /avatar/my-avatars');
      const avatars = await apiStore.get<UserAvatarOwnership[]>('/avatar/my-avatars');
      console.log('🎭 UserStore: API call successful, received:', avatars);
      console.log('🎭 UserStore: Avatars count:', avatars?.length || 0);

      runInAction(() => {
        this.userAvatars = avatars;
        this.isAvatarsLoading = false;
      });

      return avatars;
    } catch (error: any) {
      console.error('🎭 UserStore: Failed to get user avatars:', error);
      console.error('🎭 UserStore: Error details:', {
        message: error.message,
        status: error.status,
        response: error.response,
      });

      runInAction(() => {
        this.setError(error.message || 'Failed to get avatars');
        this.isAvatarsLoading = false;
        this.userAvatars = [];
      });
      return [];
    }
  }

  // Update equipped avatar
  async updateEquippedAvatar(avatarId: string): Promise<boolean> {
    this.clearError();
    this.setLoading(true);

    try {
      await apiStore.put(`/avatar/my-avatar-selection/${avatarId}`, {});

      // Refresh current user to get updated equipped avatar data
      await this.getCurrentUser();

      // Update local state
      runInAction(() => {
        this.userAvatars = this.userAvatars.map((ua) => ({
          ...ua,
          isEquipped: ua.avatarId === avatarId,
        }));
        this.setLoading(false);
      });

      return true;
    } catch (error: any) {
      console.error('Failed to update equipped avatar:', error);
      runInAction(() => {
        this.setError(error.message || 'Failed to update avatar');
        this.setLoading(false);
      });
      return false;
    }
  }

  // Get currently equipped avatar
  getEquippedAvatar(): UserAvatarOwnership | null {
    // First try to use the new pattern from currentUser
    if (this.currentUser?.equippedAvatar && this.currentUser?.equippedAvatarId) {
      // Create a UserAvatarOwnership-like object from the equipped avatar
      return {
        id: `equipped_${this.currentUser.equippedAvatarId}`,
        userId: this.currentUser.id,
        avatarId: this.currentUser.equippedAvatarId,
        isEquipped: true,
        acquiredAt: new Date().toISOString(),
        avatar: this.currentUser.equippedAvatar,
      };
    }

    // Fallback to old pattern for compatibility
    return this.userAvatars.find((ua) => ua.isEquipped) || null;
  }

  // Clear current user (for logout)
  clearCurrentUser() {
    runInAction(() => {
      this.currentUser = null;
      this.userMicrophones = [];
      this.userAvatars = [];
      this.error = null;
    });
  }

  // Get available avatars for selection (free + owned)
  async getAvailableAvatars(): Promise<Avatar[]> {
    console.log('🎭 UserStore: getAvailableAvatars called');
    this.clearError();
    this.isAvatarsLoading = true;

    try {
      console.log('🎭 UserStore: Making API call to /avatar/available-avatars');
      const avatars = await apiStore.get<Avatar[]>('/avatar/available-avatars');
      console.log('🎭 UserStore: API call successful, received avatars:', avatars);
      console.log('🎭 UserStore: Available avatars count:', avatars?.length || 0);

      runInAction(() => {
        this.isAvatarsLoading = false;
      });

      return avatars;
    } catch (error: any) {
      console.error('🎭 UserStore: Failed to get available avatars:', error);
      console.error('🎭 UserStore: Error details:', {
        message: error.message,
        status: error.status,
        response: error.response,
      });

      runInAction(() => {
        this.setError(error.message || 'Failed to get available avatars');
        this.isAvatarsLoading = false;
      });

      return [];
    }
  }

  // Get available microphones for selection (free + owned)
  async getAvailableMicrophones(): Promise<Microphone[]> {
    console.log('🎤 UserStore: getAvailableMicrophones called');
    this.clearError();
    this.isMicrophonesLoading = true;

    try {
      console.log('🎤 UserStore: Making API call to /avatar/available-microphones');
      const microphones = await apiStore.get<Microphone[]>('/avatar/available-microphones');
      console.log('🎤 UserStore: API call successful, received microphones:', microphones);
      console.log('🎤 UserStore: Available microphones count:', microphones?.length || 0);

      runInAction(() => {
        this.isMicrophonesLoading = false;
      });

      return microphones;
    } catch (error: any) {
      console.error('🎤 UserStore: Failed to get available microphones:', error);
      console.error('🎤 UserStore: Error details:', {
        message: error.message,
        status: error.status,
        response: error.response,
      });

      runInAction(() => {
        this.setError(error.message || 'Failed to get available microphones');
        this.isMicrophonesLoading = false;
      });

      return [];
    }
  }
}

// Create singleton instance
export const userStore = new UserStore();
