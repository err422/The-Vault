/**
 * @fileoverview Virtual Hierarchical Filesystem (VirtualFS) for The Web Vault WebOS.
 *
 * Implements an asynchronous virtual filesystem backed by IndexedDB with localStorage fallback.
 * Emits 'vfs:change' events via Store.js so File Explorer, Terminal, Notes, and Desktop stay in sync.
 *
 * Default directory tree seeded on first boot:
 * /Desktop
 * /Documents/Notes
 * /Downloads
 * /Pictures/Wallpapers
 * /Vault
 *
 * @module os/core/VirtualFS
 */

import store from './Store.js';

const DB_NAME = 'vault_os_vfs_v1';
const DB_VERSION = 1;
const STORE_NAME = 'files';
const LS_PREFIX = 'vault_vfs:';

class VirtualFS {
  constructor() {
    this._db = null;
    this._useLocalStorage = false;
    this._initialized = false;
  }

  /**
   * Initialize IndexedDB with localStorage fallback and seed initial directories.
   * @returns {Promise<void>}
   */
  async init() {
    if (this._initialized) return;

    try {
      if (!window.indexedDB) {
        throw new Error('IndexedDB not supported in this environment');
      }
      this._db = await new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = (e) => {
          const db = req.result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME, { keyPath: 'path' });
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.warn('[VirtualFS] IndexedDB unavailable, falling back to localStorage:', err);
      this._useLocalStorage = true;
    }

    this._initialized = true;

    // Check if initial structure exists, if not seed it
    const desktop = await this.stat('/Desktop');
    if (!desktop) {
      await this._seedDefaultTree();
    }
  }

  async _seedDefaultTree() {
    await this.mkdir('/Desktop');
    await this.mkdir('/Documents');
    await this.mkdir('/Documents/Notes');
    await this.mkdir('/Downloads');
    await this.mkdir('/Pictures');
    await this.mkdir('/Pictures/Wallpapers');
    await this.mkdir('/Vault');

    // Welcome note
    await this.writeFile(
      '/Documents/Notes/Welcome.md',
      '# Welcome to The Web Vault WebOS\n\n' +
      'A modular, windowed operating system built for the web.\n\n' +
      '### Features:\n' +
      '- **Multi-window desktop** with Windows 11-style snap preview zones\n' +
      '- **Virtual Filesystem** syncing local state and notes\n' +
      '- **Terminal** with full CLI toolchain (ls, cat, mkdir, rm, neofetch, etc.)\n' +
      '- **Vault Hub** with access to all 38+ games and proxy websites\n' +
      '- **System Monitor** with live DOM and memory diagnostics\n',
      'text/markdown'
    );

    // Desktop shortcuts (.lnk files)
    const shortcuts = [
      { path: '/Desktop/Vault Hub.lnk', target: 'vault-hub', icon: '🏠' },
      { path: '/Desktop/Browser.lnk', target: 'browser', icon: '🌐' },
      { path: '/Desktop/File Explorer.lnk', target: 'file-explorer', icon: '📁' },
      { path: '/Desktop/Terminal.lnk', target: 'terminal', icon: '💻' },
      { path: '/Desktop/Notes.lnk', target: 'notes', icon: '📝' },
      { path: '/Desktop/Settings.lnk', target: 'settings', icon: '⚙️' },
      { path: '/Desktop/System Monitor.lnk', target: 'system-monitor', icon: '📊' }
    ];

    for (const sc of shortcuts) {
      await this.writeFile(sc.path, JSON.stringify(sc), 'application/x-vault-shortcut');
    }

    console.log('[VirtualFS] Default tree seeded successfully.');
  }

  _normalizePath(p) {
    if (!p) return '/';
    let path = p.replace(/\\/g, '/').replace(/\/+/g, '/');
    if (path.length > 1 && path.endsWith('/')) {
      path = path.slice(0, -1);
    }
    if (!path.startsWith('/')) {
      path = '/' + path;
    }
    return path;
  }

  _getParent(path) {
    const norm = this._normalizePath(path);
    if (norm === '/') return null;
    const idx = norm.lastIndexOf('/');
    return idx === 0 ? '/' : norm.slice(0, idx);
  }

  _getBaseName(path) {
    const norm = this._normalizePath(path);
    if (norm === '/') return '/';
    return norm.slice(norm.lastIndexOf('/') + 1);
  }

  // --- Storage primitives ---

