import { makeAutoObservable, runInAction } from 'mobx';
import { io, Socket } from 'socket.io-client';
import { apiStore } from './ApiStore';

export interface KaraokeRoom {
  id: string;
  name: string;
  host: string;
  participants: string[];
  participantCount: number;
  currentSong?: {
    title: string;
    artist: string;
    singer: string;
  };
}

export interface ChatMessage {
  roomId: string;
  userId: string;
  userName: string;
  message: string;
  timestamp: string;
}

export class WebSocketStore {
  socket: Socket | null = null;
  isConnected = false;
  currentRoom: KaraokeRoom | null = null;
  availableRooms: KaraokeRoom[] = [];
  chatMessages: ChatMessage[] = [];
  isLoading = false;

  constructor() {
    makeAutoObservable(this);
  }

  connect() {
    if (this.socket?.connected) {
      console.log('WebSocket already connected, skipping connection attempt');
      return;
    }

    if (this.socket && !this.socket.connected) {
      // Reuse existing socket if it exists but isn't connected
      this.socket.connect();
      return;
    }

    // Create new socket connection
    console.log('Creating new WebSocket connection...');
    this.socket = io(apiStore.websocketURL, {
      transports: ['websocket', 'polling'],
      withCredentials: true,
      forceNew: false, // Reuse existing connection if possible
    });

    this.setupEventListeners();
  }

  disconnect() {
    if (this.socket) {
      console.log('Disconnecting WebSocket...');
      this.socket.removeAllListeners(); // Clean up all event listeners
      this.socket.disconnect();
      runInAction(() => {
        this.socket = null;
        this.isConnected = false;
        this.currentRoom = null;
      });
    }
  }

  private setupEventListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      runInAction(() => {
        this.isConnected = true;
      });
      console.log('✅ Connected to WebSocket server');
    });

    this.socket.on('disconnect', () => {
      runInAction(() => {
        this.isConnected = false;
        this.currentRoom = null;
      });
      console.log('❌ Disconnected from WebSocket server');
    });

    this.socket.on('welcome', (data: any) => {
      console.log('🎤 Welcome message:', data.message);
    });

    this.socket.on('roomJoined', (data: any) => {
      runInAction(() => {
        this.currentRoom = data.room;
        this.isLoading = false;
      });
      console.log('🚪 Joined room:', data.room.name);
    });

    this.socket.on('roomLeft', () => {
      runInAction(() => {
        this.currentRoom = null;
        this.chatMessages = [];
      });
      console.log('🚪 Left room');
    });

    this.socket.on('userJoined', (data: any) => {
      if (this.currentRoom) {
        runInAction(() => {
          this.currentRoom = data.room;
        });
      }
      console.log('👋 User joined:', data.userName);
    });

    this.socket.on('userLeft', (data: any) => {
      if (this.currentRoom) {
        runInAction(() => {
          if (this.currentRoom) {
            this.currentRoom.participants = data.participants;
            this.currentRoom.participantCount = data.participants.length;
          }
        });
      }
      console.log('👋 User left room');
    });

    this.socket.on('songStarted', (data: any) => {
      if (this.currentRoom) {
        runInAction(() => {
          if (this.currentRoom) {
            this.currentRoom.currentSong = data.song;
          }
        });
      }
      console.log('🎵 Song started:', data.song);
    });

    this.socket.on('songEnded', () => {
      if (this.currentRoom) {
        runInAction(() => {
          if (this.currentRoom) {
            this.currentRoom.currentSong = undefined;
          }
        });
      }
      console.log('🎵 Song ended');
    });

    this.socket.on('chatMessage', (data: ChatMessage) => {
      runInAction(() => {
        this.chatMessages.push(data);
      });
    });

    this.socket.on('roomsList', (data: any) => {
      runInAction(() => {
        this.availableRooms = data.rooms;
        this.isLoading = false;
      });
    });
  }

  joinRoom(roomId: string, userId: string, userName: string) {
    if (!this.socket?.connected) return;

    runInAction(() => {
      this.isLoading = true;
    });

    this.socket.emit('join-room', {
      roomId,
      userId,
      userName,
    });
  }

  leaveRoom(roomId: string, userId: string) {
    if (!this.socket?.connected || !this.currentRoom) return;

    this.socket.emit('leave-room', {
      roomId,
      userId,
    });
  }

  startSong(song: { title: string; artist: string; singer: string }) {
    if (!this.socket?.connected || !this.currentRoom) return;

    this.socket.emit('start-song', {
      roomId: this.currentRoom.id,
      song,
    });
  }

  endSong() {
    if (!this.socket?.connected || !this.currentRoom) return;

    this.socket.emit('end-song', {
      roomId: this.currentRoom.id,
    });
  }

  sendMessage(userId: string, userName: string, message: string) {
    if (!this.socket?.connected || !this.currentRoom) return;

    this.socket.emit('chat-message', {
      roomId: this.currentRoom.id,
      userId,
      userName,
      message,
    });
  }

  getRooms() {
    if (!this.socket?.connected) return;

    runInAction(() => {
      this.isLoading = true;
    });

    this.socket.emit('get-rooms');
  }

  clearChatMessages() {
    runInAction(() => {
      this.chatMessages = [];
    });
  }
}
