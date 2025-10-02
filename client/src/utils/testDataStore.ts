// Test data structures that mirror real database entities but stay in memory
export interface TestUser {
  id: string;
  email: string;
  name: string;
  stageName: string;
  password?: string;
  provider?: string;
  providerId?: string;
  profileImageUrl?: string;
  isActive: boolean;
  isAdmin: boolean;

  // Subscription fields
  stripeCustomerId?: string;

  // Coin system
  coins: number;

  // DJ subscription
  djId?: string;
  isDjSubscriptionActive: boolean;
  djStripeSubscriptionId?: string;
  djSubscriptionCancelledAt?: Date;
  djSubscriptionExpiresAt?: Date;

  // Equipped items
  equippedAvatarId?: string;
  equippedMicrophoneId?: string;

  createdAt: Date;
  updatedAt: Date;
}

export interface TestVenue {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  isActive: boolean;
  description?: string;
  capacity?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface TestAvatar {
  id: string;
  name: string;
  imageUrl: string;
  category: string;
  basePrice: number;
  coinPrice: number;
  isAvailable: boolean;
  isFree: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TestMicrophone {
  id: string;
  name: string;
  imageUrl: string;
  category: string;
  basePrice: number;
  coinPrice: number;
  isAvailable: boolean;
  isFree: boolean;
  effectType?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TestDJ {
  id: string;
  name: string;
  bio?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Test data store - keeps everything in memory
class TestDataStore {
  private users: Map<string, TestUser> = new Map();
  private venues: Map<string, TestVenue> = new Map();
  private avatars: Map<string, TestAvatar> = new Map();
  private microphones: Map<string, TestMicrophone> = new Map();
  private djs: Map<string, TestDJ> = new Map();

  constructor() {
    this.initializeDefaultData();
  }

  // User operations
  addUser(user: TestUser): TestUser {
    this.users.set(user.id, user);
    return user;
  }

  getUser(id: string): TestUser | undefined {
    return this.users.get(id);
  }

  getUserByEmail(email: string): TestUser | undefined {
    return Array.from(this.users.values()).find((u) => u.email === email);
  }

  getAllUsers(): TestUser[] {
    return Array.from(this.users.values());
  }

  updateUser(id: string, updates: Partial<TestUser>): TestUser | undefined {
    const user = this.users.get(id);
    if (user) {
      const updated = { ...user, ...updates, updatedAt: new Date() };
      this.users.set(id, updated);
      return updated;
    }
    return undefined;
  }

  deleteUser(id: string): boolean {
    return this.users.delete(id);
  }

  // Venue operations
  addVenue(venue: TestVenue): TestVenue {
    this.venues.set(venue.id, venue);
    return venue;
  }

  getVenue(id: string): TestVenue | undefined {
    return this.venues.get(id);
  }

  getAllVenues(): TestVenue[] {
    return Array.from(this.venues.values());
  }

  // Avatar operations
  getAvatar(id: string): TestAvatar | undefined {
    return this.avatars.get(id);
  }

  getAllAvatars(): TestAvatar[] {
    return Array.from(this.avatars.values());
  }

  getFreeAvatars(): TestAvatar[] {
    return Array.from(this.avatars.values()).filter((a) => a.isFree);
  }

  // Microphone operations
  getMicrophone(id: string): TestMicrophone | undefined {
    return this.microphones.get(id);
  }

  getAllMicrophones(): TestMicrophone[] {
    return Array.from(this.microphones.values());
  }

  getFreeMicrophones(): TestMicrophone[] {
    return Array.from(this.microphones.values()).filter((m) => m.isFree);
  }

  // DJ operations
  getDJ(id: string): TestDJ | undefined {
    return this.djs.get(id);
  }

  getAllDJs(): TestDJ[] {
    return Array.from(this.djs.values());
  }

  // Check if user has DJ subscription
  isDJUser(userId: string): boolean {
    const user = this.getUser(userId);
    return user ? user.isDjSubscriptionActive : false;
  }

  // Reset all data
  reset(): void {
    this.users.clear();
    this.venues.clear();
    this.avatars.clear();
    this.microphones.clear();
    this.djs.clear();
    this.initializeDefaultData();
  }

  private initializeDefaultData(): void {
    // Initialize default avatars
    const defaultAvatars: TestAvatar[] = [
      {
        id: 'avatar_default_1',
        name: 'Classic Alex',
        imageUrl: '/images/avatar/avatars/alex.png',
        category: 'Classic',
        basePrice: 0,
        coinPrice: 0,
        isAvailable: true,
        isFree: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'avatar_rockstar_1',
        name: 'Rock Star Avatar',
        imageUrl: '/images/avatar/avatar_7.png',
        category: 'Rock',
        basePrice: 500,
        coinPrice: 50,
        isAvailable: true,
        isFree: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'avatar_pop_1',
        name: 'Pop Star Avatar',
        imageUrl: '/images/avatar/avatar_12.png',
        category: 'Pop',
        basePrice: 300,
        coinPrice: 30,
        isAvailable: true,
        isFree: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'avatar_hip_hop_1',
        name: 'Hip Hop Avatar',
        imageUrl: '/images/avatar/avatar_15.png',
        category: 'Hip Hop',
        basePrice: 400,
        coinPrice: 40,
        isAvailable: true,
        isFree: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'avatar_country_1',
        name: 'Country Avatar',
        imageUrl: '/images/avatar/avatar_20.png',
        category: 'Country',
        basePrice: 350,
        coinPrice: 35,
        isAvailable: true,
        isFree: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    // Initialize default microphones
    const defaultMicrophones: TestMicrophone[] = [
      {
        id: 'mic_default_1',
        name: 'Basic Mic',
        imageUrl: '/images/avatar/parts/microphones/mic_basic_1.png',
        category: 'Basic',
        basePrice: 0,
        coinPrice: 0,
        isAvailable: true,
        isFree: true,
        effectType: 'none',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'mic_pro_1',
        name: 'Gold Pro Mic',
        imageUrl: '/images/avatar/parts/microphones/mic_gold_1.png',
        category: 'Professional',
        basePrice: 1000,
        coinPrice: 100,
        isAvailable: true,
        isFree: false,
        effectType: 'reverb',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'mic_vintage_1',
        name: 'Ruby Vintage Mic',
        imageUrl: '/images/avatar/parts/microphones/mic_ruby_1.png',
        category: 'Vintage',
        basePrice: 750,
        coinPrice: 75,
        isAvailable: true,
        isFree: false,
        effectType: 'echo',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'mic_wireless_1',
        name: 'Emerald Performance Mic',
        imageUrl: '/images/avatar/parts/microphones/mic_emerald_1.png',
        category: 'Wireless',
        basePrice: 600,
        coinPrice: 60,
        isAvailable: true,
        isFree: false,
        effectType: 'clarity',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'mic_gaming_1',
        name: 'Diamond Elite Mic',
        imageUrl: '/images/avatar/parts/microphones/mic_diamond_1.png',
        category: 'Gaming',
        basePrice: 450,
        coinPrice: 45,
        isAvailable: true,
        isFree: false,
        effectType: 'distortion',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    // Initialize default venues
    const defaultVenues: TestVenue[] = [
      {
        id: 'venue_test_1',
        name: 'The Karaoke Lounge',
        address: '123 Music Street, Entertainment District',
        lat: 40.7128,
        lng: -74.006,
        isActive: true,
        description: 'A cozy karaoke lounge with great sound system',
        capacity: 50,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'venue_test_2',
        name: 'Sing & Sway Bar',
        address: '456 Harmony Avenue, Music Quarter',
        lat: 40.7589,
        lng: -73.9851,
        isActive: true,
        description: 'Upbeat karaoke bar with full cocktail menu',
        capacity: 75,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'venue_test_3',
        name: 'Melody Manor',
        address: '789 Song Boulevard, Vocal Valley',
        lat: 40.7282,
        lng: -73.7949,
        isActive: true,
        description: 'Premium karaoke venue with private rooms',
        capacity: 100,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    // Add to maps
    defaultAvatars.forEach((avatar) => this.avatars.set(avatar.id, avatar));
    defaultMicrophones.forEach((mic) => this.microphones.set(mic.id, mic));
    defaultVenues.forEach((venue) => this.venues.set(venue.id, venue));
  }
}

// Singleton instance
export const testDataStore = new TestDataStore();
