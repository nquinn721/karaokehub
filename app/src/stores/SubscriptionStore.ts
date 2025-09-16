import { makeAutoObservable, runInAction } from 'mobx';
import { apiService } from '../services/ApiService';
import { SubscriptionStatus } from '../types';

export class SubscriptionStore {
  subscriptionStatus: SubscriptionStatus | null = null;
  isLoading = false;

  // Paywall limits
  private readonly SONG_PREVIEW_LIMIT = 10;
  private readonly SONG_FAVORITE_LIMIT = 5;
  private readonly SHOW_FAVORITE_LIMIT = 3;

  constructor() {
    makeAutoObservable(this);
    this.initializeDefaultStatus();
  }

  private initializeDefaultStatus() {
    this.subscriptionStatus = {
      subscription: null,
      features: {
        adFree: false,
        premium: false,
        songPreviews: {
          unlimited: false,
          limit: this.SONG_PREVIEW_LIMIT,
        },
        songFavorites: {
          unlimited: false,
          limit: this.SONG_FAVORITE_LIMIT,
        },
        showFavorites: {
          unlimited: false,
          limit: this.SHOW_FAVORITE_LIMIT,
        },
      },
    };
  }

  setLoading(loading: boolean) {
    runInAction(() => {
      this.isLoading = loading;
    });
  }

  clearSubscriptionStatus() {
    runInAction(() => {
      this.subscriptionStatus = {
        subscription: null,
        features: {
          adFree: false,
          premium: false,
          songPreviews: {
            unlimited: false,
            limit: this.SONG_PREVIEW_LIMIT,
          },
          songFavorites: {
            unlimited: false,
            limit: this.SONG_FAVORITE_LIMIT,
          },
          showFavorites: {
            unlimited: false,
            limit: this.SHOW_FAVORITE_LIMIT,
          },
        },
      };
      this.isLoading = false;
    });
  }

  async fetchSubscriptionStatus() {
    try {
      this.setLoading(true);
      const response = await apiService.get(apiService.endpoints.subscription.status);

      runInAction(() => {
        this.subscriptionStatus = {
          subscription: response?.subscription || null,
          features: {
            adFree: response?.features?.adFree || false,
            premium: response?.features?.premium || false,
            songPreviews: response?.features?.songPreviews || {
              unlimited: false,
              limit: this.SONG_PREVIEW_LIMIT,
            },
            songFavorites: response?.features?.songFavorites || {
              unlimited: false,
              limit: this.SONG_FAVORITE_LIMIT,
            },
            showFavorites: response?.features?.showFavorites || {
              unlimited: false,
              limit: this.SHOW_FAVORITE_LIMIT,
            },
          },
        };
        this.isLoading = false;
      });

      return { success: true };
    } catch (error: any) {
      runInAction(() => {
        this.isLoading = false;
        this.initializeDefaultStatus();
      });

      if (error?.response?.status === 401 || error?.status === 401) {
        console.log('SubscriptionStore: 401 error, user not authenticated');
        return { success: false, error: 'Not authenticated' };
      }

      console.warn('SubscriptionStore: Failed to fetch subscription status:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch subscription status',
      };
    }
  }

  async createCheckoutSession(plan: 'ad_free' | 'premium') {
    try {
      this.setLoading(true);

      const response = await apiService.post(
        apiService.endpoints.subscription.createCheckoutSession,
        {
          plan,
        },
      );

      runInAction(() => {
        this.isLoading = false;
      });

      return {
        success: true,
        checkoutUrl: response.url,
      };
    } catch (error: any) {
      runInAction(() => {
        this.isLoading = false;
      });

      console.error('Failed to create checkout session:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to create checkout session',
      };
    }
  }

  async cancelSubscription() {
    try {
      this.setLoading(true);

      await apiService.post(apiService.endpoints.subscription.cancelSubscription);

      // Refresh subscription status after cancellation
      await this.fetchSubscriptionStatus();

      return { success: true };
    } catch (error: any) {
      runInAction(() => {
        this.isLoading = false;
      });

      console.error('Failed to cancel subscription:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to cancel subscription',
      };
    }
  }

  // Convenience getters
  get isAdFree(): boolean {
    return this.subscriptionStatus?.features?.adFree || false;
  }

  get isPremium(): boolean {
    return this.subscriptionStatus?.features?.premium || false;
  }

  get hasUnlimitedPreviews(): boolean {
    return this.subscriptionStatus?.features?.songPreviews?.unlimited || false;
  }

  get previewLimit(): number {
    return this.subscriptionStatus?.features?.songPreviews?.limit || this.SONG_PREVIEW_LIMIT;
  }

  get hasUnlimitedSongFavorites(): boolean {
    return this.subscriptionStatus?.features?.songFavorites?.unlimited || false;
  }

  get songFavoriteLimit(): number {
    return this.subscriptionStatus?.features?.songFavorites?.limit || this.SONG_FAVORITE_LIMIT;
  }

  get hasUnlimitedShowFavorites(): boolean {
    return this.subscriptionStatus?.features?.showFavorites?.unlimited || false;
  }

  get showFavoriteLimit(): number {
    return this.subscriptionStatus?.features?.showFavorites?.limit || this.SHOW_FAVORITE_LIMIT;
  }

  get currentPlan(): 'free' | 'ad_free' | 'premium' {
    return this.subscriptionStatus?.subscription?.plan || 'free';
  }

  get subscriptionEndsAt(): string | null {
    return this.subscriptionStatus?.subscription?.currentPeriodEnd || null;
  }

  get willCancelAtPeriodEnd(): boolean {
    return this.subscriptionStatus?.subscription?.cancelAtPeriodEnd || false;
  }
}

export const subscriptionStore = new SubscriptionStore();
