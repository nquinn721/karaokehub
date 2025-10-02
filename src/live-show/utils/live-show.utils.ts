// Live Show Utility Functions

export class LiveShowUtils {
  /**
   * Generate a unique show ID based on timestamp and random string
   */
  static generateShowId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `show_${timestamp}_${random}`;
  }

  /**
   * Generate a unique message ID
   */
  static generateMessageId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `msg_${timestamp}_${random}`;
  }

  /**
   * Generate a unique queue entry ID
   */
  static generateQueueEntryId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `queue_${timestamp}_${random}`;
  }

  /**
   * Check if a user is a DJ based on their subscription status
   */
  static isDJUser(user: any): boolean {
    return user && user.djId && user.isDjSubscriptionActive;
  }

  /**
   * Format show name from DJ info and time
   */
  static formatShowName(djName: string, day: string, startTime: string, endTime?: string): string {
    const timeRange = endTime ? `${startTime}-${endTime}` : startTime;
    return `${djName}'s ${day} ${timeRange}`;
  }

  /**
   * Sort queue entries by position
   */
  static sortQueueByPosition<T extends { position: number }>(queue: T[]): T[] {
    return [...queue].sort((a, b) => a.position - b.position);
  }

  /**
   * Get next available queue position
   */
  static getNextQueuePosition<T extends { position: number }>(queue: T[]): number {
    if (queue.length === 0) return 1;
    const maxPosition = Math.max(...queue.map((entry) => entry.position));
    return maxPosition + 1;
  }

  /**
   * Reorder queue positions after drag and drop
   */
  static reorderQueue<T extends { position: number; userId: string }>(
    queue: T[],
    draggedUserId: string,
    newPosition: number,
  ): T[] {
    const updatedQueue = [...queue];
    const draggedItem = updatedQueue.find((item) => item.userId === draggedUserId);

    if (!draggedItem) return queue;

    // Remove dragged item
    const withoutDragged = updatedQueue.filter((item) => item.userId !== draggedUserId);

    // Insert at new position and update all positions
    withoutDragged.splice(newPosition - 1, 0, draggedItem);

    // Reassign positions
    return withoutDragged.map((item, index) => ({
      ...item,
      position: index + 1,
    }));
  }

  /**
   * Filter messages by type for different views
   */
  static filterMessagesByType(messages: any[], type: string, userId?: string): any[] {
    switch (type) {
      case 'singer_chat':
        return messages.filter((msg) => msg.type === 'singer_chat' || msg.type === 'system');
      case 'dj_messages':
        return messages.filter(
          (msg) =>
            (msg.type === 'dj_to_singer' && msg.recipientId === userId) || msg.type === 'system',
        );
      case 'announcements':
        return messages.filter((msg) => msg.type === 'announcement');
      case 'all':
      default:
        return messages;
    }
  }

  /**
   * Check if a message should be visible to a specific user
   */
  static isMessageVisibleToUser(message: any, userId: string, isDJ: boolean): boolean {
    switch (message.type) {
      case 'singer_chat':
        // Singers can see singer chat, DJs cannot
        return !isDJ;
      case 'dj_to_singer':
        // Only the intended recipient and the DJ can see private messages
        return isDJ || message.recipientId === userId;
      case 'announcement':
      case 'system':
        // Everyone can see announcements and system messages
        return true;
      default:
        return true;
    }
  }

  /**
   * Calculate time until show starts
   */
  static getTimeUntilStart(startTime: Date): { hours: number; minutes: number; seconds: number } {
    const now = new Date();
    const diff = startTime.getTime() - now.getTime();

    if (diff <= 0) {
      return { hours: 0, minutes: 0, seconds: 0 };
    }

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    return { hours, minutes, seconds };
  }

  /**
   * Format time for display
   */
  static formatTimeForDisplay(date: Date): string {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  }

  /**
   * Format duration for display
   */
  static formatDuration(startTime: Date, endTime?: Date): string {
    const start = this.formatTimeForDisplay(startTime);
    if (endTime) {
      const end = this.formatTimeForDisplay(endTime);
      return `${start} - ${end}`;
    }
    return `${start} onwards`;
  }

  /**
   * Check if show is currently active
   */
  static isShowActive(startTime: Date, endTime?: Date): boolean {
    const now = new Date();
    const hasStarted = now >= startTime;
    const hasNotEnded = !endTime || now <= endTime;
    return hasStarted && hasNotEnded;
  }

  /**
   * Get show status
   */
  static getShowStatus(startTime: Date, endTime?: Date): 'upcoming' | 'active' | 'ended' {
    const now = new Date();

    if (now < startTime) {
      return 'upcoming';
    }

    if (endTime && now > endTime) {
      return 'ended';
    }

    return 'active';
  }

  /**
   * Validate show name
   */
  static validateShowName(name: string): { valid: boolean; error?: string } {
    if (!name || name.trim().length === 0) {
      return { valid: false, error: 'Show name is required' };
    }

    if (name.length > 100) {
      return { valid: false, error: 'Show name must be less than 100 characters' };
    }

    return { valid: true };
  }

  /**
   * Validate chat message
   */
  static validateChatMessage(message: string): { valid: boolean; error?: string } {
    if (!message || message.trim().length === 0) {
      return { valid: false, error: 'Message cannot be empty' };
    }

    if (message.length > 500) {
      return { valid: false, error: 'Message must be less than 500 characters' };
    }

    return { valid: true };
  }

  /**
   * Get user display name (prefer stage name over regular name)
   */
  static getUserDisplayName(user: { name: string; stageName?: string }): string {
    return user.stageName && user.stageName.trim() ? user.stageName : user.name;
  }

  /**
   * Sanitize message content
   */
  static sanitizeMessage(message: string): string {
    return message.trim().replace(/\s+/g, ' ');
  }

  /**
   * Generate room ID for socket.io
   */
  static generateSocketRoomId(showId: string): string {
    return `live_show_${showId}`;
  }

  /**
   * Check if user can manage queue (is DJ)
   */
  static canManageQueue(user: any, show: any): boolean {
    return user && show && user.id === show.djId;
  }

  /**
   * Check if user can send announcements (is DJ)
   */
  static canSendAnnouncements(user: any, show: any): boolean {
    return user && show && user.id === show.djId;
  }

  /**
   * Get queue position for user
   */
  static getUserQueuePosition<T extends { userId: string; position: number }>(
    queue: T[],
    userId: string,
  ): number | undefined {
    const entry = queue.find((entry) => entry.userId === userId);
    return entry?.position;
  }

  /**
   * Check if user is in queue
   */
  static isUserInQueue<T extends { userId: string }>(queue: T[], userId: string): boolean {
    return queue.some((entry) => entry.userId === userId);
  }

  /**
   * Get current singer from queue
   */
  static getCurrentSinger<T extends { isCurrentSinger: boolean }>(queue: T[]): T | undefined {
    return queue.find((entry) => entry.isCurrentSinger);
  }

  /**
   * Get next singers in queue
   */
  static getNextSingers<T extends { position: number; isCurrentSinger: boolean }>(
    queue: T[],
    count: number = 3,
  ): T[] {
    const currentSinger = this.getCurrentSinger(queue);
    const currentPosition = currentSinger?.position || 0;

    return this.sortQueueByPosition(queue)
      .filter((entry) => entry.position > currentPosition)
      .slice(0, count);
  }
}
