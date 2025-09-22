import { makeAutoObservable } from 'mobx';
import { apiStore } from './ApiStore';

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

      const data = await apiStore.get('/store/my-coins');
      this.setCoins(data.coins);
    } catch (error) {
      this.setError(error instanceof Error ? error.message : 'Failed to fetch coins');
    } finally {
      this.setLoading(false);
    }
  }

  async fetchCoinPackages(): Promise<void> {
    try {
      this.setLoading(true);
      this.setError(null);

      const data = await apiStore.get('/store/coin-packages');
      this.setCoinPackages(data);
    } catch (error) {
      this.setError(error instanceof Error ? error.message : 'Failed to fetch coin packages');
    } finally {
      this.setLoading(false);
    }
  }

  async fetchStoreMicrophones(): Promise<void> {
    try {
      this.setLoading(true);
      this.setError(null);

      const data = await apiStore.get('/store/microphones');
      this.setStoreMicrophones(data);
    } catch (error) {
      this.setError(error instanceof Error ? error.message : 'Failed to fetch store microphones');
    } finally {
      this.setLoading(false);
    }
  }

  async fetchUserMicrophones(): Promise<void> {
    try {
      this.setLoading(true);
      this.setError(null);

      const data = await apiStore.get('/store/my-microphones');
      this.setUserMicrophones(data);
    } catch (error) {
      this.setError(error instanceof Error ? error.message : 'Failed to fetch user microphones');
    } finally {
      this.setLoading(false);
    }
  }

  async purchaseCoinPackage(packageId: string): Promise<{
    checkoutUrl?: string;
    sessionId?: string;
    transactionId?: string;
    hasPaymentMethods?: boolean;
    clientSecret?: string;
    status?: string;
  } | null> {
    try {
      this.setLoading(true);
      this.setError(null);

      const data = await apiStore.post('/store/purchase-coins', { coinPackageId: packageId });
      return data;
    } catch (error) {
      this.setError(error instanceof Error ? error.message : 'Failed to purchase coin package');
      return null;
    } finally {
      this.setLoading(false);
    }
  }

  async processPaymentSuccess(transactionId: string): Promise<boolean> {
    try {
      this.setLoading(true);
      this.setError(null);

      const data = await apiStore.post('/store/purchase-coins/success', {
        transactionId,
        stripePaymentIntentId: '', // This will be validated on the backend via Stripe webhook
      });

      if (data.success) {
        this.setCoins(data.newCoinBalance);
        return true;
      }
      return false;
    } catch (error) {
      this.setError(error instanceof Error ? error.message : 'Failed to process payment');
      return false;
    } finally {
      this.setLoading(false);
    }
  }

  async purchaseMicrophone(microphoneId: string): Promise<boolean> {
    try {
      this.setLoading(true);
      this.setError(null);

      const data = await apiStore.post('/store/purchase-microphone', { microphoneId });
      this.setCoins(data.remainingCoins);

      // Refresh user microphones
      await this.fetchUserMicrophones();

      return true;
    } catch (error) {
      this.setError(error instanceof Error ? error.message : 'Failed to purchase microphone');
      return false;
    } finally {
      this.setLoading(false);
    }
  }

  getOwnedMicrophoneIds(): string[] {
    return this.userMicrophones.map((um) => um.microphoneId);
  }

  doesUserOwnMicrophone(microphoneId: string): boolean {
    return this.getOwnedMicrophoneIds().includes(microphoneId);
  }

  // Avatar methods
  async fetchStoreAvatars(): Promise<void> {
    try {
      this.setLoading(true);
      this.setError(null);
      const data = await apiStore.get('/store/avatars');
      this.storeAvatars = data;
    } catch (error) {
      this.setError(error instanceof Error ? error.message : 'Failed to fetch avatars');
    } finally {
      this.setLoading(false);
    }
  }

  async fetchUserAvatars(): Promise<void> {
    try {
      this.setError(null);
      const data = await apiStore.get('/store/my-avatars');
      this.userAvatars = data;
    } catch (error) {
      this.setError(error instanceof Error ? error.message : 'Failed to fetch user avatars');
    }
  }

  async purchaseAvatar(avatarId: string): Promise<boolean> {
    try {
      this.setLoading(true);
      this.setError(null);

      const data = await apiStore.post('/store/purchase-avatar', { avatarId });
      this.setCoins(data.remainingCoins);

      // Refresh user avatars
      await this.fetchUserAvatars();

      return true;
    } catch (error) {
      this.setError(error instanceof Error ? error.message : 'Failed to purchase avatar');
      return false;
    } finally {
      this.setLoading(false);
    }
  }

  async equipAvatar(avatarId: string): Promise<boolean> {
    try {
      this.setLoading(true);
      this.setError(null);

      await apiStore.post('/store/equip-avatar', { avatarId });

      // Refresh user data to update equipped avatar
      await this.fetchUserAvatars();

      return true;
    } catch (error) {
      this.setError(error instanceof Error ? error.message : 'Failed to equip avatar');
      return false;
    } finally {
      this.setLoading(false);
    }
  }

  getOwnedAvatarIds(): string[] {
    return this.userAvatars.map((ua) => ua.avatarId);
  }

  doesUserOwnAvatar(avatarId: string): boolean {
    return this.getOwnedAvatarIds().includes(avatarId);
  }
}

export const storeStore = new StoreStore();
