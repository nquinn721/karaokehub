// Frontend Live Show Interfaces and Types
// These mirror the backend interfaces for type safety across the stack

export interface LiveShow {
  id: string;
  name: string;
  description?: string;
  djId?: string;
  djName?: string;
  startTime: Date;
  endTime?: Date;
  isActive: boolean;
  currentSingerId?: string;
  participants: ShowParticipant[];
  queue: QueueEntry[];
  chatMessages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
  participantCount: number;
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
  queuePosition?: number;
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
  songRequest?: string;
  isCurrentSinger: boolean;
  songStartTime?: Date;
  songDuration?: number; // Duration in seconds
}

export interface ChatMessage {
  id: string;
  showId: string;
  senderId: string;
  senderName: string;
  senderStageName?: string;
  recipientId?: string;
  message: string;
  type: ChatMessageType;
  timestamp: Date;
  isVisible: boolean;
}

export enum ChatMessageType {
  SINGER_CHAT = 'singer_chat',
  DJ_TO_SINGER = 'dj_to_singer',
  ANNOUNCEMENT = 'announcement',
  SYSTEM = 'system',
}

export interface AnnouncementMessage {
  id: string;
  showId: string;
  message: string;
  djId: string;
  djName: string;
  timestamp: Date;
  displayDuration: number;
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

// Component Props Interfaces
export interface LiveShowPageProps {
  showId: string;
}

export interface DJDashboardProps {
  show: LiveShow;
  currentUser: ShowParticipant;
}

export interface SingerViewProps {
  show: LiveShow;
  currentUser: ShowParticipant;
  currentAnnouncement?: AnnouncementMessage;
}

export interface QueueManagementProps {
  queue: QueueEntry[];
  currentSinger?: QueueEntry;
  isDJ: boolean;
  onReorderQueue?: (newOrder: string[]) => void;
  onRemoveFromQueue?: (userId: string) => void;
  onSetCurrentSinger?: (userId: string) => void;
}

export interface ChatComponentProps {
  messages: ChatMessage[];
  currentUserId: string;
  isDJ: boolean;
  showId: string;
  onSendMessage: (message: string, type: ChatMessageType, recipientId?: string) => void;
}

export interface CurrentSingerDisplayProps {
  currentSinger?: QueueEntry;
  nextInQueue?: QueueEntry[];
}

export interface AnnouncementDisplayProps {
  announcement: AnnouncementMessage;
  onExpired: () => void;
}

// Store State Interfaces
export interface LiveShowStoreState {
  currentShow: LiveShow | null;
  availableShows: LiveShow[];
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  currentUserRole: 'dj' | 'singer' | null;
  activeAnnouncement: AnnouncementMessage | null;
  unreadMessages: number;
}

// API Response Types
export interface JoinShowResponse {
  success: boolean;
  show: LiveShow;
  userRole: 'dj' | 'singer';
  queuePosition?: number;
  message?: string;
}

export interface ShowListResponse {
  success: boolean;
  shows: LiveShow[];
  totalCount: number;
}

export interface QueueResponse {
  success: boolean;
  queue: QueueEntry[];
  currentSinger?: QueueEntry;
  userPosition?: number;
}

export interface ChatHistoryResponse {
  success: boolean;
  messages: ChatMessage[];
  hasMore: boolean;
  totalCount: number;
}

// Form Data Types
export interface CreateShowFormData {
  name: string;
  description?: string;
  startTime: Date;
  endTime?: Date;
}

export interface JoinShowFormData {
  showId: string;
  avatarId?: string;
  microphoneId?: string;
}

export interface SendMessageFormData {
  message: string;
  type: ChatMessageType;
  recipientId?: string;
}

export interface SendAnnouncementFormData {
  message: string;
  displayDuration: number;
}

// UI State Types
export interface LiveShowUIState {
  sidebarOpen: boolean;
  chatOpen: boolean;
  queueOpen: boolean;
  announcementDialogOpen: boolean;
  messageDialogOpen: boolean;
  selectedParticipantId?: string;
  currentChatFilter: ChatMessageType | 'all';
}

// Socket Event Payloads
export interface JoinShowPayload {
  showId: string;
  userId: string;
  userName: string;
  stageName?: string;
  avatar?: ParticipantAvatar;
  microphone?: ParticipantMicrophone;
}

export interface LeaveShowPayload {
  showId: string;
  userId: string;
}

export interface SendChatPayload {
  showId: string;
  senderId: string;
  senderName: string;
  senderStageName?: string;
  message: string;
  type: ChatMessageType;
  recipientId?: string;
}

export interface UpdateQueuePayload {
  showId: string;
  djId: string;
  queueOrder: string[];
}

export interface AddToQueuePayload {
  showId: string;
  userId: string;
  userName: string;
  stageName?: string;
  avatar?: ParticipantAvatar;
  microphone?: ParticipantMicrophone;
  songRequest?: string;
}

export interface AnnouncementPayload {
  showId: string;
  djId: string;
  djName: string;
  message: string;
  displayDuration: number;
}
