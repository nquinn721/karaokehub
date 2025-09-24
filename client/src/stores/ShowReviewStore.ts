import { makeAutoObservable, runInAction } from 'mobx';
import { apiStore } from './ApiStore';

export interface ShowReview {
  id: string;
  showId: string;
  submittedByUserId: string;
  djName?: string;
  vendorName?: string;
  venueName?: string;
  venuePhone?: string;
  venueWebsite?: string;
  description?: string;
  comments?: string;
  status: 'pending' | 'approved' | 'declined';
  adminNotes?: string;
  reviewedByUserId?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
  show?: {
    id: string;
    venue?: string;
    address: string;
    city?: string;
    state?: string;
    startTime: string;
    endTime: string;
    dj?: {
      id: string;
      name: string;
      vendor?: {
        id: string;
        name: string;
      };
    };
  };
}

export interface CreateShowReviewDto {
  showId: string;
  submittedByUserId: string;
  djName?: string;
  vendorName?: string;
  venueName?: string;
  venuePhone?: string;
  venueWebsite?: string;
  location?: string;
  description?: string;
  comments?: string;
}

export interface ReviewShowDto {
  approve: boolean;
  adminNotes?: string;
  reviewedByUserId: string;
}

export interface ReviewStats {
  pending: number;
  approved: number;
  declined: number;
  total: number;
}

class ShowReviewStore {
  reviews: ShowReview[] = [];
  pendingReviews: ShowReview[] = [];
  stats: ReviewStats | null = null;
  loading = false;
  error: string | null = null;

  constructor() {
    makeAutoObservable(this);
  }

  async submitReview(data: CreateShowReviewDto): Promise<boolean> {
    try {
      this.setLoading(true);
      this.setError(null);

      await apiStore.post('/show-reviews', data);

      // Refresh pending reviews if we have them loaded
      if (this.pendingReviews.length > 0) {
        await this.loadPendingReviews();
      }

      return true;
    } catch (error: any) {
      this.setError(error.message || 'Failed to submit review');
      return false;
    } finally {
      this.setLoading(false);
    }
  }

  async loadAllReviews(): Promise<void> {
    try {
      this.setLoading(true);
      this.setError(null);

      const reviews = await apiStore.get('/show-reviews');

      runInAction(() => {
        this.reviews = reviews || [];
      });
    } catch (error: any) {
      this.setError(error.message || 'Failed to load reviews');
    } finally {
      this.setLoading(false);
    }
  }

  async loadPendingReviews(): Promise<void> {
    try {
      this.setLoading(true);
      this.setError(null);

      const reviews = await apiStore.get('/show-reviews/pending');

      runInAction(() => {
        this.pendingReviews = reviews || [];
      });
    } catch (error: any) {
      this.setError(error.message || 'Failed to load pending reviews');
    } finally {
      this.setLoading(false);
    }
  }

  async loadStats(): Promise<void> {
    try {
      const stats = await apiStore.get('/show-reviews/stats');

      runInAction(() => {
        this.stats = stats;
      });
    } catch (error: any) {
      console.error('Failed to load review stats:', error);
    }
  }

  async reviewSubmission(id: string, data: ReviewShowDto): Promise<boolean> {
    try {
      this.setLoading(true);
      this.setError(null);

      await apiStore.patch(`/show-reviews/${id}/review`, data);

      // Remove the review from pending list
      runInAction(() => {
        this.pendingReviews = this.pendingReviews.filter((review) => review.id !== id);
      });

      // Refresh stats
      await this.loadStats();

      return true;
    } catch (error: any) {
      this.setError(error.message || 'Failed to review submission');
      return false;
    } finally {
      this.setLoading(false);
    }
  }

  private setLoading(loading: boolean) {
    this.loading = loading;
  }

  private setError(error: string | null) {
    this.error = error;
  }

  // Computed getters
  get pendingCount(): number {
    return this.pendingReviews.length;
  }

  get hasError(): boolean {
    return !!this.error;
  }
}

export const showReviewStore = new ShowReviewStore();
