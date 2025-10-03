import { makeAutoObservable, runInAction } from 'mobx';
import { io, Socket } from 'socket.io-client';
import { locationService, NearbyShow } from '../services/LocationService';
import {
  AnnouncementMessage,
  ChatMessage,
  ChatMessageType,
  JoinShowResponse,
  LiveShow,
  LiveShowEvent,
  LiveShowEventType,
  LiveShowUIState,
  QueueEntry,
} from '../types/live-show.types';
import { LiveShowUtils } from '../utils/live-show.utils';
import { apiStore } from './ApiStore';
import { authStore } from './index';

export class LiveShowStore {
  // Socket connection
  socket: Socket | null = null;
  isConnected = false;

  // Current show state
  currentShow: LiveShow | null = null;
  currentUserRole: 'dj' | 'singer' | null = null;
  userQueuePosition?: number;

  // Available shows
  availableShows: LiveShow[] = [];

  // Chat and messaging
  chatMessages: ChatMessage[] = [];
  currentAnnouncement: AnnouncementMessage | null = null;
  unreadMessages = 0;

  // UI state
  uiState: LiveShowUIState = {
    sidebarOpen: false,
    chatOpen: true,
    queueOpen: true,
    announcementDialogOpen: false,
    messageDialogOpen: false,
    currentChatFilter: 'all',
  };

  // Loading and error states
  isLoading = false;
  error: string | null = null;
  lastError: {
    code?: string;
    message: string;
    timestamp: number;
    retryable: boolean;
    operation?: string;
  } | null = null;
  retryCount = 0;
  maxRetries = 3;

  // Location-based show detection
  nearbyShows: NearbyShow[] = [];
  isCheckingNearbyShows = false;
  nearbyShowsError: string | null = null;
  showNearbyModal = false;
  hasCheckedNearbyOnLoad = false;
  showDashboardPrompt = false;
  dismissedDashboardPrompt = false;
  isJoining = false;

  constructor() {
    makeAutoObservable(this);
    this.connectSocket();
  }

  /**
   * Retry last failed operation
   */
  async retryLastOperation() {
    if (!this.lastError || !this.lastError.retryable || this.retryCount >= this.maxRetries) {
      return false;
    }

    this.retryCount++;
    this.clearError();

    try {
      switch (this.lastError.operation) {
        case 'checkNearbyShows':
          await this.checkNearbyShows();
          break;
        case 'joinShow':
          // Would need show ID stored - could implement if needed
          break;
        default:
          return false;
      }
      return true;
    } catch (error) {
      // Handle the retry failure
      runInAction(() => {
        this.error = 'Retry failed. Please try again later.';
      });
      return false;
    }
  }

  // Socket Connection Management
  private connectSocket() {
    if (this.socket?.connected) return;

    this.socket = io(`${apiStore.websocketURL}/live-shows`, {
      transports: ['websocket', 'polling'],
      withCredentials: true,
      autoConnect: false,
    });

    this.setupSocketListeners();
  }

  private setupSocketListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      runInAction(() => {
        this.isConnected = true;
      });

