import { apiStore } from './ApiStore';
import { AuthStore } from './AuthStore';
import { FavoriteStore } from './FavoriteStore';
import { MapStore } from './MapStore';
import { ParserStore } from './ParserStore';
import { ShowStore } from './ShowStore';
import { ThemeStore } from './ThemeStore';
import { UIStore } from './UIStore';
import { VendorStore } from './VendorStore';
import { WebSocketStore } from './WebSocketStore';

export class RootStore {
  authStore: AuthStore;
  uiStore: UIStore;
  showStore: ShowStore;
  favoriteStore: FavoriteStore;
  vendorStore: VendorStore;
  webSocketStore: WebSocketStore;
  themeStore: ThemeStore;
  parserStore: ParserStore;
  mapStore: MapStore;
  apiStore: typeof apiStore;

  constructor() {
    this.authStore = new AuthStore();
    this.uiStore = new UIStore();
    this.showStore = new ShowStore();
    this.favoriteStore = new FavoriteStore();
    this.vendorStore = new VendorStore();
    this.webSocketStore = new WebSocketStore();
    this.themeStore = new ThemeStore();
    this.parserStore = new ParserStore();
    this.mapStore = new MapStore();
    this.apiStore = apiStore;
  }
}

export const rootStore = new RootStore();
export const {
  authStore,
  uiStore,
  showStore,
  favoriteStore,
  vendorStore,
  webSocketStore,
  themeStore,
  parserStore,
  mapStore,
  apiStore: api,
} = rootStore;

// Export individual stores
export { apiStore };

// Make stores available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).authStore = authStore;
  (window as any).uiStore = uiStore;
  (window as any).apiStore = apiStore;
  (window as any).parserStore = parserStore;
  (window as any).rootStore = rootStore;
}