  async _get(path) {
    await this.init();
    const key = this._normalizePath(path);
    if (this._useLocalStorage) {
      const raw = localStorage.getItem(LS_PREFIX + key);
      return raw ? JSON.parse(raw) : null;
    }

    return new Promise((resolve, reject) => {
      const tx = this._db.transaction(STORE_NAME, 'readonly');
      const storeObj = tx.objectStore(STORE_NAME);
      const req = storeObj.get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  async _put(entry) {
    await this.init();
    entry.path = this._normalizePath(entry.path);
    entry.mtime = Date.now();

    if (this._useLocalStorage) {
      localStorage.setItem(LS_PREFIX + entry.path, JSON.stringify(entry));
      return;
    }

    return new Promise((resolve, reject) => {
      const tx = this._db.transaction(STORE_NAME, 'readwrite');
      const storeObj = tx.objectStore(STORE_NAME);
      const req = storeObj.put(entry);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async _del(path) {
    await this.init();
    const key = this._normalizePath(path);
    if (this._useLocalStorage) {
      localStorage.removeItem(LS_PREFIX + key);
      return;
    }

    return new Promise((resolve, reject) => {
      const tx = this._db.transaction(STORE_NAME, 'readwrite');
      const storeObj = tx.objectStore(STORE_NAME);
      const req = storeObj.delete(key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async _getAll() {
    await this.init();
    if (this._useLocalStorage) {
      const res = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k.startsWith(LS_PREFIX)) {
          res.push(JSON.parse(localStorage.getItem(k)));
        }
      }
      return res;
    }

    return new Promise((resolve, reject) => {
      const tx = this._db.transaction(STORE_NAME, 'readonly');
      const storeObj = tx.objectStore(STORE_NAME);
      const req = storeObj.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  // --- Public VFS API ---

  async stat(path) {
    const norm = this._normalizePath(path);
    if (norm === '/') {
      return { path: '/', name: '/', type: 'dir', mtime: 0, size: 0 };
    }
    return await this._get(norm);
  }

  async mkdir(path) {
    const norm = this._normalizePath(path);
    if (norm === '/') return;

    const existing = await this.stat(norm);
    if (existing) {
      if (existing.type !== 'dir') throw new Error(`Cannot mkdir: "${norm}" exists and is not a directory`);
      return;
    }

    const parent = this._getParent(norm);
    if (parent && parent !== '/') {
      const pStat = await this.stat(parent);
      if (!pStat) {
        await this.mkdir(parent);
      }
    }

    const entry = {
      path: norm,
      name: this._getBaseName(norm),
      type: 'dir',
      ctime: Date.now(),
      mtime: Date.now(),
      size: 0
    };

    await this._put(entry);
    store.emit('vfs:change', { action: 'mkdir', path: norm });
  }

  async writeFile(path, content, mime = 'text/plain') {
    const norm = this._normalizePath(path);
    const parent = this._getParent(norm);
    if (parent && parent !== '/') {
      const pStat = await this.stat(parent);
      if (!pStat) await this.mkdir(parent);
    }

    const size = typeof content === 'string' ? new Blob([content]).size : (content.byteLength || 0);
    const entry = {
      path: norm,
      name: this._getBaseName(norm),
      type: 'file',
      content: content,
      mime: mime,
      ctime: Date.now(),
      mtime: Date.now(),
      size: size
    };

    await this._put(entry);
    store.emit('vfs:change', { action: 'write', path: norm });
  }

  async readFile(path) {
    const entry = await this.stat(path);
    if (!entry) throw new Error(`File not found: ${path}`);
    if (entry.type !== 'file') throw new Error(`Cannot readFile: "${path}" is a directory`);
    return entry.content;
  }

  async list(path) {
    const norm = this._normalizePath(path);
    const all = await this._getAll();

    return all.filter(entry => {
      const parent = this._getParent(entry.path);
      return parent === norm;
    }).sort((a, b) => {
      // Directories first, then alphabetical
      if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }

  async rename(oldPath, newPath) {
    const oNorm = this._normalizePath(oldPath);
    const nNorm = this._normalizePath(newPath);
    if (oNorm === nNorm) return;

    const entry = await this.stat(oNorm);
    if (!entry) throw new Error(`Source not found: ${oldPath}`);

    const existingTarget = await this.stat(nNorm);
    if (existingTarget) throw new Error(`Target already exists: ${newPath}`);

    if (entry.type === 'file') {
      entry.path = nNorm;
      entry.name = this._getBaseName(nNorm);
      await this._put(entry);
      await this._del(oNorm);
    } else {
      // For directories, recursively move all children
      const all = await this._getAll();
      for (const item of all) {
        if (item.path === oNorm || item.path.startsWith(oNorm + '/')) {
          const suffix = item.path.slice(oNorm.length);
          const newChildPath = nNorm + suffix;
          item.path = newChildPath;
          item.name = this._getBaseName(newChildPath);
          await this._put(item);
          await this._del(item.path);
        }
      }
    }

    store.emit('vfs:change', { action: 'rename', oldPath: oNorm, newPath: nNorm });
  }

  async move(srcPath, destDir) {
    const sNorm = this._normalizePath(srcPath);
    const dNorm = this._normalizePath(destDir);
    const dStat = await this.stat(dNorm);
    if (!dStat || dStat.type !== 'dir') throw new Error(`Destination is not a directory: ${destDir}`);

    const baseName = this._getBaseName(sNorm);
    const targetPath = dNorm === '/' ? `/${baseName}` : `${dNorm}/${baseName}`;
    await this.rename(sNorm, targetPath);
  }

  async remove(path) {
    const norm = this._normalizePath(path);
    if (norm === '/') throw new Error('Cannot delete root directory');

    const entry = await this.stat(norm);
    if (!entry) return;

    if (entry.type === 'file') {
      await this._del(norm);
    } else {
      // Recursively delete all children
      const all = await this._getAll();
      for (const item of all) {
        if (item.path === norm || item.path.startsWith(norm + '/')) {
          await this._del(item.path);
        }
      }
    }

    store.emit('vfs:change', { action: 'remove', path: norm });
  }
}

const virtualFS = new VirtualFS();
export default virtualFS;
