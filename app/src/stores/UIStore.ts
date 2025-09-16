import AsyncStorage from '@react-native-async-storage/async-storage';
import { makeAutoObservable, runInAction } from 'mobx';
import { makePersistable } from 'mobx-persist-store';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
}

export class UIStore {
  // Theme
  isDarkMode = false;

  // Navigation state
  currentTab: string = 'home';

  // Modal states
  showFeedbackModal = false;
  showSubscriptionModal = false;
  showLocationPermissionModal = false;

  // Loading states
  isAppLoading = false;
  globalLoadingMessage = '';

  // Toast notifications
  toasts: ToastMessage[] = [];

  // Bottom sheet states
  showsBottomSheetVisible = false;
  showsBottomSheetSnapPoint = 0; // 0 = closed, 1 = peek, 2 = expanded

  // Search states
  searchQuery = '';
  searchFocused = false;

  // Offline state
  isOffline = false;

  constructor() {
    makeAutoObservable(this);

    // Make UI preferences persistent
    makePersistable(this, {
      name: 'UIStore',
      properties: ['isDarkMode', 'currentTab'],
      storage: AsyncStorage,
    });
  }

  // Theme actions
  setDarkMode(isDark: boolean) {
    runInAction(() => {
      this.isDarkMode = isDark;
    });
  }

  toggleDarkMode() {
    runInAction(() => {
      this.isDarkMode = !this.isDarkMode;
    });
  }

  // Navigation actions
  setCurrentTab(tab: string) {
    runInAction(() => {
      this.currentTab = tab;
    });
  }

  // Modal actions
  openFeedbackModal() {
    runInAction(() => {
      this.showFeedbackModal = true;
    });
  }

  closeFeedbackModal() {
    runInAction(() => {
      this.showFeedbackModal = false;
    });
  }

  openSubscriptionModal() {
    runInAction(() => {
      this.showSubscriptionModal = true;
    });
  }

  closeSubscriptionModal() {
    runInAction(() => {
      this.showSubscriptionModal = false;
    });
  }

  openLocationPermissionModal() {
    runInAction(() => {
      this.showLocationPermissionModal = true;
    });
  }

  closeLocationPermissionModal() {
    runInAction(() => {
      this.showLocationPermissionModal = false;
    });
  }

  // Global loading actions
  setAppLoading(loading: boolean, message?: string) {
    runInAction(() => {
      this.isAppLoading = loading;
      this.globalLoadingMessage = message || '';
    });
  }

  // Toast notification actions
  showToast(toast: Omit<ToastMessage, 'id'>) {
    const id = Math.random().toString(36).substring(7);
    const duration = toast.duration || 3000;

    const newToast: ToastMessage = {
      ...toast,
      id,
      duration,
    };

    runInAction(() => {
      this.toasts.push(newToast);
    });

    // Auto-remove toast after duration
    setTimeout(() => {
      this.removeToast(id);
    }, duration);

    return id;
  }

  removeToast(id: string) {
    runInAction(() => {
      this.toasts = this.toasts.filter((toast) => toast.id !== id);
    });
  }

  clearAllToasts() {
    runInAction(() => {
      this.toasts = [];
    });
  }

  // Convenience toast methods
  showSuccessToast(title: string, message?: string, duration?: number) {
    return this.showToast({
      type: 'success',
      title,
      message,
      duration,
    });
  }

  showErrorToast(title: string, message?: string, duration?: number) {
    return this.showToast({
      type: 'error',
      title,
      message,
      duration: duration || 5000, // Error toasts last longer by default
    });
  }

  showWarningToast(title: string, message?: string, duration?: number) {
    return this.showToast({
      type: 'warning',
      title,
      message,
      duration,
    });
  }

  showInfoToast(title: string, message?: string, duration?: number) {
    return this.showToast({
      type: 'info',
      title,
      message,
      duration,
    });
  }

  // Bottom sheet actions for shows page
  setShowsBottomSheetVisible(visible: boolean) {
    runInAction(() => {
      this.showsBottomSheetVisible = visible;
    });
  }

  setShowsBottomSheetSnapPoint(point: number) {
    runInAction(() => {
      this.showsBottomSheetSnapPoint = point;
    });
  }

  // Search actions
  setSearchQuery(query: string) {
    runInAction(() => {
      this.searchQuery = query;
    });
  }

  setSearchFocused(focused: boolean) {
    runInAction(() => {
      this.searchFocused = focused;
    });
  }

  clearSearch() {
    runInAction(() => {
      this.searchQuery = '';
      this.searchFocused = false;
    });
  }

  // Network state
  setOfflineStatus(isOffline: boolean) {
    runInAction(() => {
      this.isOffline = isOffline;
    });

    if (isOffline) {
      this.showWarningToast('No Internet', 'You are currently offline', 5000);
    }
  }

  // Utility getters
  get hasActiveToasts(): boolean {
    return this.toasts.length > 0;
  }

  get isShowsBottomSheetOpen(): boolean {
    return this.showsBottomSheetVisible && this.showsBottomSheetSnapPoint > 0;
  }

  get shouldShowGlobalLoading(): boolean {
    return this.isAppLoading && !!this.globalLoadingMessage;
  }

  // Reset all UI state (useful for logout)
  reset() {
    runInAction(() => {
      this.showFeedbackModal = false;
      this.showSubscriptionModal = false;
      this.showLocationPermissionModal = false;
      this.isAppLoading = false;
      this.globalLoadingMessage = '';
      this.toasts = [];
      this.showsBottomSheetVisible = false;
      this.showsBottomSheetSnapPoint = 0;
      this.searchQuery = '';
      this.searchFocused = false;
      // Don't reset theme and tab preferences
    });
  }
}

export const uiStore = new UIStore();
