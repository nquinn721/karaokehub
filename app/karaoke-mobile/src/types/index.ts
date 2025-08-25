// User types
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  stageName?: string;
  profilePicture?: string;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

// Music types
export interface Song {
  id: string;
  title: string;
  artist: string;
  album?: string;
  genre?: string;
  duration?: number;
  itunesId?: string;
  youtubeId?: string;
  previewUrl?: string;
  albumArtSmall?: string;
  albumArtMedium?: string;
  albumArtLarge?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AlbumArt {
  small?: string;
  medium?: string;
  large?: string;
}

export interface MusicSearchResult {
  id: string;
  title: string;
  artist: string;
  album?: string;
  releaseDate?: string;
  year?: string;
  duration?: number;
  previewUrl?: string;
  itunesId?: number;
  popularity?: number;
  imageUrl?: string;
  albumArt?: AlbumArt;
  source: 'itunes';
  itunesUrl?: string;
}

export interface SongFavorite {
  id: string;
  userId: string;
  songId: string;
  category?: string;
  createdAt: string;
  song?: Song;
}

// Show types
export interface Show {
  id: string;
  djId?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  venue?: string;
  time?: string;
  day?: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
  startTime?: string;
  endTime?: string;
  description?: string;
  venuePhone?: string;
  venueWebsite?: string;
  source?: string;
  lat?: number;
  lng?: number;
  isActive: boolean;
  isValid: boolean;
  createdAt: string;
  updatedAt: string;
  dj?: DJ;
}

// Vendor/DJ types - using Vendor as synonym for DJ in mobile app
export interface Vendor {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  bio?: string;
  profilePicture?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DJ {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  bio?: string;
  profilePicture?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Favorites
export interface FavoriteShow {
  id: string;
  userId: string;
  showId: string;
  createdAt: string;
  show?: Show;
}

// Friend types
export interface FriendRequest {
  id: string;
  senderId: string;
  receiverId: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
  sender?: User;
  receiver?: User;
}

export interface Friendship {
  id: string;
  user1Id: string;
  user2Id: string;
  createdAt: string;
  user1?: User;
  user2?: User;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// Navigation types
export type RootStackParamList = {
  MainTabs: undefined;
  Login: undefined;
  Register: undefined;
  ShowDetails: { showId: string };
  UserProfile: { userId: string };
  EditProfile: undefined;
  Settings: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Shows: undefined;
  Music: undefined;
  Friends: undefined;
  Profile: undefined;
};

export type ShowsStackParamList = {
  ShowsList: undefined;
  ShowDetails: { showId: string };
  FavoriteShows: undefined;
};

export type MusicStackParamList = {
  MusicSearch: undefined;
  FavoriteSongs: undefined;
  SongDetails: { song: MusicSearchResult };
};

export type FriendsStackParamList = {
  FriendsList: undefined;
  FriendRequests: undefined;
  AddFriends: undefined;
};

// Form types
export interface LoginForm {
  email: string;
  password: string;
}

export interface RegisterForm {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  stageName?: string;
}

// Settings types
export interface UserSettings {
  notifications: {
    showReminders: boolean;
    friendRequests: boolean;
    newShows: boolean;
  };
  privacy: {
    profileVisibility: 'public' | 'friends' | 'private';
    showFavorites: boolean;
  };
  preferences: {
    defaultLocation?: string;
    favoriteGenres: string[];
  };
}
