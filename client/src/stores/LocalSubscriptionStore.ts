import { makeAutoObservable } from 'mobx';

export interface LocalSubscription {
  type: 'ad_free' | 'premium';
  expiresAt: number; // timestamp
  deviceId: string;
}

export class LocalSubscriptionStore {
  private readonly STORAGE_KEY = 'karaoke_hub_subscription';
  private readonly DEVICE_ID_KEY = 'karaoke_hub_device_id';

  localSubscription: LocalSubscription | null = null;
  deviceId: string = '';

  constructor() {
    makeAutoObservable(this);
    this.initializeDeviceId();
    this.loadLocalSubscription();
  }

  private initializeDeviceId() {
    let deviceId = localStorage.getItem(this.DEVICE_ID_KEY);
    if (!deviceId) {
      // Generate a unique device ID
      deviceId = 'device_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
      localStorage.setItem(this.DEVICE_ID_KEY, deviceId);
    }
    this.deviceId = deviceId;
  }

  private loadLocalSubscription() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const subscription = JSON.parse(stored) as LocalSubscription;

        // Check if subscription is still valid
        if (subscription.expiresAt > Date.now()) {
          this.localSubscription = subscription;
        } else {
          // Remove expired subscription
          this.clearLocalSubscription();
        }
      }
    } catch (error) {
      console.error('Failed to load local subscription:', error);
      this.clearLocalSubscription();
    }
  }

  setLocalSubscription(type: 'ad_free' | 'premium', durationDays: number = 30) {
    const subscription: LocalSubscription = {
      type,
      expiresAt: Date.now() + durationDays * 24 * 60 * 60 * 1000, // 30 days from now
      deviceId: this.deviceId,
    };

    this.localSubscription = subscription;
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(subscription));
  }

  clearLocalSubscription() {
    this.localSubscription = null;
    localStorage.removeItem(this.STORAGE_KEY);
  }

  get hasAdFree(): boolean {
    return (
      this.localSubscription !== null &&
      (this.localSubscription.type === 'ad_free' || this.localSubscription.type === 'premium')
    );
  }

  get hasPremium(): boolean {
    return this.localSubscription !== null && this.localSubscription.type === 'premium';
  }

  get isExpiringSoon(): boolean {
    if (!this.localSubscription) return false;
    const daysUntilExpiry = (this.localSubscription.expiresAt - Date.now()) / (24 * 60 * 60 * 1000);
    return daysUntilExpiry <= 3; // 3 days warning
  }

  get daysRemaining(): number {
    if (!this.localSubscription) return 0;
    return Math.max(
      0,
      Math.ceil((this.localSubscription.expiresAt - Date.now()) / (24 * 60 * 60 * 1000)),
    );
  }

  // For transferring to account when user logs in
  getLocalSubscriptionData(): LocalSubscription | null {
    return this.localSubscription;
  }

  // Called when user logs in to transfer local subscription to account
  transferToAccount(): Promise<boolean> {
    // This would be called by the subscription store when user logs in
    // The actual API call would be handled by the main subscription store
    return Promise.resolve(true);
  }
}

export const localSubscriptionStore = new LocalSubscriptionStore();
