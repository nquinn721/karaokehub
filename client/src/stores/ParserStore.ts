import { makeAutoObservable, runInAction } from 'mobx';
import { apiStore } from './ApiStore';

export interface ParsedVendorData {
  name: string;
  website: string;
  description?: string;
  confidence: number;
}

export interface ParsedDJData {
  name: string;
  confidence: number;
  context?: string;
}

export interface ParsedShowData {
  venue: string;
  date: string;
  time: string;
  djName?: string;
  description?: string;
  confidence: number;
}

export interface ParsedScheduleItem {
  id: string;
  url: string;
  rawData: any;
  aiAnalysis: {
    vendor: ParsedVendorData;
    djs: ParsedDJData[];
    shows: ParsedShowData[];
  };
  status: 'pending' | 'pending_review' | 'approved' | 'rejected' | 'needs_review';
  createdAt: string;
  updatedAt: string;
  rejectionReason?: string;
  reviewComments?: string;
  vendorId?: string;
  vendor?: any; // Vendor entity
}

export class ParserStore {
  pendingReviews: ParsedScheduleItem[] = [];
  isLoading = false;
  error: string | null = null;
  isInitialized = false;

  constructor() {
    makeAutoObservable(this);
  }

  // Initialize store by fetching pending reviews
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    await this.fetchPendingReviews();
    runInAction(() => {
      this.isInitialized = true;
    });
  }

  setLoading(loading: boolean) {
    this.isLoading = loading;
  }

  setError(error: string | null) {
    this.error = error;
  }

  async parseWebsite(url: string): Promise<{ success: boolean; error?: string; data?: any }> {
    try {
      this.setLoading(true);
      this.setError(null);

      const result = await apiStore.post('/parser/parse-website', { url });

      return { success: true, data: result };
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

      const response = await apiStore.get('/parser/pending-reviews');

      runInAction(() => {
        // Ensure the response is an array and has the expected structure
        this.pendingReviews = Array.isArray(response) ? response : [];
      });
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to fetch pending reviews';
      this.setError(errorMessage);
      // Ensure pendingReviews is always an array
      runInAction(() => {
        this.pendingReviews = [];
      });
    } finally {
      this.setLoading(false);
    }
  }

  async cleanupInvalidReviews(): Promise<{ success: boolean; error?: string; message?: string }> {
    try {
      this.setLoading(true);
      this.setError(null);

      const response = await apiStore.post('/parser/cleanup-invalid-reviews');

      // Refresh the list after cleanup
      await this.fetchPendingReviews();

      return { success: true, message: response.message };
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to cleanup invalid reviews';
      this.setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      this.setLoading(false);
    }
  }

  async cleanupAllReviews(): Promise<{ success: boolean; error?: string; message?: string }> {
    try {
      this.setLoading(true);
      this.setError(null);

      const response = await apiStore.post('/parser/cleanup-all-reviews');

      // Refresh the list after cleanup
      await this.fetchPendingReviews();

      return { success: true, message: response.message };
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to cleanup all reviews';
      this.setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      this.setLoading(false);
    }
  }

  async testPuppeteerParsing(
    url: string,
  ): Promise<{ success: boolean; error?: string; data?: any }> {
    try {
      this.setLoading(true);
      this.setError(null);

      const result = await apiStore.post('/parser/test-puppeteer', { url });

      return { success: true, data: result };
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to test Puppeteer parsing';
      this.setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      this.setLoading(false);
    }
  }

  async parseStevesdj(): Promise<{
    success: boolean;
    error?: string;
    data?: any;
    parsedScheduleId?: string;
  }> {
    try {
      this.setLoading(true);
      this.setError(null);

      // Use the new parse-and-save-website endpoint with Steve's DJ URL
      const stevesdjUrl = 'https://stevesdj.com/karaoke-schedule'; // Updated to correct karaoke schedule page
      const result = await apiStore.post('/parser/parse-and-save-website', { url: stevesdjUrl });

      // Refresh pending reviews to show the new entry
      await this.fetchPendingReviews();

      return {
        success: true,
        data: result.data,
        parsedScheduleId: result.parsedScheduleId,
      };
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || "Failed to parse Steve's DJ website";
      this.setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      this.setLoading(false);
    }
  }

  async parseAndSaveWebsite(
    url: string,
    _autoApprove: boolean = false, // Currently not supported by backend, kept for compatibility
  ): Promise<{
    success: boolean;
    error?: string;
    data?: any;
    parsedScheduleId?: string;
  }> {
    try {
      this.setLoading(true);
      this.setError(null);

      // Use the new parse-and-save-website endpoint which saves to database
      const result = await apiStore.post('/parser/parse-and-save-website', { url });

      // Refresh pending reviews to show the new entry
      await this.fetchPendingReviews();

      return {
        success: true,
        data: result.data,
        parsedScheduleId: result.parsedScheduleId,
      };
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to parse and save website';
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

  // Approve selected items
  async approveSelectedItems(
    reviewId: string,
    _selectedItems: any, // Currently not used, approves all data
  ): Promise<{ success: boolean; error?: string }> {
    try {
      this.setLoading(true);
      
      // Get the review data
      const review = this.getPendingReviewById(reviewId);
      if (!review) {
        return { success: false, error: 'Review not found' };
      }

      // Use the approve-schedule endpoint with the modified data
      await apiStore.post(`/parser/approve-schedule/${reviewId}`, { 
        approvedData: review.aiAnalysis 
      });

      // Refresh pending reviews
      await this.fetchPendingReviews();

      return { success: true };
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to approve selected items';
      return { success: false, error: errorMessage };
    } finally {
      this.setLoading(false);
    }
  }

  // Approve all items from a parsed schedule
  async approveAllItems(reviewId: string): Promise<{ success: boolean; error?: string }> {
    try {
      this.setLoading(true);

      // Use the new approve-all endpoint
      await apiStore.post(`/parser/approve-all/${reviewId}`);

      // Refresh pending reviews
      await this.fetchPendingReviews();

      return { success: true };
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to approve items';
      return { success: false, error: errorMessage };
    } finally {
      this.setLoading(false);
    }
  }

  // Reject parsed data
  async rejectParsedData(
    reviewId: string,
    reason?: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      this.setLoading(true);
      await apiStore.post(`/parser/reject-schedule/${reviewId}`, { reason });

      // Refresh pending reviews
      await this.fetchPendingReviews();

      return { success: true };
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to reject parsed data';
      return { success: false, error: errorMessage };
    } finally {
      this.setLoading(false);
    }
  }

  // Update review comments (stub implementation)
  async updateReviewComments(reviewId: string, comments: string): Promise<void> {
    try {
      // TODO: Implement actual update logic
      console.log('Updating review comments:', reviewId, comments);
    } catch (error) {
      console.error('Failed to update comments:', error);
    }
  }

  // Helper method to get count of pending reviews
  get pendingReviewsCount(): number {
    return this.pendingReviews.length;
  }

  // Helper method to check if there are any pending reviews
  get hasPendingReviews(): boolean {
    return this.pendingReviews.length > 0;
  }
}

export const parserStore = new ParserStore();
