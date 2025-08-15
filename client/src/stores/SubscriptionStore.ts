import { makeAutoObservable, runInAction } from 'mobx';
import { apiStore } from './ApiStore';
import { localSubscriptionStore } from './LocalSubscriptionStore';

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
    // Initialize with default subscription status to prevent undefined errors
    this.initializeDefaultStatus();
  }

  private initializeDefaultStatus() {
    this.subscriptionStatus = {
      subscription: null,
      features: {
        adFree: false,
        premium: false,
      },
    };
  }

  setLoading(loading: boolean) {
    runInAction(() => {
      this.isLoading = loading;
    });
  }

  async fetchSubscriptionStatus() {
    try {
      this.setLoading(true);
      const response = await apiStore.get(apiStore.endpoints.subscription.status);

      runInAction(() => {
        // Ensure we have a valid structure with proper defaults
        this.subscriptionStatus = {
          subscription: response?.subscription || null,
          features: {
            adFree: response?.features?.adFree || false,
            premium: response?.features?.premium || false,
          },
        };
        this.isLoading = false;
      });

      return { success: true };
    } catch (error: any) {
      runInAction(() => {
        this.isLoading = false;
        // Keep default structure even on error
        this.initializeDefaultStatus();
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
      const response = await apiStore.post(apiStore.endpoints.subscription.createCheckoutSession, {
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
      const response = await apiStore.post(apiStore.endpoints.subscription.createPortalSession);

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
    // Check account subscription first, then local subscription
    return this.subscriptionStatus?.features?.adFree || localSubscriptionStore.hasAdFree;
  }

  get hasPremiumAccess(): boolean {
    // Check account subscription first, then local subscription
    return this.subscriptionStatus?.features?.premium || localSubscriptionStore.hasPremium;
  }

  get currentPlan(): 'free' | 'ad_free' | 'premium' {
    if (this.subscriptionStatus?.subscription?.plan) {
      return this.subscriptionStatus.subscription.plan;
    }

    // Check local subscription
    if (localSubscriptionStore.hasPremium) return 'premium';
    if (localSubscriptionStore.hasAdFree) return 'ad_free';

    return 'free';
  }

  get isSubscribed(): boolean {
    return this.subscriptionStatus?.subscription?.status === 'active';
  }

  // Helper method to check if paywall should be shown for a feature
  shouldShowPaywall(feature: 'favorites' | 'ad_removal' | 'music_preview'): boolean {
    switch (feature) {
      case 'favorites':
      case 'music_preview':
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
