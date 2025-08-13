import { makeAutoObservable, runInAction } from 'mobx';
import { apiStore } from './ApiStore';

export interface ParsedVendorData {
  name: string;
  website: string;
  description?: string;
  confidence: number;
}

export interface ParsedKJData {
  name: string;
  confidence: number;
  context?: string;
}

export interface ParsedShowData {
  venue: string;
  date: string;
  time: string;
  kjName?: string;
  description?: string;
  confidence: number;
}

export interface ParsedScheduleItem {
  id: string;
  url: string;
  rawData: any;
  aiAnalysis: {
    vendor: ParsedVendorData;
    kjs: ParsedKJData[];
    shows: ParsedShowData[];
  };
  status: 'pending' | 'pending_review' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt: string;
}

export class ParserStore {
  pendingReviews: ParsedScheduleItem[] = [];
  isLoading = false;
  error: string | null = null;

  constructor() {
    makeAutoObservable(this);
  }

  setLoading(loading: boolean) {
    this.isLoading = loading;
  }

  setError(error: string | null) {
    this.error = error;
  }

  async parseWebsite(url: string): Promise<{ success: boolean; error?: string }> {
    try {
      this.setLoading(true);
      this.setError(null);

      await apiStore.post('/admin/parser/parse-website', { url });

      // Refresh pending reviews after parsing
      await this.fetchPendingReviews();

      return { success: true };
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to parse website';
      this.setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      this.setLoading(false);
    }
  }

  async fetchPendingReviews(): Promise<void> {
    try {
      this.setLoading(true);
      this.setError(null);

      const response = await apiStore.get('/admin/parser/pending-reviews');

      runInAction(() => {
        this.pendingReviews = response;
      });
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to fetch pending reviews';
      this.setError(errorMessage);
    } finally {
      this.setLoading(false);
    }
  }

  async approveParsedData(
    id: string,
    approvedData: any,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      this.setLoading(true);
      this.setError(null);

      await apiStore.patch(`/admin/parser/approve/${id}`, approvedData);

      // Remove from pending reviews
      runInAction(() => {
        this.pendingReviews = this.pendingReviews.filter((item) => item.id !== id);
      });

      return { success: true };
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to approve data';
      this.setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      this.setLoading(false);
    }
  }

  async rejectParsedData(
    id: string,
    reason?: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      this.setLoading(true);
      this.setError(null);

      await apiStore.patch(`/admin/parser/reject/${id}`, { reason });

      // Remove from pending reviews
      runInAction(() => {
        this.pendingReviews = this.pendingReviews.filter((item) => item.id !== id);
      });

      return { success: true };
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to reject data';
      this.setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      this.setLoading(false);
    }
  }

  // Get a specific pending review by ID
  getPendingReviewById(id: string): ParsedScheduleItem | undefined {
    return this.pendingReviews.find((item) => item.id === id);
  }
  led;
  async parseAndSaveWebsite(
    url: string,
    autoApprove: boolean = false,
  ): Promise<{
    success: boolean;
    error?: string;
    data?: {
      vendor: string;
      kjsCount: number;
      showsCount: number;
      confidence: {
        vendor: number;
        avgKjConfidence: number;
        avgShowConfidence: number;
      };
    };
  }> {
    try {
      this.setLoading(true);
      this.setError(null);

      const response = await apiStore.post('/admin/parser/parse-and-save', { url, autoApprove });

      // If not auto-approved, refresh pending reviews
      if (!autoApprove) {
        await this.fetchPendingReviews();
      }

      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to parse and save website';
      this.setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      this.setLoading(false);
    }
  }

  async parseStevesdj(): Promise<{
    success: boolean;
    error?: string;
    data?: {
      vendor: string;
      kjsCount: number;
      showsCount: number;
      confidence: {
        vendor: number;
        avgKjConfidence: number;
        avgShowConfidence: number;
      };
    };
  }> {
    try {
      this.setLoading(true);
      this.setError(null);

      const response = await apiStore.post('/admin/parser/parse-stevesdj');

      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || "Failed to parse Steve's DJ website";
      this.setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      this.setLoading(false);
    }
  }

  async updateReviewComments(parsedScheduleId: string, comments: string): Promise<{ success: boolean; error?: string }> {
    try {
      this.setLoading(true);
      this.setError(null);

      await apiStore.patch(`/admin/parser/review-comments/${parsedScheduleId}`, { comments });

      return { success: true };
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to update review comments';
      this.setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      this.setLoading(false);
    }
  }
}

export const parserStore = new ParserStore();
