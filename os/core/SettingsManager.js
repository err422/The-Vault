/**
 * @fileoverview Settings Manager for The Web Vault WebOS.
 *
 * Manages user preferences: theme, wallpaper, accent color, reduced motion,
 * window snapping, desktop layout, and dock behavior.
 * Persists locally to `vault_os_settings_v1` and syncs with Store.js.
 *
 * @module os/core/SettingsManager
 */

import store from './Store.js';

const STORAGE_KEY = 'vault_os_settings_v1';

export const WALLPAPERS = [
  { id: 'vault-default', name: 'Vault Deep (Default)', value: 'linear-gradient(to top, #1a0033, #0d001a, #000000)' },
  { id: 'nebula-purple', name: 'Cosmic Nebula', value: 'radial-gradient(ellipse at 50% 50%, #2e0854 0%, #15002b 60%, #070014 100%)' },
  { id: 'cyber-grid', name: 'Neon Cyberpunk', value: 'linear-gradient(135deg, #0b001a 0%, #1a0533 50%, #2e0854 100%)' },
  { id: 'abyss-dark', name: 'Pure Obsidian', value: '#07050c' },
  { id: 'synthwave', name: 'Synthwave Sunset', value: 'linear-gradient(180deg, #18052e 0%, #3a0ca3 45%, #7209b7 75%, #f72585 100%)' },
  { id: 'deep-space', name: 'Starlight Void', value: 'radial-gradient(circle at top right, #38126b, #0c0217 65%, #05000a 100%)' }
];

export const ACCENTS = [
  { id: 'violet', name: 'Electric Violet', primary: '#8b5cf6', secondary: '#a855f7' },
  { id: 'magenta', name: 'Neon Magenta', primary: '#ec4899', secondary: '#f43f5e' },
  { id: 'cyan', name: 'Cyber Cyan', primary: '#06b6d4', secondary: '#3b82f6' },
  { id: 'emerald', name: 'Matrix Emerald', primary: '#10b981', secondary: '#059669' },
  { id: 'amber', name: 'Solar Amber', primary: '#f59e0b', secondary: '#d97706' }
];

const DEFAULT_SETTINGS = {
  theme: 'dark',
  accent: 'violet',
  wallpaper: 'vault-default',
  customWallpaperUrl: '',
  reducedMotion: false,
  windowSnapping: true,
  dockAutoHide: false,
  desktopIconSize: 'medium', // small, medium, large
  snapToGrid: true
};

class SettingsManager {
  constructor() {
    this._settings = { ...DEFAULT_SETTINGS };
    this._initialized = false;
  }

  /**
   * Load saved settings and apply them to the document and Store.
   */
  async init() {
    if (this._initialized) return;

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        this._settings = { ...DEFAULT_SETTINGS, ...parsed };
      }
    } catch (err) {
      console.warn('[SettingsManager] Failed to read localStorage:', err);
    }

    this._initialized = true;
    this.applyAll();
  }

  get(key) {
    return this._settings[key];
  }

  getAll() {
    return { ...this._settings };
  }

  set(key, value) {
    this._settings[key] = value;
    this._save();
    this.applySetting(key, value);
    store.emit('settings:changed', { key, value, settings: this._settings });
  }

  setMultiple(obj) {
    for (const [k, v] of Object.entries(obj)) {
      this._settings[k] = v;
      this.applySetting(k, v);
    }
    this._save();
    store.emit('settings:changed', { settings: this._settings });
  }

  _save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this._settings));
    } catch (err) {
      console.error('[SettingsManager] Failed to save settings:', err);
    }
  }

  applySetting(key, value) {
    const doc = document.documentElement;

    switch (key) {
      case 'theme':
        doc.setAttribute('data-theme', value);
        store.setState('theme', value);
        break;

      case 'accent': {
        const acc = ACCENTS.find(a => a.id === value) || ACCENTS[0];
        doc.style.setProperty('--vault-accent-primary', acc.primary);
        doc.style.setProperty('--vault-accent-secondary', acc.secondary);
        doc.style.setProperty('--vault-accent-glow', `${acc.primary}55`);
        break;
      }

      case 'wallpaper':
      case 'customWallpaperUrl': {
        let wpValue = '';
        if (this._settings.customWallpaperUrl) {
          wpValue = `url("${this._settings.customWallpaperUrl}")`;
        } else {
          const wp = WALLPAPERS.find(w => w.id === this._settings.wallpaper) || WALLPAPERS[0];
          wpValue = wp.value.startsWith('http') || wp.value.startsWith('/')
            ? `url("${wp.value}")`
            : wp.value;
        }
        doc.style.setProperty('--vault-wallpaper', wpValue);
        store.setState('desktop.wallpaper', wpValue);
        store.emit('wallpaper:changed', wpValue);
        break;
      }

      case 'reducedMotion':
        doc.setAttribute('data-reduced-motion', String(value));
        break;

      case 'dockAutoHide':
        store.setState('dock.autoHide', value);
        break;

      case 'desktopIconSize':
      case 'snapToGrid':
        store.setState(`desktop.${key}`, value);
        break;
    }
  }

  applyAll() {
    for (const [k, v] of Object.entries(this._settings)) {
      this.applySetting(k, v);
    }
  }

  /**
   * Reset all settings and virtual filesystem to factory state.
   */
  async factoryReset() {
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem('vault_os_prefs');

      // Clear VFS indexedDB
      if (window.indexedDB) {
        indexedDB.deleteDatabase('vault_os_vfs_v1');
      }

      // Clear any localStorage VFS keys
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('vault_vfs:')) keysToRemove.push(k);
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));

      window.location.reload();
    } catch (err) {
      console.error('[SettingsManager] Factory reset failed:', err);
    }
  }
}

const settingsManager = new SettingsManager();
export default settingsManager;
