// Live Show System Interfaces and Types

export interface LiveShow {
  id: string;
  name: string; // e.g., "Bernard's Tuesday 8-11PM with DJ DJChas"
  description?: string;
  djId?: string; // DJ user ID if present
  djName?: string; // DJ display name
  startTime: Date;
  endTime?: Date;
  isActive: boolean;
  currentSingerId?: string; // Current performer
  participants: Map<string, ShowParticipant>; // userId -> participant
  queue: QueueEntry[];
  chatMessages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
  venueId?: string;
  venue?: {
    id: string;
    name: string;
    address: string;
    lat: number;
    lng: number;
  };
}

export interface ShowParticipant {
  userId: string;
  userName: string;
  stageName?: string;
  avatar?: ParticipantAvatar;
  microphone?: ParticipantMicrophone;
  joinedAt: Date;
  isOnline: boolean;
  socketId?: string;
  isDJ: boolean;
  queuePosition?: number; // Position in queue, undefined if not in queue
}

export interface ParticipantAvatar {
  id: string;
  name: string;
  imageUrl?: string;
}

export interface ParticipantMicrophone {
  id: string;
  name: string;
  imageUrl?: string;
}

export interface QueueEntry {
  id: string;
  userId: string;
  userName: string;
  stageName?: string;
  avatar?: ParticipantAvatar;
  microphone?: ParticipantMicrophone;
  position: number;
  joinedQueueAt: Date;
  songRequest?: string; // Optional song they plan to sing
  isCurrentSinger: boolean;
  songStartTime?: Date; // When the song started
  songDuration?: number; // Duration in seconds
}

export interface ChatMessage {
  id: string;
  showId: string;
  senderId: string;
  senderName: string;
  senderStageName?: string;
  recipientId?: string; // For private DJ -> Singer messages
  message: string;
  type: ChatMessageType;
  timestamp: Date;
  isVisible: boolean; // For managing message visibility
}

export enum ChatMessageType {
  SINGER_CHAT = 'singer_chat', // Singers only, DJ can't see
  DJ_TO_SINGER = 'dj_to_singer', // Private message from DJ to specific singer
  ANNOUNCEMENT = 'announcement', // Public announcement from DJ to all
  SYSTEM = 'system', // System messages (user joined, left, etc.)
}

export interface AnnouncementMessage {
  id: string;
  showId: string;
  message: string;
  djId: string;
  djName: string;
  timestamp: Date;
  displayDuration: number; // Duration in seconds (default 10)
  isActive: boolean;
}

export interface LiveShowEvent {
  type: LiveShowEventType;
  showId: string;
  data: any;
  timestamp: Date;
}

export enum LiveShowEventType {
  // Participant events
  USER_JOINED = 'user_joined',
  USER_LEFT = 'user_left',
  USER_RECONNECTED = 'user_reconnected',

  // Queue events
  QUEUE_UPDATED = 'queue_updated',
  SINGER_ADDED_TO_QUEUE = 'singer_added_to_queue',
  SINGER_REMOVED_FROM_QUEUE = 'singer_removed_from_queue',
  QUEUE_REORDERED = 'queue_reordered',
  CURRENT_SINGER_CHANGED = 'current_singer_changed',

  // Chat events
  CHAT_MESSAGE = 'chat_message',
  PRIVATE_MESSAGE = 'private_message',
  ANNOUNCEMENT = 'announcement',
  ANNOUNCEMENT_EXPIRED = 'announcement_expired',

  // Show events
  SHOW_STARTED = 'show_started',
  SHOW_ENDED = 'show_ended',
  DJ_JOINED = 'dj_joined',
  DJ_LEFT = 'dj_left',
}

// DTOs for API requests
export interface CreateLiveShowDto {
  name: string;
  description?: string;
  djId?: string;
  startTime: Date;
  endTime?: Date;
  venueId?: string;
  latitude?: number;
  longitude?: number;
}

export interface JoinShowDto {
  showId: string;
  userId: string;
  userLatitude?: number;
  userLongitude?: number;
  avatarId?: string;
  microphoneId?: string;
}

export interface SendChatMessageDto {
  showId: string;
  senderId: string;
  message: string;
  type: ChatMessageType;
  recipientId?: string; // Required for DJ_TO_SINGER messages
}

export interface SendAnnouncementDto {
  showId: string;
  djId: string;
  message: string;
  displayDuration?: number;
}

export interface NearbyShowDto {
  userLatitude: number;
  userLongitude: number;
  radiusMeters?: number; // Default to 30 meters
}

export interface ShowWithDistance {
  show: LiveShow;
  distanceMeters: number;
  venue?: {
    id: string;
    name: string;
    address: string;
    lat: number;
    lng: number;
  };
}

export interface UpdateQueueDto {
  showId: string;
  djId: string;
  queueOrder: string[]; // Array of user IDs in desired order
}

export interface AddToQueueDto {
  showId: string;
  userId: string;
  songRequest: string; // Required - user must specify a song to join queue
}

export interface RemoveFromQueueDto {
  showId: string;
  userId: string;
  djId?: string; // If DJ is removing someone
}

export interface SetCurrentSingerDto {
  showId: string;
  djId: string;
  singerId: string;
}

// Response interfaces
export interface LiveShowResponse {
  show: LiveShow;
  userRole: 'dj' | 'singer';
  queuePosition?: number;
}

export interface ShowListResponse {
  shows: LiveShow[];
  totalCount: number;
}

export interface QueueResponse {
  queue: QueueEntry[];
  currentSinger?: QueueEntry;
  userPosition?: number;
}

export interface ChatHistoryResponse {
  messages: ChatMessage[];
  hasMore: boolean;
  totalCount: number;
}
