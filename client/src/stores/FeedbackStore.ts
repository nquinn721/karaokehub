import { makeAutoObservable } from 'mobx';
import { apiStore } from './ApiStore';

export interface FeedbackSubmission {
  type: 'bug' | 'feature' | 'improvement' | 'compliment' | 'complaint' | 'general';
  subject?: string;
  message: string;
  email?: string;
  name?: string;
  userId?: string | null;
  userAgent?: string;
  url?: string;
}

export interface Feedback extends FeedbackSubmission {
  id: string;
  createdAt: string;
  status: 'pending' | 'reviewed' | 'resolved';
  response?: string;
  responseDate?: string;
}

export class FeedbackStore {
  feedbacks: Feedback[] = [];
  isLoading = false;
  error: string | null = null;

  constructor() {
    makeAutoObservable(this);
  }

  async submitFeedback(feedback: FeedbackSubmission): Promise<void> {
    this.isLoading = true;
    this.error = null;

    try {
      const response = await apiStore.post('/feedback', feedback);

      if (response.data) {
        // Add to local store if we get the created feedback back
        this.feedbacks.unshift(response.data);
      }
    } catch (error: any) {
      this.error = error.response?.data?.message || 'Failed to submit feedback';
      throw error;
    } finally {
      this.isLoading = false;
    }
  }

  async getUserFeedbacks(userId: string): Promise<void> {
    this.isLoading = true;
    this.error = null;

    try {
      const response = await apiStore.get(`/feedback/user/${userId}`);
      this.feedbacks = response.data;
    } catch (error: any) {
      this.error = error.response?.data?.message || 'Failed to load feedbacks';
      throw error;
    } finally {
      this.isLoading = false;
    }
  }

  async getAllFeedbacks(): Promise<void> {
    this.isLoading = true;
    this.error = null;

    try {
      const response = await apiStore.get('/feedback');
      this.feedbacks = response.data;
    } catch (error: any) {
      this.error = error.response?.data?.message || 'Failed to load feedbacks';
      throw error;
    } finally {
      this.isLoading = false;
    }
  }

  async updateFeedbackStatus(
    feedbackId: string,
    status: Feedback['status'],
    response?: string,
  ): Promise<void> {
    try {
      await apiStore.patch(`/feedback/${feedbackId}`, { status, response });

      // Update local store
      const feedback = this.feedbacks.find((f) => f.id === feedbackId);
      if (feedback) {
        feedback.status = status;
        if (response) {
          feedback.response = response;
          feedback.responseDate = new Date().toISOString();
        }
      }
    } catch (error: any) {
      this.error = error.response?.data?.message || 'Failed to update feedback';
      throw error;
    }
  }

  clearError(): void {
    this.error = null;
  }
}

export const feedbackStore = new FeedbackStore();
