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
import { UrlService } from '../config/url.service';

interface KaraokeRoom {
  id: string;
  name: string;
  host: string;
  participants: string[];
  currentSong?: {
    title: string;
    artist: string;
    singer: string;
  };
}

interface ParserLogEntry {
  id: string;
  message: string;
  timestamp: Date;
  level: 'info' | 'success' | 'warning' | 'error';
}

@WebSocketGateway({
  cors: {
    origin: true, // Will be dynamically set
    credentials: true,
  },
  maxHttpBufferSize: 1e6, // 1MB limit
  pingTimeout: 60000,
  pingInterval: 25000,
})
export class KaraokeWebSocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger: Logger = new Logger('KaraokeWebSocketGateway');
  private rooms: Map<string, KaraokeRoom> = new Map();
  private userSockets: Map<string, string> = new Map(); // userId -> socketId
  private parserLogs: ParserLogEntry[] = []; // Store parser logs
  private connectedClients: Set<string> = new Set(); // Track connected client IDs

  constructor(private urlService: UrlService) {
    // Update CORS origins dynamically
    const allowedOrigins = this.urlService.getWebSocketOrigins();
    this.logger.log(`WebSocket CORS origins: ${allowedOrigins.join(', ')}`);
  }

  handleConnection(client: Socket) {
    // Check if too many clients are connected (simple rate limiting)
    if (this.connectedClients.size > 100) {
      this.logger.warn(`Connection limit reached. Rejecting client: ${client.id}`);
      client.emit('error', { message: 'Server is at capacity. Please try again later.' });
      client.disconnect();
      return;
    }

    this.connectedClients.add(client.id);
    
    // Only log every 10th connection to reduce noise in development
    if (this.connectedClients.size % 10 === 0 || this.connectedClients.size <= 5) {
      this.logger.log(`Client connected: ${client.id} (Total: ${this.connectedClients.size})`);
    }

    // Send welcome message
    client.emit('welcome', {
      message: 'Welcome to KaraokeHub! 🎤',
      timestamp: new Date().toISOString(),
    });
  }

  handleDisconnect(client: Socket) {
    this.connectedClients.delete(client.id);
    
    // Only log every 10th disconnection or when getting to low numbers
    if (this.connectedClients.size % 10 === 0 || this.connectedClients.size <= 5) {
      this.logger.log(`Client disconnected: ${client.id} (Total: ${this.connectedClients.size})`);
    }

    // Remove from user sockets mapping
    for (const [userId, socketId] of this.userSockets.entries()) {
      if (socketId === client.id) {
        this.userSockets.delete(userId);
        break;
      }
    }

    // Remove from rooms
    for (const [roomId, room] of this.rooms.entries()) {
      const index = room.participants.findIndex((p) => p === client.id);
      if (index !== -1) {
        room.participants.splice(index, 1);

        // Notify other participants
        client.to(roomId).emit('userLeft', {
          roomId,
          participants: room.participants,
        });

        // Remove room if empty
        if (room.participants.length === 0) {
          this.rooms.delete(roomId);
        }
        break;
      }
    }
  }

  @SubscribeMessage('join-room')
  handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; userId: string; userName: string },
  ) {
    const { roomId, userId, userName } = data;

    // Map user to socket
    this.userSockets.set(userId, client.id);

    // Join socket room
    client.join(roomId);

    // Get or create room
    let room = this.rooms.get(roomId);
    if (!room) {
      room = {
        id: roomId,
        name: `Room ${roomId}`,
        host: userId,
        participants: [],
      };
      this.rooms.set(roomId, room);
    }

    // Add participant if not already present
    if (!room.participants.includes(client.id)) {
      room.participants.push(client.id);
    }

    this.logger.log(`User ${userName} joined room ${roomId}`);

    // Notify all participants in the room
    this.server.to(roomId).emit('userJoined', {
      roomId,
      userId,
      userName,
      participants: room.participants,
      room,
    });

    // Send current room state to the new participant
    client.emit('roomJoined', {
      room,
      success: true,
    });
  }

  @SubscribeMessage('leave-room')
  handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; userId: string },
  ) {
    const { roomId, userId } = data;

    client.leave(roomId);

    const room = this.rooms.get(roomId);
    if (room) {
      const index = room.participants.findIndex((p) => p === client.id);
      if (index !== -1) {
        room.participants.splice(index, 1);

        // Notify other participants
        client.to(roomId).emit('userLeft', {
          roomId,
          userId,
          participants: room.participants,
        });

        // Remove room if empty
        if (room.participants.length === 0) {
          this.rooms.delete(roomId);
        }
      }
    }

    client.emit('roomLeft', { roomId, success: true });
  }

  @SubscribeMessage('start-song')
  handleStartSong(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: { roomId: string; song: { title: string; artist: string; singer: string } },
  ) {
    const { roomId, song } = data;

    const room = this.rooms.get(roomId);
    if (room) {
      room.currentSong = song;

      // Notify all participants in the room
      this.server.to(roomId).emit('songStarted', {
        roomId,
        song,
        timestamp: new Date().toISOString(),
      });
    }
  }

  @SubscribeMessage('end-song')
  handleEndSong(@ConnectedSocket() client: Socket, @MessageBody() data: { roomId: string }) {
    const { roomId } = data;

    const room = this.rooms.get(roomId);
    if (room) {
      const previousSong = room.currentSong;
      room.currentSong = undefined;

      // Notify all participants in the room
      this.server.to(roomId).emit('songEnded', {
        roomId,
        previousSong,
        timestamp: new Date().toISOString(),
      });
    }
  }

  @SubscribeMessage('chat-message')
  handleChatMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; userId: string; userName: string; message: string },
  ) {
    const { roomId, userId, userName, message } = data;

    // Broadcast message to all participants in the room
    this.server.to(roomId).emit('chatMessage', {
      roomId,
      userId,
      userName,
      message,
      timestamp: new Date().toISOString(),
    });
  }

  @SubscribeMessage('get-rooms')
  handleGetRooms(@ConnectedSocket() client: Socket) {
    const roomList = Array.from(this.rooms.values()).map((room) => ({
      ...room,
      participantCount: room.participants.length,
    }));

    client.emit('roomsList', {
      rooms: roomList,
      timestamp: new Date().toISOString(),
    });
  }

  // Parser log methods
  @SubscribeMessage('join-parser-logs')
  handleJoinParserLogs(@ConnectedSocket() client: Socket) {
    client.join('parser-logs');
    // Send current logs to the client
    client.emit('parser-logs-history', this.parserLogs);
  }

  @SubscribeMessage('leave-parser-logs')
  handleLeaveParserLogs(@ConnectedSocket() client: Socket) {
    client.leave('parser-logs');
  }

  // Method to broadcast parser logs to all subscribed clients
  broadcastParserLog(message: string, level: 'info' | 'success' | 'warning' | 'error' = 'info') {
    const logEntry: ParserLogEntry = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      message,
      timestamp: new Date(),
      level,
    };

    // Add to internal log storage
    this.parserLogs.push(logEntry);

    // Keep only the last 50 entries in memory
    if (this.parserLogs.length > 50) {
      this.parserLogs = this.parserLogs.slice(-50);
    }

    // Broadcast to all clients subscribed to parser logs
    this.server.to('parser-logs').emit('parser-log', logEntry);

    // Auto-remove log entry after 10 seconds
    setTimeout(() => {
      this.parserLogs = this.parserLogs.filter((log) => log.id !== logEntry.id);
      this.server.to('parser-logs').emit('parser-log-expired', logEntry.id);
    }, 10000);

    return logEntry;
  }

  // Method to clear all parser logs
  clearParserLogs() {
    this.parserLogs = [];
    this.server.to('parser-logs').emit('parser-logs-cleared');
  }
}
