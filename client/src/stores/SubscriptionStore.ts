import { makeAutoObservable, runInAction } from 'mobx';
import { apiStore } from './ApiStore';

export interface SubscriptionStatus {
  subscription: {
    id: string;
    plan: 'free' | 'ad_free' | 'premium';
    status: string;
    pricePerMonth: number;
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
  } | null;
  features: {
    adFree: boolean;
    premium: boolean;
  };
}

export class SubscriptionStore {
  subscriptionStatus: SubscriptionStatus | null = null;
  isLoading = false;

  constructor() {
    makeAutoObservable(this);
  }

  setLoading(loading: boolean) {
    runInAction(() => {
      this.isLoading = loading;
    });
  }

  async fetchSubscriptionStatus() {
    try {
      this.setLoading(true);
      const response = await apiStore.get('/subscription/status');

      runInAction(() => {
        this.subscriptionStatus = response;
        this.isLoading = false;
      });

      return { success: true };
    } catch (error: any) {
      runInAction(() => {
        this.isLoading = false;
      });
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch subscription status',
      };
    }
  }

  async createCheckoutSession(plan: 'ad_free' | 'premium') {
    try {
      this.setLoading(true);
      const response = await apiStore.post('/subscription/create-checkout-session', {
        plan,
      });

      runInAction(() => {
        this.isLoading = false;
      });

      if (response.url) {
        window.location.href = response.url;
      }

      return { success: true };
    } catch (error: any) {
      runInAction(() => {
        this.isLoading = false;
      });
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to create checkout session',
      };
    }
  }

  async createPortalSession() {
    try {
      this.setLoading(true);
      const response = await apiStore.post('/subscription/create-portal-session');

      runInAction(() => {
        this.isLoading = false;
      });

      if (response.url) {
        window.location.href = response.url;
      }

      return { success: true };
    } catch (error: any) {
      runInAction(() => {
        this.isLoading = false;
      });
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to create portal session',
      };
    }
  }

  // Getters for easy access to subscription features
  get hasAdFreeAccess(): boolean {
    return this.subscriptionStatus?.features.adFree || false;
  }

  get hasPremiumAccess(): boolean {
    return this.subscriptionStatus?.features.premium || false;
  }

  get currentPlan(): 'free' | 'ad_free' | 'premium' {
    return this.subscriptionStatus?.subscription?.plan || 'free';
  }

  get isSubscribed(): boolean {
    return this.subscriptionStatus?.subscription?.status === 'active';
  }

  // Helper method to check if paywall should be shown for a feature
  shouldShowPaywall(feature: 'favorites' | 'friends' | 'ad_removal'): boolean {
    switch (feature) {
      case 'favorites':
      case 'friends':
        return !this.hasPremiumAccess;
      case 'ad_removal':
        return !this.hasAdFreeAccess;
      default:
        return true;
    }
  }
}

export const subscriptionStore = new SubscriptionStore();
export default subscriptionStore;
