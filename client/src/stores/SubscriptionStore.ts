import { makeAutoObservable, runInAction } from 'mobx';
import { apiStore } from './ApiStore';
import { localSubscriptionStore } from './LocalSubscriptionStore';

// Helper function to check if user is admin
const isCurrentUserAdmin = (): boolean => {
  try {
    // Try to access the auth store from the global window if available
    if (typeof window !== 'undefined' && (window as any).authStore) {
      return (window as any).authStore.isAdmin;
    }
    // Fallback: check if there's a user in localStorage
    const storedAuth = localStorage.getItem('AuthStore');
    if (storedAuth) {
      const authData = JSON.parse(storedAuth);
      return authData?.user?.isAdmin === true || authData?.user?.isAdmin === 1;
    }
    return false;
  } catch (error) {
    console.warn('Failed to check admin status:', error);
    return false;
  }
};

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
    // Prevent subscription fetch during auth initialization to avoid loops
    const authStore = (window as any).authStore;
    if (authStore?.isInitializing) {
      console.log('SubscriptionStore: Skipping fetch during auth initialization');
      return { success: false, error: 'Auth initializing' };
    }

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

      // Handle 401 errors gracefully to prevent auth loops
      if (error?.response?.status === 401 || error?.status === 401) {
        console.log(
          'SubscriptionStore: 401 error, user not authenticated - using default subscription',
        );
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

      // Backend enum uses lowercase values: AD_FREE = 'ad_free', PREMIUM = 'premium'
      // So we can send the frontend plan names directly
      console.log('🛒 [SUBSCRIPTION_STORE] Creating checkout session:', {
        plan,
      });

      const response = await apiStore.post(apiStore.endpoints.subscription.createCheckoutSession, {
        plan,
      });

      runInAction(() => {
        this.isLoading = false;
      });

      if (response.url) {
        // For development/testing, add test card auto-fill parameters
        if (process.env.NODE_ENV === 'development') {
          const testUrl = new URL(response.url);
          testUrl.searchParams.append('prefilled_email', 'test@example.com');
          // Note: Stripe will automatically use test cards in test mode
          window.location.href = testUrl.toString();
        } else {
          window.location.href = response.url;
        }
      }

      return { success: true };
    } catch (error: any) {
      runInAction(() => {
        this.isLoading = false;
      });

      console.error('SubscriptionStore: Failed to create checkout session:', error);

      // More detailed error message for checkout failures
      let errorMessage = 'Failed to create checkout session';
      if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.response?.status === 401) {
        errorMessage = 'Please log in to subscribe';
      } else if (error?.message?.includes('Network Error')) {
        errorMessage = 'Network error - please check your connection';
      }

      return {
        success: false,
        error: errorMessage,
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
    // Admins get all premium features
    if (isCurrentUserAdmin()) return true;

    // Check account subscription first, then local subscription
    return this.subscriptionStatus?.features?.adFree || localSubscriptionStore.hasAdFree;
  }

  get hasPremiumAccess(): boolean {
    // Admins get all premium features
    if (isCurrentUserAdmin()) return true;

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
    // Admins get unlimited song previews
    if (isCurrentUserAdmin()) return true;

    const features = this.subscriptionStatus?.features?.songPreviews;
    if (features?.unlimited) return true;

    const limit = features?.limit || this.SONG_PREVIEW_LIMIT;
    return this.getSongPreviewCount() < limit;
  }

  // Use a song preview (increments counter)
  useSongPreview(): boolean {
    // Admins get unlimited song previews
    if (isCurrentUserAdmin()) return true;

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
    // Admins get unlimited previews
    if (isCurrentUserAdmin()) return Infinity;

    const features = this.subscriptionStatus?.features?.songPreviews;
    if (features?.unlimited) return Infinity;

    const limit = features?.limit || this.SONG_PREVIEW_LIMIT;
    return Math.max(0, limit - this.getSongPreviewCount());
  }

  // Check if user can favorite songs (requires backend data)
  canFavoriteSongs(currentFavoriteCount: number): boolean {
    // Admins get unlimited song favorites
    if (isCurrentUserAdmin()) return true;

    const features = this.subscriptionStatus?.features?.songFavorites;
    if (features?.unlimited) return true;

    const limit = features?.limit || this.SONG_FAVORITE_LIMIT;
    return currentFavoriteCount < limit;
  }

  // Check if user can favorite shows (requires backend data)
  canFavoriteShows(currentFavoriteCount: number): boolean {
    // Admins get unlimited show favorites
    if (isCurrentUserAdmin()) return true;

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
    // Admins never see paywalls
    if (isCurrentUserAdmin()) return false;

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
