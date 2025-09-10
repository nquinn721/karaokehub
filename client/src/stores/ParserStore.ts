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
  lat?: number;
  lng?: number;
  venuePhone?: string;
  venueWebsite?: string;
  source?: string;
  confidence: number;
}

export interface ParsedScheduleItem {
  id: string;
  url: string;
  rawData: any;
  aiAnalysis?: {
    vendor: ParsedVendorData;
    djs: ParsedDJData[];
    shows: ParsedShowData[];
  };
  stats?: {
    showsFound: number;
    djsFound: number;
    venuesFound: number;
    vendorsFound: number;
  };
  shows?: any[];
  vendors?: any[];
  status: 'pending' | 'pending_review' | 'approved' | 'rejected' | 'needs_review';
  createdAt: string;
  updatedAt: string;
  rejectionReason?: string;
  reviewComments?: string;
  vendorId?: string;
  vendor?: any; // Vendor entity
  parsingLogs?: Array<{
    timestamp: Date;
    level: 'info' | 'success' | 'warning' | 'error';
    message: string;
  }>;
}

export interface UrlToParse {
  id: number;
  url: string;
  name?: string;
  isApproved: boolean;
  hasBeenParsed: boolean;
  city?: string;
  state?: string;
  submittedBy?: {
    id: number;
    username: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface ParserLogEntry {
  id: string;
  message: string;
  timestamp: Date;
  level: 'info' | 'success' | 'warning' | 'error';
}

export interface ParserSummary {
  pageName?: string;
  imagesFound: number;
  imagesParsed: number;
  totalVenues: number;
  totalShows: number;
  totalDJs: number;
  totalVendors: number;
  status: 'idle' | 'parsing' | 'completed' | 'error';
  currentStep?: string;
  lastUpdated: Date;
}

export class ParserStore {
  pendingReviews: ParsedScheduleItem[] = [];
  urlsToParse: UrlToParse[] = [];
  parsingLog: ParserLogEntry[] = [];
  parserSummary: ParserSummary = {
    imagesFound: 0,
    imagesParsed: 0,
    totalVenues: 0,
    totalShows: 0,
    totalDJs: 0,
    totalVendors: 0,
    status: 'idle',
    lastUpdated: new Date(),
  };
  isLoading = false;
  error: string | null = null;
  isInitialized = false;
  parsingStartTime: Date | null = null;
  parsingElapsedTime = 0;
  parsingTimer: number | null = null;
  summaryUpdateTimer: number | null = null;
  lastCompletedParsingTime: number | null = null; // Track the final completion time
  socket: Socket | null = null;
  urlFilter: 'all' | 'unparsed' | 'approved-and-unparsed' = 'all';

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

    // Listen for Facebook parser logs (from the new Facebook parser service)
    socket.on(
      'facebook-parsing-log',
      (logEntry: {
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

    // Clear logs when leaving the parser logs
    this.clearLog();
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

  setUrlFilter(filter: 'all' | 'unparsed' | 'approved-and-unparsed') {
    this.urlFilter = filter;
    this.fetchUrlsBasedOnFilter();
  }

  async fetchUrlsBasedOnFilter(): Promise<void> {
    switch (this.urlFilter) {
      case 'unparsed':
        await this.fetchUnparsedUrls();
        break;
      case 'approved-and-unparsed':
        await this.fetchApprovedAndUnparsedUrls();
        break;
      case 'all':
      default:
        await this.fetchUrlsToParse();
        break;
    }
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
      // Keep only the last 50 entries to prevent memory issues
      if (this.parsingLog.length > 50) {
        this.parsingLog = this.parsingLog.slice(-50);
      }

      // Update parser summary based on log content
      this.updateSummaryFromLogMessage(message, level);
    });
  }

  private updateSummaryFromLogMessage(message: string, level: string) {
    const updates: Partial<ParserSummary> = {};

    // Extract page name
    const pageNameMatch = message.match(/Page name.*?:\s*(.+?)(?:\s*$|\s*\[)/i);
    if (pageNameMatch) {
      updates.pageName = pageNameMatch[1].trim();
    }

    // Extract images found
    const imagesFoundMatch = message.match(/Found (\d+) images?/i);
    if (imagesFoundMatch) {
      updates.imagesFound = parseInt(imagesFoundMatch[1]);
      updates.status = 'parsing';
    }

    // Extract images parsed
    const imagesParsedMatch =
      message.match(/Parsed (\d+)\/(\d+) images?/i) ||
      message.match(/Processing image (\d+) of (\d+)/i);
    if (imagesParsedMatch) {
      updates.imagesParsed = parseInt(imagesParsedMatch[1]);
      updates.imagesFound = parseInt(imagesParsedMatch[2]);
      updates.status = 'parsing';
    }

    // Extract venues/shows/DJs/vendors found
    const venuesMatch = message.match(/(\d+) venues?/i);
    if (venuesMatch) {
      updates.totalVenues = parseInt(venuesMatch[1]);
    }

    const showsMatch = message.match(/(\d+) shows?/i);
    if (showsMatch) {
      updates.totalShows = parseInt(showsMatch[1]);
    }

    const djsMatch = message.match(/(\d+) (?:DJs?|hosts?)/i);
    if (djsMatch) {
      updates.totalDJs = parseInt(djsMatch[1]);
    }

    const vendorsMatch = message.match(/(\d+) vendors?/i);
    if (vendorsMatch) {
      updates.totalVendors = parseInt(vendorsMatch[1]);
    }

    // Detect current step
    if (message.includes('Starting') || message.includes('Initializing')) {
      updates.status = 'parsing';
      updates.currentStep = 'Initializing';
    } else if (message.includes('Analyzing page')) {
      updates.currentStep = 'Analyzing page structure';
    } else if (message.includes('Finding images')) {
      updates.currentStep = 'Finding images';
    } else if (message.includes('Processing image')) {
      updates.currentStep = 'Processing images';
    } else if (message.includes('Extracting data')) {
      updates.currentStep = 'Extracting data';
    } else if (message.includes('Validating')) {
      updates.currentStep = 'Validating results';
    } else if (message.includes('Completed') || message.includes('Finished')) {
      updates.status = 'completed';
      updates.currentStep = 'Completed';
    }

    // Detect errors
    if (level === 'error') {
      updates.status = 'error';
    }

    // Apply updates if any
    if (Object.keys(updates).length > 0) {
      this.updateParserSummary(updates);
    }
  }

  clearLog() {
    runInAction(() => {
      this.parsingLog = [];
    });
  }

  updateParserSummary(updates: Partial<ParserSummary>) {
    runInAction(() => {
      this.parserSummary = {
        ...this.parserSummary,
        ...updates,
        lastUpdated: new Date(),
      };
    });
  }

  resetParserSummary() {
    runInAction(() => {
      this.parserSummary = {
        imagesFound: 0,
        imagesParsed: 0,
        totalVenues: 0,
        totalShows: 0,
        totalDJs: 0,
        totalVendors: 0,
        status: 'idle',
        lastUpdated: new Date(),
      };
    });
  }

  // Public method to clear logs when needed (e.g., when switching between pages)
  clearParsingLogs() {
    this.clearLog();
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

    // Start the summary update timer (every 10 seconds)
    this.summaryUpdateTimer = window.setInterval(() => {
      runInAction(() => {
        this.parserSummary.lastUpdated = new Date();
      });
    }, 10000);
  }

  stopParsingTimer() {
    if (this.parsingTimer) {
      window.clearInterval(this.parsingTimer);
      this.parsingTimer = null;
    }
    if (this.summaryUpdateTimer) {
      window.clearInterval(this.summaryUpdateTimer);
      this.summaryUpdateTimer = null;
    }
    runInAction(() => {
      // Save the final completion time before clearing
      if (this.parsingStartTime) {
        this.lastCompletedParsingTime = Date.now() - this.parsingStartTime.getTime();
      }
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
      const status = response?.data;

      // Check if status exists and has the expected structure
      if (!status || typeof status.isCurrentlyParsing === 'undefined') {
        console.warn('Invalid parsing status response:', status);
        return false;
      }

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
      // Don't throw the error, just return false to indicate no parsing is active
      return false;
    }
  }

  getFormattedElapsedTime(): string {
    const seconds = Math.floor(this.parsingElapsedTime / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  getFormattedCompletionTime(): string {
    if (this.lastCompletedParsingTime === null) {
      return 'N/A';
    }
    const seconds = Math.floor(this.lastCompletedParsingTime / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    } else {
      return `${remainingSeconds}s`;
    }
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

      // Reset parser summary for new parsing session
      this.resetParserSummary();

      const result = await apiStore.post('/parser/parse-url', { url });

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

      // Clear previous logs when starting a new test parse
      this.clearLog();

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

      // Clear previous logs when starting a new parse
      this.clearLog();

      // Reset parser summary for new parsing session
      this.resetParserSummary();

      this.startParsingTimer();

      this.addLogEntry(`Starting parse for URL: ${url}`, 'info');
      this.addLogEntry(`Using ${parseMethod} parsing method`, 'info');
      this.addLogEntry('Fetching webpage content...', 'info');

      // Use the new unified parser endpoint that auto-detects URL type
      const result = await apiStore.post('/parser/parse-url', {
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
        errorMessage = 'Parsing request timed out - the server may be processing a complex website';
        this.addLogEntry(
          'Parsing timed out - try increasing timeout or check server logs',
          'error',
        );
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

  /**
   * Cancel the current parsing operation
   */
  async cancelParsing(): Promise<{
    success: boolean;
    error?: string;
    message?: string;
  }> {
    try {
      this.addLogEntry('🛑 Cancellation requested by user...', 'warning');

      // Call the emergency cancel endpoint
      const result = await apiStore.post('/parser/emergency-cancel');

      if (result.success) {
        this.addLogEntry('✅ Parsing operation cancelled successfully', 'success');
        this.stopParsingTimer();
        this.setLoading(false);

        return {
          success: true,
          message: 'Parsing operation cancelled successfully',
        };
      } else {
        this.addLogEntry('❌ Failed to cancel parsing operation', 'error');
        return {
          success: false,
          error: 'Failed to cancel parsing operation',
        };
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to cancel parsing operation';
      this.addLogEntry(`❌ Cancel error: ${errorMessage}`, 'error');
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Parse website using DeepSeek-V3.1 AI model with worker-based parallel processing
   */
  async parseWithDeepSeek(
    url: string,
    options: {
      usePuppeteer?: boolean;
      maxPages?: number;
      includeSubdomains?: boolean;
    } = {},
  ): Promise<{
    success: boolean;
    error?: string;
    data?: any;
    parsedScheduleId?: string;
  }> {
    try {
      this.setLoading(true);
      this.setError(null);
      this.clearLog();

      this.startParsingTimer();

      this.addLogEntry(
        `🧪 Starting comprehensive DeepSeek-V3.1 worker-based parsing for: ${url}`,
        'info',
      );
      this.addLogEntry(`🔧 Using DeepSeek-V3.1 AI with parallel worker architecture`, 'info');
      this.addLogEntry(
        `⚙️ Options: Puppeteer=${options.usePuppeteer ?? true}, MaxPages=${options.maxPages ?? 10}, Subdomains=${options.includeSubdomains ?? false}`,
        'info',
      );

      const result = await apiStore.post('/parser/parse-website', {
        url,
        usePuppeteer: options.usePuppeteer ?? true,
        maxPages: options.maxPages ?? 10,
        includeSubdomains: options.includeSubdomains ?? false,
      });

      if (result.success) {
        this.addLogEntry('✅ DeepSeek website parsing completed successfully!', 'success');

        if (result.summary) {
          this.addLogEntry(
            `📊 Comprehensive Results: ${result.summary.totalPages} pages, ${result.summary.totalShows} shows, ${result.summary.totalDJs} DJs, ${result.summary.totalVendors} vendors`,
            'success',
          );
        }

        // Log navigation discovery
        if (result.navLinks && result.navLinks.length > 0) {
          this.addLogEntry(`🔗 Discovered ${result.navLinks.length} navigation links`, 'info');
        }

        // Log per-page breakdown
        if (result.allPages && result.allPages.length > 0) {
          this.addLogEntry(`📄 Parsed ${result.allPages.length} pages:`, 'info');
          result.allPages.forEach((page: any, index: number) => {
            this.addLogEntry(
              `   ${index + 1}. ${page.url} - ${page.shows?.length || 0} shows, ${page.djs?.length || 0} DJs`,
              'info',
            );
          });
        }

        return {
          success: true,
          data: result.data,
          parsedScheduleId: result.parsedScheduleId,
        };
      } else {
        this.addLogEntry(`❌ DeepSeek parsing failed: ${result.error}`, 'error');
        this.setError(result.error || 'DeepSeek parsing failed');
        return {
          success: false,
          error: result.error || 'DeepSeek parsing failed',
        };
      }
    } catch (error: any) {
      let errorMessage = 'Failed to parse with DeepSeek';

      if (error.response?.status === 500) {
        errorMessage = 'DeepSeek API error - check configuration';
        this.addLogEntry('❌ DeepSeek API error - ensure DEEPSEEK_API_KEY is configured', 'error');
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
        this.addLogEntry(`❌ Server error: ${errorMessage}`, 'error');
      } else if (error.message) {
        errorMessage = error.message;
        this.addLogEntry(`❌ Network error: ${errorMessage}`, 'error');
      } else {
        this.addLogEntry('❌ Unknown error during DeepSeek parsing', 'error');
      }

      this.setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      this.stopParsingTimer();
      this.setLoading(false);
    }
  }

  /**
   * Get DeepSeek status and test connection
   */
  async getDeepSeekStatus(): Promise<{
    success: boolean;
    status?: any;
    connectionTest?: any;
    error?: string;
  }> {
    try {
      const result = await apiStore.get('/parser/test-deepseek');
      return {
        success: true,
        status: result.status,
        connectionTest: result.connectionTest,
      };
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to get DeepSeek status';
      return {
        success: false,
        error: errorMessage,
      };
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

      // Refresh statistics to update admin counts after approval
      try {
        const { adminStore } = await import('./AdminStore');
        await adminStore.fetchStatistics();
      } catch (error) {
        console.warn('Failed to refresh statistics after approval:', error);
      }

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

      // Refresh statistics to update admin counts after approval
      try {
        const { adminStore } = await import('./AdminStore');
        await adminStore.fetchStatistics();
      } catch (error) {
        console.warn('Failed to refresh statistics after approval:', error);
      }

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

  async fetchUnparsedUrls(): Promise<void> {
    try {
      this.setLoading(true);
      this.setError(null);

      const response = await apiStore.get('/parser/urls/unparsed');

      runInAction(() => {
        this.urlsToParse = Array.isArray(response) ? response : [];
      });
    } catch (error: any) {
      console.error('Error fetching unparsed URLs:', error);
      const errorMessage = error.response?.data?.message || 'Failed to fetch unparsed URLs';
      this.setError(errorMessage);
      runInAction(() => {
        this.urlsToParse = [];
      });
    } finally {
      this.setLoading(false);
    }
  }

  async fetchApprovedAndUnparsedUrls(): Promise<void> {
    try {
      this.setLoading(true);
      this.setError(null);

      const response = await apiStore.get('/parser/urls/approved-and-unparsed');

      runInAction(() => {
        this.urlsToParse = Array.isArray(response) ? response : [];
      });
    } catch (error: any) {
      console.error('Error fetching approved and unparsed URLs:', error);
      const errorMessage =
        error.response?.data?.message || 'Failed to fetch approved and unparsed URLs';
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

  async markUrlAsParsed(id: number): Promise<{ success: boolean; error?: string }> {
    try {
      this.setLoading(true);
      this.setError(null);

      await apiStore.post(`/parser/urls/${id}/mark-parsed`);

      // Refresh the list after marking as parsed
      await this.fetchUrlsToParse();

      return { success: true };
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to mark URL as parsed';
      this.setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      this.setLoading(false);
    }
  }

  async markUrlAsUnparsed(id: number): Promise<{ success: boolean; error?: string }> {
    try {
      this.setLoading(true);
      this.setError(null);

      await apiStore.post(`/parser/urls/${id}/mark-unparsed`);

      // Refresh the list after marking as unparsed
      await this.fetchUrlsToParse();

      return { success: true };
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to mark URL as unparsed';
      this.setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      this.setLoading(false);
    }
  }

  async getUnapprovedUrls(): Promise<{ success: boolean; data?: UrlToParse[]; error?: string }> {
    try {
      this.setLoading(true);
      this.setError(null);

      const response = await apiStore.get('/parser/urls/unapproved');
      // Normalize to array in case the transport layer wraps the result
      const data = Array.isArray(response)
        ? response
        : Array.isArray((response as any)?.data)
          ? (response as any).data
          : [];

      return { success: true, data };
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to fetch unapproved URLs';
      this.setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      this.setLoading(false);
    }
  }

  async approveUrl(id: number): Promise<{ success: boolean; error?: string }> {
    try {
      this.setLoading(true);
      this.setError(null);

      await apiStore.post(`/parser/urls/${id}/approve`);

      // Refresh the list after approving
      await this.fetchUrlsToParse();

      return { success: true };
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to approve URL';
      this.setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      this.setLoading(false);
    }
  }

  async unapproveUrl(id: number): Promise<{ success: boolean; error?: string }> {
    try {
      this.setLoading(true);
      this.setError(null);

      await apiStore.post(`/parser/urls/${id}/unapprove`);

      // Refresh the list after unapproving
      await this.fetchUrlsToParse();

      return { success: true };
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to unapprove URL';
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

      await apiStore.post('/parser/parse-url', { url });

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

  // Update URL city/state information
  async updateUrlCityState(
    id: number,
    city?: string,
    state?: string,
    name?: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      this.setLoading(true);
      this.setError(null);

      const updateData: { name?: string; city?: string; state?: string } = {};
      if (name !== undefined) updateData.name = name;
      if (city !== undefined) updateData.city = city;
      if (state !== undefined) updateData.state = state;

      await apiStore.put(`/parser/urls/${id}`, updateData);

      // Refresh the list after updating
      await this.fetchUrlsToParse();

      return { success: true };
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to update URL';
      this.setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      this.setLoading(false);
    }
  }

  // Image analysis methods for user submissions
  async analyzeUserImage(data: {
    image: string;
    vendorId?: string | null;
  }): Promise<{ success: boolean; error?: string; data?: any }> {
    try {
      this.setLoading(true);
      this.setError(null);

      // Convert single image to screenshots array and add vendor context
      const requestBody = {
        screenshots: [data.image],
        isAdminUpload: true, // Use admin upload flow for user images with vendor
        vendor: data.vendorId || 'user-submission',
        description: 'User uploaded image for karaoke show analysis',
      };

      const response = await apiStore.post('/parser/analyze-screenshots', requestBody);

      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to analyze image';
      this.setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      this.setLoading(false);
    }
  }

  async submitImageAnalysis(data: any): Promise<{ success: boolean; error?: string }> {
    try {
      this.setLoading(true);
      this.setError(null);

      await apiStore.post('/parser/submit-image-analysis', data);

      return { success: true };
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to submit analysis';
      this.setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      this.setLoading(false);
    }
  }
}

export const parserStore = new ParserStore();
