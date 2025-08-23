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
    songPreviews: {
      unlimited: boolean;
      limit: number | null;
    };
    songFavorites: {
      unlimited: boolean;
      limit: number | null;
    };
    showFavorites: {
      unlimited: boolean;
      limit: number | null;
    };
  };
}

export class SubscriptionStore {
  subscriptionStatus: SubscriptionStatus | null = null;
  isLoading = false;

  // Paywall limits
  private readonly SONG_PREVIEW_LIMIT = 10;
  private readonly SONG_FAVORITE_LIMIT = 5;
  private readonly SHOW_FAVORITE_LIMIT = 3;

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
      const response = await apiStore.get(apiStore.endpoints.subscription.status);

      runInAction(() => {
        // Ensure we have a valid structure with proper defaults
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

  // Preview usage tracking in localStorage
  private getSongPreviewCount(): number {
    const count = localStorage.getItem('songPreviewCount');
    return count ? parseInt(count, 10) : 0;
  }

  private incrementSongPreviewCount(): void {
    const currentCount = this.getSongPreviewCount();
    localStorage.setItem('songPreviewCount', (currentCount + 1).toString());
  }

  // Check if user can use song preview
  canUseSongPreview(): boolean {
    const features = this.subscriptionStatus?.features?.songPreviews;
    if (features?.unlimited) return true;

    const limit = features?.limit || this.SONG_PREVIEW_LIMIT;
    return this.getSongPreviewCount() < limit;
  }

  // Use a song preview (increments counter)
  useSongPreview(): boolean {
    const features = this.subscriptionStatus?.features?.songPreviews;
    if (features?.unlimited) return true;

    if (this.canUseSongPreview()) {
      this.incrementSongPreviewCount();
      return true;
    }
    return false;
  }

  // Get remaining preview count
  getRemainingPreviews(): number {
    const features = this.subscriptionStatus?.features?.songPreviews;
    if (features?.unlimited) return Infinity;

    const limit = features?.limit || this.SONG_PREVIEW_LIMIT;
    return Math.max(0, limit - this.getSongPreviewCount());
  }

  // Check if user can favorite songs (requires backend data)
  canFavoriteSongs(currentFavoriteCount: number): boolean {
    const features = this.subscriptionStatus?.features?.songFavorites;
    if (features?.unlimited) return true;

    const limit = features?.limit || this.SONG_FAVORITE_LIMIT;
    return currentFavoriteCount < limit;
  }

  // Check if user can favorite shows (requires backend data)
  canFavoriteShows(currentFavoriteCount: number): boolean {
    const features = this.subscriptionStatus?.features?.showFavorites;
    if (features?.unlimited) return true;

    const limit = features?.limit || this.SHOW_FAVORITE_LIMIT;
    return currentFavoriteCount < limit;
  }

  // Helper method to check if paywall should be shown for a feature
  shouldShowPaywall(
    feature: 'favorites' | 'ad_removal' | 'music_preview' | 'song_favorites' | 'show_favorites',
    currentFavoriteCount?: number,
  ): boolean {
    switch (feature) {
      case 'music_preview':
        return !this.canUseSongPreview();
      case 'song_favorites':
        return currentFavoriteCount !== undefined && !this.canFavoriteSongs(currentFavoriteCount);
      case 'show_favorites':
        return currentFavoriteCount !== undefined && !this.canFavoriteShows(currentFavoriteCount);
      case 'favorites': // Legacy support
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
