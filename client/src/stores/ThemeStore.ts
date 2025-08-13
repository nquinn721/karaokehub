import { makeAutoObservable } from 'mobx';
import { makePersistable } from 'mobx-persist-store';

export type ThemeMode = 'light' | 'dark';

export class ThemeStore {
  mode: ThemeMode = 'dark';

  constructor() {
    makeAutoObservable(this);

    // Make theme preference persistent
    makePersistable(this, {
      name: 'ThemeStore',
      properties: ['mode'],
      storage: window.localStorage,
    });
  }

  setTheme(mode: ThemeMode) {
    this.mode = mode;
  }

  toggleTheme() {
    this.mode = this.mode === 'dark' ? 'light' : 'dark';
  }

  get isDark() {
    return this.mode === 'dark';
  }

  get isLight() {
    return this.mode === 'light';
  }
}

export const themeStore = new ThemeStore();
