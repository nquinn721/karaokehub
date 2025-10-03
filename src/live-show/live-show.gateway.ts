import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import {
  AddToQueueDto,
  ChatMessageType,
  JoinShowDto,
  LiveShowEvent,
  LiveShowEventType,
  RemoveFromQueueDto,
  SendAnnouncementDto,
  SendChatMessageDto,
  SetCurrentSingerDto,
  UpdateQueueDto,
} from './interfaces/live-show.interface';
import { LiveShowService } from './live-show.service';
import { LiveShowUtils } from './utils/live-show.utils';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userName?: string;
  showId?: string;
}

@WebSocketGateway({
  namespace: 'live-shows',
  cors: {
    origin: [
      'http://localhost:5173', // Frontend Vite dev server
      'http://localhost:5174', // Alternative Vite port
      'http://localhost:5175', // Alternative Vite port
      'http://localhost:8000', // Backend dev server
      'http://localhost:8080', // Cloud Run port
    ],
    credentials: true,
  },
})
export class LiveShowGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(LiveShowGateway.name);
  private readonly userSockets = new Map<string, string>(); // userId -> socketId
  private readonly socketUsers = new Map<string, string>(); // socketId -> userId
  private readonly showParticipants = new Map<string, Set<string>>(); // showId -> Set<socketId>

  constructor(private readonly liveShowService: LiveShowService) {}

  handleConnection(client: AuthenticatedSocket) {
    this.logger.log(`Live show client connected: ${client.id}`);

    client.emit('welcome', {
      message: 'Connected to Live Shows! 🎤',
      timestamp: new Date().toISOString(),
    });
  }

  handleDisconnect(client: AuthenticatedSocket) {
    this.logger.log(`Live show client disconnected: ${client.id}`);

    const userId = this.socketUsers.get(client.id);
    if (userId) {
      this.handleUserDisconnected(userId, client.id);
    }
  }

  @SubscribeMessage('authenticate')
  async handleAuthenticate(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { userId: string; userName: string; token?: string },
  ) {
    const { userId, userName } = data;

    // TODO: Validate JWT token if provided

    // Map user to socket
    this.userSockets.set(userId, client.id);
    this.socketUsers.set(client.id, userId);

    client.userId = userId;
    client.userName = userName;

    client.emit('authenticated', {
      success: true,
      userId,
      userName,
    });

    this.logger.log(`User ${userName} (${userId}) authenticated on socket ${client.id}`);
  }

  @SubscribeMessage('join-show')
  async handleJoinShow(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody()
    data: { showId: string; userId: string; avatarId?: string; microphoneId?: string },
  ) {
    try {
      const { showId, userId, avatarId, microphoneId } = data;

      if (!client.userId || client.userId !== userId) {
        client.emit('error', { message: 'Authentication required' });
        return;
      }

      const joinDto: JoinShowDto = { showId, userId, avatarId, microphoneId };
      const result = await this.liveShowService.joinShow(joinDto);

      // Join socket room
      const roomId = LiveShowUtils.generateSocketRoomId(showId);
      client.join(roomId);
      client.showId = showId;

      // Track show participants
      if (!this.showParticipants.has(showId)) {
        this.showParticipants.set(showId, new Set());
      }
      this.showParticipants.get(showId)!.add(client.id);

      // Emit to user
      client.emit('show-joined', {
        success: true,
        show: this.serializeShow(result.show),
        userRole: result.userRole,
        queuePosition: result.queuePosition,
      });

      // Notify others in the show
      const event: LiveShowEvent = {
        type: LiveShowEventType.USER_JOINED,
        showId,
        data: {
          userId,
          userName: client.userName,
          userRole: result.userRole,
          participantCount: result.show.participants.size,
        },
        timestamp: new Date(),
      };

      client.to(roomId).emit('show-event', event);

      this.logger.log(`User ${client.userName} joined show ${showId}`);
    } catch (error) {
      this.logger.error(`Error joining show: ${error.message}`);
      client.emit('error', { message: error.message });
    }
  }

  @SubscribeMessage('leave-show')
  async handleLeaveShow(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { showId: string; userId: string },
  ) {
    try {
      const { showId, userId } = data;

      if (!client.userId || client.userId !== userId) {
        client.emit('error', { message: 'Authentication required' });
        return;
      }

      await this.liveShowService.leaveShow(showId, userId);

      // Leave socket room
      const roomId = LiveShowUtils.generateSocketRoomId(showId);
      client.leave(roomId);
      client.showId = undefined;

      // Remove from show participants tracking
      this.showParticipants.get(showId)?.delete(client.id);

      // Emit to user
      client.emit('show-left', { success: true, showId });

      // Notify others in the show
      const event: LiveShowEvent = {
        type: LiveShowEventType.USER_LEFT,
        showId,
        data: { userId, userName: client.userName },
        timestamp: new Date(),
      };

      client.to(roomId).emit('show-event', event);

      this.logger.log(`User ${client.userName} left show ${showId}`);
    } catch (error) {
      this.logger.error(`Error leaving show: ${error.message}`);
      client.emit('error', { message: error.message });
    }
  }

  @SubscribeMessage('send-chat-message')
  async handleSendChatMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody()
    data: { showId: string; message: string; type: ChatMessageType; recipientId?: string },
  ) {
    try {
      const { showId, message, type, recipientId } = data;

      if (!client.userId) {
        client.emit('error', { message: 'Authentication required' });
        return;
      }

      const chatDto: SendChatMessageDto = {
        showId,
        senderId: client.userId,
        message,
        type,
        recipientId,
      };

      const chatMessage = await this.liveShowService.sendChatMessage(chatDto);

      const roomId = LiveShowUtils.generateSocketRoomId(showId);

      // Handle different message types
      if (type === ChatMessageType.DJ_TO_SINGER && recipientId) {
        // Send to DJ and specific recipient only
        client.emit('chat-message', chatMessage);

        const recipientSocketId = this.userSockets.get(recipientId);
        if (recipientSocketId) {
          this.server.to(recipientSocketId).emit('chat-message', chatMessage);
        }

        // Send private message event
        const event: LiveShowEvent = {
          type: LiveShowEventType.PRIVATE_MESSAGE,
          showId,
          data: { chatMessage, recipientId },
          timestamp: new Date(),
        };

        client.emit('show-event', event);
        if (recipientSocketId) {
          this.server.to(recipientSocketId).emit('show-event', event);
        }
      } else if (type === ChatMessageType.ANNOUNCEMENT) {
        // Send to everyone in the show
        this.server.to(roomId).emit('chat-message', chatMessage);

        const event: LiveShowEvent = {
          type: LiveShowEventType.ANNOUNCEMENT,
          showId,
          data: { chatMessage },
          timestamp: new Date(),
        };

        this.server.to(roomId).emit('show-event', event);
      } else {
        // Regular chat - send to appropriate audience
        this.server.to(roomId).emit('chat-message', chatMessage);

        const event: LiveShowEvent = {
          type: LiveShowEventType.CHAT_MESSAGE,
          showId,
          data: { chatMessage },
          timestamp: new Date(),
        };

        this.server.to(roomId).emit('show-event', event);
      }

      this.logger.log(`Chat message sent by ${client.userName} in show ${showId}`);
    } catch (error) {
      this.logger.error(`Error sending chat message: ${error.message}`);
      client.emit('error', { message: error.message });
    }
  }

  @SubscribeMessage('send-announcement')
  async handleSendAnnouncement(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { showId: string; message: string; displayDuration?: number },
  ) {
    try {
      const { showId, message, displayDuration } = data;

      if (!client.userId) {
        client.emit('error', { message: 'Authentication required' });
        return;
      }

      const announcementDto: SendAnnouncementDto = {
        showId,
        djId: client.userId,
        message,
        displayDuration,
      };

      const announcement = await this.liveShowService.sendAnnouncement(announcementDto);

      const roomId = LiveShowUtils.generateSocketRoomId(showId);

      // Send announcement to everyone in the show
      this.server.to(roomId).emit('announcement', announcement);

      const event: LiveShowEvent = {
        type: LiveShowEventType.ANNOUNCEMENT,
        showId,
        data: { announcement },
        timestamp: new Date(),
      };

      this.server.to(roomId).emit('show-event', event);

      // Auto-expire announcement
      setTimeout(
        () => {
          const expiredEvent: LiveShowEvent = {
            type: LiveShowEventType.ANNOUNCEMENT_EXPIRED,
            showId,
            data: { announcementId: announcement.id },
            timestamp: new Date(),
          };

          this.server.to(roomId).emit('show-event', expiredEvent);
        },
        (displayDuration || 10) * 1000,
      );

      this.logger.log(`Announcement sent by DJ ${client.userName} in show ${showId}`);
    } catch (error) {
      this.logger.error(`Error sending announcement: ${error.message}`);
      client.emit('error', { message: error.message });
    }
  }

  @SubscribeMessage('add-to-queue')
  async handleAddToQueue(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { showId: string; userId?: string; songRequest?: string },
  ) {
    try {
      const { showId, songRequest } = data;
      const userId = data.userId || client.userId;

      if (!client.userId) {
        client.emit('error', { message: 'Authentication required' });
        return;
      }

      const addToQueueDto: AddToQueueDto = {
        showId,
        userId: userId!,
        songRequest,
      };

      const queueEntry = await this.liveShowService.addToQueue(addToQueueDto);

      const roomId = LiveShowUtils.generateSocketRoomId(showId);

      // Notify everyone in the show
      const event: LiveShowEvent = {
        type: LiveShowEventType.SINGER_ADDED_TO_QUEUE,
        showId,
        data: { queueEntry },
        timestamp: new Date(),
      };

      this.server.to(roomId).emit('show-event', event);

      // Send updated queue
      const queueResponse = await this.liveShowService.getQueue(showId);
      this.server.to(roomId).emit('queue-updated', queueResponse);

      this.logger.log(`User ${client.userName} added to queue in show ${showId}`);
    } catch (error) {
      this.logger.error(`Error adding to queue: ${error.message}`);
      client.emit('error', { message: error.message });
    }
  }

  @SubscribeMessage('remove-from-queue')
  async handleRemoveFromQueue(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { showId: string; userId: string },
  ) {
    try {
      const { showId, userId } = data;

      if (!client.userId) {
        client.emit('error', { message: 'Authentication required' });
        return;
      }

      const removeDto: RemoveFromQueueDto = {
        showId,
        userId,
        djId: client.userId,
      };

      await this.liveShowService.removeFromQueue(removeDto);

      const roomId = LiveShowUtils.generateSocketRoomId(showId);

      // Notify everyone in the show
      const event: LiveShowEvent = {
        type: LiveShowEventType.SINGER_REMOVED_FROM_QUEUE,
        showId,
        data: { userId },
        timestamp: new Date(),
      };

      this.server.to(roomId).emit('show-event', event);

      // Send updated queue
      const queueResponse = await this.liveShowService.getQueue(showId);
      this.server.to(roomId).emit('queue-updated', queueResponse);

      this.logger.log(`User ${userId} removed from queue in show ${showId}`);
    } catch (error) {
      this.logger.error(`Error removing from queue: ${error.message}`);
      client.emit('error', { message: error.message });
    }
  }

  @SubscribeMessage('reorder-queue')
  async handleReorderQueue(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { showId: string; queueOrder: string[] },
  ) {
    try {
      const { showId, queueOrder } = data;

      if (!client.userId) {
        client.emit('error', { message: 'Authentication required' });
        return;
      }

      const updateDto: UpdateQueueDto = {
        showId,
        djId: client.userId,
        queueOrder,
      };

      const reorderedQueue = await this.liveShowService.updateQueueOrder(updateDto);

      const roomId = LiveShowUtils.generateSocketRoomId(showId);

      // Notify everyone in the show
      const event: LiveShowEvent = {
        type: LiveShowEventType.QUEUE_REORDERED,
        showId,
        data: { queue: reorderedQueue },
        timestamp: new Date(),
      };

      this.server.to(roomId).emit('show-event', event);

      // Send updated queue
      const queueResponse = await this.liveShowService.getQueue(showId);
      this.server.to(roomId).emit('queue-updated', queueResponse);

      this.logger.log(`Queue reordered by DJ ${client.userName} in show ${showId}`);
    } catch (error) {
      this.logger.error(`Error reordering queue: ${error.message}`);
      client.emit('error', { message: error.message });
    }
  }

  @SubscribeMessage('set-current-singer')
  async handleSetCurrentSinger(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { showId: string; singerId: string },
  ) {
    try {
      const { showId, singerId } = data;

      if (!client.userId) {
        client.emit('error', { message: 'Authentication required' });
        return;
      }

      const setCurrentDto: SetCurrentSingerDto = {
        showId,
        djId: client.userId,
        singerId,
      };

      await this.liveShowService.setCurrentSinger(setCurrentDto);

      const roomId = LiveShowUtils.generateSocketRoomId(showId);

      // Notify everyone in the show
      const event: LiveShowEvent = {
        type: LiveShowEventType.CURRENT_SINGER_CHANGED,
        showId,
        data: { currentSingerId: singerId },
        timestamp: new Date(),
      };

      this.server.to(roomId).emit('show-event', event);

      // Send updated queue
      const queueResponse = await this.liveShowService.getQueue(showId);
      this.server.to(roomId).emit('queue-updated', queueResponse);

      this.logger.log(
        `Current singer set to ${singerId} by DJ ${client.userName} in show ${showId}`,
      );
    } catch (error) {
      this.logger.error(`Error setting current singer: ${error.message}`);
      client.emit('error', { message: error.message });
    }
  }

  @SubscribeMessage('start-song')
  async handleStartSong(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { showId: string; userId: string; startTime: Date },
  ) {
    try {
      const { showId, userId, startTime } = data;

      if (!client.userId) {
        client.emit('error', { message: 'Authentication required' });
        return;
      }

      await this.liveShowService.startSong(showId, client.userId, userId, startTime);

      const roomId = LiveShowUtils.generateSocketRoomId(showId);

      // Notify everyone in the show about song start
      const event: LiveShowEvent = {
        type: LiveShowEventType.CURRENT_SINGER_CHANGED,
        showId,
        data: { userId, songStartTime: startTime },
        timestamp: new Date(),
      };

      this.server.to(roomId).emit('show-event', event);

      // Send updated queue
      const queueResponse = await this.liveShowService.getQueue(showId);
      this.server.to(roomId).emit('queue-updated', queueResponse);

      this.logger.log(`Song started for user ${userId} by DJ ${client.userName} in show ${showId}`);
    } catch (error) {
      this.logger.error(`Error starting song: ${error.message}`);
      client.emit('error', { message: error.message });
    }
  }

  @SubscribeMessage('set-song-duration')
  async handleSetSongDuration(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { showId: string; userId: string; duration: number },
  ) {
    try {
      const { showId, userId, duration } = data;

      if (!client.userId) {
        client.emit('error', { message: 'Authentication required' });
        return;
      }

      await this.liveShowService.setSongDuration(showId, client.userId, userId, duration);

      const roomId = LiveShowUtils.generateSocketRoomId(showId);

      // Notify everyone in the show about duration update
      const event: LiveShowEvent = {
        type: LiveShowEventType.QUEUE_UPDATED,
        showId,
        data: { userId, songDuration: duration },
        timestamp: new Date(),
      };

      this.server.to(roomId).emit('show-event', event);

      // Send updated queue
      const queueResponse = await this.liveShowService.getQueue(showId);
      this.server.to(roomId).emit('queue-updated', queueResponse);

      this.logger.log(
        `Song duration set to ${duration}s for user ${userId} by DJ ${client.userName} in show ${showId}`,
      );
    } catch (error) {
      this.logger.error(`Error setting song duration: ${error.message}`);
      client.emit('error', { message: error.message });
    }
  }

  @SubscribeMessage('dj-song-request')
  async handleDJSongRequest(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody()
    data: { showId: string; songRequest: string; fromUserId: string; fromUserName: string },
  ) {
    try {
      const { showId, songRequest, fromUserId, fromUserName } = data;

      if (!client.userId) {
        client.emit('error', { message: 'Authentication required' });
        return;
      }

      await this.liveShowService.sendDJSongRequest(showId, fromUserId, fromUserName, songRequest);

      const roomId = LiveShowUtils.generateSocketRoomId(showId);

      // Send message to DJ only
      const show = await this.liveShowService.getShow(showId);
      if (show && show.djId) {
        // Find DJ socket
        const djSocket = Array.from(this.server.sockets.sockets.values()).find(
          (s) =>
            (s as AuthenticatedSocket).userId === show.djId &&
            (s as AuthenticatedSocket).showId === showId,
        );

        if (djSocket) {
          djSocket.emit('dj-song-request-received', {
            fromUserId,
            fromUserName,
            songRequest,
            timestamp: new Date(),
          });
        }
      }

      this.logger.log(
        `Song request "${songRequest}" sent to DJ from ${fromUserName} in show ${showId}`,
      );
    } catch (error) {
      this.logger.error(`Error sending DJ song request: ${error.message}`);
      client.emit('error', { message: error.message });
    }
  }

  @SubscribeMessage('get-show-details')
  async handleGetShowDetails(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { showId: string },
  ) {
    try {
      const { showId } = data;

      const show = await this.liveShowService.getShow(showId);
      if (!show) {
        client.emit('error', { message: 'Show not found' });
        return;
      }

      client.emit('show-details', {
        success: true,
        show: this.serializeShow(show),
      });
    } catch (error) {
      this.logger.error(`Error getting show details: ${error.message}`);
      client.emit('error', { message: error.message });
    }
  }

  @SubscribeMessage('get-queue')
  async handleGetQueue(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { showId: string },
  ) {
    try {
      const { showId } = data;

      const queueResponse = await this.liveShowService.getQueue(showId);

      client.emit('queue-details', {
        success: true,
        ...queueResponse,
      });
    } catch (error) {
      this.logger.error(`Error getting queue: ${error.message}`);
      client.emit('error', { message: error.message });
    }
  }

  @SubscribeMessage('get-chat-history')
  async handleGetChatHistory(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { showId: string; limit?: number; offset?: number },
  ) {
    try {
      const { showId, limit, offset } = data;

      if (!client.userId) {
        client.emit('error', { message: 'Authentication required' });
        return;
      }

      const chatHistory = await this.liveShowService.getChatHistory(
        showId,
        client.userId,
        limit,
        offset,
      );

      client.emit('chat-history', {
        success: true,
        ...chatHistory,
      });
    } catch (error) {
      this.logger.error(`Error getting chat history: ${error.message}`);
      client.emit('error', { message: error.message });
    }
  }

  private handleUserDisconnected(userId: string, socketId: string) {
    // Clean up mappings
    this.userSockets.delete(userId);
    this.socketUsers.delete(socketId);

    // Remove from all show participants
    this.showParticipants.forEach((participants, showId) => {
      if (participants.has(socketId)) {
        participants.delete(socketId);

        // Notify other participants
        const roomId = LiveShowUtils.generateSocketRoomId(showId);
        const event: LiveShowEvent = {
          type: LiveShowEventType.USER_LEFT,
          showId,
          data: { userId, reason: 'disconnected' },
          timestamp: new Date(),
        };

        this.server.to(roomId).emit('show-event', event);
      }
    });

    this.logger.log(`User ${userId} disconnected and cleaned up`);
  }

  private serializeShow(show: any) {
    // Convert Map to Array for JSON serialization
    return {
      ...show,
      participants: Array.from(show.participants.values()),
    };
  }
}
