/**
 * @fileoverview Firebase Authentication & Data Synchronization Bridge for The Web Vault WebOS.
 *
 * Wraps existing window.auth and window.database globals non-destructively.
 * Never calls initializeApp() again.
 * Syncs user preferences (theme, wallpaper, accent, pinned apps) to `users/{uid}/webos`
 * with graceful offline degradation.
 *
 * @module os/services/FirebaseSync
 */

import store from '../core/Store.js';
import settingsManager from '../core/SettingsManager.js';
import notificationManager from '../core/NotificationManager.js';

class FirebaseSync {
  constructor() {
    this._user = null;
    this._initialized = false;
    this._syncTimer = null;
    this._cloudPrefs = {};
  }

  init() {
    if (this._initialized) return;
    this._initialized = true;

    // Listen to AuthCore profile ready event or window.auth
    window.addEventListener('authProfileReady', (e) => {
      this._handleAuthChange(e.detail?.user, e.detail?.username, e.detail?.admin);
    });

    // Check if auth is already available
    if (window.AuthCore?.currentUser) {
      this._handleAuthChange(
        window.AuthCore.currentUser,
        window.AuthCore.currentUsername,
        window.AuthCore.currentAdmin
      );
    } else if (window.auth) {
      window.auth.onAuthStateChanged((user) => {
        if (!window.AuthCore) {
          this._handleAuthChange(user, user?.displayName || user?.email?.split('@')[0], false);
        }
      });
    }

    // Listen to settings changes to push to cloud if logged in
    store.on('settings:changed', () => {
      if (this._user) {
        this._scheduleSync();
      }
    });
  }

  _handleAuthChange(user, username, isAdmin) {
    this._user = user;

    store.setState('session', {
      uid: user ? user.uid : null,
      email: user ? user.email : null,
      displayName: username || (user ? user.email?.split('@')[0] : 'Guest'),
      username: username || null,
      isAdmin: !!isAdmin,
      isLoggedIn: !!user
    });

    store.emit('user:changed', store.getState('session'));

    if (user) {
      console.log(`[FirebaseSync] Signed in as @${username || user.uid}`);
      this._pullCloudPreferences(user.uid);
    } else {
      console.log('[FirebaseSync] Running in guest mode.');
    }
  }

  async _pullCloudPreferences(uid) {
    if (!window.database) return;
    try {
      const snap = await window.database.ref(`users/${uid}/webos`).once('value');
      const cloudPrefs = snap.val() || {};
      this._cloudPrefs = cloudPrefs;
      if (cloudPrefs && typeof cloudPrefs === 'object') {
        const settingKeys = ['theme', 'accent', 'wallpaper', 'customWallpaperUrl', 'reducedMotion', 'windowSnapping', 'autoFullscreenOnClick', 'dockAutoHide', 'desktopIconSize', 'snapToGrid'];
        const settings = Object.fromEntries(settingKeys.filter(key => Object.prototype.hasOwnProperty.call(cloudPrefs, key)).map(key => [key, cloudPrefs[key]]));
        if (Object.keys(settings).length) settingsManager.setMultiple(settings);
        notificationManager.notify({
          title: 'Cloud Synced',
          message: 'Your WebOS desktop preferences have been loaded from cloud.',
          type: 'success'
        });
      }
    } catch (err) {
      console.warn('[FirebaseSync] Could not pull cloud preferences (falling back to local):', err);
    }
  }

  getCloudPreferences() {
    return { ...this._cloudPrefs };
  }

  _scheduleSync() {
    if (this._syncTimer) clearTimeout(this._syncTimer);
    this._syncTimer = setTimeout(() => this._pushCloudPreferences(), 1000);
  }

  async _pushCloudPreferences() {
    if (!this._user || !window.database) return;
    try {
      const settings = settingsManager.getAll();
      // Keep only lightweight syncable fields
      const toSync = {
        theme: settings.theme,
        accent: settings.accent,
        wallpaper: settings.wallpaper,
        customWallpaperUrl: settings.customWallpaperUrl,
        reducedMotion: settings.reducedMotion,
        windowSnapping: settings.windowSnapping,
        desktopIconSize: settings.desktopIconSize,
        snapToGrid: settings.snapToGrid,
        lastSynced: Date.now()
      };

      await window.database.ref(`users/${this._user.uid}/webos`).update(toSync);
    } catch (err) {
      console.warn('[FirebaseSync] Cloud sync update failed (using local cache):', err);
    }
  }

  async signIn(usernameOrEmail, password) {
    if (window.AuthCore?.signIn) {
      return await window.AuthCore.signIn(usernameOrEmail, password);
    }
    throw new Error('Authentication system not available');
  }

  async signUp(username, email, password) {
    if (window.AuthCore?.signUp) {
      return await window.AuthCore.signUp(username, email, password);
    }
    throw new Error('Authentication system not available');
  }

  async signOut() {
    if (window.AuthCore?.signOut) {
      return await window.AuthCore.signOut();
    }
    if (window.auth?.signOut) {
      return await window.auth.signOut();
    }
  }
}

const firebaseSync = new FirebaseSync();
export default firebaseSync;
