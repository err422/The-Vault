/**
 * @fileoverview Window Manager for The Web Vault WebOS.
 *
 * Manages the full lifecycle of window instances: creation, focus, z-index
 * stacking, minimize, maximize, restore, snap zones, and cleanup.
 * All window state lives in {@link Store} under the `windows` Map.
 *
 * Z-index range: 100–899 (compacts automatically when nearing ceiling).
 *
 * @module os/core/WindowManager
 */

import store from './Store.js';
import WindowFrame from '../ui/WindowFrame.js';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

/** @type {number} Lowest z-index available for windows */
const Z_BASE = 100;

/** @type {number} Highest z-index available for windows */
const Z_CEILING = 899;

/** @type {number} Height of the top menu bar in px */
const MENUBAR_HEIGHT = 32;

/** @type {number} Height of the bottom dock in px */
const DOCK_HEIGHT = 64;

/** @type {number} Auto-increment counter for unique instance IDs */
let idCounter = 0;

/* ------------------------------------------------------------------ */
/*  Window state schema (JSDoc only – no runtime class needed)          */
/* ------------------------------------------------------------------ */

/**
 * @typedef {Object} WindowBounds
 * @property {number} x
 * @property {number} y
 * @property {number} width
 * @property {number} height
 */

/**
 * @typedef {Object} MinSize
 * @property {number} width
 * @property {number} height
 */

/**
 * @typedef {'normal'|'minimized'|'maximized'|'snapped'} WindowState
 */

/**
 * @typedef {'left'|'right'|'top-left'|'top-right'|'bottom-left'|'bottom-right'} SnapZone
 */

/**
 * @typedef {Object} WindowInstance
 * @property {string}       instanceId
 * @property {string}       appId
 * @property {string}       title
 * @property {string}       icon       - Emoji or URL
 * @property {WindowBounds} bounds
 * @property {WindowBounds|null} restoreBounds - Saved bounds before maximize/snap
 * @property {MinSize}      minSize
 * @property {WindowState}  state
 * @property {SnapZone|null} snapZone
 * @property {number}       zIndex
 * @property {boolean}      isFocused
 */

/* ------------------------------------------------------------------ */
/*  WindowManager class                                                 */
/* ------------------------------------------------------------------ */

class WindowManager {
  constructor() {
    /** @type {number} Tracks the next z-index to assign on focus */
    this._nextZ = Z_BASE;
    /** @type {Map<string, WindowFrame>} */
    this._frames = new Map();
  }

  /* ---------------------------------------------------------------- */
  /*  Work area                                                        */
  /* ---------------------------------------------------------------- */

  /**
   * Returns the usable desktop rectangle, accounting for the top menu bar
   * and bottom dock.
   *
   * @returns {WindowBounds}
   */
  getWorkArea(ignoreDock = false) {
    const topBar = document.querySelector(
      '.vault-menubar, #vault-top-bar, #top-menu-bar, .vault-top-menu, .top-menu-bar',
    );
    const topOffset = topBar && topBar.getClientRects().length
      ? topBar.getBoundingClientRect().height
      : 0;
    const reserveDock = !ignoreDock && !this._isDockAutoHideEnabled();

    return {
      x: 0,
      y: topOffset,
      width: window.innerWidth,
      height: Math.max(0, window.innerHeight - topOffset - (reserveDock ? DOCK_HEIGHT : 0)),
    };
  }

  /* ---------------------------------------------------------------- */
  /*  Window creation                                                   */
  /* ---------------------------------------------------------------- */

