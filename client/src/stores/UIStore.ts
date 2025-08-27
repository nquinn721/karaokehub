import { makeAutoObservable } from 'mobx';
import { makePersistable } from 'mobx-persist-store';

export class UIStore {
  sidebarOpen = false;
  feedbackModalOpen = false;
  notifications: Array<{
    id: string;
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
    timestamp: Date;
  }> = [];

  constructor() {
    makeAutoObservable(this);

    makePersistable(this, {
      name: 'UIStore',
      properties: ['sidebarOpen'],
      storage: window.localStorage,
    });
  }

  toggleSidebar() {
    this.sidebarOpen = !this.sidebarOpen;
  }

  setSidebarOpen(open: boolean) {
    this.sidebarOpen = open;
  }

  openFeedbackModal() {
    this.feedbackModalOpen = true;
  }

  closeFeedbackModal() {
    this.feedbackModalOpen = false;
  }

  addNotification(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') {
    const notification = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      message,
      type,
      timestamp: new Date(),
    };
    this.notifications.push(notification);

    // Auto remove after 5 seconds
    setTimeout(() => {
      this.removeNotification(notification.id);
    }, 5000);
  }

  removeNotification(id: string) {
    this.notifications = this.notifications.filter((n) => n.id !== id);
  }

  clearNotifications() {
    this.notifications = [];
  }
}
