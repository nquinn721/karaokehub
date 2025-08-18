import { makeAutoObservable, runInAction } from 'mobx';
import { Socket } from 'socket.io-client';
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
  aliases?: string[]; // Array of nicknames/aliases found
  socialHandles?: string[]; // Array of social media handles
}

export interface ParsedShowData {
  venue: string;
  time: string;
  djName?: string;
  description?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  venuePhone?: string;
  venueWebsite?: string;
  imageUrl?: string;
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

export interface UrlToParse {
  id: number;
  url: string;
  createdAt: string;
  updatedAt: string;
}

export interface ParserLogEntry {
  id: string;
  message: string;
  timestamp: Date;
  level: 'info' | 'success' | 'warning' | 'error';
}

export class ParserStore {
  pendingReviews: ParsedScheduleItem[] = [];
  urlsToParse: UrlToParse[] = [];
  parsingLog: ParserLogEntry[] = [];
  isLoading = false;
  error: string | null = null;
  isInitialized = false;
  parsingStartTime: Date | null = null;
  parsingElapsedTime = 0;
  parsingTimer: number | null = null;
  socket: Socket | null = null;

  constructor() {
    makeAutoObservable(this);
    // Don't auto-initialize WebSocket - let WebSocketStore handle connections
  }

  // Setup parser-specific WebSocket events through the shared WebSocketStore
  setupParserEvents(socket: Socket) {
    if (!socket) return;

    // Join the parser-logs room to receive parser log broadcasts
    socket.emit('join-parser-logs');

    // Listen for parser logs with the new structure
    socket.on(
      'parser-log',
      (logEntry: {
        id: string;
        message: string;
        timestamp: Date;
        level: 'info' | 'success' | 'warning' | 'error';
      }) => {
        this.addLogEntry(logEntry.message, logEntry.level || 'info');
      },
    );

    // Listen for log expiration events to remove logs after 10 seconds
    socket.on('parser-log-expired', (_logId: string) => {
      // The logs are already managed by the 10-second auto-expiration in the backend
      // This event is just for sync purposes if needed
    });

    // Keep legacy parser-error handler for backwards compatibility
    socket.on('parser-error', (data: { message: string; timestamp: string }) => {
      this.addLogEntry(data.message, 'error');
    });
  }

  // Initialize WebSocket connection for real-time parser logs (legacy method - now deprecated)
  initializeWebSocket() {
    // This method is deprecated - use setupParserEvents with shared WebSocketStore instead
    console.warn(
      'ParserStore.initializeWebSocket() is deprecated. Use setupParserEvents() with shared WebSocketStore.',
    );
  }

