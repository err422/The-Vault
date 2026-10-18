/**
 * @fileoverview Application Registry for The Web Vault WebOS.
 *
 * Stores app manifests, enforces singleton constraints, and provides
 * the primary `launch()` API that bridges manifests with the WindowManager.
 *
 * @module os/core/AppRegistry
 */

import store from './Store.js';
import windowManager from './WindowManager.js';

/* ------------------------------------------------------------------ */
/*  Manifest schema (JSDoc only)                                       */
/* ------------------------------------------------------------------ */

/**
 * @typedef {Object} MenuAction
 * @property {string}  label
 * @property {string}  [action]   - Action identifier dispatched to the app
 * @property {string}  [shortcut] - Human-readable shortcut hint, e.g. '⌘N'
 * @property {boolean} [separator] - Render a separator instead of an item
 */

/**
 * @typedef {Object} MenuGroup
 * @property {string}       label
 * @property {MenuAction[]} items
 */

/**
 * @typedef {Object} AppManifest
 * @property {string}   id          - Unique app identifier (lowercase, e.g. 'finder')
 * @property {string}   name        - Human-readable name
 * @property {string}   icon        - Emoji or icon URL
 * @property {string}   [category]  - 'utility' | 'productivity' | 'media' | 'system' | 'game'
 * @property {string}   [version]   - Semver string
 * @property {boolean}  [singleton] - If true, only one window instance allowed
 * @property {{width: number, height: number}} [defaultSize]
 * @property {{width: number, height: number}} [minSize]
 * @property {MenuGroup[]} [menus]  - App-specific menu bar entries
 * @property {(containerEl: HTMLElement, context: AppContext) => void|Promise<void>} mount
 * @property {(containerEl: HTMLElement) => void} [unmount]
 */

/**
 * Context object passed to an app's mount function.
 *
 * @typedef {Object} AppContext
 * @property {string} instanceId  - The window instance ID
 * @property {string} appId
 * @property {Object} [launchOptions] - Arbitrary data from the caller
 * @property {Function} close     - Shortcut to close this window
 * @property {Function} setTitle  - Update the window title bar
 * @property {import('./Store.js').default} store
 * @property {import('./WindowManager.js').default} windowManager
 */

/* ------------------------------------------------------------------ */
/*  AppRegistry class                                                   */
/* ------------------------------------------------------------------ */

class AppRegistry {
  constructor() {
    /** @type {Map<string, AppManifest>} */
    this._manifests = new Map();

    /**
     * Tracks mount / unmount references per instanceId so we can cleanly
     * call unmount when a window is closed.
     * @type {Map<string, { manifest: AppManifest, containerEl: HTMLElement }>}
     */
    this._mountedInstances = new Map();

    // Listen for window close events to auto-unmount apps
    store.on('window:closed', ({ instanceId }) => {
      this._handleWindowClosed(instanceId);
    });
  }

  /* ---------------------------------------------------------------- */
  /*  Registration                                                      */
  /* ---------------------------------------------------------------- */

  /**
   * Register an application manifest.
   *
   * @param {AppManifest} manifest
   * @throws {Error} If `manifest.id` is missing or already registered.
   */
  register(manifest) {
    if (!manifest?.id) {
      throw new Error('[AppRegistry] Manifest must have an "id" property.');
    }
    if (typeof manifest.mount !== 'function') {
      throw new Error(`[AppRegistry] Manifest "${manifest.id}" must have a "mount" function.`);
    }
    if (this._manifests.has(manifest.id)) {
      console.warn(`[AppRegistry] Overwriting existing manifest for "${manifest.id}".`);
    }
    this._manifests.set(manifest.id, manifest);
  }

  /* ---------------------------------------------------------------- */
  /*  Queries                                                           */
  /* ---------------------------------------------------------------- */

  /**
   * Retrieve a registered manifest.
   *
   * @param {string} appId
   * @returns {AppManifest|undefined}
   */
  getApp(appId) {
    return this._manifests.get(appId);
  }

  /**
   * Return all registered manifests.
   *
   * @returns {AppManifest[]}
   */
  getAllApps() {
    return Array.from(this._manifests.values());
  }