      // Authenticate with the socket
      if (authStore.user) {
        this.socket!.emit('authenticate', {
          userId: authStore.user.id,
          userName: authStore.user.name,
          token: authStore.token,
        });
      }
    });

    this.socket.on('disconnect', () => {
      runInAction(() => {
        this.isConnected = false;
      });
    });

    this.socket.on('authenticated', (data: { success: boolean }) => {
      console.log('🎤 Authenticated with live show socket:', data);
    });

    this.socket.on('error', (error: { message: string }) => {
      runInAction(() => {
        this.error = error.message;
      });
      console.error('Live show socket error:', error);
    });

    // Show events
    this.socket.on('show-joined', (data: JoinShowResponse) => {
      runInAction(() => {
        this.currentShow = data.show;
        this.currentUserRole = data.userRole;
        this.userQueuePosition = data.queuePosition;
        this.isLoading = false;
      });
    });

    this.socket.on('show-left', (data: { success: boolean; showId: string }) => {
      runInAction(() => {
        if (this.currentShow?.id === data.showId) {
          this.currentShow = null;
          this.currentUserRole = null;
          this.userQueuePosition = undefined;
          this.chatMessages = [];
        }
      });
    });

    // Real-time events
    this.socket.on('show-event', (event: LiveShowEvent) => {
      this.handleShowEvent(event);
    });

    // Chat messages
    this.socket.on('chat-message', (message: ChatMessage) => {
      runInAction(() => {
        this.chatMessages.push(message);

        // Increment unread if chat is not visible or message is not from current user
        if (!this.uiState.chatOpen || message.senderId !== authStore.user?.id) {
          this.unreadMessages++;
        }

        // Keep only last 100 messages
        if (this.chatMessages.length > 100) {
          this.chatMessages = this.chatMessages.slice(-100);
        }
      });
    });

    // Announcements
    this.socket.on('announcement', (announcement: AnnouncementMessage) => {
      runInAction(() => {
        this.currentAnnouncement = announcement;
      });

      // Auto-hide announcement after duration
      setTimeout(() => {
        runInAction(() => {
          if (this.currentAnnouncement?.id === announcement.id) {
            this.currentAnnouncement = null;
          }
        });
      }, announcement.displayDuration * 1000);
    });

    // DJ Song Requests
    this.socket.on(
      'dj-song-request-received',
      (data: {
        fromUserId: string;
        fromUserName: string;
        songRequest: string;
        timestamp: Date;
      }) => {
        if (this.currentUserRole === 'dj') {
          // Add as a system message visible to DJ
          runInAction(() => {
            const message: ChatMessage = {
              id: `song-request-${Date.now()}`,
              showId: this.currentShow?.id || '',
              senderId: 'system',
              senderName: 'Song Request',
              message: `🎵 ${data.fromUserName} requests: "${data.songRequest}"`,
              type: ChatMessageType.SYSTEM,
              timestamp: new Date(data.timestamp),
              isVisible: true,
            };
            this.chatMessages.push(message);
          });
        }
      },
    );

    // Queue updates
    this.socket.on('queue-updated', (data: { queue: QueueEntry[]; currentSinger?: QueueEntry }) => {
      runInAction(() => {
        if (this.currentShow) {
          this.currentShow.queue = data.queue;
          if (authStore.user) {
            this.userQueuePosition = LiveShowUtils.getUserQueuePosition(
              authStore.user.id,
              data.queue,
            );
          }
        }
      });
    });
  }

  // Connection management
  connect() {
    if (this.socket && !this.socket.connected) {
      this.socket.connect();
    }
  }

  disconnect() {
    if (this.socket?.connected) {
      this.socket.disconnect();
    }
    runInAction(() => {
      this.isConnected = false;
      this.currentShow = null;
      this.currentUserRole = null;
      this.chatMessages = [];
    });
  }

  // Show Management
  async getActiveShows(): Promise<void> {
    try {
      runInAction(() => {
        this.isLoading = true;
        this.error = null;
      });

      const response = await apiStore.get('/live-shows');
      if (response.success) {
        runInAction(() => {
          this.availableShows = response.shows || [];
        });
      }
    } catch (error: any) {
      runInAction(() => {
        this.error = error.message || 'Failed to fetch shows';
      });
    } finally {
      runInAction(() => {
        this.isLoading = false;
      });
    }
  }

  async createShow(
    name: string,
    description?: string,
    startTime?: Date,
    endTime?: Date,
  ): Promise<boolean> {
    try {
      runInAction(() => {
        this.isLoading = true;
        this.error = null;
      });

      const response = await apiStore.post('/live-shows', {
        name,
        description,
        startTime: startTime || new Date(),
        endTime,
        djId: authStore.user?.djId ? authStore.user.id : undefined,
      });

      if (response.success) {
        await this.getActiveShows();
        return true;
      }

      return false;
    } catch (error: any) {
      runInAction(() => {
        this.error = error.message || 'Failed to create show';
      });
      return false;
    } finally {
      runInAction(() => {
        this.isLoading = false;
      });
    }
  }

  async joinShow(showId: string, avatarId?: string, microphoneId?: string): Promise<boolean> {
    if (!this.socket?.connected || !authStore.user) {
      runInAction(() => {
        this.error = 'Not connected or authenticated';
      });
      return false;
    }

    try {
      runInAction(() => {
        this.isLoading = true;
        this.error = null;
      });

      this.socket.emit('join-show', {
        showId,
        userId: authStore.user.id,
        avatarId,
        microphoneId,
      });

      return true;
    } catch (error: any) {
      runInAction(() => {
        this.error = error.message || 'Failed to join show';
        this.isLoading = false;
      });
      return false;
    }
  }

  async leaveShow(): Promise<void> {
    if (!this.socket?.connected || !this.currentShow || !authStore.user) return;

    this.socket.emit('leave-show', {
      showId: this.currentShow.id,
      userId: authStore.user.id,
    });
  }

  // Chat and Messaging
  sendMessage(
    message: string,
    type: ChatMessageType = ChatMessageType.SINGER_CHAT,
    recipientId?: string,
  ): void {
    if (!this.socket?.connected || !this.currentShow || !authStore.user) return;

    const validation = LiveShowUtils.validateMessage(message);
    if (!validation.valid) {
      runInAction(() => {
        this.error = validation.error!;
      });
      return;
    }

    this.socket.emit('send-chat-message', {
      showId: this.currentShow.id,
      message: LiveShowUtils.sanitizeInput(message),
      type,
      recipientId,
    });
  }

  sendAnnouncement(message: string, displayDuration: number = 10): void {
    if (!this.socket?.connected || !this.currentShow || !authStore.user) return;

    const validation = LiveShowUtils.validateAnnouncement(message);
    if (!validation.valid) {
      runInAction(() => {
        this.error = validation.error!;
      });
      return;
    }

    this.socket.emit('send-announcement', {
      showId: this.currentShow.id,
      message: LiveShowUtils.sanitizeInput(message),
      displayDuration,
    });
  }

  // Queue Management
  addToQueue(songRequest?: string): void {
    if (!this.socket?.connected || !this.currentShow || !authStore.user) return;

    this.socket.emit('add-to-queue', {
      showId: this.currentShow.id,
      songRequest,
    });
  }

  removeFromQueue(userId?: string): void {
    if (!this.socket?.connected || !this.currentShow || !authStore.user) return;

    this.socket.emit('remove-from-queue', {
      showId: this.currentShow.id,
      userId: userId || authStore.user.id,
    });
  }

  reorderQueue(queueOrder: string[]): void {
    if (!this.socket?.connected || !this.currentShow || !authStore.user) return;
    if (this.currentUserRole !== 'dj') return;

    this.socket.emit('reorder-queue', {
      showId: this.currentShow.id,
      queueOrder,
    });
  }

  reorderSingers(singerOrder: string[]): void {
    if (!this.socket?.connected || !this.currentShow || !authStore.user) return;
    if (this.currentUserRole !== 'dj') return;

    // Use API call instead of websocket for singer reordering
    apiStore
      .post(`/live-shows/${this.currentShow.id}/singers/reorder`, {
        singerOrder,
      })
      .then((response) => {
        if (response.success) {
          console.log('Singer rotation reordered successfully');
          // The queue will be updated via websocket events
        } else {
          console.error('Failed to reorder singer rotation:', response.message);
        }
      })
      .catch((error) => {
        console.error('Error reordering singer rotation:', error);
      });
  }

  setCurrentSinger(singerId: string): void {
    if (!this.socket?.connected || !this.currentShow || !authStore.user) return;
    if (this.currentUserRole !== 'dj') return;

    this.socket.emit('set-current-singer', {
      showId: this.currentShow.id,
      singerId,
    });
  }

  // Song timing methods
  startSong(userId: string): void {
    if (!this.socket?.connected || !this.currentShow || !authStore.user) return;
    if (this.currentUserRole !== 'dj') return;

    this.socket.emit('start-song', {
      showId: this.currentShow.id,
      userId,
      startTime: new Date(),
    });
  }

  setSongDuration(userId: string, duration: number): void {
    if (!this.socket?.connected || !this.currentShow || !authStore.user) return;
    if (this.currentUserRole !== 'dj') return;

    this.socket.emit('set-song-duration', {
      showId: this.currentShow.id,
      userId,
      duration,
    });
  }

  // Send song request to DJ
  requestSongFromDJ(songRequest: string): void {
    if (!this.socket?.connected || !this.currentShow || !authStore.user) return;
    if (this.currentUserRole === 'dj') return; // DJs don't request songs from themselves

    this.socket.emit('dj-song-request', {
      showId: this.currentShow.id,
      songRequest,
      fromUserId: authStore.user.id,
      fromUserName: authStore.user.name || authStore.user.stageName,
    });
  }

  // Event handling
  private handleShowEvent(event: LiveShowEvent): void {
    runInAction(() => {
      switch (event.type) {
        case LiveShowEventType.USER_JOINED:
          if (this.currentShow && event.data.userId !== authStore.user?.id) {
            // Add system message
            this.addSystemMessage(`${event.data.userName} joined the show`);
          }
          break;

        case LiveShowEventType.USER_LEFT:
          if (this.currentShow && event.data.userId !== authStore.user?.id) {
            this.addSystemMessage(`${event.data.userName} left the show`);
          }
          break;

        case LiveShowEventType.CURRENT_SINGER_CHANGED:
          if (this.currentShow) {
            const singer = this.currentShow.participants.find(
              (p) => p.userId === event.data.currentSingerId,
            );
            if (singer) {
              this.addSystemMessage(`${LiveShowUtils.getDisplayName(singer)} is now singing!`);
            }
          }
          break;

        case LiveShowEventType.ANNOUNCEMENT_EXPIRED:
          if (this.currentAnnouncement?.id === event.data.announcementId) {
            this.currentAnnouncement = null;
          }
          break;
      }
    });
  }

  private addSystemMessage(message: string): void {
    const systemMessage: ChatMessage = {
      id: LiveShowUtils.generateTempId(),
      showId: this.currentShow!.id,
      senderId: 'system',
      senderName: 'System',
      message,
      type: ChatMessageType.SYSTEM,
      timestamp: new Date(),
      isVisible: true,
    };

    this.chatMessages.push(systemMessage);
  }

  // UI State Management
  toggleSidebar(): void {
    runInAction(() => {
      this.uiState.sidebarOpen = !this.uiState.sidebarOpen;
    });
  }

  toggleChat(): void {
    runInAction(() => {
      this.uiState.chatOpen = !this.uiState.chatOpen;
      if (this.uiState.chatOpen) {
        this.unreadMessages = 0;
      }
    });
  }

  toggleQueue(): void {
    runInAction(() => {
      this.uiState.queueOpen = !this.uiState.queueOpen;
    });
  }

  setChatFilter(filter: ChatMessageType | 'all'): void {
    runInAction(() => {
      this.uiState.currentChatFilter = filter;
    });
  }

  openAnnouncementDialog(): void {
    runInAction(() => {
      this.uiState.announcementDialogOpen = true;
    });
  }

  closeAnnouncementDialog(): void {
    runInAction(() => {
      this.uiState.announcementDialogOpen = false;
    });
  }

  openMessageDialog(participantId: string): void {
    runInAction(() => {
      this.uiState.messageDialogOpen = true;
      this.uiState.selectedParticipantId = participantId;
    });
  }

  closeMessageDialog(): void {
    runInAction(() => {
      this.uiState.messageDialogOpen = false;
      this.uiState.selectedParticipantId = undefined;
    });
  }

  clearError(): void {
    runInAction(() => {
      this.error = null;
    });
  }

  // Computed getters
  get filteredMessages(): ChatMessage[] {
    if (!authStore.user) return [];

    // Convert ChatMessageType enum to string literals
    let filterString: 'all' | 'singer_chat' | 'dj_messages' | 'announcements';
    if (this.uiState.currentChatFilter === 'all') {
      filterString = 'all';
    } else if (this.uiState.currentChatFilter === ChatMessageType.SINGER_CHAT) {
      filterString = 'singer_chat';
    } else if (this.uiState.currentChatFilter === ChatMessageType.DJ_TO_SINGER) {
      filterString = 'dj_messages';
    } else if (this.uiState.currentChatFilter === ChatMessageType.ANNOUNCEMENT) {
      filterString = 'announcements';
    } else {
      filterString = 'all'; // fallback
    }

    return LiveShowUtils.filterMessages(
      this.chatMessages,
      authStore.user.id,
      this.currentUserRole === 'dj',
      filterString,
    );
  }

  get currentSinger(): QueueEntry | undefined {
    if (!this.currentShow) return undefined;
    return LiveShowUtils.getCurrentSinger(this.currentShow.queue);
  }

  get nextSingers(): QueueEntry[] {
    if (!this.currentShow) return [];
    return LiveShowUtils.getNextSingers(this.currentShow.queue, 3);
  }

  get isUserInQueue(): boolean {
    if (!this.currentShow || !authStore.user) return false;
    return LiveShowUtils.isUserInQueue(authStore.user.id, this.currentShow.queue);
  }

  get canManageQueue(): boolean {
    return this.currentUserRole === 'dj';
  }

  get canSendAnnouncements(): boolean {
    return this.currentUserRole === 'dj';
  }

  get hasDJ(): boolean {
    return Boolean(this.currentShow?.djId);
  }

  get onlineParticipantCount(): number {
    if (!this.currentShow) return 0;
    return LiveShowUtils.getOnlineParticipantCount(this.currentShow.participants);
  }

  get queueStats() {
    if (!this.currentShow) return null;
    return LiveShowUtils.getQueueStats(this.currentShow.queue, authStore.user?.id);
  }

  // Location-based computed properties
  get shouldShowDashboardPrompt(): boolean {
    return (
      !this.currentShow &&
      !this.dismissedDashboardPrompt &&
      !this.showNearbyModal &&
      this.nearbyShows.length > 0 &&
      authStore.isAuthenticated
    );
  }

  get shouldShowFloatingButton(): boolean {
    return !!this.currentShow && this.isConnected;
  }

  // Location-based actions
  async checkNearbyShowsOnLoad(): Promise<void> {
    if (this.hasCheckedNearbyOnLoad || !authStore.isAuthenticated) {
      return;
    }

    try {
      this.hasCheckedNearbyOnLoad = true;
      await this.checkNearbyShows();

      // Show modal if we found nearby shows
      if (this.nearbyShows.length > 0) {
        this.showNearbyModal = true;
      }
    } catch (error) {
      console.error('Error checking nearby shows on load:', error);
    }
  }

  async checkNearbyShows(): Promise<void> {
    if (!authStore.isAuthenticated) {
      return;
    }

    try {
      runInAction(() => {
        this.isCheckingNearbyShows = true;
        this.nearbyShowsError = null;
        this.clearError();
      });

      // Find nearby shows (locationService handles getting current location internally)
      const nearbyShows = await locationService.findNearbyShows(undefined, 30); // 30 meter radius

      runInAction(() => {
        this.nearbyShows = nearbyShows;
        this.isCheckingNearbyShows = false;

        // Show dashboard prompt if user hasn't dismissed and not showing modal
        if (nearbyShows.length > 0 && !this.showNearbyModal && !this.dismissedDashboardPrompt) {
          this.showDashboardPrompt = true;
        }
      });
    } catch (error: any) {
      // Enhanced error handling with retry logic
      runInAction(() => {
        this.isCheckingNearbyShows = false;

        // Store detailed error information for retry functionality
        this.lastError = {
          code: error.code || 'UNKNOWN',
          message: error.userMessage || error.message || 'Failed to check nearby shows',
          timestamp: Date.now(),
          retryable: error.retryable !== false,
          operation: 'checkNearbyShows',
        };

        // Set user-friendly error message
        this.nearbyShowsError =
          error.userMessage ||
          (error.code === 'PERMISSION_DENIED'
            ? 'Location access required to find nearby shows'
            : error.code === 'NETWORK_ERROR'
              ? 'Connection issue. Please check your internet.'
              : 'Unable to find nearby shows. Please try again.');

        console.error('Error checking nearby shows:', error);
      });
    }
  }

  async joinShowWithLocation(showId: string, userLat: number, userLng: number): Promise<void> {
    if (!authStore.isAuthenticated) {
      throw new Error('Must be authenticated to join show');
    }

    try {
      this.isJoining = true;

      const response = await apiStore.post(`/live-shows/${showId}/join`, {
        userLatitude: userLat,
        userLongitude: userLng,
        // avatarId: authStore.user?.equippedAvatar?.id,
        // microphoneId: authStore.user?.equippedMicrophone?.id,
      });

      if (response.success) {
        runInAction(() => {
          this.currentShow = response.show;
          this.currentUserRole = response.userRole;
          this.userQueuePosition = response.queuePosition;

          // Clear nearby shows state
          this.showNearbyModal = false;
          this.showDashboardPrompt = false;
          this.nearbyShows = [];
        });
      } else {
        throw new Error(response.message || 'Failed to join show');
      }
    } catch (error) {
      throw error;
    } finally {
      runInAction(() => {
        this.isJoining = false;
      });
    }
  }

  async joinShowDirectly(
    showId: string,
    avatarId?: string,
    microphoneId?: string,
  ): Promise<boolean> {
    if (!authStore.isAuthenticated) {
      runInAction(() => {
        this.error = 'Must be authenticated to join show';
      });
      return false;
    }

    try {
      runInAction(() => {
        this.isJoining = true;
        this.error = null;
      });

      const response = await apiStore.post(`/live-shows/${showId}/join`, {
        // No location provided - will allow test mode join
        avatarId,
        microphoneId,
      });

      if (response.success) {
        runInAction(() => {
          this.currentShow = response.show;
          this.currentUserRole = response.userRole;
          this.userQueuePosition = response.queuePosition;
          this.isJoining = false;

          // Clear nearby shows state
          this.showNearbyModal = false;
          this.showDashboardPrompt = false;
          this.nearbyShows = [];
        });
        return true;
      } else {
        throw new Error(response.message || 'Failed to join show');
      }
    } catch (error: any) {
      runInAction(() => {
        this.error = error.response?.data?.message || error.message || 'Failed to join show';
        this.isJoining = false;
      });
      return false;
    }
  }

  dismissNearbyModal = () => {
    this.showNearbyModal = false;
    this.showDashboardPrompt = true; // Show dashboard prompt instead
  };

  dismissDashboardPrompt = () => {
    this.showDashboardPrompt = false;
    this.dismissedDashboardPrompt = true;

    // Clear nearby shows after dismissing
    setTimeout(() => {
      this.nearbyShows = [];
    }, 5000);
  };

  resetLocationState = () => {
    this.nearbyShows = [];
    this.showNearbyModal = false;
    this.showDashboardPrompt = false;
    this.dismissedDashboardPrompt = false;
    this.hasCheckedNearbyOnLoad = false;
    this.nearbyShowsError = null;
  };

  // Cleanup
  destroy(): void {
    this.disconnect();
    this.resetLocationState();
  }
}

// Create singleton instance
export const liveShowStore = new LiveShowStore();
