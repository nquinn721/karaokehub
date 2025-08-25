// Export store classes
export { AuthStore } from './AuthStore';
export { FriendsStore } from './FriendsStore';
export { MusicStore } from './MusicStore';
export { ShowsStore } from './ShowsStore';
export { UserStore } from './UserStore';

// Import store classes for creating instances
import { AuthStore } from './AuthStore';
import { FriendsStore } from './FriendsStore';
import { MusicStore } from './MusicStore';
import { ShowsStore } from './ShowsStore';
import { UserStore } from './UserStore';

// Create store instances
export const authStore = new AuthStore();
export const musicStore = new MusicStore();
export const showsStore = new ShowsStore();
export const userStore = new UserStore();
export const friendsStore = new FriendsStore();

// Create a stores object for easy access
export const stores = {
  authStore,
  musicStore,
  showsStore,
  userStore,
  friendsStore,
};

// Root store type for MobX DevTools
export interface RootStore {
  authStore: AuthStore;
  musicStore: MusicStore;
  showsStore: ShowsStore;
  userStore: UserStore;
  friendsStore: FriendsStore;
}
