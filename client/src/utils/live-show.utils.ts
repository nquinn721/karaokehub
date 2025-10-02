// Frontend Live Show Utilities
import {
  AnnouncementMessage,
  ChatMessage,
  ChatMessageType,
  LiveShow,
  QueueEntry,
  ShowParticipant,
} from '../types/live-show.types';

export class LiveShowUtils {
  /**
   * Generate a unique message ID
   */
  static generateMessageId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `msg_${timestamp}_${random}`;
  }

  /**
   * Check if user is DJ in a show
   */
  static isUserDJ(userId: string, show: LiveShow): boolean {
    return show.djId === userId;
  }

  /**
   * Get user's queue position
   */
  static getUserQueuePosition(userId: string, queue: QueueEntry[]): number | undefined {
    const entry = queue.find((entry) => entry.userId === userId);
    return entry?.position;
  }

  /**
   * Check if user is in queue
   */
  static isUserInQueue(userId: string, queue: QueueEntry[]): boolean {
    return queue.some((entry) => entry.userId === userId);
  }

  /**
   * Sort queue by position
   */
  static sortQueueByPosition(queue: QueueEntry[]): QueueEntry[] {
    return [...queue].sort((a, b) => a.position - b.position);
  }

  /**
   * Get current singer from queue
   */
  static getCurrentSinger(queue: QueueEntry[]): QueueEntry | undefined {
    return queue.find((entry) => entry.isCurrentSinger);
  }

  /**
   * Get next singers in queue
   */
  static getNextSingers(queue: QueueEntry[], count: number = 3): QueueEntry[] {
    const currentSinger = this.getCurrentSinger(queue);
    const currentPosition = currentSinger?.position || 0;

    return this.sortQueueByPosition(queue)
      .filter((entry) => entry.position > currentPosition)
      .slice(0, count);
  }

  /**
   * Filter messages for different chat views
   */
  static filterMessages(
    messages: ChatMessage[],
    userId: string,
    isDJ: boolean,
    filter: 'all' | 'singer_chat' | 'dj_messages' | 'announcements',
  ): ChatMessage[] {
    switch (filter) {
      case 'singer_chat':
        return messages.filter(
          (msg) =>
            (msg.type === ChatMessageType.SINGER_CHAT || msg.type === ChatMessageType.SYSTEM) &&
            this.isMessageVisibleToUser(msg, userId, isDJ),
        );
      case 'dj_messages':
        return messages.filter(
          (msg) =>
            msg.type === ChatMessageType.DJ_TO_SINGER && (isDJ || msg.recipientId === userId),
        );
      case 'announcements':
        return messages.filter((msg) => msg.type === ChatMessageType.ANNOUNCEMENT);
      case 'all':
      default:
        return messages.filter((msg) => this.isMessageVisibleToUser(msg, userId, isDJ));
    }
  }

  /**
   * Check if message is visible to user
   */
  static isMessageVisibleToUser(message: ChatMessage, userId: string, isDJ: boolean): boolean {
    switch (message.type) {
      case ChatMessageType.SINGER_CHAT:
        return !isDJ; // Singers only
      case ChatMessageType.DJ_TO_SINGER:
        return isDJ || message.recipientId === userId;
      case ChatMessageType.ANNOUNCEMENT:
      case ChatMessageType.SYSTEM:
        return true;
      default:
        return true;
    }
  }

  /**
   * Get user display name
   */
  static getDisplayName(participant: ShowParticipant): string {
    return participant.stageName || participant.userName;
  }

  /**
   * Format timestamp for chat display
   */
  static formatChatTime(timestamp: Date): string {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  /**
   * Format show time
   */
  static formatShowTime(startTime: Date, endTime?: Date): string {
    const start = new Date(startTime).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    if (endTime) {
      const end = new Date(endTime).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
      return `${start} - ${end}`;
    }

    return `${start} onwards`;
  }

  /**
   * Get show status
   */
  static getShowStatus(show: LiveShow): 'upcoming' | 'active' | 'ended' {
    const now = new Date();
    const startTime = new Date(show.startTime);
    const endTime = show.endTime ? new Date(show.endTime) : null;

    if (now < startTime) {
      return 'upcoming';
    }

    if (endTime && now > endTime) {
      return 'ended';
    }

    return 'active';
  }

  /**
   * Check if show is joinable
   */
  static isShowJoinable(show: LiveShow): boolean {
    const status = this.getShowStatus(show);
    return status === 'active' || status === 'upcoming';
  }

  /**
   * Get time until show starts
   */
  static getTimeUntilStart(startTime: Date): string {
    const now = new Date();
    const start = new Date(startTime);
    const diff = start.getTime() - now.getTime();

    if (diff <= 0) {
      return 'Started';
    }

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `Starts in ${hours}h ${minutes}m`;
    }

    return `Starts in ${minutes}m`;
  }

  /**
   * Validate message input
   */
  static validateMessage(message: string): { valid: boolean; error?: string } {
    const trimmed = message.trim();

    if (!trimmed) {
      return { valid: false, error: 'Message cannot be empty' };
    }

    if (trimmed.length > 500) {
      return { valid: false, error: 'Message too long (max 500 characters)' };
    }

    return { valid: true };
  }

  /**
   * Validate announcement
   */
  static validateAnnouncement(message: string): { valid: boolean; error?: string } {
    const trimmed = message.trim();

    if (!trimmed) {
      return { valid: false, error: 'Announcement cannot be empty' };
    }

    if (trimmed.length > 200) {
      return { valid: false, error: 'Announcement too long (max 200 characters)' };
    }

    return { valid: true };
  }

  /**
   * Get participant by user ID
   */
  static getParticipant(
    participants: ShowParticipant[],
    userId: string,
  ): ShowParticipant | undefined {
    return participants.find((p) => p.userId === userId);
  }

  /**
   * Count online participants
   */
  static getOnlineParticipantCount(participants: ShowParticipant[]): number {
    return participants.filter((p) => p.isOnline).length;
  }

  /**
   * Get participant avatar URL with fallback
   */
  static getParticipantAvatarUrl(participant: ShowParticipant, fallback?: string): string {
    return participant.avatar?.imageUrl || fallback || '/default-avatar.png';
  }

  /**
   * Get participant microphone URL with fallback
   */
  static getParticipantMicUrl(participant: ShowParticipant, fallback?: string): string {
    return participant.microphone?.imageUrl || fallback || '/default-microphone.png';
  }

  /**
   * Generate socket room ID
   */
  static getSocketRoomId(showId: string): string {
    return `live_show_${showId}`;
  }

  /**
   * Check if announcement is expired
   */
  static isAnnouncementExpired(announcement: AnnouncementMessage): boolean {
    const now = Date.now();
    const expiryTime =
      new Date(announcement.timestamp).getTime() + announcement.displayDuration * 1000;
    return now > expiryTime;
  }

  /**
   * Get remaining announcement time in seconds
   */
  static getAnnouncementTimeRemaining(announcement: AnnouncementMessage): number {
    const now = Date.now();
    const expiryTime =
      new Date(announcement.timestamp).getTime() + announcement.displayDuration * 1000;
    return Math.max(0, Math.ceil((expiryTime - now) / 1000));
  }

  /**
   * Sanitize user input
   */
  static sanitizeInput(input: string): string {
    return input.trim().replace(/\s+/g, ' ');
  }

  /**
   * Generate a temporary ID for optimistic updates
   */
  static generateTempId(): string {
    return `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Check if two participants are the same
   */
  static isSameParticipant(a: ShowParticipant, b: ShowParticipant): boolean {
    return a.userId === b.userId;
  }

  /**
   * Sort participants by join time
   */
  static sortParticipantsByJoinTime(participants: ShowParticipant[]): ShowParticipant[] {
    return [...participants].sort(
      (a, b) => new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime(),
    );
  }

  /**
   * Get queue statistics
   */
  static getQueueStats(
    queue: QueueEntry[],
    userId?: string,
  ): {
    totalInQueue: number;
    userPosition?: number;
    estimatedWaitTime?: number; // in minutes, rough estimate
  } {
    const totalInQueue = queue.length;
    const userPosition = userId ? this.getUserQueuePosition(userId, queue) : undefined;

    // Rough estimate: 3-4 minutes per song
    const estimatedWaitTime = userPosition ? (userPosition - 1) * 3.5 : undefined;

    return {
      totalInQueue,
      userPosition,
      estimatedWaitTime,
    };
  }

  /**
   * Format queue stats for display
   */
  static formatQueueStats(stats: ReturnType<typeof LiveShowUtils.getQueueStats>): string {
    if (stats.userPosition) {
      const waitTime = stats.estimatedWaitTime
        ? ` • ~${Math.ceil(stats.estimatedWaitTime)}min wait`
        : '';
      return `Position ${stats.userPosition} of ${stats.totalInQueue}${waitTime}`;
    }
    return `${stats.totalInQueue} singers in queue`;
  }
}
