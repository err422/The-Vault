/**
 * @fileoverview Reactive pub/sub state store for The Web Vault WebOS.
 *
 * Provides a centralized, observable state tree with deep path access,
 * batched subscriber notifications, and a general-purpose event emitter.
 *
 * @module os/core/Store
 */

/**
 * @typedef {'dark'|'light'} ThemeMode
 */

/**
 * @typedef {Object} SessionState
 * @property {string|null} uid        - Firebase user ID
 * @property {string|null} email      - User email
 * @property {string|null} displayName
 * @property {boolean}     isLoggedIn
 */

/**
 * @typedef {Object} Notification
 * @property {string} id
 * @property {string} title
 * @property {string} body
 * @property {'info'|'warning'|'error'|'success'} level
 * @property {number} timestamp
 */

/**
 * @typedef {Object} StoreState
 * @property {Map<string, Object>} windows       - Window instance map (instanceId → state)
 * @property {ThemeMode}           theme          - Current UI theme
 * @property {SessionState}        session        - Logged-in user info
 * @property {Object}              desktop        - Icon positions & layout
 * @property {Object}              dock           - Pinned app IDs & order
 * @property {Notification[]}      notifications  - Notification queue
 */

class Store {
  constructor() {
    /** @type {StoreState} */
    this._state = {
      windows: new Map(),
      theme: 'dark',
      session: {
        uid: null,
        email: null,
        displayName: null,
        isLoggedIn: false,
      },
      desktop: {
        icons: {},       // appId → {x, y}
        gridSize: 80,
        wallpaper: null,
      },
      dock: {
        pinned: [],      // appId[]
        running: [],     // instanceId[]
      },
      notifications: [],
    };

    /**
     * Subscribers keyed by dot-path.
     * '*' is a wildcard that receives every state change.
     * @type {Map<string, Set<Function>>}
     */
    this._subscribers = new Map();

    /**
     * General-purpose event listeners.
     * @type {Map<string, Set<Function>>}
     */
    this._eventListeners = new Map();

    /**
     * Paths that have been dirtied since the last microtask flush.
     * @type {Set<string>}
     */
    this._dirtyPaths = new Set();

    /** Whether a microtask flush is already scheduled. */
    this._flushScheduled = false;
  }

  /* ------------------------------------------------------------------ */
  /*  State access                                                       */
  /* ------------------------------------------------------------------ */

  /**
   * Read a value from the state tree using a dot-separated path.
   *
   * @param {string} path - e.g. `'theme'`, `'windows'`, `'session.uid'`,
   *                         or `'desktop.icons.finder'`
   * @returns {*} The value at the given path, or `undefined`.
   *
   * @example
   * store.getState('session.email'); // 'user@example.com'
   * store.getState('windows');       // Map { … }
   */
  getState(path) {
    if (!path) return this._state;

    const keys = path.split('.');
    let current = this._state;

    for (const key of keys) {
      if (current == null) return undefined;

      // Transparently traverse Maps
      if (current instanceof Map) {
        current = current.get(key);
      } else {
        current = current[key];
      }
    }

    return current;
  }

  /* ------------------------------------------------------------------ */
  /*  State mutation                                                      */
  /* ------------------------------------------------------------------ */

  /**
   * Set a value at the given dot-path, then schedule batched notifications
   * for all subscribers whose path is a prefix of (or equal to) the
   * changed path.
   *
   * @param {string} path  - Dot-separated path into the state tree.
   * @param {*}      value - New value.
   *
   * @example
   * store.setState('theme', 'light');
   * store.setState('windows.win_1.bounds', { x: 100, y: 50, width: 800, height: 600 });
   */
  setState(path, value) {
    if (!path) return;

    const keys = path.split('.');
    let current = this._state;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];

