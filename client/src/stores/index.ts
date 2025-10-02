import { autorun } from 'mobx';
import { adminStore as adminStoreInstance } from './AdminStore';
import { apiStore as apiStoreInstance } from './ApiStore';
import { audioStore as audioStoreInstance } from './AudioStore';
import { AuthStore } from './AuthStore';
import { FavoriteStore } from './FavoriteStore';
import { FeedbackStore, feedbackStore as feedbackStoreInstance } from './FeedbackStore';
import { FriendsStore, friendsStore as friendsStoreInstance } from './FriendsStore';
// import { LiveShowStore, liveShowStore as liveShowStoreInstance } from './LiveShowStore';
import { MapStore, mapStore as mapStoreInstance } from './MapStore';
import { MusicStore, musicStore as musicStoreInstance } from './MusicStore';
import { ParserStore } from './ParserStore';
import { ShowStore, showStore as showStoreInstance } from './ShowStore';
import {
  SongFavoriteStore,
  songFavoriteStore as songFavoriteStoreInstance,
} from './SongFavoriteStore';
import {
  SubscriptionStore,
  subscriptionStore as subscriptionStoreInstance,
} from './SubscriptionStore';
import { ThemeStore, themeStore as themeStoreInstance } from './ThemeStore';
import { TransactionStore } from './TransactionStore';
import { UIStore } from './UIStore';
import { UserStore, userStore as userStoreInstance } from './UserStore';
import { VendorStore } from './VendorStore';
import { WebSocketStore } from './WebSocketStore';

export class RootStore {
  authStore: AuthStore;
  uiStore: UIStore;
  showStore: ShowStore;
  favoriteStore: FavoriteStore;
  friendsStore: FriendsStore;
  songFavoriteStore: SongFavoriteStore;
  feedbackStore: FeedbackStore;
  vendorStore: VendorStore;
  webSocketStore: WebSocketStore;
  themeStore: ThemeStore;
  parserStore: ParserStore;
  mapStore: MapStore;
  musicStore: MusicStore;
  subscriptionStore: SubscriptionStore;
  userStore: UserStore;
  transactionStore: TransactionStore;
  apiStore: typeof apiStoreInstance;
  audioStore: typeof audioStoreInstance;

  private webSocketInitialized = false;

  constructor() {
    console.log('🏪 RootStore constructor called');
    this.authStore = new AuthStore();
    this.uiStore = new UIStore();
    this.showStore = showStoreInstance; // Use the singleton instance
    this.favoriteStore = new FavoriteStore();
    this.friendsStore = friendsStoreInstance; // Use the singleton instance
    this.songFavoriteStore = songFavoriteStoreInstance; // Use the singleton instance
    this.feedbackStore = feedbackStoreInstance; // Use the singleton instance
    this.vendorStore = new VendorStore();
    this.webSocketStore = new WebSocketStore();
    this.themeStore = themeStoreInstance; // Use the singleton instance
    this.parserStore = new ParserStore();
    this.mapStore = mapStoreInstance; // Use the singleton instance
    this.musicStore = musicStoreInstance; // Use the singleton instance
    this.subscriptionStore = subscriptionStoreInstance; // Use the singleton instance
    this.userStore = userStoreInstance; // Use the singleton instance
    this.transactionStore = new TransactionStore(apiStoreInstance);
    this.apiStore = apiStoreInstance;
    this.audioStore = audioStoreInstance; // Use the singleton instance

    // Setup WebSocket connection and parser events
    this.setupWebSocket();

    // Setup autorun to fetch subscription status when auth state changes
    autorun(() => {
      if (this.authStore.isAuthenticated && this.authStore.token) {
        // Fetch subscription status whenever user becomes authenticated
        this.subscriptionStore.fetchSubscriptionStatus().catch((error) => {
          console.warn('Failed to fetch subscription status:', error);
        });
      } else {
        // Clear subscription status when user logs out
        this.subscriptionStore.clearSubscriptionStatus();
      }
    });
  }

  private setupWebSocket() {
    if (this.webSocketInitialized) {
      console.log('🔄 WebSocket already initialized, skipping...');
      return;
    }

    console.log('🔌 Initializing WebSocket connection...');
    this.webSocketInitialized = true;

    // Connect to WebSocket server
    this.webSocketStore.connect();

    // Setup parser-specific events when WebSocket connects
    autorun(() => {
      if (this.webSocketStore.isConnected && this.webSocketStore.socket) {
        this.parserStore.setupParserEvents(this.webSocketStore.socket);
      }
    });
  }

  // Cleanup method for when the app unmounts
  cleanup() {
    this.webSocketStore.disconnect();
    this.parserStore.disconnect();
  }
}

export const rootStore = new RootStore();
export const {
  authStore,
  uiStore,
  showStore,
  favoriteStore,
  friendsStore,
  songFavoriteStore,
  feedbackStore,
  vendorStore,
  webSocketStore,
  parserStore,
  mapStore,
  musicStore,
  subscriptionStore,
  userStore,
  transactionStore,
  audioStore,
  apiStore: api,
} = rootStore;

// Export individual stores
export { adminStore } from './AdminStore';
export { liveShowStore } from './LiveShowStore';
export { localSubscriptionStore } from './LocalSubscriptionStore';
export { storeStore } from './StoreStore';
export { themeStore } from './ThemeStore';

export const apiStore = api;

// Make stores available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).authStore = authStore;
  (window as any).uiStore = uiStore;
  (window as any).apiStore = apiStore;
  (window as any).parserStore = parserStore;
  (window as any).adminStore = adminStoreInstance;
  (window as any).rootStore = rootStore;
}
