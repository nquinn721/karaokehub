import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { GeocodingService } from '../geocoding/geocoding.service';
import { Show } from '../show/show.entity';
import { Venue } from '../venue/venue.entity';
// TODO: Add these imports when avatar system is available
// import { Avatar } from '../avatar/entities/avatar.entity';
// import { Microphone } from '../avatar/entities/microphone.entity';
import {
  AddToQueueDto,
  AnnouncementMessage,
  ChatHistoryResponse,
  ChatMessage,
  ChatMessageType,
  CreateLiveShowDto,
  JoinShowDto,
  LiveShow,
  LiveShowResponse,
  NearbyShowDto,
  ParticipantAvatar,
  ParticipantMicrophone,
  QueueEntry,
  QueueResponse,
  RemoveFromQueueDto,
  SendAnnouncementDto,
  SendChatMessageDto,
  SetCurrentSingerDto,
  ShowListResponse,
  ShowParticipant,
  ShowWithDistance,
  UpdateQueueDto,
} from './interfaces/live-show.interface';
import { LiveShowUtils } from './utils/live-show.utils';

@Injectable()
export class LiveShowService {
  private readonly logger = new Logger(LiveShowService.name);
  private readonly shows = new Map<string, LiveShow>();
  private readonly showCleanupInterval = 30 * 60 * 1000; // 30 minutes
  private cleanupTimer?: NodeJS.Timeout;

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Venue)
    private readonly venueRepository: Repository<Venue>,
    @InjectRepository(Show)
    private readonly showRepository: Repository<Show>,
    private readonly geocodingService: GeocodingService,
    // TODO: Add these repositories when avatar system is available
    // @InjectRepository(Avatar)
    // private readonly avatarRepository: Repository<Avatar>,
    // @InjectRepository(Microphone)
    // private readonly microphoneRepository: Repository<Microphone>,
  ) {
    this.startCleanupTimer();
  }

  /**
   * Create a new live show
   */
  async createShow(createShowDto: CreateLiveShowDto, creatorUserId: string): Promise<LiveShow> {
    const creator = await this.userRepository.findOne({
      where: { id: creatorUserId },
      relations: ['dj'],
    });

    if (!creator) {
      throw new NotFoundException('User not found');
    }

    // Check if user is a DJ if they want to be the DJ of the show
    if (createShowDto.djId && createShowDto.djId === creatorUserId) {
      if (!LiveShowUtils.isDJUser(creator)) {
        throw new ForbiddenException('User does not have DJ subscription');
      }
    }

    const showId = LiveShowUtils.generateShowId();
    const now = new Date();

    // Get venue data if venueId is provided
    let venueData = null;
    if (createShowDto.venueId) {
      venueData = await this.getShowVenueData(createShowDto.venueId);
    }

    // Get DJ name if djId is provided
    let djName = undefined;
    if (createShowDto.djId) {
      if (createShowDto.djId === creatorUserId) {
        djName = creator.name;
      } else {
        // Look up the DJ user if different from creator
        const djUser = await this.userRepository.findOne({ where: { id: createShowDto.djId } });
        djName = djUser?.name || 'Unknown DJ';
      }
    }

    const isActive = LiveShowUtils.isShowActive(createShowDto.startTime, createShowDto.endTime);

    const show: LiveShow = {
      id: showId,
      name: createShowDto.name,
      description: createShowDto.description,
      djId: createShowDto.djId,
      djName,
      startTime: createShowDto.startTime,
      endTime: createShowDto.endTime,
      isActive,
      currentSingerId: undefined,
      participants: new Map(),
      queue: [],
      chatMessages: [],
      createdAt: now,
      updatedAt: now,
      venueId: createShowDto.venueId,
      venue: venueData,
    };

    this.shows.set(showId, show);
    this.logger.log(
      `Created live show: ${showId} - ${createShowDto.name} by DJ ${creator.name} | ` +
        `Active: ${isActive} | Start: ${createShowDto.startTime.toISOString()} | ` +
        `End: ${createShowDto.endTime?.toISOString() || 'No end time'}`,
    );

    return show;
  }

  /**
   * Get a live show by ID
   */
  async getShow(showId: string): Promise<LiveShow | undefined> {
    return this.shows.get(showId);
  }

  /**
   * Get all active shows
   */
  async getActiveShows(): Promise<ShowListResponse> {
    const activeShows = Array.from(this.shows.values())
      .filter((show) => show.isActive)
      .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

    return {
      shows: activeShows,
      totalCount: activeShows.length,
    };
  }

  /**
   * Join a live show
   */
  async joinShow(joinShowDto: JoinShowDto): Promise<LiveShowResponse> {
    const { showId, userId, userLatitude, userLongitude, avatarId, microphoneId } = joinShowDto;

    const show = this.shows.get(showId);
    if (!show) {
      throw new NotFoundException('Show not found');
    }

    if (!show.isActive) {
      this.logger.error(
        `Show ${showId} is not active - Start: ${show.startTime.toISOString()}, ` +
          `End: ${show.endTime?.toISOString() || 'No end time'}, ` +
          `Current time: ${new Date().toISOString()}`,
      );
      throw new BadRequestException('Show is not active');
    }

    // Validate user proximity (30 meter radius) - only if location is provided
    if (userLatitude !== undefined && userLongitude !== undefined) {
      const isInProximity = await this.validateUserProximity(userLatitude, userLongitude, show);
      if (!isInProximity) {
        throw new ForbiddenException('You must be within 30 meters of the venue to join this show');
      }
    } else {
      // If no location provided (e.g., from websocket or testing), allow join without validation
      this.logger.log(
        `User ${userId} joining show ${showId} without location validation (test mode)`,
      );
    }

    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['dj'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Get avatar and microphone
    const avatar = await this.getParticipantAvatar(user, avatarId);
    const microphone = await this.getParticipantMicrophone(user, microphoneId);

    // Check if user is already in the show
    if (show.participants.has(userId)) {
      const existing = show.participants.get(userId)!;
      existing.isOnline = true;
      existing.avatar = avatar;
      existing.microphone = microphone;
      show.updatedAt = new Date();

      const userRole = LiveShowUtils.isDJUser(user) && show.djId === userId ? 'dj' : 'singer';
      return {
        show,
        userRole,
        queuePosition: existing.queuePosition,
      };
    }

    // Create participant
    const participant: ShowParticipant = {
      userId,
      userName: user.name,
      stageName: user.stageName,
      avatar,
      microphone,
      joinedAt: new Date(),
      isOnline: true,
      isDJ: LiveShowUtils.isDJUser(user) && show.djId === userId,
    };

    show.participants.set(userId, participant);

    // If this is the first user and no DJ is set, make them the DJ if they're qualified
    if (show.participants.size === 1 && !show.djId && LiveShowUtils.isDJUser(user)) {
      show.djId = userId;
      show.djName = user.name;
      participant.isDJ = true;
      this.logger.log(`Auto-assigned ${user.name} as DJ for show ${showId} (first qualified user)`);
    }

    // Auto-add non-DJ users to queue
    if (!participant.isDJ) {
      this.logger.log(`Adding ${user.name} to queue for show ${showId} (non-DJ user)`);
      await this.addToQueue({
        showId,
        userId,
        songRequest: undefined,
      });
    }

    show.updatedAt = new Date();

    const userRole = participant.isDJ ? 'dj' : 'singer';
    const queuePosition = LiveShowUtils.getUserQueuePosition(show.queue, userId);

    this.logger.log(
      `User ${user.name} joined show ${showId} as ${userRole} | ` +
        `Show DJ: ${show.djId || 'None'} | Queue position: ${queuePosition || 'N/A'}`,
    );

    return {
      show,
      userRole,
      queuePosition,
    };
  }

  /**
   * Leave a live show
   */
  async leaveShow(showId: string, userId: string): Promise<void> {
    const show = this.shows.get(showId);
    if (!show) {
      throw new NotFoundException('Show not found');
    }

    const participant = show.participants.get(userId);
    if (!participant) {
      return; // User wasn't in the show
    }

    // Remove from participants
    show.participants.delete(userId);

    // Remove from queue if present
    show.queue = show.queue.filter((entry) => entry.userId !== userId);

    // If this was the current singer, clear current singer
    if (show.currentSingerId === userId) {
      show.currentSingerId = undefined;
    }

    // If this was the DJ and there are other participants, try to promote someone
    if (participant.isDJ && show.participants.size > 0) {
      const nextDJ = Array.from(show.participants.values()).find((p) =>
        LiveShowUtils.isDJUser({ djId: p.userId, isDjSubscriptionActive: true }),
      );

      if (nextDJ) {
        show.djId = nextDJ.userId;
        show.djName = nextDJ.userName;
        nextDJ.isDJ = true;
      } else {
        show.djId = undefined;
        show.djName = undefined;
      }
    }

    show.updatedAt = new Date();

    // If no participants left, mark show as inactive
    if (show.participants.size === 0) {
      show.isActive = false;
    }

    this.logger.log(`User ${userId} left show ${showId}`);
  }

  /**
   * Send a chat message
   */
  async sendChatMessage(sendChatDto: SendChatMessageDto): Promise<ChatMessage> {
    const { showId, senderId, message, type, recipientId } = sendChatDto;

    const show = this.shows.get(showId);
    if (!show) {
      throw new NotFoundException('Show not found');
    }

    const sender = show.participants.get(senderId);
    if (!sender) {
      throw new BadRequestException('Sender not in show');
    }

    // Validate message type permissions
    if (type === ChatMessageType.DJ_TO_SINGER && !sender.isDJ) {
      throw new ForbiddenException('Only DJs can send private messages');
    }

    if (type === ChatMessageType.ANNOUNCEMENT && !sender.isDJ) {
      throw new ForbiddenException('Only DJs can send announcements');
    }

    if (type === ChatMessageType.DJ_TO_SINGER && !recipientId) {
      throw new BadRequestException('Recipient required for private messages');
    }

    if (recipientId && !show.participants.has(recipientId)) {
      throw new BadRequestException('Recipient not in show');
    }

    const chatMessage: ChatMessage = {
      id: LiveShowUtils.generateMessageId(),
      showId,
      senderId,
      senderName: sender.userName,
      senderStageName: sender.stageName,
      recipientId,
      message: LiveShowUtils.sanitizeMessage(message),
      type,
      timestamp: new Date(),
      isVisible: true,
    };

    show.chatMessages.push(chatMessage);
    show.updatedAt = new Date();

    // Keep only last 100 messages to prevent memory bloat
    if (show.chatMessages.length > 100) {
      show.chatMessages = show.chatMessages.slice(-100);
    }

    this.logger.log(`Chat message sent in show ${showId} by ${sender.userName}`);

    return chatMessage;
  }

  /**
   * Send an announcement
   */
  async sendAnnouncement(announcementDto: SendAnnouncementDto): Promise<AnnouncementMessage> {
    const { showId, djId, message, displayDuration = 10 } = announcementDto;

    const show = this.shows.get(showId);
    if (!show) {
      throw new NotFoundException('Show not found');
    }

    const dj = show.participants.get(djId);
    if (!dj || !dj.isDJ) {
      throw new ForbiddenException('Only DJs can send announcements');
    }

    const announcement: AnnouncementMessage = {
      id: LiveShowUtils.generateMessageId(),
      showId,
      message: LiveShowUtils.sanitizeMessage(message),
      djId,
      djName: dj.userName,
      timestamp: new Date(),
      displayDuration,
      isActive: true,
    };

    // Also add as chat message
    const chatMessage: ChatMessage = {
      id: LiveShowUtils.generateMessageId(),
      showId,
      senderId: djId,
      senderName: dj.userName,
      senderStageName: dj.stageName,
      message,
      type: ChatMessageType.ANNOUNCEMENT,
      timestamp: new Date(),
      isVisible: true,
    };

    show.chatMessages.push(chatMessage);
    show.updatedAt = new Date();

    this.logger.log(`Announcement sent in show ${showId} by DJ ${dj.userName}`);

    return announcement;
  }

  /**
   * Add user to queue
   */
  async addToQueue(addToQueueDto: AddToQueueDto): Promise<QueueEntry> {
    const { showId, userId, songRequest } = addToQueueDto;

    const show = this.shows.get(showId);
    if (!show) {
      throw new NotFoundException('Show not found');
    }

    const participant = show.participants.get(userId);
    if (!participant) {
      throw new BadRequestException('User not in show');
    }

    if (participant.isDJ) {
      throw new BadRequestException('DJs cannot join the queue');
    }

    // Check if already in queue
    if (LiveShowUtils.isUserInQueue(show.queue, userId)) {
      throw new BadRequestException('User already in queue');
    }

    const queueEntry: QueueEntry = {
      id: LiveShowUtils.generateQueueEntryId(),
      userId,
      userName: participant.userName,
      stageName: participant.stageName,
      avatar: participant.avatar,
      microphone: participant.microphone,
      position: LiveShowUtils.getNextQueuePosition(show.queue),
      joinedQueueAt: new Date(),
      songRequest,
      isCurrentSinger: false,
    };

    show.queue.push(queueEntry);
    participant.queuePosition = queueEntry.position;
    show.updatedAt = new Date();

    // If no current singer, make this person current (only if there's a DJ in the show)
    if (!show.currentSingerId && show.queue.length === 1 && show.djId) {
      // Find a DJ participant who can set the current singer
      const djParticipant = Array.from(show.participants.values()).find((p) => p.isDJ);

      if (djParticipant) {
        await this.setCurrentSinger({
          showId,
          djId: djParticipant.userId,
          singerId: userId,
        });
      } else {
        // If no DJ is present, just mark as current without validation
        const queueEntry = show.queue.find((entry) => entry.userId === userId);
        if (queueEntry) {
          queueEntry.isCurrentSinger = true;
          show.currentSingerId = userId;
          this.logger.log(`Auto-set ${userId} as current singer in show ${showId} (no DJ present)`);
        }
      }
    }

    this.logger.log(`User ${participant.userName} added to queue in show ${showId}`);

    return queueEntry;
  }

  /**
   * Remove user from queue
   */
  async removeFromQueue(removeDto: RemoveFromQueueDto): Promise<void> {
    const { showId, userId, djId } = removeDto;

    const show = this.shows.get(showId);
    if (!show) {
      throw new NotFoundException('Show not found');
    }

    // Check permissions - user can remove themselves, DJ can remove anyone
    if (djId && djId !== userId) {
      const dj = show.participants.get(djId);
      if (!dj || !dj.isDJ) {
        throw new ForbiddenException('Only DJs can remove others from queue');
      }
    }

    const queueIndex = show.queue.findIndex((entry) => entry.userId === userId);
    if (queueIndex === -1) {
      throw new BadRequestException('User not in queue');
    }

    const removedEntry = show.queue[queueIndex];
    show.queue.splice(queueIndex, 1);

    // Reposition remaining queue entries
    show.queue = show.queue.map((entry, index) => ({
      ...entry,
      position: index + 1,
    }));

    // Update participant queue position
    const participant = show.participants.get(userId);
    if (participant) {
      participant.queuePosition = undefined;
    }

    // If this was the current singer, clear current singer
    if (show.currentSingerId === userId) {
      show.currentSingerId = undefined;
    }

    show.updatedAt = new Date();

    this.logger.log(`User ${removedEntry.userName} removed from queue in show ${showId}`);
  }

  /**
   * Reorder queue (DJ only)
   */
  async updateQueueOrder(updateDto: UpdateQueueDto): Promise<QueueEntry[]> {
    const { showId, djId, queueOrder } = updateDto;

    const show = this.shows.get(showId);
    if (!show) {
      throw new NotFoundException('Show not found');
    }

    const dj = show.participants.get(djId);
    if (!dj || !dj.isDJ) {
      throw new ForbiddenException('Only DJs can reorder the queue');
    }

    // Validate all user IDs are in queue
    const currentUserIds = show.queue.map((entry) => entry.userId);
    const hasAllUsers = queueOrder.every((userId) => currentUserIds.includes(userId));
    const hasExtraUsers = queueOrder.some((userId) => !currentUserIds.includes(userId));

    if (!hasAllUsers || hasExtraUsers || queueOrder.length !== show.queue.length) {
      throw new BadRequestException('Invalid queue order');
    }

    // Reorder queue
    const reorderedQueue: QueueEntry[] = [];
    queueOrder.forEach((userId, index) => {
      const entry = show.queue.find((e) => e.userId === userId)!;
      reorderedQueue.push({
        ...entry,
        position: index + 1,
      });
    });

    show.queue = reorderedQueue;

    // Update participant queue positions
    reorderedQueue.forEach((entry) => {
      const participant = show.participants.get(entry.userId);
      if (participant) {
        participant.queuePosition = entry.position;
      }
    });

    show.updatedAt = new Date();

    this.logger.log(`Queue reordered in show ${showId} by DJ ${dj.userName}`);

    return reorderedQueue;
  }

  /**
   * Set current singer (DJ only)
   */
  async setCurrentSinger(setCurrentDto: SetCurrentSingerDto): Promise<void> {
    const { showId, djId, singerId } = setCurrentDto;

    const show = this.shows.get(showId);
    if (!show) {
      throw new NotFoundException('Show not found');
    }

    const dj = show.participants.get(djId);
    if (!dj || !dj.isDJ) {
      throw new ForbiddenException('Only DJs can set current singer');
    }

    const queueEntry = show.queue.find((entry) => entry.userId === singerId);
    if (!queueEntry) {
      throw new BadRequestException('Singer not in queue');
    }

    // Clear previous current singer
    show.queue.forEach((entry) => {
      entry.isCurrentSinger = false;
    });

    // Set new current singer
    queueEntry.isCurrentSinger = true;
    show.currentSingerId = singerId;
    show.updatedAt = new Date();

    this.logger.log(`Current singer set to ${queueEntry.userName} in show ${showId}`);
  }

  /**
   * Get chat history
   */
  async getChatHistory(
    showId: string,
    userId: string,
    limit = 50,
    offset = 0,
  ): Promise<ChatHistoryResponse> {
    const show = this.shows.get(showId);
    if (!show) {
      throw new NotFoundException('Show not found');
    }

    const participant = show.participants.get(userId);
    if (!participant) {
      throw new BadRequestException('User not in show');
    }

    // Filter messages based on user role
    const visibleMessages = show.chatMessages.filter((msg) =>
      LiveShowUtils.isMessageVisibleToUser(msg, userId, participant.isDJ),
    );

    const totalCount = visibleMessages.length;
    const messages = visibleMessages
      .slice(Math.max(0, totalCount - limit - offset), totalCount - offset)
      .reverse();

    return {
      messages,
      hasMore: offset + limit < totalCount,
      totalCount,
    };
  }

  /**
   * Get queue for a show
   */
  async getQueue(showId: string): Promise<QueueResponse> {
    const show = this.shows.get(showId);
    if (!show) {
      throw new NotFoundException('Show not found');
    }

    const sortedQueue = LiveShowUtils.sortQueueByPosition(show.queue);
    const currentSinger = LiveShowUtils.getCurrentSinger(sortedQueue);

    return {
      queue: sortedQueue,
      currentSinger,
      userPosition: undefined, // Will be set by caller if needed
    };
  }

  /**
   * Cleanup inactive shows
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupInactiveShows();
    }, this.showCleanupInterval);
  }

  private cleanupInactiveShows(): void {
    const now = new Date();
    const showsToDelete: string[] = [];

    this.shows.forEach((show, showId) => {
      const isExpired = show.endTime && now > show.endTime;
      const isEmptyAndOld =
        show.participants.size === 0 && now.getTime() - show.updatedAt.getTime() > 10 * 60 * 1000; // 10 minutes

      if (isExpired || isEmptyAndOld) {
        showsToDelete.push(showId);
      }
    });

    showsToDelete.forEach((showId) => {
      this.shows.delete(showId);
      this.logger.log(`Cleaned up inactive show: ${showId}`);
    });

    if (showsToDelete.length > 0) {
      this.logger.log(`Cleaned up ${showsToDelete.length} inactive shows`);
    }
  }

  /**
   * Get participant avatar - TODO: Implement when avatar system is available
   */
  private async getParticipantAvatar(
    user: User,
    avatarId?: string,
  ): Promise<ParticipantAvatar | undefined> {
    // Map of avatar IDs to avatar data (matching our test data)
    const avatarMap = {
      'avatar_default_1': {
        id: 'avatar_default_1',
        name: 'Classic Alex',
        imageUrl: '/images/avatar/avatars/alex.png',
      },
      'avatar_rockstar_1': {
        id: 'avatar_rockstar_1',
        name: 'Rock Star Avatar',
        imageUrl: '/images/avatar/avatar_7.png',
      },
      'avatar_rockstar_2': {
        id: 'avatar_rockstar_2',
        name: 'Rock Star Avatar',
        imageUrl: '/images/avatar/avatar_7.png',
      },
      'avatar_pop_1': {
        id: 'avatar_pop_1',
        name: 'Pop Star Avatar',
        imageUrl: '/images/avatar/avatar_12.png',
      },
      'avatar_hip_hop_1': {
        id: 'avatar_hip_hop_1',
        name: 'Hip Hop Avatar',
        imageUrl: '/images/avatar/avatar_15.png',
      },
      'avatar_country_1': {
        id: 'avatar_country_1',
        name: 'Country Avatar',
        imageUrl: '/images/avatar/avatar_20.png',
      },
    };

    this.logger.log(`Getting avatar for user ${user.id}, equippedAvatarId: ${user.equippedAvatarId}`);
    
    // For test mode, always return a working avatar based on user name or default
    if (user.name === 'NateDogg' || user.name.includes('Nate')) {
      this.logger.log('Returning rockstar avatar for NateDogg');
      return avatarMap['avatar_rockstar_2'] || avatarMap['avatar_default_1'];
    }
    
    // Check if user has equipped avatar and it exists in our map
    if (user.equippedAvatarId && avatarMap[user.equippedAvatarId]) {
      this.logger.log(`Found avatar mapping for ${user.equippedAvatarId}`);
      return avatarMap[user.equippedAvatarId];
    }

    // Return default avatar to ensure UI always works
    this.logger.log(`Using default avatar for user ${user.id}`);
    return avatarMap['avatar_default_1'];
  }

  /**
   * Get participant microphone - TODO: Implement when microphone system is available
   */
  private async getParticipantMicrophone(
    user: User,
    microphoneId?: string,
  ): Promise<ParticipantMicrophone | undefined> {
    // Map of microphone IDs to microphone data (matching our test data)
    const microphoneMap = {
      'mic_default_1': {
        id: 'mic_default_1',
        name: 'Basic Mic',
        imageUrl: '/images/avatar/parts/microphones/mic_basic_1.png',
      },
      'mic_pro_1': {
        id: 'mic_pro_1',
        name: 'Gold Pro Mic',
        imageUrl: '/images/avatar/parts/microphones/mic_gold_1.png',
      },
      'mic_vintage_1': {
        id: 'mic_vintage_1',
        name: 'Ruby Vintage Mic',
        imageUrl: '/images/avatar/parts/microphones/mic_ruby_1.png',
      },
      'mic_wireless_1': {
        id: 'mic_wireless_1',
        name: 'Emerald Performance Mic',
        imageUrl: '/images/avatar/parts/microphones/mic_emerald_1.png',
      },
      'mic_gaming_1': {
        id: 'mic_gaming_1',
        name: 'Diamond Elite Mic',
        imageUrl: '/images/avatar/parts/microphones/mic_diamond_1.png',
      },
    };

    this.logger.log(`Getting microphone for user ${user.id}, equippedMicrophoneId: ${user.equippedMicrophoneId}`);
    
    // For test mode, return a premium microphone for NateDogg
    if (user.name === 'NateDogg' || user.name.includes('Nate')) {
      this.logger.log('Returning gold pro mic for NateDogg');
      return microphoneMap['mic_pro_1'] || microphoneMap['mic_default_1'];
    }
    
    // Check if user has equipped microphone and it exists in our map
    if (user.equippedMicrophoneId && microphoneMap[user.equippedMicrophoneId]) {
      this.logger.log(`Found microphone mapping for ${user.equippedMicrophoneId}`);
      return microphoneMap[user.equippedMicrophoneId];
    }

    // Return default microphone to ensure UI always works
    this.logger.log(`Using default microphone for user ${user.id}`);
    return microphoneMap['mic_default_1'];
  }

  /**
   * Find shows near a user's location
   */
  async findNearbyShows(nearbyShowDto: NearbyShowDto): Promise<ShowWithDistance[]> {
    const { userLatitude, userLongitude, radiusMeters = 30 } = nearbyShowDto;
    const activeShows = Array.from(this.shows.values()).filter((show) => show.isActive);

    const nearbyShows: ShowWithDistance[] = [];

    for (const show of activeShows) {
      if (show.venue) {
        try {
          // Calculate distance using geocoding service
          const distanceMiles = await this.geocodingService.calculateDistance(
            userLatitude,
            userLongitude,
            show.venue.lat,
            show.venue.lng,
          );

          const distanceMeters = distanceMiles * 1609.34; // Convert miles to meters

          if (distanceMeters <= radiusMeters) {
            nearbyShows.push({
              show,
              distanceMeters: Math.round(distanceMeters),
              venue: show.venue,
            });
          }
        } catch (error) {
          this.logger.warn(`Failed to calculate distance for show ${show.id}: ${error.message}`);
        }
      }
    }

    // Sort by distance (closest first)
    return nearbyShows.sort((a, b) => a.distanceMeters - b.distanceMeters);
  }

  /**
   * Validate user proximity to show venue (30 meter radius)
   */
  private async validateUserProximity(
    userLat: number,
    userLng: number,
    show: LiveShow,
  ): Promise<boolean> {
    if (!show.venue) {
      // If no venue data, allow join for backwards compatibility
      return true;
    }

    try {
      const distanceMiles = await this.geocodingService.calculateDistance(
        userLat,
        userLng,
        show.venue.lat,
        show.venue.lng,
      );

      const distanceMeters = distanceMiles * 1609.34;
      const maxDistanceMeters = 30;

      this.logger.log(
        `User distance from show venue: ${distanceMeters.toFixed(2)}m (max: ${maxDistanceMeters}m)`,
      );

      return distanceMeters <= maxDistanceMeters;
    } catch (error) {
      this.logger.error(`Distance calculation failed: ${error.message}`);
      // Allow join if distance calculation fails
      return true;
    }
  }

  /**
   * Get venue data for a show
   */
  private async getShowVenueData(venueId: string) {
    const venue = await this.venueRepository.findOne({ where: { id: venueId } });
    if (venue && venue.lat && venue.lng) {
      return {
        id: venue.id,
        name: venue.name,
        address: venue.address || '',
        lat: venue.lat,
        lng: venue.lng,
      };
    }
    return null;
  }

  /**
   * Populate a show with test users for development/testing
   */
  async populateShowWithTestUsers(showId: string): Promise<void> {
    const show = this.shows.get(showId);
    if (!show) {
      throw new NotFoundException('Show not found');
    }

    // Create test participants that would represent the active test users
    const testUsers = [
      {
        id: 'test-dj-mike',
        name: 'DJ Mike',
        avatarId: 'avatar_hip_hop_1',
        microphoneId: 'mic_pro_1',
        isDJ: true,
      },
      {
        id: 'test-sarah-star',
        name: 'Sarah Star',
        avatarId: 'avatar_pop_1', 
        microphoneId: 'mic_wireless_1',
        isDJ: false,
      },
      {
        id: 'test-rock-andy',
        name: 'Rock Andy',
        avatarId: 'avatar_rockstar_1',
        microphoneId: 'mic_vintage_1',
        isDJ: false,
      },
    ];

    // Add test users as participants
    for (const testUser of testUsers) {
      if (!show.participants.has(testUser.id)) {
        const avatar = await this.getTestUserAvatar(testUser.avatarId);
        const microphone = await this.getTestUserMicrophone(testUser.microphoneId);
        
        const participant: ShowParticipant = {
          userId: testUser.id,
          userName: testUser.name,
          isOnline: true,
          joinedAt: new Date(),
          avatar,
          microphone,
          isDJ: testUser.isDJ,
          queuePosition: undefined,
        };

        show.participants.set(testUser.id, participant);
        
        // Add singers to queue automatically
        if (!testUser.isDJ) {
          const queueEntry: QueueEntry = {
            id: `queue-${testUser.id}-${Date.now()}`,
            userId: testUser.id,
            userName: testUser.name,
            position: show.queue.length + 1,
            joinedQueueAt: new Date(),
            songRequest: `${testUser.name}'s favorite song`,
            isCurrentSinger: false,
            avatar,
            microphone,
          };
          show.queue.push(queueEntry);
        }
      }
    }

    // Set the first singer as current singer
    if (show.queue.length > 0 && !show.queue.some(entry => entry.isCurrentSinger)) {
      show.queue[0].isCurrentSinger = true;
    }

    show.updatedAt = new Date();
    this.logger.log(`Populated show ${showId} with ${testUsers.length} test participants`);
  }

  private async getTestUserAvatar(avatarId: string): Promise<ParticipantAvatar> {
    const avatarMap = {
      'avatar_default_1': { id: 'avatar_default_1', name: 'Classic Alex', imageUrl: '/images/avatar/avatars/alex.png' },
      'avatar_rockstar_1': { id: 'avatar_rockstar_1', name: 'Rock Star Avatar', imageUrl: '/images/avatar/avatar_7.png' },
      'avatar_pop_1': { id: 'avatar_pop_1', name: 'Pop Star Avatar', imageUrl: '/images/avatar/avatar_12.png' },
      'avatar_hip_hop_1': { id: 'avatar_hip_hop_1', name: 'Hip Hop Avatar', imageUrl: '/images/avatar/avatar_15.png' },
      'avatar_country_1': { id: 'avatar_country_1', name: 'Country Avatar', imageUrl: '/images/avatar/avatar_20.png' },
    };
    return avatarMap[avatarId] || avatarMap['avatar_default_1'];
  }

  private async getTestUserMicrophone(microphoneId: string): Promise<ParticipantMicrophone> {
    const microphoneMap = {
      'mic_default_1': { id: 'mic_default_1', name: 'Basic Mic', imageUrl: '/images/avatar/parts/microphones/mic_basic_1.png' },
      'mic_pro_1': { id: 'mic_pro_1', name: 'Gold Pro Mic', imageUrl: '/images/avatar/parts/microphones/mic_gold_1.png' },
      'mic_vintage_1': { id: 'mic_vintage_1', name: 'Ruby Vintage Mic', imageUrl: '/images/avatar/parts/microphones/mic_ruby_1.png' },
      'mic_wireless_1': { id: 'mic_wireless_1', name: 'Emerald Performance Mic', imageUrl: '/images/avatar/parts/microphones/mic_emerald_1.png' },
    };
    return microphoneMap[microphoneId] || microphoneMap['mic_default_1'];
  }

  /**
   * Switch user role in a show for testing purposes
   */
  async switchUserRoleInShow(showId: string, userId: string, newRole: 'dj' | 'singer'): Promise<string> {
    const show = this.shows.get(showId);
    if (!show) {
      throw new NotFoundException('Show not found');
    }

    const participant = show.participants.get(userId);
    if (!participant) {
      throw new NotFoundException('User not found in show');
    }

    // Update participant role
    participant.isDJ = newRole === 'dj';
    
    // If switching to DJ and there's no DJ, make this user the DJ
    if (newRole === 'dj' && !show.djId) {
      show.djId = userId;
      show.djName = participant.userName;
    }
    
    // If switching from DJ to singer and they were the DJ, clear DJ
    if (newRole === 'singer' && show.djId === userId) {
      show.djId = undefined;
      show.djName = undefined;
    }

    show.updatedAt = new Date();
    this.logger.log(`Switched user ${userId} to role ${newRole} in show ${showId}`);
    
    return newRole;
  }

  /**
   * Cleanup on module destroy
   */
  onModuleDestroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
  }
}