      if (current instanceof Map) {
        if (!current.has(key)) {
          current.set(key, {});
        }
        current = current.get(key);
      } else {
        if (current[key] == null || typeof current[key] !== 'object') {
          current[key] = {};
        }
        current = current[key];
      }
    }

    const lastKey = keys[keys.length - 1];

    if (current instanceof Map) {
      current.set(lastKey, value);
    } else {
      current[lastKey] = value;
    }

    // Mark this path and every ancestor as dirty so subscribers fire.
    this._markDirty(path);
  }

  /**
   * Delete a key at the given path (useful for removing a window entry
   * from the windows Map).
   *
   * @param {string} path - Dot-separated path whose leaf key will be deleted.
   */
  deleteState(path) {
    if (!path) return;

    const keys = path.split('.');
    let current = this._state;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (current instanceof Map) {
        current = current.get(key);
      } else {
        current = current?.[key];
      }
      if (current == null) return;
    }

    const lastKey = keys[keys.length - 1];

    if (current instanceof Map) {
      current.delete(lastKey);
    } else if (current && typeof current === 'object') {
      delete current[lastKey];
    }

    this._markDirty(path);
  }

  /* ------------------------------------------------------------------ */
  /*  Subscriptions (reactive state observation)                          */
  /* ------------------------------------------------------------------ */

  /**
   * Subscribe to state changes at a given path.
   *
   * The callback receives `(newValue, path)` and is invoked asynchronously
   * via a batched microtask after one or more `setState` calls within the
   * same synchronous turn.
   *
   * @param {string}   path     - Dot-path to observe (use `'*'` for all changes).
   * @param {Function} callback - `(newValue, path) => void`
   * @returns {Function} Unsubscribe function.
   *
   * @example
   * const unsub = store.subscribe('theme', (value) => {
   *   document.body.dataset.theme = value;
   * });
   * // later…
   * unsub();
   */
  subscribe(path, callback) {
    if (typeof callback !== 'function') {
      throw new TypeError('Store.subscribe: callback must be a function');
    }

    if (!this._subscribers.has(path)) {
      this._subscribers.set(path, new Set());
    }
    this._subscribers.get(path).add(callback);

    // Return unsubscribe handle
    return () => {
      const subs = this._subscribers.get(path);
      if (subs) {
        subs.delete(callback);
        if (subs.size === 0) this._subscribers.delete(path);
      }
    };
  }

  /* ------------------------------------------------------------------ */
  /*  Event emitter (for one-shot signals unrelated to state paths)       */
  /* ------------------------------------------------------------------ */

  /**
   * Emit a named event. Listeners are invoked synchronously.
   *
   * @param {string} event - Event name, e.g. `'window:created'`.
   * @param {*}      data  - Arbitrary payload.
   */
  emit(event, data) {
    const listeners = this._eventListeners.get(event);
    if (!listeners) return;

    for (const fn of listeners) {
      try {
        fn(data);
      } catch (err) {
        console.error(`[Store] Error in listener for "${event}":`, err);
      }
    }
  }

  /**
   * Register a listener for a named event.
   *
   * @param {string}   event    - Event name.
   * @param {Function} callback - `(data) => void`
   * @returns {Function} Unsubscribe function.
   */
  on(event, callback) {
    if (typeof callback !== 'function') {
      throw new TypeError('Store.on: callback must be a function');
    }

    if (!this._eventListeners.has(event)) {
      this._eventListeners.set(event, new Set());
    }
    this._eventListeners.get(event).add(callback);

    return () => {
      const set = this._eventListeners.get(event);
      if (set) {
        set.delete(callback);
        if (set.size === 0) this._eventListeners.delete(event);
      }
    };
  }

  /**
   * Register a listener that fires only once.
   *
   * @param {string}   event    - Event name.
   * @param {Function} callback - `(data) => void`
   * @returns {Function} Unsubscribe function.
   */
  once(event, callback) {
    const unsub = this.on(event, (data) => {
      unsub();
      callback(data);
    });
    return unsub;
  }

  /* ------------------------------------------------------------------ */
  /*  Batched notification internals                                      */
  /* ------------------------------------------------------------------ */

  /**
   * Mark a path (and all its ancestor prefixes) as dirty.
   * Schedules a microtask flush if not already pending.
   *
   * @private
   * @param {string} path
   */
  _markDirty(path) {
    // Add the exact path
    this._dirtyPaths.add(path);

    // Add ancestor paths so parent subscribers also fire.
    // e.g. 'windows.win_1.bounds' → also dirty 'windows.win_1' and 'windows'
    const parts = path.split('.');
    for (let i = parts.length - 1; i >= 1; i--) {
      this._dirtyPaths.add(parts.slice(0, i).join('.'));
    }

    if (!this._flushScheduled) {
      this._flushScheduled = true;
      queueMicrotask(() => this._flush());
    }
  }

  /**
   * Flush all dirty paths: notify matching subscribers and wildcard listeners.
   * @private
   */
  _flush() {
    this._flushScheduled = false;

    const paths = new Set(this._dirtyPaths);
    this._dirtyPaths.clear();

    // Notify exact-path subscribers
    for (const dirtyPath of paths) {
      const subs = this._subscribers.get(dirtyPath);
      if (subs) {
        const value = this.getState(dirtyPath);
        for (const fn of subs) {
          try {
            fn(value, dirtyPath);
          } catch (err) {
            console.error(`[Store] Error in subscriber for "${dirtyPath}":`, err);
          }
        }
      }
    }

    // Notify wildcard subscribers once per flush, with the set of dirty paths
    const wildcardSubs = this._subscribers.get('*');
    if (wildcardSubs) {
      for (const fn of wildcardSubs) {
        try {
          fn(paths, '*');
        } catch (err) {
          console.error('[Store] Error in wildcard subscriber:', err);
        }
      }
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Utilities                                                           */
  /* ------------------------------------------------------------------ */

  /**
   * Reset the store to a clean default state. Useful for testing or logout.
   */
  reset() {
    this._state = {
      windows: new Map(),
      theme: 'dark',
      session: {
        uid: null,
        email: null,
        displayName: null,
        isLoggedIn: false,
      },
      desktop: {
        icons: {},
        gridSize: 80,
        wallpaper: null,
      },
      dock: {
        pinned: [],
        running: [],
      },
      notifications: [],
    };
    this._dirtyPaths.clear();
    this._flushScheduled = false;
  }

  /**
   * Snapshot the entire state tree (shallow clone—Maps become plain objects).
   * Intended for debugging / devtools.
   *
   * @returns {Object}
   */
  snapshot() {
    const windowsObj = {};
    for (const [id, win] of this._state.windows) {
      windowsObj[id] = { ...win };
    }
    return {
      ...this._state,
      windows: windowsObj,
    };
  }
}

/** Singleton instance */
export default new Store();