  /**
   * Return active (non-closed) window instances for a given app.
   *
   * @param {string} appId
   * @returns {import('./WindowManager.js').WindowInstance[]}
   */
  getRunningInstances(appId) {
    return windowManager.getWindowsByApp(appId);
  }

  /* ---------------------------------------------------------------- */
  /*  Launch                                                            */
  /* ---------------------------------------------------------------- */

  /**
   * Launch an application.
   *
   * If the app is registered as a singleton and already has an open
   * window, the existing window is focused instead of creating a new one.
   *
   * @param {string} appId
   * @param {Object} [options]            - Passed through as `launchOptions`.
   * @param {Object} [options.bounds]     - Override default window bounds.
   * @returns {string|null} instanceId of the created (or focused) window.
   */
  launch(appId, options = {}) {
    const manifest = this._manifests.get(appId);
    if (!manifest) {
      console.error(`[AppRegistry] No manifest registered for "${appId}".`);
      return null;
    }

    // Singleton check
    if (manifest.singleton) {
      const existing = windowManager.getWindowsByApp(appId);
      if (existing.length > 0) {
        const first = existing[0];
        windowManager.focusWindow(first.instanceId);

        // If it was minimized, restore it
        if (first.state === 'minimized') {
          windowManager.restoreWindow(first.instanceId);
        }

        return first.instanceId;
      }
    }

    // Create window via WindowManager
    const instanceId = windowManager.createWindow(appId, {
      title: manifest.name ?? appId,
      icon: manifest.icon ?? '📁',
      bounds: options.bounds ?? {
        width: manifest.defaultSize?.width ?? 800,
        height: manifest.defaultSize?.height ?? 600,
      },
      minSize: manifest.minSize,
    });

    // Defer mount to next microtask so the DOM host (WindowComponent)
    // has time to create the container element.
    queueMicrotask(() => {
      this._mountApp(instanceId, manifest, options);
    });

    store.emit('app:launched', { appId, instanceId });
    return instanceId;
  }

  /* ---------------------------------------------------------------- */
  /*  Mount / Unmount internals                                         */
  /* ---------------------------------------------------------------- */

  /**
   * Mount an app into its window's content container.
   *
   * The container element is expected to already exist in the DOM with
   * the attribute `data-window-content="{instanceId}"`.
   *
   * @private
   * @param {string}      instanceId
   * @param {AppManifest} manifest
   * @param {Object}      launchOptions
   */
  _mountApp(instanceId, manifest, launchOptions) {
    const containerEl = document.querySelector(
      `[data-window-content="${instanceId}"]`
    );

    if (!containerEl) {
      console.warn(
        `[AppRegistry] Container not found for "${instanceId}". ` +
        `Mount will be retried by WindowComponent.`
      );
      return;
    }

    /** @type {AppContext} */
    const context = {
      instanceId,
      appId: manifest.id,
      launchOptions,
      close: () => windowManager.closeWindow(instanceId),
      setTitle: (title) => windowManager.setTitle(instanceId, title),
      store,
      windowManager,
    };

    try {
      manifest.mount(containerEl, context);
    } catch (err) {
      console.error(`[AppRegistry] Error mounting "${manifest.id}":`, err);
    }

    this._mountedInstances.set(instanceId, { manifest, containerEl });
  }

  /**
   * Notify the manifest's unmount hook (if any) and clean up tracking.
   *
   * @private
   * @param {string} instanceId
   */
  _handleWindowClosed(instanceId) {
    const entry = this._mountedInstances.get(instanceId);
    if (!entry) return;

    const { manifest, containerEl } = entry;

    if (typeof manifest.unmount === 'function') {
      try {
        manifest.unmount(containerEl);
      } catch (err) {
        console.error(`[AppRegistry] Error unmounting "${manifest.id}":`, err);
      }
    }

    this._mountedInstances.delete(instanceId);
  }

  /**
   * Retry mounting an app when the container becomes available.
   * Called by WindowComponent after it inserts the content element.
   *
   * @param {string} instanceId
   */
  retryMount(instanceId) {
    // If already mounted, skip
    if (this._mountedInstances.has(instanceId)) return;

    const win = windowManager.getWindow(instanceId);
    if (!win) return;

    const manifest = this._manifests.get(win.appId);
    if (!manifest) return;

    this._mountApp(instanceId, manifest, {});
  }
}

/** Singleton instance */
export default new AppRegistry();