  /**
   * Create a new window instance and register it in the Store.
   *
   * @param {string} appId   - Application identifier.
   * @param {Object} [options]
   * @param {string} [options.title]
   * @param {string} [options.icon]
   * @param {WindowBounds} [options.bounds]
   * @param {MinSize}      [options.minSize]
   * @returns {string} The unique `instanceId`.
   */
  createWindow(appId, options = {}) {
    const instanceId = `win_${appId}_${++idCounter}`;
    const workArea = this.getWorkArea();

    const defaultWidth = options.bounds?.width ?? 800;
    const defaultHeight = options.bounds?.height ?? 600;

    // Centre the window in the work area with a small cascade offset
    const cascadeOffset = (idCounter % 10) * 24;
    const defaultX = options.bounds?.x
      ?? Math.max(workArea.x, Math.round((workArea.width - defaultWidth) / 2) + cascadeOffset);
    const defaultY = options.bounds?.y
      ?? Math.max(workArea.y, Math.round((workArea.height - defaultHeight) / 2) + cascadeOffset);

    /** @type {WindowInstance} */
    const instance = {
      instanceId,
      appId,
      title: options.title ?? appId,
      icon: options.icon ?? '📁',
      bounds: {
        x: defaultX,
        y: defaultY,
        width: defaultWidth,
        height: defaultHeight,
      },
      restoreBounds: null,
      minSize: {
        width: options.minSize?.width ?? 320,
        height: options.minSize?.height ?? 240,
      },
      state: 'normal',
      snapZone: null,
      zIndex: this._assignZ(),
      isFocused: true,
    };

    // Unfocus every other window first
    this._unfocusAll();

    // Write to store
    store.setState(`windows.${instanceId}`, instance);

    // Track in dock running list
    const running = store.getState('dock.running') ?? [];
    if (!running.includes(instanceId)) {
      store.setState('dock.running', [...running, instanceId]);
    }

    // Instantiate WindowFrame DOM
    try {
      const frame = new WindowFrame(instanceId, {
        title: instance.title,
        icon: instance.icon,
        x: instance.bounds.x,
        y: instance.bounds.y,
        width: instance.bounds.width,
        height: instance.bounds.height,
        minWidth: instance.minSize.width,
        minHeight: instance.minSize.height,
        onClose: () => this.closeWindow(instanceId),
        onMinimize: () => this.minimizeWindow(instanceId),
        onFocus: () => this.focusWindow(instanceId),
      });
      frame.setZIndex(instance.zIndex);

      const targetLayer = document.getElementById('vault-windows-layer') || document.body;
      targetLayer.appendChild(frame.element);
      this._frames.set(instanceId, frame);
    } catch (err) {
      console.warn('[WindowManager] Could not attach WindowFrame DOM:', err);
    }

    store.emit('window:created', { instanceId, appId });
    return instanceId;
  }

  /* ---------------------------------------------------------------- */
  /*  Window destruction                                                */
  /* ---------------------------------------------------------------- */

  /**
   * Close and remove a window instance.
   *
   * @param {string} instanceId
   */
  closeWindow(instanceId) {
    const win = this._getWindow(instanceId);
    if (!win) return;

    const { appId } = win;

    // Destroy WindowFrame DOM
    const frame = this._frames.get(instanceId);
    if (frame) {
      try { frame.destroy(); } catch {}
      this._frames.delete(instanceId);
    }

    // Remove from store
    store.deleteState(`windows.${instanceId}`);

    // Remove from dock running list
    const running = (store.getState('dock.running') ?? []).filter(id => id !== instanceId);
    store.setState('dock.running', running);

    store.emit('window:closed', { instanceId, appId });

    // Focus the next top window
    this._focusTopWindow();
  }

  /* ---------------------------------------------------------------- */
  /*  Focus / z-index                                                   */
  /* ---------------------------------------------------------------- */

  /**
   * Bring a window to the front and mark it as focused.
   *
   * @param {string} instanceId
   */
  focusWindow(instanceId) {
    const win = this._getWindow(instanceId);
    if (!win) return;

    // Already focused and on top? Nothing to do.
    if (win.isFocused) return;

    this._unfocusAll();

    const z = this._assignZ();
    store.setState(`windows.${instanceId}`, {
      ...win,
      zIndex: z,
      isFocused: true,
      // Restore from minimized if needed
      state: win.state === 'minimized' ? 'normal' : win.state,
    });

    for (const [id, frame] of this._frames) {
      const isTarget = id === instanceId;
      frame.setFocused(isTarget);
      if (isTarget) {
        frame.setZIndex(z);
        if (frame.state === 'minimized') {
          frame.updateState('normal');
        }
      }
    }

    store.emit('window:focused', { instanceId });
  }

  /* ---------------------------------------------------------------- */
  /*  Minimize                                                          */
  /* ---------------------------------------------------------------- */

  /**
   * Minimize a window (hide from desktop, keep in dock).
   *
   * @param {string} instanceId
   */
  minimizeWindow(instanceId) {
    const win = this._getWindow(instanceId);
    if (!win || win.state === 'minimized') return;

    store.setState(`windows.${instanceId}`, {
      ...win,
      state: 'minimized',
      isFocused: false,
    });

    const frame = this._frames.get(instanceId);
    if (frame) {
      frame.updateState('minimized');
    }

    store.emit('window:stateChanged', { instanceId, state: 'minimized' });

    // Focus the next window
    this._focusTopWindow();
  }

  /* ---------------------------------------------------------------- */
  /*  Maximize                                                          */
  /* ---------------------------------------------------------------- */

