import { makeAutoObservable } from 'mobx';
import { apiService } from '../services/ApiService';

export interface CoinPackage {
  id: string;
  name: string;
  description: string;
  coinAmount: number;
  priceUSD: number;
  bonusCoins: number;
  isActive: boolean;
  sortOrder: number;
}

export interface Microphone {
  id: string;
  name: string;
  description?: string;
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
  description?: string;
  type: string;
  rarity: string;
  imageUrl: string;
  coinPrice: number;
  isFree: boolean;
  isAvailable: boolean;
}

export interface UserAvatar {
  id: string;
  userId: string;
  avatarId: string;
  acquiredAt: string;
  avatar: Avatar;
}

class StoreStore {
  coins: number = 0;
  coinPackages: CoinPackage[] = [];
  storeMicrophones: Microphone[] = [];
  userMicrophones: UserMicrophone[] = [];
  storeAvatars: Avatar[] = [];
  userAvatars: UserAvatar[] = [];
  isLoading: boolean = false;
  error: string | null = null;

  constructor() {
    makeAutoObservable(this);
  }

  setCoins(coins: number) {
    this.coins = coins;
  }

  setCoinPackages(packages: CoinPackage[]) {
    this.coinPackages = packages;
  }

  setStoreMicrophones(microphones: Microphone[]) {
    this.storeMicrophones = microphones;
  }

  setUserMicrophones(microphones: UserMicrophone[]) {
    this.userMicrophones = microphones;
  }

  setStoreAvatars(avatars: Avatar[]) {
    this.storeAvatars = avatars;
  }

  setUserAvatars(avatars: UserAvatar[]) {
    this.userAvatars = avatars;
  }

  setLoading(loading: boolean) {
    this.isLoading = loading;
  }

  setError(error: string | null) {
    this.error = error;
  }

  async fetchUserCoins(): Promise<void> {
    try {
      this.setLoading(true);
      this.setError(null);

      console.log('📱 Fetching user coins from:', apiService.endpoints.store.myCoins);
      const data = await apiService.get(apiService.endpoints.store.myCoins);
      console.log('💰 User coins response:', data);
      this.setCoins(data.coins);
    } catch (error: any) {
      console.error('❌ Failed to fetch user coins:', error);
      this.setError(error.message || 'Failed to fetch coins');
    } finally {
      this.setLoading(false);
    }
  }

  async fetchCoinPackages(): Promise<void> {
    try {
      this.setLoading(true);
      this.setError(null);

      console.log('📦 Fetching coin packages from:', apiService.endpoints.store.coinPackages);
      const data = await apiService.get(apiService.endpoints.store.coinPackages);
      console.log('💎 Coin packages response:', data);
      this.setCoinPackages(data);
    } catch (error: any) {
      console.error('❌ Failed to fetch coin packages:', error);
      this.setError(error.message || 'Failed to fetch coin packages');
    } finally {
      this.setLoading(false);
    }
  }

  async fetchStoreMicrophones(): Promise<void> {
    try {
      this.setLoading(true);
      this.setError(null);

      const data = await apiService.get(apiService.endpoints.store.microphones);
      this.setStoreMicrophones(data);
    } catch (error: any) {
      console.error('Failed to fetch store microphones:', error);
      this.setError(error.message || 'Failed to fetch microphones');
    } finally {
      this.setLoading(false);
    }
  }

  async fetchUserMicrophones(): Promise<void> {
    try {
      this.setLoading(true);
      this.setError(null);

      const data = await apiService.get(apiService.endpoints.store.myMicrophones);
      this.setUserMicrophones(data);
    } catch (error: any) {
      console.error('Failed to fetch user microphones:', error);
      this.setError(error.message || 'Failed to fetch user microphones');
    } finally {
      this.setLoading(false);
    }
  }

  async fetchStoreAvatars(): Promise<void> {
    try {
      this.setLoading(true);
      this.setError(null);

      const data = await apiService.get(apiService.endpoints.store.avatars);
      this.setStoreAvatars(data);
    } catch (error: any) {
      console.error('Failed to fetch store avatars:', error);
      this.setError(error.message || 'Failed to fetch avatars');
    } finally {
      this.setLoading(false);
    }
  }

  async fetchUserAvatars(): Promise<void> {
    try {
      this.setLoading(true);
      this.setError(null);

      const data = await apiService.get(apiService.endpoints.store.myAvatars);
      this.setUserAvatars(data);
    } catch (error: any) {
      console.error('Failed to fetch user avatars:', error);
      this.setError(error.message || 'Failed to fetch user avatars');
    } finally {
      this.setLoading(false);
    }
  }
}

export const storeStore = new StoreStore();