  // Cleanup WebSocket connection
  disconnect() {
    if (this.socket) {
      this.socket.emit('leave-parser-logs');
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // New method to leave parser logs without disconnecting the socket
  leaveParserLogs(socket?: Socket) {
    const socketToUse = socket || this.socket;
    if (socketToUse) {
      socketToUse.emit('leave-parser-logs');
    }
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

  // Parser log management
  addLogEntry(message: string, level: 'info' | 'success' | 'warning' | 'error' = 'info') {
    // Check for duplicate messages in the last 5 seconds to prevent duplicate logs
    const now = Date.now();
    const recentDuplicate = this.parsingLog.find(
      (entry) =>
        entry.message === message &&
        entry.level === level &&
        now - entry.timestamp.getTime() < 5000, // Within last 5 seconds
    );

    if (recentDuplicate) {
      // Skip adding duplicate message
      return;
    }

    // Generate a unique ID using timestamp + random component to prevent duplicates
    const entry: ParserLogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      message,
      timestamp: new Date(),
      level,
    };

    runInAction(() => {
      this.parsingLog.push(entry);
      // Keep only the last 5 entries
      if (this.parsingLog.length > 5) {
        this.parsingLog = this.parsingLog.slice(-5);
      }
    });

    // Auto-remove entry after 10 seconds
    setTimeout(() => {
      runInAction(() => {
        this.parsingLog = this.parsingLog.filter((log) => log.id !== entry.id);
      });
    }, 10000);
  }

  clearLog() {
    runInAction(() => {
      this.parsingLog = [];
    });
  }

  startParsingTimer() {
    runInAction(() => {
      this.parsingStartTime = new Date();
      this.parsingElapsedTime = 0;
    });

    this.parsingTimer = window.setInterval(() => {
      if (this.parsingStartTime) {
        runInAction(() => {
          this.parsingElapsedTime = Date.now() - this.parsingStartTime!.getTime();
        });
      }
    }, 1000);
  }

  stopParsingTimer() {
    if (this.parsingTimer) {
      window.clearInterval(this.parsingTimer);
      this.parsingTimer = null;
    }
    runInAction(() => {
      this.parsingStartTime = null;
      this.parsingElapsedTime = 0;
    });
  }

  /**
   * Check server parsing status and restore client state if parsing is active
   */
  async checkAndRestoreParsingStatus(): Promise<boolean> {
    try {
      const response = await apiStore.get('/parser/parsing-status');
      const status = response.data;

      if (status.isCurrentlyParsing) {
        runInAction(() => {
          this.parsingStartTime = new Date(status.parsingStartTime);
          this.parsingElapsedTime = status.elapsedTimeMs;
        });

        // Start the timer to keep updating elapsed time
        this.parsingTimer = window.setInterval(() => {
          if (this.parsingStartTime) {
            runInAction(() => {
              this.parsingElapsedTime = Date.now() - this.parsingStartTime!.getTime();
            });
          }
        }, 1000);

        // Add a log entry to indicate parsing is in progress
        if (status.currentParsingUrl) {
          this.addLogEntry(`Parsing in progress: ${status.currentParsingUrl}`, 'info');
        } else {
          this.addLogEntry('Parsing in progress...', 'info');
        }

        return true;
      }

      return false;
    } catch (error) {
      console.error('Failed to check parsing status:', error);
      return false;
    }
  }

  getFormattedElapsedTime(): string {
    const seconds = Math.floor(this.parsingElapsedTime / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  /**
   * Check if parsing is currently active (has a start time and timer running)
   */
  get isParsingActive(): boolean {
    return this.parsingStartTime !== null && this.parsingTimer !== null;
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

  async parseAndSaveWebsite(
    url: string,
    parseMethod: 'html' | 'screenshot' = 'html',
  ): Promise<{
    success: boolean;
    error?: string;
    data?: any;
    parsedScheduleId?: string;
  }> {
    try {
      this.setLoading(true);
      this.setError(null);
      this.startParsingTimer();

      this.addLogEntry(`Starting parse for URL: ${url}`, 'info');
      this.addLogEntry(`Using ${parseMethod} parsing method`, 'info');
      this.addLogEntry('Fetching webpage content...', 'info');

      // Use the new parse-and-save-website endpoint which saves to database
      const result = await apiStore.post('/parser/parse-and-save-website', {
        url,
        parseMethod,
      });

      this.addLogEntry('Gemini response received, extracting JSON', 'success');

      // Log details about the parsed data if available
      if (result.data) {
        const showsCount = result.data.shows?.length || 0;
        const djsCount = result.data.djs?.length || 0;
        this.addLogEntry(
          `Parse completed: ${showsCount} shows found, ${djsCount} DJs identified`,
          'success',
        );

        if (result.data.vendor?.name) {
          this.addLogEntry(`Vendor identified: ${result.data.vendor.name}`, 'info');
        }
      }

      // Log stats if available from backend
      if (result.stats) {
        this.addLogEntry(`Processing completed in ${result.stats.processingTime}ms`, 'info');
        this.addLogEntry(`HTML content processed: ${result.stats.htmlLength} characters`, 'info');
      }

      // Refresh pending reviews to show the new entry
      await this.fetchPendingReviews();

      this.addLogEntry('Data saved for admin review', 'success');

      return {
        success: true,
        data: result.data,
        parsedScheduleId: result.parsedScheduleId,
      };
    } catch (error: any) {
      let errorMessage = 'Failed to parse and save website';

      // Check if it's a timeout error
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        errorMessage = 'Parser request timed out - this usually indicates a server error';
        this.addLogEntry('Request timed out - server may have encountered an error', 'error');
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
        this.addLogEntry(`Server error: ${errorMessage}`, 'error');
      } else if (error.message) {
        errorMessage = error.message;
        this.addLogEntry(`Network error: ${errorMessage}`, 'error');
      } else {
        this.addLogEntry('Unknown error occurred during parsing', 'error');
      }

      this.setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      this.stopParsingTimer();
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
  ): Promise<{ success: boolean; error?: string; message?: string }> {
    try {
      this.setLoading(true);

      // Get the review data
      const review = this.getPendingReviewById(reviewId);
      if (!review) {
        return { success: false, error: 'Review not found' };
      }

      // Use the approve-schedule endpoint with the modified data
      const response = await apiStore.post(`/parser/approve-schedule/${reviewId}`, {
        approvedData: review.aiAnalysis,
      });

      // Refresh pending reviews
      await this.fetchPendingReviews();

      return {
        success: true,
        message: response.data?.result?.message || response.data?.message,
      };
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to approve selected items';
      return { success: false, error: errorMessage };
    } finally {
      this.setLoading(false);
    }
  }

  // Approve all items from a parsed schedule
  async approveAllItems(
    reviewId: string,
  ): Promise<{ success: boolean; error?: string; message?: string }> {
    try {
      this.setLoading(true);

      // Use the new approve-all endpoint
      const response = await apiStore.post(`/parser/approve-all/${reviewId}`);

      // Refresh pending reviews
      await this.fetchPendingReviews();

      return {
        success: true,
        message: response.data?.result?.message || response.data?.message,
      };
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

  // Helper method to get count of pending reviews
  get pendingReviewsCount(): number {
    return this.pendingReviews.length;
  }

  // Helper method to check if there are any pending reviews
  get hasPendingReviews(): boolean {
    return this.pendingReviews.length > 0;
  }

  // URL management methods
  async fetchUrlsToParse(): Promise<void> {
    try {
      this.setLoading(true);
      this.setError(null);

      const response = await apiStore.get('/parser/urls');

      runInAction(() => {
        // The apiStore.get() already returns response.data, so response should be the array directly
        this.urlsToParse = Array.isArray(response) ? response : [];
      });
    } catch (error: any) {
      console.error('Error fetching URLs:', error);
      const errorMessage = error.response?.data?.message || 'Failed to fetch URLs to parse';
      this.setError(errorMessage);
      runInAction(() => {
        this.urlsToParse = [];
      });
    } finally {
      this.setLoading(false);
    }
  }

  async addUrlToParse(url: string): Promise<{ success: boolean; error?: string }> {
    try {
      this.setLoading(true);
      this.setError(null);

      await apiStore.post('/parser/urls', { url });

      // Refresh the list after adding
      await this.fetchUrlsToParse();

      return { success: true };
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to add URL';
      this.setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      this.setLoading(false);
    }
  }

  async deleteUrlToParse(id: number): Promise<{ success: boolean; error?: string }> {
    try {
      this.setLoading(true);
      this.setError(null);

      await apiStore.post(`/parser/urls/${id}/delete`);

      // Refresh the list after deleting
      await this.fetchUrlsToParse();

      return { success: true };
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to delete URL';
      this.setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      this.setLoading(false);
    }
  }

  async parseSelectedUrl(url: string): Promise<{ success: boolean; error?: string }> {
    try {
      this.setLoading(true);
      this.setError(null);

      this.addLogEntry(`Starting to parse: ${url}`, 'info');
      this.addLogEntry('Sending request to parser service...', 'info');

      await apiStore.post('/parser/parse-and-save-website', { url });

      this.addLogEntry('Successfully parsed website', 'success');
      this.addLogEntry('Refreshing pending reviews...', 'info');

      // Refresh pending reviews to see newly parsed data
      await this.fetchPendingReviews();

      this.addLogEntry('Parse completed successfully', 'success');

      return { success: true };
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to parse URL';
      this.addLogEntry(`Parse failed: ${errorMessage}`, 'error');
      this.setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      this.setLoading(false);
    }
  }

  // Update review comments (stub implementation)
  async updateReviewComments(reviewId: string, comments: string): Promise<void> {
    try {
      // TODO: Implement actual update logic when backend endpoint is available
      console.log('Updating review comments:', reviewId, comments);
    } catch (error) {
      console.error('Failed to update comments:', error);
    }
  }

  // Submit manual show data
  async submitManualShow(showData: any): Promise<{ success: boolean; error?: string }> {
    try {
      this.setLoading(true);
      this.setError(null);

      await apiStore.post('/parser/submit-manual-show', showData);

      return { success: true };
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to submit manual show';
      this.setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      this.setLoading(false);
    }
  }

  // Simple approve review method for admin interface
  async approveReview(reviewId: string, comments?: string): Promise<void> {
    await this.approveAllItems(reviewId);
    if (comments) {
      await this.updateReviewComments(reviewId, comments);
    }
  }

  // Simple reject review method for admin interface
  async rejectReview(reviewId: string, reason?: string): Promise<void> {
    await this.rejectParsedData(reviewId, reason || 'Rejected by admin');
  }
}

export const parserStore = new ParserStore();