  /**
   * Expand a window to fill the entire work area.
   * Saves current bounds for later restore.
   *
   * @param {string} instanceId
   */
  maximizeWindow(instanceId) {
    const win = this._getWindow(instanceId);
    if (!win) return;

    // If already maximized, restore instead (toggle behaviour)
    if (win.state === 'maximized') {
      this.restoreWindow(instanceId);
      return;
    }

    // Maximized windows must not reserve dock space, even when auto-hide is enabled.
    const workArea = this.getWorkArea(true);
    const maxBounds = {
      x: workArea.x,
      y: workArea.y,
      width: workArea.width,
      height: workArea.height,
    };

    this._unfocusAll();

    store.setState(`windows.${instanceId}`, {
      ...win,
      restoreBounds: win.restoreBounds ?? { ...win.bounds },
      bounds: maxBounds,
      state: 'maximized',
      snapZone: null,
      isFocused: true,
      zIndex: this._assignZ(),
    });

    document.body.classList.add('os-window-maximized');

    const frame = this._frames.get(instanceId);
    if (frame) {
      frame.updateBounds(maxBounds, true);
      frame.updateState('maximized');
    }

    store.emit('window:stateChanged', { instanceId, state: 'maximized' });
  }

  /* ---------------------------------------------------------------- */
  /*  Restore                                                           */
  /* ---------------------------------------------------------------- */

  /**
   * Restore a window from maximized, minimized, or snapped state to
   * its previous normal bounds.
   *
   * @param {string} instanceId
   */
  restoreWindow(instanceId) {
    const win = this._getWindow(instanceId);
    if (!win) return;

    this._unfocusAll();

    const bounds = win.restoreBounds ?? win.bounds;

    store.setState(`windows.${instanceId}`, {
      ...win,
      bounds: { ...bounds },
      restoreBounds: null,
      state: 'normal',
      snapZone: null,
      isFocused: true,
      zIndex: this._assignZ(),
    });

    const frame = this._frames.get(instanceId);
    if (frame) {
      frame.updateState('normal');
      frame.updateBounds(bounds, true);
    }

    store.emit('window:stateChanged', { instanceId, state: 'normal' });
  }

  /* ---------------------------------------------------------------- */
  /*  Snap                                                              */
  /* ---------------------------------------------------------------- */

  /**
   * Snap a window to a predefined zone of the work area.
   *
   * Zones:
   * - `'left'`  / `'right'`       → half-screen
   * - `'top-left'` / `'top-right'` / `'bottom-left'` / `'bottom-right'` → quarter
   *
   * @param {string}   instanceId
   * @param {SnapZone} zone
   */
  snapWindow(instanceId, zone) {
    const win = this._getWindow(instanceId);
    if (!win) return;

    const wa = this.getWorkArea();
    const halfW = Math.round(wa.width / 2);
    const halfH = Math.round(wa.height / 2);

    /** @type {Record<SnapZone, WindowBounds>} */
    const zoneBounds = {
      'left':         { x: wa.x,         y: wa.y,          width: halfW, height: wa.height },
      'right':        { x: wa.x + halfW, y: wa.y,          width: halfW, height: wa.height },
      'top-left':     { x: wa.x,         y: wa.y,          width: halfW, height: halfH },
      'top-right':    { x: wa.x + halfW, y: wa.y,          width: halfW, height: halfH },
      'bottom-left':  { x: wa.x,         y: wa.y + halfH,  width: halfW, height: halfH },
      'bottom-right': { x: wa.x + halfW, y: wa.y + halfH,  width: halfW, height: halfH },
    };

    const bounds = zoneBounds[zone];
    if (!bounds) {
      console.warn(`[WindowManager] Unknown snap zone: "${zone}"`);
      return;
    }

    this._unfocusAll();

    // Save original bounds if not already saved (e.g. from a previous snap)
    const restoreBounds = win.restoreBounds ?? (win.state === 'normal' ? { ...win.bounds } : null);

    store.setState(`windows.${instanceId}`, {
      ...win,
      restoreBounds,
      bounds,
      state: 'snapped',
      snapZone: zone,
      isFocused: true,
      zIndex: this._assignZ(),
    });

    const frame = this._frames.get(instanceId);
    if (frame) {
      frame.updateBounds(bounds, true);
    }

    store.emit('window:stateChanged', { instanceId, state: 'snapped', zone });
  }

  /* ---------------------------------------------------------------- */
  /*  Bounds update (used by drag / resize)                             */
  /* ---------------------------------------------------------------- */

