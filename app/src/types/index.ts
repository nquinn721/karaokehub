export interface User {
  id: string;
  email: string;
  name: string;
  stageName?: string;
  avatar?: string;
  isAdmin?: boolean;
  djId?: string;
  isDjSubscriptionActive?: boolean;
  coins?: number;
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
    fullAddress?: string;
    cityState?: string;
  };
  favorites?: Array<{
    id: string;
    userId: string;
  }>;
}

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

export interface Vendor {
  id: string;
  name: string;
  website?: string;
  instagram?: string;
  facebook?: string;
  owner?: string;
  djCount?: number;
}

export interface CitySummary {
  city: string;
  state: string;
  showCount: number;
  lat: number;
  lng: number;
  vendors: string[];
}

export interface MapBounds {
  lat: number;
  lng: number;
  radius?: number;
}

export interface VenueProximity {
  show: Show;
  distance: number;
  isAtVenue: boolean;
}
