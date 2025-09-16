a; // User and Authentication Types
export interface User {
  id: string;
  email: string;
  name: string;
  stageName?: string;
  avatar?: string;
  isAdmin?: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  name: string;
  stageName?: string;
}

// Show Types
export enum DayOfWeek {
  MONDAY = 'monday',
  TUESDAY = 'tuesday',
  WEDNESDAY = 'wednesday',
  THURSDAY = 'thursday',
  FRIDAY = 'friday',
  SATURDAY = 'saturday',
  SUNDAY = 'sunday',
}

export interface Show {
  id: string;
  djId: string;
  venueId?: string;
  source?: string;
  day: DayOfWeek | string;
  startTime: string;
  endTime: string;
  description?: string;
  isFlagged?: boolean;
  submittedBy?: string;
  submittedByUser?: {
    id: string;
    name: string;
    email: string;
    stageName?: string;
    avatar?: string;
  };
  dj?: {
    id: string;
    name: string;
    vendor?: {
      id: string;
      name: string;
      owner?: string;
    };
  };
  venue?: {
    id: string;
    name: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    lat?: number;
    lng?: number;
    phone?: string;
    website?: string;
  };
}

// Music Types
export interface MusicSearchResult {
  id: string;
  title: string;
  artist?: string;
  artistId?: string;
  album?: string;
  year?: string;
  duration?: number;
  country?: string;
  disambiguation?: string;
  tags?: string[];
  score?: number;
  albumArt?: {
    small?: string;
    medium?: string;
    large?: string;
  };
  previewUrl?: string;
}

export interface ArtistSearchResult {
  id: string;
  name: string;
  country?: string;
  area?: string;
  disambiguation?: string;
  tags?: string[];
  score?: number;
  beginDate?: string;
  endDate?: string;
}

// Subscription Types
export interface SubscriptionStatus {
  subscription: {
    id: string;
    plan: 'free' | 'ad_free' | 'premium';
    status: string;
    pricePerMonth: number;
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
  } | null;
  features: {
    adFree: boolean;
    premium: boolean;
    songPreviews: {
      unlimited: boolean;
      limit: number | null;
    };
    songFavorites: {
      unlimited: boolean;
      limit: number | null;
    };
    showFavorites: {
      unlimited: boolean;
      limit: number | null;
    };
  };
}

// Navigation Types
export type RootStackParamList = {
  AuthStack: undefined;
  MainTabs: undefined;
  Settings: undefined;
  About: undefined;
  PrivacyPolicy: undefined;
  SubmitShow: undefined;
};

export type AuthStackParamList = {
  Welcome: undefined;
  Login: undefined;
  Register: undefined;
};

export type MainTabParamList = {
  Shows: undefined;
  SubmitShow: undefined;
  Music: undefined;
  Dashboard: undefined;
  Profile: undefined;
};

export type MusicStackParamList = {
  MusicHome: undefined;
  MusicSearch: { query?: string };
  MusicCategory: { categoryId: string };
  MusicArtist: { artistId: string };
  MusicSong: { songId: string };
};

// Component Props Types
export interface PaywallModalProps {
  visible: boolean;
  onClose: () => void;
  feature: 'favorites' | 'ad_removal' | 'music_preview';
  featureDescription?: string;
}

export interface AudioPlayerProps {
  song: MusicSearchResult;
  onPlayPause: () => void;
  isPlaying: boolean;
  currentTime?: number;
  duration?: number;
}

// Location Types
export interface LocationCoords {
  latitude: number;
  longitude: number;
}

export interface VenueProximity {
  show: Show;
  distance: number;
  isAtVenue: boolean;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// Filter Types
export interface ShowFilters {
  day?: DayOfWeek | 'all';
  city?: string;
  state?: string;
  searchQuery?: string;
  favoritesOnly?: boolean;
}

export interface MusicFilters {
  category?: string;
  query?: string;
  artist?: string;
  year?: string;
}

// Favorite Types
export interface ShowFavorite {
  id: string;
  userId: string;
  showId: string;
  show?: Show;
  createdAt: string;
}

export interface SongFavorite {
  id: string;
  userId: string;
  songId: string;
  song?: MusicSearchResult;
  createdAt: string;
}

// Friend Types
export interface Friend {
  id: string;
  userId: string;
  friendId: string;
  status: 'pending' | 'accepted' | 'blocked';
  friend?: User;
  createdAt: string;
}

// Notification Types
export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  duration?: number;
  action?: {
    label: string;
    onPress: () => void;
  };
}

// Stats Types
export interface UserStats {
  showsAttended: number;
  favoriteSongs: number;
  favoriteShows: number;
  friendsCount: number;
  achievements?: Achievement[];
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt?: string;
}

// Theme Types
export interface ThemeColors {
  primary: string;
  secondary: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  border: string;
  error: string;
  warning: string;
  success: string;
  info: string;
}

export type ThemeMode = 'light' | 'dark' | 'auto';