  /**
   * Update a window's position and/or size.
   * Clamps to min size and resets state to 'normal' if it was snapped/maximized.
   *
   * @param {string} instanceId
   * @param {Partial<WindowBounds>} boundsUpdate
   */
  updateBounds(instanceId, boundsUpdate) {
    const win = this._getWindow(instanceId);
    if (!win) return;

    const newBounds = {
      ...win.bounds,
      ...boundsUpdate,
    };

    // Enforce minimum size
    newBounds.width = Math.max(newBounds.width, win.minSize.width);
    newBounds.height = Math.max(newBounds.height, win.minSize.height);

    // If user manually moves / resizes, drop out of maximized/snapped
    const newState = (win.state === 'maximized' || win.state === 'snapped')
      ? 'normal'
      : win.state;

    store.setState(`windows.${instanceId}`, {
      ...win,
      bounds: newBounds,
      state: newState,
      snapZone: newState === 'normal' ? null : win.snapZone,
      restoreBounds: newState === 'normal' ? null : win.restoreBounds,
    });

    store.emit('window:boundsChanged', { instanceId, bounds: newBounds });
  }

  /**
   * Compatibility method for external calls from WindowFrame
   * @param {string} instanceId
   * @param {Object} updates
   */
  updateWindow(instanceId, updates = {}) {
    if (updates.bounds) {
      this.updateBounds(instanceId, updates.bounds);
    }
    if (updates.state) {
      const win = this._getWindow(instanceId);
      if (win) {
        store.setState(`windows.${instanceId}.state`, updates.state);
      }
    }
  }

  /**
   * Update a window's title.
   *
   * @param {string} instanceId
   * @param {string} title
   */
  setTitle(instanceId, title) {
    const win = this._getWindow(instanceId);
    if (!win) return;
    store.setState(`windows.${instanceId}.title`, title);
  }

  /* ---------------------------------------------------------------- */
  /*  Queries                                                           */
  /* ---------------------------------------------------------------- */

  /**
   * Get all window instances for a given appId.
   *
   * @param {string} appId
   * @returns {WindowInstance[]}
   */
  getWindowsByApp(appId) {
    const all = this.getAllWindows();
    return all.filter(w => w.appId === appId);
  }

  /**
   * Get every window instance.
   *
   * @returns {WindowInstance[]}
   */
  getAllWindows() {
    /** @type {Map<string, WindowInstance>} */
    const windowsMap = store.getState('windows');
    if (!windowsMap || !(windowsMap instanceof Map)) return [];
    return Array.from(windowsMap.values());
  }

  /**
   * Get every window instance (alias for getAllWindows).
   * @returns {WindowInstance[]}
   */
  getWindows() {
    return this.getAllWindows();
  }

  /**
   * Get currently focused window instance.
   * @returns {WindowInstance|null}
   */
  getFocusedWindow() {
    return this.getAllWindows().find(w => w.isFocused) || null;
  }

  /**
   * Get a single window instance by ID (or null).
   *
   * @param {string} instanceId
   * @returns {WindowInstance|null}
   */
  getWindow(instanceId) {
    return this._getWindow(instanceId);
  }

  /* ---------------------------------------------------------------- */
  /*  Internal helpers                                                  */
  /* ---------------------------------------------------------------- */

  /**
   * @private
   * @param {string} instanceId
   * @returns {WindowInstance|null}
   */
  _getWindow(instanceId) {
    return store.getState(`windows.${instanceId}`) ?? null;
  }

  /**
   * Un-focus every window in the store.
   * @private
   */
  _unfocusAll() {
    const windowsMap = store.getState('windows');
    if (!windowsMap || !(windowsMap instanceof Map)) return;

    for (const [id, win] of windowsMap) {
      if (win.isFocused) {
        store.setState(`windows.${id}`, { ...win, isFocused: false });
      }
    }
  }

  /**
   * Focus the highest-z non-minimized window.
   * @private
   */
  _focusTopWindow() {
    const windows = this.getAllWindows()
      .filter(w => w.state !== 'minimized')
      .sort((a, b) => b.zIndex - a.zIndex);

    if (windows.length > 0) {
      const top = windows[0];
      store.setState(`windows.${top.instanceId}`, { ...top, isFocused: true });
      store.emit('window:focused', { instanceId: top.instanceId });
    }
  }

  /**
   * Assign the next z-index value. Compacts the stack when approaching
   * the ceiling to avoid overflow.
   *
   * @private
   * @returns {number}
   */
  _assignZ() {
    this._nextZ++;

    // Compact when we're getting close to the ceiling
    if (this._nextZ >= Z_CEILING - 10) {
      this._compactZIndices();
    }

    return this._nextZ;
  }

  /**
   * Reassign z-indices for all windows starting from Z_BASE, preserving
   * their existing stacking order.
   *
   * @private
   */
  _compactZIndices() {
    const windows = this.getAllWindows().sort((a, b) => a.zIndex - b.zIndex);

    let z = Z_BASE;
    for (const win of windows) {
      z++;
      if (win.zIndex !== z) {
        store.setState(`windows.${win.instanceId}`, { ...win, zIndex: z });
      }
    }
    this._nextZ = z;
  }
}

/** Singleton instance */
export default new WindowManager();
