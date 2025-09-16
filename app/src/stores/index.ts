import { audioStore } from './AudioStore';
import { authStore } from './AuthStore';
import { createMapStore } from './MapStore';
import { musicStore } from './MusicStore';
import { showStore } from './ShowStore';
import { subscriptionStore } from './SubscriptionStore';
import { uiStore } from './UIStore';

// Create map store with show store dependency
const mapStore = createMapStore(showStore);

// Export all stores
export { audioStore, authStore, mapStore, musicStore, showStore, subscriptionStore, uiStore };

// Root store class for dependency injection if needed
export class RootStore {
  authStore = authStore;
  subscriptionStore = subscriptionStore;
  showStore = showStore;
  musicStore = musicStore;
  audioStore = audioStore;
  mapStore = mapStore;
  uiStore = uiStore;

  constructor() {
    console.log('🏪 RootStore initialized for mobile app');

    // Initialize stores that need setup
    this.initialize();
  }

  private async initialize() {
    try {
      // Initialize map store
      await this.mapStore.initialize();

      console.log('✅ All stores initialized successfully');
    } catch (error) {
      console.error('❌ Store initialization failed:', error);
    }
  }

  // Cleanup method for app shutdown
  async cleanup() {
    try {
      await this.audioStore.cleanup();
      this.mapStore.cleanup();
      console.log('✅ Store cleanup completed');
    } catch (error) {
      console.error('❌ Store cleanup failed:', error);
    }
  }

  // Reset all stores (useful for logout)
  reset() {
    this.showStore.clearData();
    this.musicStore.reset();
    this.mapStore.reset();
    this.uiStore.reset();
    // Note: Don't reset auth store here, it handles its own logout
  }
}

// Create and export the root store instance
export const rootStore = new RootStore();

// Make stores available globally for debugging in development
if (__DEV__) {
  (global as any).stores = {
    authStore,
    subscriptionStore,
    showStore,
    musicStore,
    audioStore,
    mapStore,
    uiStore,
    rootStore,
  };
}
